"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Monitor } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import type { Call } from '@/lib/types';

type CallScreenProps = {
    callState: 'calling' | 'ringing' | 'connected';
    callType: 'audio' | 'video' | 'screen';
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    incomingCall: Call | null;
    onAnswer: () => void;
    onDecline: () => void;
    onEndCall: () => void;
};

export default function CallScreen({
    callState,
    callType,
    localStream,
    remoteStream,
    incomingCall,
    onAnswer,
    onDecline,
    onEndCall,
}: CallScreenProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [hasRemoteAudio, setHasRemoteAudio] = useState(false);

    // Attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.muted = true; // Always mute local to prevent echo
            localVideoRef.current.play().catch(console.error);
        }
    }, [localStream]);

    // Attach remote stream and handle audio
    useEffect(() => {
        if (!remoteStream) return;

        console.log('Remote stream received:', {
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length,
        });

        // Check if we have audio
        setHasRemoteAudio(remoteStream.getAudioTracks().length > 0);

        // Attach to video element
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            // Start muted to allow autoplay, we'll unmute on user interaction
            remoteVideoRef.current.muted = !isAudioEnabled;
            remoteVideoRef.current.play().catch(e => {
                console.log('Remote video autoplay blocked:', e);
            });
        }

        // Attach to separate audio element for reliable audio playback
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.muted = !isAudioEnabled;
            remoteAudioRef.current.play().catch(e => {
                console.log('Remote audio autoplay blocked:', e);
            });
        }
    }, [remoteStream, isAudioEnabled]);

    // Enable audio on user interaction
    const enableAudio = useCallback(() => {
        setIsAudioEnabled(true);

        if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.play().catch(console.error);
        }

        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.play().catch(console.error);
        }
    }, []);

    // Toggle local microphone mute
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    // Toggle speaker (remote audio)
    const toggleSpeaker = () => {
        const newMuted = isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);

        if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = newMuted;
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = newMuted;
        }
    };

    // Ringing state - incoming call
    if (callState === 'ringing' && incomingCall) {
        return (
            <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white">
                <div className="text-center space-y-6">
                    <Avatar className="w-32 h-32 mx-auto border-4 border-primary animate-pulse">
                        <AvatarImage src={incomingCall.callerAvatar} />
                        <AvatarFallback className="text-4xl">{incomingCall.callerName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold">{incomingCall.callerName}</h2>
                        <p className="text-muted-foreground animate-pulse">
                            Incoming {incomingCall.type === 'screen' ? 'screen share' : incomingCall.type + ' call'}...
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <Button
                            size="lg"
                            variant="destructive"
                            className="rounded-full w-16 h-16"
                            onClick={onDecline}
                        >
                            <PhoneOff className="w-8 h-8" />
                        </Button>
                        <Button
                            size="lg"
                            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                                enableAudio(); // Enable audio when answering
                                onAnswer();
                            }}
                        >
                            <Phone className="w-8 h-8" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Calling state - waiting for answer
    if (callState === 'calling') {
        return (
            <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-white">
                <div className="text-center space-y-6">
                    <div className="w-32 h-32 mx-auto rounded-full bg-muted flex items-center justify-center">
                        {callType === 'screen' ? (
                            <Monitor className="w-16 h-16 text-primary animate-pulse" />
                        ) : callType === 'video' ? (
                            <Video className="w-16 h-16 text-primary animate-pulse" />
                        ) : (
                            <Phone className="w-16 h-16 text-primary animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">
                            {callType === 'screen' ? 'Starting Screen Share...' : 'Calling...'}
                        </h2>
                        <p className="text-muted-foreground">Waiting for others to join</p>
                    </div>
                    {/* Show local preview for screen share */}
                    {callType === 'screen' && localStream && (
                        <div className="w-80 aspect-video rounded-lg overflow-hidden border-2 border-primary mx-auto">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <Button
                        size="lg"
                        variant="destructive"
                        className="rounded-full w-16 h-16"
                        onClick={onEndCall}
                    >
                        <PhoneOff className="w-8 h-8" />
                    </Button>
                </div>
            </div>
        );
    }

    // Connected state - show video/audio feeds
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={!isAudioEnabled ? enableAudio : undefined}>
            {/* Hidden audio element for reliable audio playback */}
            <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                style={{ display: 'none' }}
            />

            {/* Click to enable audio prompt */}
            {!isAudioEnabled && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 animate-bounce cursor-pointer">
                    <Volume2 className="w-4 h-4" />
                    <span>Click anywhere to enable audio</span>
                </div>
            )}

            {/* No audio warning */}
            {isAudioEnabled && !hasRemoteAudio && callType === 'screen' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-yellow-500/80 text-black px-4 py-2 rounded-full flex items-center gap-2">
                    <VolumeX className="w-4 h-4" />
                    <span>Screen share has no audio (browser limitation)</span>
                </div>
            )}

            {/* Remote Video (large) */}
            {callType === 'video' || callType === 'screen' ? (
                <div className="flex-1 relative">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                    />
                    {/* Local Video (small overlay) - only for video calls */}
                    {callType === 'video' && (
                        <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border-2 border-white shadow-lg">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    {/* Screen share indicator */}
                    {callType === 'screen' && (
                        <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full flex items-center gap-2 text-white">
                            <Monitor className="w-4 h-4 text-red-500 animate-pulse" />
                            <span className="text-sm">Screen Share</span>
                        </div>
                    )}
                </div>
            ) : (
                // Audio call - show avatar
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-white">
                        <div className="w-32 h-32 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <Phone className="w-16 h-16 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">Audio Call</h2>
                        <p className={isAudioEnabled ? "text-green-500 font-medium" : "text-yellow-500"}>
                            {isAudioEnabled ? "Connected" : "Click to enable audio"}
                        </p>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="p-6 bg-black/80 flex items-center justify-center gap-4">
                <Button
                    size="lg"
                    variant={isMuted ? "destructive" : "secondary"}
                    className="rounded-full w-14 h-14"
                    onClick={toggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                <Button
                    size="lg"
                    variant={!isAudioEnabled ? "destructive" : "secondary"}
                    className="rounded-full w-14 h-14"
                    onClick={isAudioEnabled ? toggleSpeaker : enableAudio}
                    title={isAudioEnabled ? "Mute speaker" : "Enable audio"}
                >
                    {isAudioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </Button>

                {callType === 'video' && (
                    <Button
                        size="lg"
                        variant={isCameraOff ? "destructive" : "secondary"}
                        className="rounded-full w-14 h-14"
                        onClick={toggleCamera}
                        title={isCameraOff ? "Turn camera on" : "Turn camera off"}
                    >
                        {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </Button>
                )}

                <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-14 h-14"
                    onClick={onEndCall}
                    title="End call"
                >
                    <PhoneOff className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
}
