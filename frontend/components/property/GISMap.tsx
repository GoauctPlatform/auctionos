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

        let lng = -98.5795;
        let lat = 39.8283;
        let zoom = 4;

        let hasCoords = false;
        if (property.longitude && property.latitude) {
            const pLng = parseFloat(property.longitude);
            const pLat = parseFloat(property.latitude);
            if (!isNaN(pLng) && !isNaN(pLat)) {
                lng = pLng;
                lat = pLat;
                zoom = 18; // Close zoom for satellite
                hasCoords = true;
            }
        }

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-streets-v12',
            center: [lng, lat],
            zoom: zoom,
            pitch: 45, // Add a bit of pitch for 3D effect
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const initializeMapLayers = (currentLng: number, currentLat: number, isGeocoded: boolean) => {
            if (!map.current) return;

            // Add a marker for the property center
            if (hasCoords || isGeocoded) {
                new mapboxgl.Marker({ color: '#0ea5e9' })
                    .setLngLat([currentLng, currentLat])
                    .addTo(map.current);
            }

            // Add ATTOM Parcel Tiles layer
            try {
                if (!map.current.getSource('attom-parcels')) {
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
                }
            } catch (e) {
                console.error('Failed to add ATTOM parcel tiles layer:', e);
            }
        };

        map.current.on('load', () => {
            initializeMapLayers(lng, lat, false);

            // Force resize after load to prevent 0x0 canvas bugs if rendered off-screen
            setTimeout(() => {
                if (map.current) {
                    map.current.resize();
                }
            }, 500);

            // If we don't have explicit coordinates, try to Geocode the address
            if (!hasCoords) {
                const addressString = [
                    property.address || property.parcel_address || (property.owner_address ? String(property.owner_address).split('\n')[0] : ''),
                    property.city,
                    property.state,
                    property.zip_code || property.zip
                ].filter(Boolean).join(', ');

                if (addressString.length > 5) {
                    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressString)}.json?access_token=${token}&limit=1`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.features && data.features.length > 0) {
                                const [gLng, gLat] = data.features[0].center;
                                if (map.current) {
                                    map.current.flyTo({ center: [gLng, gLat], zoom: 18, pitch: 45 });
                                    initializeMapLayers(gLng, gLat, true);
                                }
                            }
                        })
                        .catch(err => console.error('Geocoding failed', err));
                }
            }
        });

        return () => {
            if (map.current) {
                map.current.remove();
            }
        };
    }, [property]);

    return (
        <div 
            className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg ${className}`}
            style={{ minHeight: '300px' }}
        >
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ width: '100%', height: '100%' }} />
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-xl z-10 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">satellite_alt</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">GIS Lot View</span>
            </div>
        </div>
    );
};
