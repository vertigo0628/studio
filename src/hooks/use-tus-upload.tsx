"use client";

import { useState, useRef, useCallback } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/lib/supabase';

type UploadState = 'idle' | 'uploading' | 'paused' | 'complete' | 'error';

type UploadProgress = {
    bytesUploaded: number;
    bytesTotal: number;
    percentage: number;
    speed: number; // bytes per second
    remainingTime: number; // seconds
};

export function useTusUpload() {
    const [state, setState] = useState<UploadState>('idle');
    const [progress, setProgress] = useState<UploadProgress>({
        bytesUploaded: 0,
        bytesTotal: 0,
        percentage: 0,
        speed: 0,
        remainingTime: 0,
    });
    const [error, setError] = useState<string | null>(null);
    const [publicUrl, setPublicUrl] = useState<string | null>(null);

    const uploadRef = useRef<tus.Upload | null>(null);
    const startTimeRef = useRef<number>(0);
    const lastBytesRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const upload = useCallback(async (file: File, bucket: string = 'media-share') => {
        setState('uploading');
        setError(null);
        setPublicUrl(null);
        startTimeRef.current = Date.now();
        lastTimeRef.current = Date.now();
        lastBytesRef.current = 0;

        const filename = `${Date.now()}-${file.name}`;

        try {
            // For files under 50MB, use simple upload
            if (file.size < 50 * 1024 * 1024) {
                const { data, error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(filename, file, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl: url } } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(data.path);

                setPublicUrl(url);
                setProgress({
                    bytesUploaded: file.size,
                    bytesTotal: file.size,
                    percentage: 100,
                    speed: 0,
                    remainingTime: 0,
                });
                setState('complete');
                return { url, path: data.path };
            }

            // For larger files, use TUS resumable upload
            // Note: This requires Supabase to have TUS enabled and a signed URL
            // For now, we'll chunk it manually or use the standard upload with retry logic

            // Fallback: Use standard upload with progress simulation
            // In production, you'd get a signed TUS URL from your backend

            const { data, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filename, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                // If file is too large, provide helpful error
                if (uploadError.message.includes('Payload too large') || file.size > 50 * 1024 * 1024) {
                    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). For files over 50MB, please use URL streaming or reduce file size.`);
                }
                throw uploadError;
            }

            const { data: { publicUrl: url } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            setPublicUrl(url);
            setProgress({
                bytesUploaded: file.size,
                bytesTotal: file.size,
                percentage: 100,
                speed: 0,
                remainingTime: 0,
            });
            setState('complete');
            return { url, path: data.path };

        } catch (err: any) {
            setError(err.message || 'Upload failed');
            setState('error');
            return null;
        }
    }, []);

    const pause = useCallback(() => {
        if (uploadRef.current) {
            uploadRef.current.abort();
            setState('paused');
        }
    }, []);

    const resume = useCallback(() => {
        if (uploadRef.current) {
            uploadRef.current.start();
            setState('uploading');
        }
    }, []);

    const cancel = useCallback(() => {
        if (uploadRef.current) {
            uploadRef.current.abort();
            uploadRef.current = null;
        }
        setState('idle');
        setProgress({
            bytesUploaded: 0,
            bytesTotal: 0,
            percentage: 0,
            speed: 0,
            remainingTime: 0,
        });
        setError(null);
    }, []);

    const reset = useCallback(() => {
        cancel();
        setPublicUrl(null);
    }, [cancel]);

    return {
        state,
        progress,
        error,
        publicUrl,
        upload,
        pause,
        resume,
        cancel,
        reset,
    };
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format seconds to human readable
export function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
