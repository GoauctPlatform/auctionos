import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { API_BASE_URL } from '../../services/httpClient';

interface GISMapProps {
    property: any;
    className?: string;
}

export const GISMap: React.FC<GISMapProps> = ({ property, className = "h-[450px]" }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) {
            console.error('Mapbox token is missing');
            return;
        }

        mapboxgl.accessToken = token;

        // Default to US center if no coordinates
        let lng = -98.5795;
        let lat = 39.8283;
        let zoom = 4;

        if (property.longitude && property.latitude) {
            lng = parseFloat(property.longitude);
            lat = parseFloat(property.latitude);
            zoom = 18; // Close zoom for satellite
        }

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [lng, lat],
            zoom: zoom,
            pitch: 45, // Add a bit of pitch for 3D effect
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
            if (!map.current) return;

            // Add a marker for the property center
            if (property.longitude && property.latitude) {
                new mapboxgl.Marker({ color: '#0ea5e9' })
                    .setLngLat([lng, lat])
                    .addTo(map.current);
            }

            // Add ATTOM Parcel Tiles layer
            try {
                map.current.addSource('attom-parcels', {
                    type: 'raster',
                    tiles: [
                        `${API_BASE_URL}/api/v1/properties/parceltiles/{z}/{x}/{y}.png`
                    ],
                    tileSize: 256,
                    attribution: '&copy; ATTOM Data Solutions'
                });

                map.current.addLayer({
                    id: 'attom-parcels-layer',
                    type: 'raster',
                    source: 'attom-parcels',
                    minzoom: 14,
                    maxzoom: 22,
                    paint: {
                        'raster-opacity': 0.8
                    }
                });
            } catch (e) {
                console.error('Failed to add ATTOM parcel tiles layer:', e);
            }
        });

        return () => {
            if (map.current) {
                map.current.remove();
            }
        };
    }, [property]);

    return (
        <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg ${className}`}>
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-xl z-10 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">satellite_alt</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">GIS Lot View</span>
            </div>
        </div>
    );
};
