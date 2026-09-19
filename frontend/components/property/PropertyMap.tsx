import React from 'react';
import { PropertyDetails as Property } from '../../types';

interface PropertyMapProps {
    property: Property;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({ property }) => {
    const address = property.address || `${property.city}, ${property.state}`;
    const encodedAddress = encodeURIComponent(address);
    // Note: In a production environment, you should use the real Google Maps Embed API key
    // For now, we use the public search embed which works without a key for simple views
    const mapSyncUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm overflow-hidden h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-lg">map</span>
                    Interactive Map
                </h3>
                <a 
                    href={`https://www.google.com/maps/search/${encodedAddress}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    Full View <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
            </div>
            
            <div className="flex-1 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 relative">
                {address ? (
                    <iframe
                        title="Property Location"
                        src={mapSyncUrl}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">location_off</span>
                        <p className="text-sm font-bold">No Address Found</p>
                        <p className="text-xs">Location coordinates could not be resolved.</p>
                    </div>
                )}
            </div>
            
            <div className="mt-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Parcel ID</span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{property.parcel_id}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                     <span className="text-[10px] font-bold text-slate-500">Verified GSI</span>
                </div>
            </div>
        </div>
    );
};
