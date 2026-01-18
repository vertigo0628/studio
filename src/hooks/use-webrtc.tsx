
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    onSnapshot,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import type { Call, User } from '@/lib/types';

// Free Google STUN servers
const servers: RTCConfiguration = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
};

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export function useWebRTC(roomId: string, currentUser: User | null) {
    const [callState, setCallState] = useState<CallState>('idle');
    const [incomingCall, setIncomingCall] = useState<Call | null>(null);
    const [callType, setCallType] = useState<'audio' | 'video' | 'screen'>('video');
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const callDocRef = useRef<string | null>(null);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    // Cleanup function
    const cleanup = useCallback(async () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        remoteStreamRef.current = null;
        setRemoteStream(null);

        // Delete call document
        if (callDocRef.current) {
            try {
                await deleteDoc(doc(db, 'rooms', roomId, 'calls', callDocRef.current));
            } catch (e) {
                console.error("Error deleting call doc:", e);
            }
            callDocRef.current = null;
        }

        setCallState('idle');
        setIncomingCall(null);
    }, [roomId]);

    // Start a call
    const startCall = useCallback(async (type: 'audio' | 'video') => {
        if (!currentUser) return;

        setCallType(type);
        setCallState('calling');

        try {
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);

            // Create peer connection
            const pc = new RTCPeerConnection(servers);
            peerConnectionRef.current = pc;

            // Add local tracks
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Handle remote stream
            const remote = new MediaStream();
            remoteStreamRef.current = remote;
            setRemoteStream(remote);

            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach(track => {
                    remote.addTrack(track);
                });
                setRemoteStream(new MediaStream(remote.getTracks())); // Trigger re-render
            };

            // Create call document
            const callsRef = collection(db, 'rooms', roomId, 'calls');
            const callDoc = await addDoc(callsRef, {
                callerId: currentUser.id,
                callerName: currentUser.name,
                callerAvatar: currentUser.avatar,
                type,
                status: 'ringing',
                createdAt: serverTimestamp(),
            });
            callDocRef.current = callDoc.id;

            // ICE candidates
            const offerCandidates = collection(db, 'rooms', roomId, 'calls', callDoc.id, 'offerCandidates');
            const answerCandidates = collection(db, 'rooms', roomId, 'calls', callDoc.id, 'answerCandidates');

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    addDoc(offerCandidates, event.candidate.toJSON());
                }
            };

            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await updateDoc(doc(db, 'rooms', roomId, 'calls', callDoc.id), {
                offer: { type: offer.type, sdp: offer.sdp },
            });

            // Listen for answer
            onSnapshot(doc(db, 'rooms', roomId, 'calls', callDoc.id), (snapshot) => {
                const data = snapshot.data();
                if (data?.answer && !pc.currentRemoteDescription) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    pc.setRemoteDescription(answerDescription);
                    setCallState('connected');
                }
                if (data?.status === 'ended') {
                    cleanup();
                }
            });

            // Listen for answer ICE candidates
            onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });

        } catch (error) {
            console.error("Error starting call:", error);
            cleanup();
        }
    }, [roomId, currentUser, cleanup]);

    // Answer a call
    const answerCall = useCallback(async () => {
        if (!incomingCall || !currentUser) return;

        setCallState('connected');
        setCallType(incomingCall.type);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: incomingCall.type === 'video',
                audio: true,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);

            const pc = new RTCPeerConnection(servers);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            const remote = new MediaStream();
            remoteStreamRef.current = remote;
            setRemoteStream(remote);

            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach(track => {
                    remote.addTrack(track);
                });
                setRemoteStream(new MediaStream(remote.getTracks()));
            };

            const callDoc = doc(db, 'rooms', roomId, 'calls', incomingCall.id);
            callDocRef.current = incomingCall.id;

            const offerCandidates = collection(db, 'rooms', roomId, 'calls', incomingCall.id, 'offerCandidates');
            const answerCandidates = collection(db, 'rooms', roomId, 'calls', incomingCall.id, 'answerCandidates');

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    addDoc(answerCandidates, event.candidate.toJSON());
                }
            };

            // Get offer from Firestore
            const callData = (await getDocs(query(collection(db, 'rooms', roomId, 'calls'), where('__name__', '==', incomingCall.id)))).docs[0]?.data();

            if (callData?.offer) {
                await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await updateDoc(callDoc, {
                    answer: { type: answer.type, sdp: answer.sdp },
                    status: 'connected',
                });
            }

            // Listen for offer ICE candidates
            onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });

            setIncomingCall(null);

        } catch (error) {
            console.error("Error answering call:", error);
            cleanup();
        }
    }, [roomId, currentUser, incomingCall, cleanup]);

    // End call
    const endCall = useCallback(async () => {
        if (callDocRef.current) {
            try {
                await updateDoc(doc(db, 'rooms', roomId, 'calls', callDocRef.current), {
                    status: 'ended',
                });
            } catch (e) {
                console.error("Error ending call:", e);
            }
        }
        cleanup();
    }, [roomId, cleanup]);

    // Decline incoming call
    const declineCall = useCallback(async () => {
        if (incomingCall) {
            try {
                await updateDoc(doc(db, 'rooms', roomId, 'calls', incomingCall.id), {
                    status: 'ended',
                });
            } catch (e) {
                console.error("Error declining call:", e);
            }
        }
        setIncomingCall(null);
    }, [roomId, incomingCall]);

    // Start screen sharing
    const startScreenShare = useCallback(async () => {
        if (!currentUser) return;

        setCallType('screen');
        setCallState('calling');
        setIsScreenSharing(true);

        try {
            // Get screen media
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);

            // Handle when user stops sharing via browser UI
            stream.getVideoTracks()[0].onended = () => {
                cleanup();
            };

            // Create peer connection
            const pc = new RTCPeerConnection(servers);
            peerConnectionRef.current = pc;

            // Add local tracks
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Handle remote stream
            const remote = new MediaStream();
            remoteStreamRef.current = remote;
            setRemoteStream(remote);

            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach(track => {
                    remote.addTrack(track);
                });
                setRemoteStream(new MediaStream(remote.getTracks()));
            };

            // Create call document for screen share
            const callsRef = collection(db, 'rooms', roomId, 'calls');
            const callDoc = await addDoc(callsRef, {
                callerId: currentUser.id,
                callerName: currentUser.name,
                callerAvatar: currentUser.avatar,
                type: 'screen',
                status: 'ringing',
                createdAt: serverTimestamp(),
            });
            callDocRef.current = callDoc.id;

            // ICE candidates
            const offerCandidates = collection(db, 'rooms', roomId, 'calls', callDoc.id, 'offerCandidates');
            const answerCandidates = collection(db, 'rooms', roomId, 'calls', callDoc.id, 'answerCandidates');

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    addDoc(offerCandidates, event.candidate.toJSON());
                }
            };

            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await updateDoc(doc(db, 'rooms', roomId, 'calls', callDoc.id), {
                offer: { type: offer.type, sdp: offer.sdp },
            });

            // Listen for answer
            onSnapshot(doc(db, 'rooms', roomId, 'calls', callDoc.id), (snapshot) => {
                const data = snapshot.data();
                if (data?.answer && !pc.currentRemoteDescription) {
                    const answerDescription = new RTCSessionDescription(data.answer);
                    pc.setRemoteDescription(answerDescription);
                    setCallState('connected');
                }
                if (data?.status === 'ended') {
                    cleanup();
                }
            });

            // Listen for answer ICE candidates
            onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate);
                    }
                });
            });

        } catch (error) {
            console.error("Error starting screen share:", error);
            setIsScreenSharing(false);
            cleanup();
        }
    }, [roomId, currentUser, cleanup]);

    // Listen for incoming calls
    useEffect(() => {
        if (!currentUser || !roomId) return;

        const callsRef = collection(db, 'rooms', roomId, 'calls');

        const unsubscribe = onSnapshot(callsRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();

                if (change.type === 'added' && data.status === 'ringing' && data.callerId !== currentUser.id) {
                    setIncomingCall({
                        id: change.doc.id,
                        callerId: data.callerId,
                        callerName: data.callerName,
                        callerAvatar: data.callerAvatar,
                        type: data.type,
                        status: data.status,
                    });
                    setCallState('ringing');
                }

                if (change.type === 'modified' && data.status === 'ended') {
                    if (incomingCall?.id === change.doc.id || callDocRef.current === change.doc.id) {
                        cleanup();
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [roomId, currentUser, cleanup, incomingCall]);

    return {
        callState,
        callType,
        localStream,
        remoteStream,
        incomingCall,
        isScreenSharing,
        startCall,
        answerCall,
        endCall,
        declineCall,
        startScreenShare,
    };
}
