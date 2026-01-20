"use client";

import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Upload, Pause, Play, X, CheckCircle, AlertCircle, FileVideo, FileAudio } from 'lucide-react';
import { useTusUpload, formatBytes, formatTime } from '@/hooks/use-tus-upload';
import { cn } from '@/lib/utils';

type TusUploaderProps = {
    onUploadComplete: (url: string, filename: string, type: 'audio' | 'video') => void;
    accept?: string;
    disabled?: boolean;
};

export function TusUploader({ onUploadComplete, accept = "audio/*,video/*", disabled }: TusUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const { state, progress, error, publicUrl, upload, pause, resume, cancel, reset } = useTusUpload();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const result = await upload(selectedFile);
        if (result) {
            const type = selectedFile.type.startsWith('audio/') ? 'audio' : 'video';
            onUploadComplete(result.url, selectedFile.name, type);
        }
    };

    const handleCancel = () => {
        cancel();
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleReset = () => {
        reset();
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const isVideo = selectedFile?.type.startsWith('video/');

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || state === 'uploading'}
            />

            {/* File selection */}
            {!selectedFile && state !== 'complete' && (
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                        "hover:border-primary hover:bg-primary/5",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                >
                    <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">Click to select a file</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Supports video and audio files
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Files under 50MB upload instantly • Larger files use resumable upload
                    </p>
                </div>
            )}

            {/* Selected file preview */}
            {selectedFile && state === 'idle' && (
                <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        {isVideo ? (
                            <FileVideo className="w-10 h-10 text-blue-500" />
                        ) : (
                            <FileAudio className="w-10 h-10 text-purple-500" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatBytes(selectedFile.size)} • {isVideo ? 'Video' : 'Audio'}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleCancel}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <Button onClick={handleUpload} className="flex-1">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload & Share
                        </Button>
                    </div>
                </div>
            )}

            {/* Upload progress */}
            {(state === 'uploading' || state === 'paused') && selectedFile && (
                <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        {isVideo ? (
                            <FileVideo className="w-8 h-8 text-blue-500" />
                        ) : (
                            <FileAudio className="w-8 h-8 text-purple-500" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.bytesTotal)}
                            </p>
                        </div>
                        <span className="text-sm font-mono font-medium">
                            {progress.percentage.toFixed(0)}%
                        </span>
                    </div>

                    <Progress value={progress.percentage} className="h-2" />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            {state === 'paused' ? 'Paused' : `${formatBytes(progress.speed)}/s`}
                        </span>
                        <span>
                            {state === 'paused' ? '' : `${formatTime(progress.remainingTime)} remaining`}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {state === 'uploading' ? (
                            <Button variant="outline" size="sm" onClick={pause} className="flex-1">
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={resume} className="flex-1">
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={handleCancel}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Upload complete */}
            {state === 'complete' && (
                <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div className="flex-1">
                            <p className="font-medium text-green-700 dark:text-green-400">Upload Complete!</p>
                            <p className="text-sm text-muted-foreground">Ready to share with the room</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            Upload Another
                        </Button>
                    </div>
                </div>
            )}

            {/* Error state */}
            {state === 'error' && (
                <div className="border border-destructive/30 bg-destructive/10 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                        <div className="flex-1">
                            <p className="font-medium text-destructive">Upload Failed</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            Try Again
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
