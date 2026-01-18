"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Maximize2, ExternalLink, FileText, Music, Film, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

type MediaViewerDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    file: {
        name: string;
        url: string;
        type: string;
    };
};

export function MediaViewerDialog({ isOpen, onOpenChange, file }: MediaViewerDialogProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isPDF = file.type === 'application/pdf';

    const handleFullscreen = () => {
        const element = document.getElementById('media-viewer-content');
        if (element) {
            if (!document.fullscreenElement) {
                element.requestFullscreen();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenInNewTab = () => {
        window.open(file.url, '_blank');
    };

    const getFileIcon = () => {
        if (isImage) return <ImageIcon className="w-16 h-16 text-blue-500" />;
        if (isVideo) return <Film className="w-16 h-16 text-purple-500" />;
        if (isAudio) return <Music className="w-16 h-16 text-pink-500" />;
        return <FileText className="w-16 h-16 text-orange-500" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                id="media-viewer-content"
                className="max-w-[90vw] max-h-[90vh] w-auto h-auto p-0 overflow-hidden bg-black/95 border-none"
            >
                <DialogTitle className="sr-only">{file.name}</DialogTitle>

                {/* Header Controls */}
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
                    <h3 className="text-white font-semibold truncate max-w-[50%]">{file.name}</h3>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={handleDownload}
                            title="Download"
                        >
                            <Download className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={handleOpenInNewTab}
                            title="Open in new tab"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={handleFullscreen}
                            title="Fullscreen"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={() => onOpenChange(false)}
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Media Content */}
                <div className="flex items-center justify-center min-h-[400px] p-8 pt-16">
                    {isImage && (
                        <img
                            src={file.url}
                            alt={file.name}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                        />
                    )}

                    {isVideo && (
                        <video
                            src={file.url}
                            controls
                            autoPlay
                            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                        >
                            Your browser does not support the video tag.
                        </video>
                    )}

                    {isAudio && (
                        <div className="flex flex-col items-center gap-6 p-8">
                            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center animate-pulse">
                                <Music className="w-24 h-24 text-white" />
                            </div>
                            <p className="text-white text-lg font-semibold">{file.name}</p>
                            <audio
                                src={file.url}
                                controls
                                autoPlay
                                className="w-full max-w-md"
                            >
                                Your browser does not support the audio tag.
                            </audio>
                        </div>
                    )}

                    {isPDF && (
                        <iframe
                            src={file.url}
                            className="w-full h-[80vh] rounded-lg"
                            title={file.name}
                        />
                    )}

                    {!isImage && !isVideo && !isAudio && !isPDF && (
                        <div className="flex flex-col items-center gap-6 p-8 text-center">
                            {getFileIcon()}
                            <div>
                                <p className="text-white text-lg font-semibold">{file.name}</p>
                                <p className="text-gray-400 text-sm">{file.type || 'Unknown file type'}</p>
                            </div>
                            <Button onClick={handleDownload} className="mt-4">
                                <Download className="w-4 h-4 mr-2" />
                                Download File
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
