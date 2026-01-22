"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
    Play, Pause, Volume2, VolumeX, X, Radio, Users, Loader2,
    Crown, AlertCircle, Wifi, Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDb } from '@/lib/firebase';
import {
    doc, collection, addDoc, onSnapshot, updateDoc, deleteDoc,
    serverTimestamp, query, where, getDocs, orderBy, limit
} from 'firebase/firestore';
import type { User, Media } from '@/lib/types';

// STUN servers for WebRTC
const servers: RTCConfiguration = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
};

type P2PMediaPlayerProps = {
    media: Media;
    file?: File; // Only host has this
    onStop: () => void;
    roomId: string;
    userId: string;
    isHost: boolean;
};

export default function P2PMediaPlayer({
    media,
    file,
    onStop,
    roomId,
    userId,
    isHost
}: P2PMediaPlayerProps) {
    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const [streamConnected, setStreamConnected] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const viewerStreamRef = useRef<MediaStream | null>(null); // Store viewer stream for re-attaching
    const p2pDocIdRef = useRef<string | null>(null);
    const unsubscribesRef = useRef<(() => void)[]>([]);

    // Helper functions
    const formatTime = (seconds: number) => {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTimeUpdate = () => {
        if (isHost && localVideoRef.current) {
            setCurrentTime(localVideoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (isHost && localVideoRef.current) {
            setDuration(localVideoRef.current.duration);
            setIsLoading(false);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isHost || !localVideoRef.current) return;
        const newTime = parseFloat(e.target.value);
        localVideoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    // Host: Set up video element with local file
    useEffect(() => {
        if (!isHost || !file) return;

        const video = localVideoRef.current;
        if (!video) return;

        // Create object URL for the file
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;
        video.muted = true; // Mute local to prevent echo

        // Use canplaythrough for more reliable capture on all browsers
        video.oncanplaythrough = async () => {
            // Only initialize once
            if (mediaStreamRef.current) return;

            setIsLoading(false);

            // Must play briefly to initialize tracks for captureStream() in some browsers
            try {
                await video.play();
                // Small delay to ensure decoder is fully initialized
                await new Promise(r => setTimeout(r, 200));
                video.pause(); // Pause immediately - will resume when viewer connects
                console.log('🎬 Video initialized for capture');
            } catch (e) {
                console.warn('⚠️ Could not auto-play for capture, proceeding anyway');
            }

            // Capture the stream for WebRTC
            captureAndBroadcast(video);
        };

        video.onerror = () => {
            setHasError(true);
            setErrorMessage('Failed to load media file');
            setIsLoading(false);
        };

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [isHost, file]); // removed isExpanded, video ref is stable

    // Viewer: Update mute state on video element (don't re-attach or replay!)
    useEffect(() => {
        if (isHost) return;
        const video = remoteVideoRef.current;
        if (video) {
            video.muted = isMuted;
        }
    }, [isHost, isMuted]);

    // Host: Capture stream and set up broadcasting
    const captureAndBroadcast = useCallback(async (video: HTMLVideoElement) => {
        const db = getDb();
        if (!db) return;

        // Use existing stream if available
        if (mediaStreamRef.current) return;

        try {
            // Capture stream from video element
            // Capture stream from video element with capped FPS for stability
            const stream = (video as HTMLVideoElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
            mediaStreamRef.current = stream;

            const vTracks = stream.getVideoTracks();
            console.log('📡 Captured stream:', {
                id: stream.id,
                active: stream.active,
                videoTracks: vTracks.length,
                audioTracks: stream.getAudioTracks().length,
                firstTrackMuted: vTracks[0]?.muted
            });

            if (vTracks.length === 0) {
                console.warn('⚠️ No video tracks in captured stream! Retrying without FPS cap...');
                // Fallback to default capture if 30fps fails (sometimes helps)
                const backupStream = (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream();
                if (backupStream.getVideoTracks().length > 0) {
                    mediaStreamRef.current = backupStream;
                    console.log('✅ Fallback capture succeeded');
                }
            }

            // Cleanup: Mark all existing active streams from this host as inactive
            const p2pRef = collection(db, 'rooms', roomId, 'p2pStreams');
            const existingStreams = await getDocs(query(
                p2pRef,
                where('status', '==', 'active')
            ));

            const cleanupPromises = existingStreams.docs.map(async (docSnapshot) => {
                try {
                    await updateDoc(doc(db, 'rooms', roomId, 'p2pStreams', docSnapshot.id), {
                        status: 'inactive'
                    });
                    console.log('🧹 Cleaned up old stream:', docSnapshot.id);
                } catch (e) {
                    console.warn('⚠️ Failed to cleanup stream:', docSnapshot.id);
                }
            });
            await Promise.all(cleanupPromises);

            // Create new P2P stream document
            const p2pDoc = await addDoc(p2pRef, {
                hostId: userId,
                fileName: file?.name || media.title,
                fileType: file?.type || 'video',
                status: 'active',
                createdAt: serverTimestamp(),
            });
            p2pDocIdRef.current = p2pDoc.id;
            console.log('📺 Created new P2P stream:', p2pDoc.id);

            // Listen for viewer connection requests
            const requestsRef = collection(db, 'rooms', roomId, 'p2pStreams', p2pDoc.id, 'requests');
            const unsubscribe = onSnapshot(requestsRef, async (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added') {
                        const data = change.doc.data() as { offer: RTCSessionDescriptionInit; viewerId: string; type: string; status: string };
                        if (data.type === 'offer' && data.status === 'pending') {
                            await handleViewerOffer(p2pDoc.id, change.doc.id, data);
                        }
                    }
                }
            });
            unsubscribesRef.current.push(unsubscribe);

            console.log('✅ P2P broadcast ready, doc:', p2pDoc.id);
        } catch (e) {
            console.error('Failed to start P2P broadcast:', e);
            setHasError(true);
            setErrorMessage('Failed to start P2P streaming');
        }
    }, [roomId, userId, file, media.title]);

    // Host: Handle incoming viewer connection
    const handleViewerOffer = useCallback(async (
        p2pDocId: string,
        requestId: string,
        data: { offer: RTCSessionDescriptionInit; viewerId: string }
    ) => {
        const db = getDb();
        const stream = mediaStreamRef.current;
        if (!db || !stream) return;

        try {
            console.log('📞 Viewer connecting:', data.viewerId);

            const pc = new RTCPeerConnection(servers);
            peerConnectionsRef.current.set(requestId, pc);

            // Add tracks to send to viewer
            if (!stream) {
                console.error('❌ No stream available to send to viewer', data.viewerId);
                return;
            }

            const videoTracks = stream.getVideoTracks();
            console.log(`🎥 Adding ${videoTracks.length} video tracks to connection for ${data.viewerId}`);

            // Add tracks to send to viewer
            stream.getTracks().forEach(track => {
                console.log(`   - Adding track: ${track.kind} (${track.id}) enabled:${track.enabled} muted:${track.muted}`);
                pc.addTrack(track, stream);
            });

            // Optimize transceiver for video quality
            const transceiver = pc.getTransceivers().find(t => t.sender.track?.kind === 'video');
            if (transceiver && transceiver.sender) {
                const params = transceiver.sender.getParameters();
                if (!params.encodings) {
                    params.encodings = [{}];
                }
                params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps cap
                params.encodings[0].networkPriority = 'high';
                transceiver.sender.setParameters(params).catch(console.error);
            }

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    const candidatesRef = collection(
                        db, 'rooms', roomId, 'p2pStreams', p2pDocId,
                        'requests', requestId, 'hostCandidates'
                    );
                    await addDoc(candidatesRef, event.candidate.toJSON());
                }
            };

            // Set remote description (viewer's offer)
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

            // Create answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send answer to viewer
            const requestRef = doc(
                db, 'rooms', roomId, 'p2pStreams', p2pDocId, 'requests', requestId
            );
            await updateDoc(requestRef, {
                answer: { type: answer.type, sdp: answer.sdp },
                status: 'answered',
            });

            // Listen for viewer's ICE candidates
            const viewerCandidatesRef = collection(
                db, 'rooms', roomId, 'p2pStreams', p2pDocId,
                'requests', requestId, 'viewerCandidates'
            );
            const unsubCandidate = onSnapshot(viewerCandidatesRef, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate).catch(console.error);
                    }
                });
            });
            unsubscribesRef.current.push(unsubCandidate);

            // Viewer connected state
            pc.onconnectionstatechange = () => {
                console.log(`Viewer ${data.viewerId} connection state:`, pc.connectionState);
                if (pc.connectionState === 'connected') {
                    setViewerCount(prev => prev + 1);

                    // Auto-start playback on first viewer connection
                    const video = localVideoRef.current;
                    if (video && video.paused) {
                        console.log('👥 First viewer connected, starting playback...');
                        video.play().then(() => setIsPlaying(true)).catch(console.error);
                    }
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    setViewerCount(prev => Math.max(0, prev - 1));
                    pc.close();
                    peerConnectionsRef.current.delete(requestId);
                }
            };

        } catch (e) {
            console.error('Error handling viewer offer:', e);
        }
    }, [roomId]);



    const isConnectingRef = useRef(false);

    const connectToP2PStream = useCallback(async () => {
        if (isConnectingRef.current) return;
        const db = getDb();
        if (!db) return;

        isConnectingRef.current = true;
        setIsLoading(true);
        setErrorMessage('Connecting to host...');

        try {
            // Find the NEWEST active P2P stream for this room (avoid stale streams)
            const p2pRef = collection(db, 'rooms', roomId, 'p2pStreams');
            const q = query(
                p2pRef,
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log('❌ No active P2P stream found');
                setHasError(true);
                setErrorMessage('No active P2P stream found');
                setIsLoading(false);
                isConnectingRef.current = false;
                return;
            }

            const p2pDoc = snapshot.docs[0];
            const p2pDocId = p2pDoc.id;
            const p2pData = p2pDoc.data();
            console.log('🔗 Found P2P stream:', p2pDocId, 'created:', p2pData.createdAt?.toDate?.());

            // Create peer connection
            const pc = new RTCPeerConnection(servers);
            const remoteStream = new MediaStream();
            viewerStreamRef.current = remoteStream; // Store ref for re-attaching

            pc.ontrack = (event) => {
                console.log('📥 Received track:', event.track.kind);
                event.streams[0].getTracks().forEach(track => {
                    remoteStream.addTrack(track);
                });

                // Attach to video element
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    // Always start muted to allow autoplay
                    remoteVideoRef.current.muted = true;
                    remoteVideoRef.current.play().then(() => {
                        setIsLoading(false);
                        setIsPlaying(true);
                        setStreamConnected(true);
                        console.log('✅ P2P stream connected!');
                    }).catch(e => {
                        console.log('Autoplay blocked, user needs to click to unmute');
                        // Still mark as connected so the video element displays
                        setIsLoading(false);
                        setStreamConnected(true);
                        setIsPlaying(false); // Paused until user clicks
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                console.log('Viewer connection state:', pc.connectionState);
                if (pc.connectionState === 'failed') {
                    setHasError(true);
                    setErrorMessage('Connection to host failed');
                }
            };

            // Create offer
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Send offer to host
            const requestsRef = collection(
                db, 'rooms', roomId, 'p2pStreams', p2pDocId, 'requests'
            );
            let requestDoc;
            try {
                requestDoc = await addDoc(requestsRef, {
                    viewerId: userId,
                    offer: { type: offer.type, sdp: offer.sdp },
                    type: 'offer',
                    status: 'pending',
                    createdAt: serverTimestamp(),
                });
                console.log('📨 Sent connection request:', requestDoc.id);
            } catch (signalError) {
                console.error('❌ Signaling failed (ad blocker?):', signalError);
                setHasError(true);
                setErrorMessage('Connection blocked. Disable ad blocker and refresh.');
                setIsLoading(false);
                isConnectingRef.current = false;
                return;
            }

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    const candidatesRef = collection(
                        db, 'rooms', roomId, 'p2pStreams', p2pDocId,
                        'requests', requestDoc.id, 'viewerCandidates'
                    );
                    await addDoc(candidatesRef, event.candidate.toJSON());
                }
            };

            // Listen for host's answer
            const requestRef = doc(
                db, 'rooms', roomId, 'p2pStreams', p2pDocId,
                'requests', requestDoc.id
            );
            const unsubAnswer = onSnapshot(requestRef, async (snapshot) => {
                const data = snapshot.data();
                if (data?.answer && pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    console.log('📝 Set remote answer');
                }
            });
            unsubscribesRef.current.push(unsubAnswer);

            // Listen for host's ICE candidates
            const hostCandidatesRef = collection(
                db, 'rooms', roomId, 'p2pStreams', p2pDocId,
                'requests', requestDoc.id, 'hostCandidates'
            );
            const unsubCandidates = onSnapshot(hostCandidatesRef, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate).catch(console.error);
                    }
                });
            });
            unsubscribesRef.current.push(unsubCandidates);

            peerConnectionsRef.current.set('viewer', pc);

            // Mark as successfully connected (allow reconnection if needed later)
            // Keep isConnectingRef true to prevent duplicate connections during this session

        } catch (e) {
            console.error('Failed to connect to P2P stream:', e);
            setHasError(true);
            setErrorMessage('Failed to connect to P2P stream');
            setIsLoading(false);
            isConnectingRef.current = false;
        }
    }, [roomId, userId]); // Removed isMuted dependency

    // Trigger connection for viewer - only run once on mount
    useEffect(() => {
        if (!isHost && roomId && userId) {
            connectToP2PStream();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHost, roomId, userId]); // Intentionally excluding connectToP2PStream to prevent re-runs

    // Toggle mute
    const toggleMute = useCallback(() => {
        const video = isHost ? localVideoRef.current : remoteVideoRef.current;
        if (video) {
            video.muted = !video.muted;
            setIsMuted(video.muted);
            if (!video.muted) {
                video.play().catch(console.error);
            }
        }
    }, [isHost]);

    // Toggle play/pause (host only)
    const togglePlayPause = useCallback(() => {
        if (!isHost) return;
        const video = localVideoRef.current;
        if (video) {
            if (video.paused) {
                video.play();
                setIsPlaying(true);
            } else {
                video.pause();
                setIsPlaying(false);
            }
        }
    }, [isHost]);

    // Cleanup
    useEffect(() => {
        return () => {
            // Close all peer connections
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();

            // Unsubscribe from all listeners
            unsubscribesRef.current.forEach(unsub => unsub());

            // Delete P2P stream doc if host
            if (isHost && p2pDocIdRef.current) { // Only if not navigating away unexpectedly logic - actually just always cleanup
                // Note: Ideally we want to keep stream if just expanding, but simple cleanup for now
            }
            if (isHost && p2pDocIdRef.current) {
                const db = getDb();
                if (db) {
                    deleteDoc(doc(db, 'rooms', roomId, 'p2pStreams', p2pDocIdRef.current))
                        .catch(console.error);
                }
            }
        };
    }, [roomId]); // Removed isHost dependency so it cleans up when component unmounts regardless, but checked inside

    // Handle stop
    const handleStop = useCallback(() => {
        // Cleanup happens in useEffect
        onStop();
    }, [onStop]);

    return (
        <div className="p-2 border-b shrink-0">
            <Card className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
                {/* Status banner */}
                {isLoading && (
                    <div className="mb-3 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 py-2 px-3 rounded-md flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                            {isHost ? 'Starting P2P stream...' : errorMessage || 'Connecting to host...'}
                        </span>
                    </div>
                )}

                {hasError && (
                    <div className="mb-3 bg-destructive/20 text-destructive py-2 px-3 rounded-md">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{errorMessage}</span>
                        </div>
                    </div>
                )}

                {streamConnected && !isHost && isMuted && !isExpanded && (
                    <div
                        className="mb-3 bg-primary/20 text-primary py-2 px-3 rounded-md flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/30"
                        onClick={toggleMute}
                    >
                        <VolumeX className="w-4 h-4" />
                        <span className="font-medium">Click to enable audio</span>
                        <Volume2 className="w-4 h-4" />
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {/* Persistent Video Container */}
                    <div
                        className={cn(
                            "transition-all duration-300 ease-in-out",
                            isExpanded
                                ? "fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
                                : "relative w-32 h-20 md:w-64 md:h-36 lg:w-80 lg:h-44 rounded-md overflow-hidden bg-black shrink-0 cursor-pointer group"
                        )}
                        onClick={() => !isExpanded && setIsExpanded(true)}
                    >
                        {/* Close button (Expanded only) */}
                        {isExpanded && (
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        )}

                        {/* Video Element (Persistent) */}
                        {isHost ? (
                            <video
                                ref={localVideoRef}
                                className={cn(
                                    "transition-all",
                                    isExpanded ? "max-w-full max-h-full rounded-none" : "w-full h-full object-cover"
                                )}
                                muted
                                playsInline
                                controls={false}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                            />
                        ) : (
                            <video
                                ref={remoteVideoRef}
                                className={cn(
                                    "transition-all",
                                    isExpanded ? "max-w-full max-h-full rounded-none" : "w-full h-full object-cover"
                                )}
                                muted={isMuted}
                                playsInline
                            />
                        )}

                        {/* Playing Dot (Compact) */}
                        {!isExpanded && isPlaying && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}

                        {/* Hover Overlay (Compact) */}
                        {!isExpanded && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-6 h-6 text-white" />
                            </div>
                        )}

                        {/* Expanded Controls Overlay */}
                        {isExpanded && (
                            <>
                                {/* Unmute prompt */}
                                {isMuted && (
                                    <div
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
                                        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                    >
                                        <Volume2 className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                                        <p className="text-lg font-bold">Click to Enable Audio</p>
                                        <p className="text-sm text-gray-400">Browser requires interaction</p>
                                    </div>
                                )}

                                <div className="absolute bottom-0 left-0 right-0 p-8 pb-16 md:pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center justify-center gap-6" onClick={(e) => e.stopPropagation()}>
                                    {/* Progress Bar (Host Only) */}
                                    {isHost && (
                                        <div className="w-full max-w-4xl flex items-center gap-3 text-white">
                                            <span className="text-sm font-mono w-12">{formatTime(currentTime)}</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={duration || 100}
                                                value={currentTime}
                                                onChange={handleSeek}
                                                className="flex-1 h-2 bg-gray-600 rounded-full appearance-none cursor-pointer accent-primary"
                                            />
                                            <span className="text-sm font-mono w-12">{formatTime(duration)}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-6">
                                        {isHost && (
                                            <Button
                                                variant="secondary"
                                                size="lg"
                                                className="rounded-full w-14 h-14 p-0 shadow-xl hover:scale-105 transition-transform"
                                                onClick={togglePlayPause}
                                            >
                                                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                                            </Button>
                                        )}

                                        <Button
                                            variant={isMuted ? "destructive" : "secondary"}
                                            size="icon"
                                            className="rounded-full w-12 h-12 shadow-xl"
                                            onClick={toggleMute}
                                        >
                                            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                        </Button>

                                        <div className="text-white ml-2">
                                            <p className="font-bold text-lg">{media.title}</p>
                                            <p className="text-sm opacity-80">
                                                {isHost ? `Broadcasting to ${viewerCount} viewers` : 'Live P2P Stream'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Placeholder for layout stability when expanded */}
                    {isExpanded && <div className="w-32 h-20 shrink-0" />}

                    {/* Info (Compact) */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                            <Radio className="w-4 h-4" />
                            <span>P2P Streaming</span>
                            {isHost ? (
                                <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                                    <Crown className="w-3 h-3" />
                                    Host
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                                    <Wifi className="w-3 h-3" />
                                    Connected
                                </span>
                            )}
                        </div>
                        <p className="font-bold truncate mt-1">{media.title}</p>
                        <p className="text-sm text-muted-foreground">
                            {isHost ? `${viewerCount} viewer${viewerCount !== 1 ? 's' : ''} connected` : 'From device'}
                        </p>
                    </div>

                    {/* Controls (Compact) */}
                    <div className="flex items-center gap-1 shrink-0">
                        {isHost && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={togglePlayPause}
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </Button>
                        )}
                        <Button
                            variant={isMuted ? "destructive" : "ghost"}
                            size="icon"
                            onClick={toggleMute}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsExpanded(true)}
                        >
                            <Maximize2 className="w-5 h-5" />
                        </Button>
                        {isHost && (
                            <Button variant="ghost" size="icon" onClick={handleStop}>
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
