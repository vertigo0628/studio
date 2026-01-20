"use client";

import { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
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
    const [isRemoteMuted, setIsRemoteMuted] = useState(false);
    const [audioStarted, setAudioStarted] = useState(false);

    // Attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote stream to video/audio elements
    useEffect(() => {
        if (remoteStream) {
            // Attach to video element
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
                // Try to play (may be blocked by autoplay policy)
                remoteVideoRef.current.play().catch(e => {
                    console.log('Video autoplay blocked, user interaction needed');
                });
            }
            // Attach to separate audio element for better audio handling
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStream;
                remoteAudioRef.current.play().catch(e => {
                    console.log('Audio autoplay blocked, user interaction needed');
                });
            }
        }
    }, [remoteStream]);

    // Function to manually start audio (for browsers that block autoplay)
    const startAudio = () => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.play().catch(console.error);
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.play().catch(console.error);
        }
        setAudioStarted(true);
    };

    // Toggle mute (local microphone)
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

    // Toggle remote audio (speaker)
    const toggleRemoteAudio = () => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
        }
        setIsRemoteMuted(!isRemoteMuted);
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
                            Incoming {incomingCall.type} call...
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
                            onClick={onAnswer}
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
                        {callType === 'video' ? (
                            <Video className="w-16 h-16 text-primary animate-pulse" />
                        ) : (
                            <Phone className="w-16 h-16 text-primary animate-pulse" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Calling...</h2>
                        <p className="text-muted-foreground">Waiting for answer</p>
                    </div>
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
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Hidden audio element for better audio playback */}
            <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                style={{ display: 'none' }}
            />

            {/* Click to enable audio overlay (if blocked by autoplay) */}
            {!audioStarted && remoteStream && (
                <div
                    className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center cursor-pointer"
                    onClick={startAudio}
                >
                    <div className="text-center text-white p-6 bg-black/80 rounded-xl">
                        <Volume2 className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                        <p className="text-xl font-bold">Click to enable audio</p>
                        <p className="text-muted-foreground text-sm mt-2">Browser requires interaction to play sound</p>
                    </div>
                </div>
            )}

            {/* Remote Video (large) */}
            {callType === 'video' || callType === 'screen' ? (
                <div className="flex-1 relative" onClick={startAudio}>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {/* Local Video (small overlay) */}
                    <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border-2 border-white shadow-lg">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            ) : (
                // Audio call - show avatar
                <div className="flex-1 flex items-center justify-center" onClick={startAudio}>
                    <div className="text-center text-white">
                        <div className="w-32 h-32 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <Phone className="w-16 h-16 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">Audio Call</h2>
                        <p className="text-green-500 font-medium">Connected</p>
                        <p className="text-muted-foreground text-sm mt-2">
                            {audioStarted ? "Audio playing" : "Tap to enable audio"}
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
                    variant={isRemoteMuted ? "destructive" : "secondary"}
                    className="rounded-full w-14 h-14"
                    onClick={toggleRemoteAudio}
                    title={isRemoteMuted ? "Unmute speaker" : "Mute speaker"}
                >
                    {isRemoteMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </Button>

                {(callType === 'video' || callType === 'screen') && (
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
