import React, { Component, ErrorInfo, ReactNode, useState, useEffect, useRef } from 'react';
// @ts-ignore
import USAMapImport from 'react-usa-map';

interface USMapProps {
    onStateSelect?: (stateCode: string) => void;
    customize?: Record<string, { fill?: string; onClick?: (e: any) => void }>;
    selectedState?: string;
}

class MapErrorBoundary extends React.Component<any, any> {
    state: any;
    props: any;
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("USMap Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-red-900/20 border border-red-500 rounded-xl p-4 text-center">
                    <p className="text-red-400 font-mono text-sm">Failed to load Map: {String(this.state.error)}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const USMap: React.FC<USMapProps> = ({ onStateSelect, customize, selectedState }) => {
    // Zoom & Pan states
    const [scale, setScale] = useState<number>(1.0);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

    // Dynamic reset to 1.0x scale when no state is selected
    useEffect(() => {
        if (!selectedState) {
            setScale(1.0);
            setPosition({ x: 0, y: 0 });
        }
    }, [selectedState]);

    const zoomToState = (targetElement: SVGPathElement, targetScale: number) => {
        if (!targetElement || typeof targetElement.getBBox !== 'function') return;

        try {
            const bbox = targetElement.getBBox();
            const stateCenterX = bbox.x + bbox.width / 2;
            const stateCenterY = bbox.y + bbox.height / 2;

            // Default react-usa-map dimensions
            const svgWidth = 959;
            const svgHeight = 593;

            // Compute center transformation
            const tx = (svgWidth / 2) - stateCenterX * targetScale;
            const ty = (svgHeight / 2) - stateCenterY * targetScale;

            setScale(targetScale);
            setPosition({ x: tx, y: ty });
        } catch (err) {
            console.error('USMap: Failed to calculate state bounding box for zoom:', err);
        }
    };

    const handleStateClick = (event: any) => {
        // Distinguish drag-to-pan from state selection click
        const start = clickStartRef.current;
        if (start) {
            const distance = Math.sqrt(
                Math.pow(event.clientX - start.x, 2) +
                Math.pow(event.clientY - start.y, 2)
            );
            if (distance > 6) {
                return; // Treat as pan drag end, not a click
            }
        }

        const stateCode = event.target.dataset.name;
        if (stateCode) {
            // Focus and zoom in at 2.2x
            zoomToState(event.target as SVGPathElement, 2.2);
            if (onStateSelect) {
                onStateSelect(stateCode);
            }
        }
    };

    // Bubble double click to zoom in closer (3.5x)
    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as SVGElement;
        if (target && target.tagName === 'path' && target.dataset && target.dataset.name) {
            const stateCode = target.dataset.name;
            zoomToState(target as SVGPathElement, 3.5);
            if (onStateSelect) {
                onStateSelect(stateCode);
            }
        }
    };

    // Pan (Drag-to-move) mouse handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click drags
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        clickStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    // Zoom (Wheel) handler
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.15;
        let nextScale = scale;
        if (e.deltaY < 0) {
            nextScale = Math.min(nextScale * zoomFactor, 6.0); // Cap zoom at 6.0x
        } else {
            nextScale = Math.max(nextScale / zoomFactor, 0.7); // Cap zoom out at 0.7x
        }
        setScale(nextScale);
    };

    // HUD Button Handlers
    const zoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev * 1.3, 6.0));
    };

    const zoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev / 1.3, 0.7));
    };

    const resetMap = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(1.0);
        setPosition({ x: 0, y: 0 });
        if (onStateSelect && selectedState) {
            onStateSelect(selectedState); // Toggle/deselect active state
        }
    };

    // Handle Vite/CJS interop issues where default export might be nested
    const MapComponent = (USAMapImport && USAMapImport.default) ? USAMapImport.default : USAMapImport;

    if (!MapComponent || typeof MapComponent !== 'function') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-yellow-900/20 border border-yellow-500 rounded-xl p-4 text-center">
                <p className="text-yellow-400 font-mono text-sm">Map Component is invalid. Type: {typeof MapComponent}</p>
            </div>
        );
    }

    return (
        <div 
            className="w-full h-full flex items-center justify-center us-map-container overflow-hidden select-none cursor-grab active:cursor-grabbing relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
        >
            <div 
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="w-full h-full flex items-center justify-center"
            >
                <MapErrorBoundary>
                    <MapComponent 
                        onClick={handleStateClick} 
                        customize={customize} 
                    />
                </MapErrorBoundary>
            </div>

            {/* Custom Premium HUD overlay */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#002b36]/80 backdrop-blur-md border border-[#1a4554]/40 rounded-xl p-1 z-20 shadow-xl">
                <button 
                    onClick={zoomIn} 
                    className="size-6 bg-[#073642]/60 hover:bg-cyan-500 hover:text-[#070d1a] border border-[#1a4554]/30 hover:border-cyan-400 text-white rounded-lg flex items-center justify-center font-bold text-xs transition-all active:scale-90"
                    title="Zoom In"
                >
                    +
                </button>
                <button 
                    onClick={zoomOut} 
                    className="size-6 bg-[#073642]/60 hover:bg-cyan-500 hover:text-[#070d1a] border border-[#1a4554]/30 hover:border-cyan-400 text-white rounded-lg flex items-center justify-center font-bold text-xs transition-all active:scale-90"
                    title="Zoom Out"
                >
                    -
                </button>
                <button 
                    onClick={resetMap} 
                    className="px-2.5 h-6 bg-[#073642]/60 hover:bg-red-500/20 hover:text-red-400 border border-[#1a4554]/30 hover:border-red-500/40 text-slate-300 rounded-lg flex items-center justify-center font-black text-[9px] uppercase tracking-wider transition-all active:scale-90"
                    title="Reset Focus"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default USMap;
