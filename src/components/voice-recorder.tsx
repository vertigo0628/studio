"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Square, Play, Trash2, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type VoiceRecorderProps = {
    onSendVoice: (audioBlob: Blob) => void;
    disabled?: boolean;
};

export function VoiceRecorder({ onSendVoice, disabled }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isSending, setIsSending] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const deleteRecording = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const sendRecording = async () => {
        if (audioBlob) {
            setIsSending(true);
            try {
                await onSendVoice(audioBlob);
                deleteRecording();
            } finally {
                setIsSending(false);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Recording state
    if (isRecording) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-full animate-pulse">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono text-red-500">{formatTime(recordingTime)}</span>
                <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-full h-8 w-8 p-0"
                    onClick={stopRecording}
                >
                    <Square className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    // Preview state
    if (audioUrl) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full">
                <audio src={audioUrl} controls className="h-8 max-w-[150px]" />
                <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full h-8 w-8 p-0 text-destructive"
                    onClick={deleteRecording}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    className="rounded-full h-8 w-8 p-0"
                    onClick={sendRecording}
                    disabled={isSending}
                >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
        );
    }

    // Default state - mic button
    return (
        <Button
            size="icon"
            variant="ghost"
            className={cn("rounded-full", disabled && "opacity-50")}
            onClick={startRecording}
            disabled={disabled}
            title="Record voice message"
        >
            <Mic className="w-5 h-5" />
        </Button>
    );
}
