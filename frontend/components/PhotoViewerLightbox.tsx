import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';

interface PhotoViewerLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    initialIndex?: number;
}

export const PhotoViewerLightbox: React.FC<PhotoViewerLightboxProps> = ({
    isOpen,
    onClose,
    images,
    initialIndex = 0
}) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [rotation, setRotation] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);

    // Sync state when lightbox opens/initialIndex changes
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setRotation(0);
        }
    }, [isOpen, initialIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, images.length]);

    if (!isOpen || !images || images.length === 0) return null;

    const handleNext = () => {
        setRotation(0);
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = () => {
        setRotation(0);
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleDownload = async () => {
        const url = images[currentIndex];
        if (!url) return;
        
        setIsDownloading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error('Fetch failed');
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            // Get filename from URL or default
            const filename = url.split('/').pop()?.split('?')[0] || `property_photo_${currentIndex + 1}.jpg`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error('Blob download failed, falling back to direct link:', e);
            // Fallback: direct download using link
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.download = url.split('/').pop()?.split('?')[0] || `property_photo_${currentIndex + 1}.jpg`;
            a.click();
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/95 backdrop-blur-md p-4 animate-fade-in">
            {/* Top Bar */}
            <div className="w-full max-w-7xl flex items-center justify-between z-10 py-2">
                <div className="text-white/80 text-sm font-semibold select-none bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    Image {currentIndex + 1} of {images.length}
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRotate}
                        title="Rotate Photo"
                        className="p-2.5 rounded-full bg-white/10 text-white/90 hover:bg-white/20 transition-all active:scale-95"
                    >
                        <RefreshCw size={20} className="transform rotate-0 active:rotate-180 transition-transform duration-300" />
                    </button>
                    
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        title="Download Photo"
                        className="p-2.5 rounded-full bg-white/10 text-white/90 hover:bg-white/20 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                        <Download size={20} className={isDownloading ? 'animate-bounce' : ''} />
                    </button>

                    <button
                        onClick={onClose}
                        title="Close Viewer"
                        className="p-2.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-white transition-all active:scale-95 border border-red-500/20"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div className="relative flex-1 w-full max-w-7xl flex items-center justify-center overflow-hidden my-4 select-none">
                {/* Left Arrow */}
                {images.length > 1 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-all border border-white/5 active:scale-90"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* Main Image Viewport */}
                <div className="relative max-w-full max-h-full flex items-center justify-center p-2">
                    <img
                        src={images[currentIndex]}
                        alt={`Property view ${currentIndex + 1}`}
                        style={{ transform: `rotate(${rotation}deg)` }}
                        className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/10 transition-transform duration-300 select-none pointer-events-none"
                    />
                </div>

                {/* Right Arrow */}
                {images.length > 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-all border border-white/5 active:scale-90"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>

            {/* Bottom Thumbnail Bar */}
            {images.length > 1 && (
                <div className="w-full max-w-5xl overflow-x-auto py-3 px-4 z-10 flex gap-2 justify-start md:justify-center scrollbar-thin select-none scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setRotation(0);
                                setCurrentIndex(idx);
                            }}
                            className={`relative shrink-0 w-16 h-12 md:w-20 md:h-14 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                                idx === currentIndex
                                    ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/20'
                                    : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/40'
                            }`}
                        >
                            <img
                                src={img}
                                alt={`Thumb ${idx + 1}`}
                                className="w-full h-full object-cover pointer-events-none"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
