import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { PropertyFilterParams } from '../admin/PropertyFilters';
import { PropertyService, ClientDataService } from '../../services/property.service';
import { PropertyCard } from '../PropertyCard';
import { CircularProgress, Button, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { geocodeAddress } from '../../services/geocoding.service';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPropertySearchLayoutProps {
    filters: PropertyFilterParams;
    hasActiveFilters: boolean;
    onOpenPropertyDetails?: (propertyId: string | number, parcelId: string) => void;
}

// Controller to handle automatic map bounds based on properties
const MapBoundsController = ({ properties, activeState, geocodedProps }: { properties: any[], activeState: string | undefined, geocodedProps: Record<string, {lat: number, lng: number}> }) => {
    const map = useMap();

    useEffect(() => {
        if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

        // Fix for grey areas (invalid size) on Leaflet load
        const resizeObserver = new ResizeObserver(() => {
            try {
                requestAnimationFrame(() => map.invalidateSize());
            } catch (err) {
                console.error("Failed to invalidate map size:", err);
            }
        });
        
        const container = map.getContainer();
        if (container) {
            try {
                resizeObserver.observe(container);
            } catch (err) {
                console.error("Failed to observe map container:", err);
            }
        }

        const t1 = setTimeout(() => {
            try { map.invalidateSize(); } catch {}
        }, 100);
        const t2 = setTimeout(() => {
            try { map.invalidateSize(); } catch {}
        }, 500);

        return () => {
            if (container && resizeObserver) {
                try { resizeObserver.unobserve(container); } catch {}
            }
            try { resizeObserver.disconnect(); } catch {}
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [map]);

    useEffect(() => {
        if (!properties || properties.length === 0) {
            try {
                if (!activeState) {
                    map.setView([39.8283, -98.5795], 4);
                }
            } catch (error) {
                console.error("Failed to set default view:", error);
            }
            return;
        }

        const lats: number[] = [];
        const lngs: number[] = [];

        properties.forEach(p => {
            if (!p) return;
            let lat = parseFloat(p.latitude);
            let lng = parseFloat(p.longitude);
            if (isNaN(lat) || isNaN(lng)) {
                const fallback = geocodedProps[p.id || p.parcel_id];
                if (fallback) {
                    lat = fallback.lat;
                    lng = fallback.lng;
                }
            }
            if (!isNaN(lat) && !isNaN(lng)) {
                lats.push(lat);
                lngs.push(lng);
            }
        });

        try {
            if (lats.length > 0 && lngs.length > 0) {
                const bounds = L.latLngBounds(
                    L.latLng(Math.min(...lats), Math.min(...lngs)),
                    L.latLng(Math.max(...lats), Math.max(...lngs))
                );
                // Pad bounds so markers aren't right on the edge
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
            }
        } catch (error) {
            console.error("Failed to fit bounds on map:", error);
        }
    }, [properties, activeState, map, geocodedProps]);

    return null;
};

export const MapPropertySearchLayout: React.FC<MapPropertySearchLayoutProps> = ({ filters, hasActiveFilters, onOpenPropertyDetails }) => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [geocodedProps, setGeocodedProps] = useState<Record<string, {lat: number, lng: number}>>({});
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    const pageSize = 50;

    // Load favorites on mount
    useEffect(() => {
        PropertyService.getFavorites().then(favs => {
            if (favs && Array.isArray(favs)) {
                setFavorites(new Set(favs));
            } else {
                setFavorites(new Set());
            }
        }).catch(err => {
            console.error('Error loading favorites:', err);
            setFavorites(new Set());
        });
    }, []);

    const handleToggleFavorite = async (property: any) => {
        try {
            const id = property.id;
            const res = await PropertyService.toggleFavorite(id);
            setFavorites(prev => {
                const next = new Set(prev);
                if (res.is_favorite) {
                    next.add(id);
                } else {
                    next.delete(id);
                }
                return next;
            });
        } catch (error) {
            console.error('Failed to toggle favorite', error);
            alert('Failed to update favorite status');
        }
    };

    const fetchProperties = async (resetPage = false) => {
        setLoading(true);
        try {
            const currentPage = resetPage ? 0 : page;
            const skip = currentPage * pageSize;
            const limit = pageSize;

            const params: any = { ...filters, limit, skip };

            const items = await PropertyService.getProperties(params);
            
            // Sort by availability: available first
            const sortedItems = items.sort((a: any, b: any) => {
                const aAvail = (a.availability_status || '').toLowerCase() === 'available' ? 0 : 1;
                const bAvail = (b.availability_status || '').toLowerCase() === 'available' ? 0 : 1;
                return aAvail - bAvail;
            });

            if (resetPage) {
                setProperties(sortedItems);
                setIsSidebarOpen(true);
            } else {
                setProperties(prev => {
                    const existingIds = new Set(prev.map(p => p.id || p.parcel_id));
                    const newItems = sortedItems.filter((p: any) => !existingIds.has(p.id || p.parcel_id));
                    return [...prev, ...newItems];
                });
            }

            setHasMore(sortedItems.length === pageSize);
            setPage(currentPage + 1);
        } catch (err) {
            console.error('Error fetching properties', err);
        } finally {
            setLoading(false);
        }
    };

    // When filters change, reset and fetch
    useEffect(() => {
        if (hasActiveFilters) {
            fetchProperties(true);
        } else {
            setProperties([]);
            setIsSidebarOpen(false);
        }
    }, [filters, hasActiveFilters]);

    // Asynchronous Geocoding Fallback for properties lacking lat/lng
    useEffect(() => {
        properties.forEach(async (p) => {
            const lat = parseFloat(p.latitude);
            const lng = parseFloat(p.longitude);
            if (isNaN(lat) || isNaN(lng)) {
                const id = p.id || p.parcel_id;
                if (!geocodedProps[id]) {
                    const addressStr = `${p.address || p.parcel_id}, ${p.county || ''} County, ${p.state || ''} ${p.zip_code || ''}`;
                    const coords = await geocodeAddress(addressStr);
                    if (coords) {
                        setGeocodedProps(prev => ({...prev, [id]: coords}));
                    }
                }
            }
        });
    }, [properties]);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden flex">
            {/* Map Background */}
            <div className="flex-1 relative z-0">
                <MapContainer 
                    center={[39.8283, -98.5795]} 
                    zoom={4} 
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution="Tiles &copy; Esri &mdash; Source: Esri"
                        maxZoom={19}
                    />
                    
                    {properties.filter(Boolean).map(p => {
                        let lat = parseFloat(p.latitude);
                        let lng = parseFloat(p.longitude);
                        
                        if (isNaN(lat) || isNaN(lng)) {
                            const fallback = geocodedProps[p.id || p.parcel_id];
                            if (fallback) {
                                lat = fallback.lat;
                                lng = fallback.lng;
                            } else {
                                return null;
                            }
                        }

                        return (
                            <Marker key={p.id || p.parcel_id} position={[lat, lng]}>
                                <Popup>
                                    <div className="text-sm font-semibold">{p.address || p.parcel_id}</div>
                                    <div className="text-xs text-slate-500">{p.county} County, {p.state}</div>
                                    <Button 
                                        size="small" 
                                        variant="text" 
                                        onClick={() => onOpenPropertyDetails && onOpenPropertyDetails(p.id || p.parcel_id, p.parcel_id)}
                                        className="mt-2"
                                    >
                                        View Details
                                    </Button>
                                </Popup>
                            </Marker>
                        );
                    })}
                    
                    <MapBoundsController properties={properties} activeState={filters.state} geocodedProps={geocodedProps} />
                </MapContainer>
            </div>

            {/* Sidebar */}
            <div 
                className={`absolute top-0 right-0 h-full w-full sm:w-[450px] bg-slate-50 dark:bg-slate-900 z-20 shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${isSidebarOpen && hasActiveFilters ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <Typography variant="h6" className="font-bold">
                        Search Results ({properties.length}{hasMore ? '+' : ''})
                    </Typography>
                    <IconButton onClick={() => setIsSidebarOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {properties.length === 0 && !loading && (
                        <div className="text-center text-slate-500 mt-10">
                            No properties found matching your criteria.
                        </div>
                    )}
                    
                    {properties.map(p => (
                        <PropertyCard 
                            key={p.id || p.parcel_id}
                            property={{...p, id: p.id || p.parcel_id, title: p.address || 'Property', status: (p.availability_status || '').toLowerCase() === 'available' ? 'Active' : 'Sold'}}
                            onView={() => onOpenPropertyDetails && onOpenPropertyDetails(p.id || p.parcel_id, p.parcel_id)}
                            onFavorite={() => handleToggleFavorite(p)}
                            onFlyer={(property) => navigate(`/client/properties/${property.id || property.parcel_id}?action=export_flyer`)}
                            isFavorite={favorites.has(p.id)}
                        />
                    ))}

                    {loading && (
                        <div className="flex justify-center py-4">
                            <CircularProgress size={24} />
                        </div>
                    )}

                    {hasMore && !loading && (
                        <Button 
                            fullWidth 
                            variant="outlined" 
                            onClick={() => fetchProperties(false)}
                            className="mt-4"
                        >
                            Load More
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Toggle Sidebar Button (when closed but has filters) */}
            {!isSidebarOpen && hasActiveFilters && (
                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 z-10">
                    <Button 
                        variant="contained" 
                        color="primary"
                        onClick={() => setIsSidebarOpen(true)}
                        className="rounded-l-xl rounded-r-none shadow-lg py-4"
                        sx={{ minWidth: '40px', px: 1 }}
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </Button>
                </div>
            )}
        </div>
    );
};
