import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../../services/httpClient';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GISMapProps {
    property: any;
    className?: string;
}

// Component to handle dynamic recentering, geocoding, and resize bugs
const MapController = ({ property }: { property: any }) => {
    const map = useMap();

    useEffect(() => {
        // Fix for "cut off" grey areas in Leaflet when container size changes
        const fixSize = () => {
            if (map) {
                map.invalidateSize();
            }
        };
        
        // Trigger resize multiple times to ensure all CSS transitions are caught
        setTimeout(fixSize, 100);
        setTimeout(fixSize, 500);
        setTimeout(fixSize, 1500);

        // Add a ResizeObserver to automatically fix size if layout changes
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                if (map) map.invalidateSize();
            });
        });
        const container = map.getContainer();
        if (container) {
            resizeObserver.observe(container);
        }

        let hasCoords = false;
        let pLng = -98.5795;
        let pLat = 39.8283;

        if (property.longitude && property.latitude) {
            const lng = parseFloat(property.longitude);
            const lat = parseFloat(property.latitude);
            if (!isNaN(lng) && !isNaN(lat)) {
                pLng = lng;
                pLat = lat;
                hasCoords = true;
                map.setView([pLat, pLng], 18);
            }
        }

        if (!hasCoords) {
            const addressString = [
                property.address || property.parcel_address || (property.owner_address ? String(property.owner_address).split('\n')[0] : ''),
                property.city,
                property.state,
                property.zip_code || property.zip
            ].filter(Boolean).join(', ');

            if (addressString.length > 5) {
                // Use OpenStreetMap Nominatim for free geocoding
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            const gLat = parseFloat(data[0].lat);
                            const gLng = parseFloat(data[0].lon);
                            if (!isNaN(gLat) && !isNaN(gLng)) {
                                map.setView([gLat, gLng], 18);
                                // Add a dynamic marker
                                L.marker([gLat, gLng]).addTo(map);
                            }
                        }
                    })
                    .catch(err => console.error('Geocoding failed', err));
            }
        }

        return () => {
            if (container) resizeObserver.unobserve(container);
            resizeObserver.disconnect();
        };
    }, [property, map]);

    return null;
};

export const GISMap: React.FC<GISMapProps> = ({ property, className = "h-[450px]" }) => {
    let initialLat = 39.8283;
    let initialLng = -98.5795;
    let initialZoom = 4;
    let hasCoords = false;

    if (property.longitude && property.latitude) {
        const pLng = parseFloat(property.longitude);
        const pLat = parseFloat(property.latitude);
        if (!isNaN(pLng) && !isNaN(pLat)) {
            initialLng = pLng;
            initialLat = pLat;
            initialZoom = 18;
            hasCoords = true;
        }
    }

    return (
        <div 
            className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg ${className}`}
            style={{ minHeight: '300px' }}
        >
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-xl z-20 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">satellite_alt</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">GIS Lot View</span>
            </div>

            <MapContainer 
                center={[initialLat, initialLng]} 
                zoom={initialZoom} 
                style={{ width: '100%', height: '100%', zIndex: 10 }}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                touchZoom={false}
                doubleClickZoom={false}
                boxZoom={false}
                keyboard={false}
            >
                {/* Satellite Base Layer (ESRI World Imagery) */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri"
                    maxZoom={19}
                />
                
                {/* ATTOM Parcel Tiles Layer */}
                <TileLayer
                    url={`${API_BASE_URL}/api/v1/properties/parceltiles/{z}/{x}/{y}.png`}
                    attribution="&copy; ATTOM Data Solutions"
                    maxZoom={22}
                    minZoom={17}
                    opacity={1}
                    className="saturate-[3] contrast-[1.5] drop-shadow-md"
                />

                {hasCoords && <Marker position={[initialLat, initialLng]} />}
                <MapController property={property} />
            </MapContainer>
        </div>
    );
};
