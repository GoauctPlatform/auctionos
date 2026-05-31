import React from 'react';
// @ts-ignore
import USAMap from 'react-usa-map';

interface USMapProps {
    onStateSelect?: (stateCode: string) => void;
    customize?: Record<string, { fill?: string; onClick?: (e: any) => void }>;
}

const USMap: React.FC<USMapProps> = ({ onStateSelect, customize }) => {
    const handleStateClick = (event: any) => {
        const stateCode = event.target.dataset.name;
        if (onStateSelect) {
            onStateSelect(stateCode);
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center us-map-container overflow-hidden select-none">
            <USAMap 
                onClick={handleStateClick} 
                customize={customize} 
            />
        </div>
    );
};

export default USMap;
