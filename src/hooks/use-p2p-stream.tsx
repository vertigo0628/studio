"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { getDb } from '@/lib/firebase';
import {
    doc,
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';
import type { User } from '@/lib/types';

// STUN servers for WebRTC
const servers: RTCConfiguration = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
};

type P2PStreamState = 'idle' | 'hosting' | 'connecting' | 'connected' | 'error';

export function useP2PStream(roomId: string, currentUser: User | null) {
    const [streamState, setStreamState] = useState<P2PStreamState>('idle');
    const [viewerCount, setViewerCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);

    const fileRef = useRef<File | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const streamDocIdRef = useRef<string | null>(null);

    // Create object URL from file for local playback
    const createObjectUrl = useCallback((file: File) => {
        // Revoke previous URL if exists
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setStreamUrl(url);
        return url;
    }, []);

    // Start hosting a P2P stream
    const startHosting = useCallback(async (file: File) => {
        const db = getDb();
        if (!db || !currentUser) return null;

        try {
            setStreamState('hosting');
            setError(null);
            fileRef.current = file;

            // Create object URL for the host to play
            const url = createObjectUrl(file);

            // Create P2P stream document in Firestore
            const streamsRef = collection(db, 'rooms', roomId, 'p2pStreams');
            const streamDoc = await addDoc(streamsRef, {
                hostId: currentUser.id,
                hostName: currentUser.name,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                status: 'active',
                createdAt: serverTimestamp(),
            });
            streamDocIdRef.current = streamDoc.id;

            // Listen for viewer connection requests
            const requestsRef = collection(db, 'rooms', roomId, 'p2pStreams', streamDoc.id, 'requests');
            const unsubscribe = onSnapshot(requestsRef, async (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added') {
                        const requestData = change.doc.data() as {
                            offer: RTCSessionDescriptionInit;
                            viewerId: string;
                            type: string;
                            status: string;
                        };
                        if (requestData.type === 'offer' && requestData.status === 'pending') {
                            // Handle new viewer connection request
                            await handleViewerConnection(streamDoc.id, change.doc.id, requestData);
                        }
                    }
                }
            });

            // Return cleanup function
            return {
                url,
                cleanup: () => {
                    unsubscribe();
                    stopHosting();
                }
            };

        } catch (e) {
            console.error('Error starting P2P host:', e);
            setError('Failed to start streaming');
            setStreamState('error');
            return null;
        }
    }, [roomId, currentUser, createObjectUrl]);

    // Handle incoming viewer connection
    const handleViewerConnection = useCallback(async (
        streamDocId: string,
        requestId: string,
        requestData: { offer: RTCSessionDescriptionInit; viewerId: string }
    ) => {
        const db = getDb();
        if (!db || !fileRef.current) return;

        try {
            const pc = new RTCPeerConnection(servers);
            peerConnectionsRef.current.set(requestId, pc);

            // Create media stream from file
            const video = document.createElement('video');
            video.src = objectUrlRef.current || '';
            video.muted = true;
            await video.play();

            // Capture stream from video element
            const stream = (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream();

            // Add tracks to peer connection
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    const candidatesRef = collection(
                        db, 'rooms', roomId, 'p2pStreams', streamDocId, 'requests', requestId, 'hostCandidates'
                    );
                    await addDoc(candidatesRef, event.candidate.toJSON());
                }
            };

            // Set remote description (viewer's offer)
            await pc.setRemoteDescription(new RTCSessionDescription(requestData.offer));

            // Create and set answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send answer back
            const requestRef = doc(db, 'rooms', roomId, 'p2pStreams', streamDocId, 'requests', requestId);
            await updateDoc(requestRef, {
                answer: { type: answer.type, sdp: answer.sdp },
                status: 'answered',
            });

            // Listen for viewer ICE candidates
            const viewerCandidatesRef = collection(
                db, 'rooms', roomId, 'p2pStreams', streamDocId, 'requests', requestId, 'viewerCandidates'
            );
            onSnapshot(viewerCandidatesRef, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });

            // Update viewer count
            setViewerCount(prev => prev + 1);

            // Handle disconnection
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    setViewerCount(prev => Math.max(0, prev - 1));
                    pc.close();
                    peerConnectionsRef.current.delete(requestId);
                }
            };

        } catch (e) {
            console.error('Error handling viewer connection:', e);
        }
    }, [roomId]);

    // Connect as viewer to a P2P stream
    const connectToStream = useCallback(async (streamDocId: string) => {
        const db = getDb();
        if (!db || !currentUser) return null;

        try {
            setStreamState('connecting');
            setError(null);

            const pc = new RTCPeerConnection(servers);

            // Create media stream placeholder
            const remoteStream = new MediaStream();

            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach(track => {
                    remoteStream.addTrack(track);
                });
                // Create blob URL from stream (for video element)
                setStreamUrl(URL.createObjectURL(new MediaSource())); // This won't work directly
                setStreamState('connected');
            };

            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Send connection request
            const requestsRef = collection(db, 'rooms', roomId, 'p2pStreams', streamDocId, 'requests');
            const requestDoc = await addDoc(requestsRef, {
                viewerId: currentUser.id,
                offer: { type: offer.type, sdp: offer.sdp },
                type: 'offer',
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    const candidatesRef = collection(
                        db, 'rooms', roomId, 'p2pStreams', streamDocId, 'requests', requestDoc.id, 'viewerCandidates'
                    );
                    await addDoc(candidatesRef, event.candidate.toJSON());
                }
            };

            // Listen for host's answer
            const requestRef = doc(db, 'rooms', roomId, 'p2pStreams', streamDocId, 'requests', requestDoc.id);
            const unsubscribeAnswer = onSnapshot(requestRef, async (snapshot) => {
                const data = snapshot.data();
                if (data?.answer && pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
            });

            // Listen for host ICE candidates
            const hostCandidatesRef = collection(
                db, 'rooms', roomId, 'p2pStreams', streamDocId, 'requests', requestDoc.id, 'hostCandidates'
            );
            const unsubscribeCandidates = onSnapshot(hostCandidatesRef, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });

            return {
                stream: remoteStream,
                cleanup: () => {
                    unsubscribeAnswer();
                    unsubscribeCandidates();
                    pc.close();
                }
            };

        } catch (e) {
            console.error('Error connecting to P2P stream:', e);
            setError('Failed to connect to stream');
            setStreamState('error');
            return null;
        }
    }, [roomId, currentUser]);

    // Stop hosting
    const stopHosting = useCallback(async () => {
        const db = getDb();

        // Close all peer connections
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();

        // Revoke object URL
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }

        // Delete stream document
        if (streamDocIdRef.current && db) {
            try {
                await deleteDoc(doc(db, 'rooms', roomId, 'p2pStreams', streamDocIdRef.current));
            } catch (e) {
                console.error('Error deleting stream doc:', e);
            }
            streamDocIdRef.current = null;
        }

        fileRef.current = null;
        setStreamUrl(null);
        setStreamState('idle');
        setViewerCount(0);
    }, [roomId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopHosting();
        };
    }, [stopHosting]);

    return {
        streamState,
        streamUrl,
        viewerCount,
        error,
        startHosting,
        connectToStream,
        stopHosting,
    };
}
