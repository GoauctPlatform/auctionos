import React, { Component, ErrorInfo, ReactNode } from 'react';
// @ts-ignore
import USAMapImport from 'react-usa-map';

interface USMapProps {
    onStateSelect?: (stateCode: string) => void;
    customize?: Record<string, { fill?: string; onClick?: (e: any) => void }>;
}

class MapErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
    public state = { hasError: false, error: null };

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

const USMap: React.FC<USMapProps> = ({ onStateSelect, customize }) => {
    const handleStateClick = (event: any) => {
        const stateCode = event.target.dataset.name;
        if (onStateSelect) {
            onStateSelect(stateCode);
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
        <div className="w-full h-full flex items-center justify-center us-map-container overflow-hidden select-none">
            <MapErrorBoundary>
                <MapComponent 
                    onClick={handleStateClick} 
                    customize={customize} 
                />
            </MapErrorBoundary>
        </div>
    );
};

export default USMap;
