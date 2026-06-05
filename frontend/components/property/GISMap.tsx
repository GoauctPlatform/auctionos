import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

            // Try to parse and add parcel shape
            if (property.parcel_shape_data) {
                try {
                    const geojson = JSON.parse(property.parcel_shape_data);
                    
                    map.current.addSource('parcel', {
                        type: 'geojson',
                        data: geojson
                    });

                    // Add a semi-transparent fill
                    map.current.addLayer({
                        id: 'parcel-fill',
                        type: 'fill',
                        source: 'parcel',
                        paint: {
                            'fill-color': '#0ea5e9', // primary blue
                            'fill-opacity': 0.3
                        }
                    });

                    // Add a solid outline
                    map.current.addLayer({
                        id: 'parcel-outline',
                        type: 'line',
                        source: 'parcel',
                        paint: {
                            'line-color': '#0284c7', // darker blue
                            'line-width': 3
                        }
                    });

                    // Fit bounds to polygon if possible
                    try {
                        const bounds = new mapboxgl.LngLatBounds();
                        
                        let coords = [];
                        if (geojson.type === 'Feature') {
                            coords = geojson.geometry.coordinates;
                        } else if (geojson.type === 'Polygon') {
                            coords = geojson.coordinates;
                        }

                        if (coords.length > 0) {
                            // Simple flatten for bounds calculation
                            const flatCoords = coords.flat(Infinity);
                            for (let i = 0; i < flatCoords.length; i += 2) {
                                bounds.extend([flatCoords[i], flatCoords[i+1]]);
                            }
                            map.current.fitBounds(bounds, { padding: 50, maxZoom: 19 });
                        }
                    } catch (e) {
                        console.warn('Could not fit bounds to polygon', e);
                    }

                } catch (e) {
                    console.error('Failed to parse parcel shape data:', e);
                }
            } else if (property.longitude && property.latitude) {
                // If no shape data, at least add a marker
                new mapboxgl.Marker({ color: '#0ea5e9' })
                    .setLngLat([lng, lat])
                    .addTo(map.current);
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
