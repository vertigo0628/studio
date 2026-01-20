"use client";

import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Radio, FileVideo, FileAudio, Play, Users, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

type P2PStreamHostProps = {
    onStartStream: (file: File) => void;
    roomId?: string;
    disabled?: boolean;
};

export function P2PStreamHost({ onStartStream, roomId, disabled }: P2PStreamHostProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleStartStream = () => {
        if (selectedFile) {
            setIsStreaming(true);
            onStartStream(selectedFile);
        }
    };

    const isVideo = selectedFile?.type.startsWith('video/');

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isStreaming}
            />

            {/* File selection */}
            {!selectedFile && (
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                        "hover:border-primary hover:bg-primary/5",
                        "bg-gradient-to-br from-purple-500/5 to-pink-500/5",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                >
                    <Radio className="w-10 h-10 mx-auto mb-3 text-purple-500" />
                    <p className="font-medium">Select a file to stream</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Any size • Streams directly from your device
                    </p>
                </div>
            )}

            {/* Selected file preview */}
            {selectedFile && !isStreaming && (
                <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                    <div className="flex items-center gap-3">
                        {isVideo ? (
                            <FileVideo className="w-10 h-10 text-blue-500" />
                        ) : (
                            <FileAudio className="w-10 h-10 text-purple-500" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatFileSize(selectedFile.size)} • {isVideo ? 'Video' : 'Audio'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 p-3 rounded bg-muted/50 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 mb-2">
                            <Wifi className="w-4 h-4 text-green-500" />
                            <span className="font-medium">How P2P Streaming Works</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1">
                            <li>File stays on your device (not uploaded)</li>
                            <li>Viewers receive stream via WebRTC</li>
                            <li>Works with any file size</li>
                            <li>Requires keeping this tab open</li>
                        </ul>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedFile(null)}
                            className="flex-1"
                        >
                            Change File
                        </Button>
                        <Button
                            onClick={handleStartStream}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Start Streaming
                        </Button>
                    </div>
                </div>
            )}

            {/* Streaming state */}
            {isStreaming && (
                <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Radio className="w-8 h-8 text-green-500" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-green-700 dark:text-green-400">Streaming Live</p>
                            <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>0 viewers</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Info note */}
            <p className="text-xs text-center text-muted-foreground">
                P2P streaming uses your internet connection to share media directly with viewers.
                <br />
                Connection quality depends on your upload speed.
            </p>
        </div>
    );
}
