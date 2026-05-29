import React from 'react';
import { getStreetViewUrl } from '../utils/maps';

interface StreetViewThumbnailProps {
    property?: any; // Full property object
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    size?: number;
    className?: string;
}

export const StreetViewThumbnail: React.FC<StreetViewThumbnailProps> = ({ 
    property,
    address, 
    city, 
    state, 
    zip, 
    size = 64,
    className = ""
}) => {
    const [error, setError] = React.useState(false);
    const [hover, setHover] = React.useState(false);
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

    // Use the flexible utility: pass property object if available, else strings
    const effectiveLocation = property || address;
    const imageUrl = getStreetViewUrl(effectiveLocation, city, state, zip, `${size}x${size}`);
    const largeImageUrl = getStreetViewUrl(effectiveLocation, city, state, zip, '640x400');

    if (!imageUrl || error) {
        return (
            <div 
                className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 ${className}`}
                style={{ width: size, height: size }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: size * 0.4 }}>image_not_supported</span>
            </div>
        );
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div 
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onMouseMove={handleMouseMove}
        >
            <img 
                src={imageUrl} 
                alt="Property"
                className="rounded-lg object-cover shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors cursor-zoom-in"
                style={{ width: size, height: size }}
                onError={() => {
                    console.warn('Thumbnail load failed for:', effectiveLocation);
                    setError(true);
                }}
            />

            {/* Hover Zoom Overlay */}
            {hover && (
                <div 
                    className="fixed z-[99999] pointer-events-none"
                    style={{ 
                        left: mousePos.x + 20, 
                        top: mousePos.y - 120,
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl border-2 border-blue-500 animate-in fade-in zoom-in duration-200">
                        <img 
                            src={largeImageUrl} 
                            alt="Property Zoom"
                            className="rounded-xl w-[480px] h-[300px] object-cover"
                        />
                        <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded shadow-lg uppercase tracking-wider">
                            Street View Preview
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
