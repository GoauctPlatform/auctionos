import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { PropertyFilterParams } from '../admin/PropertyFilters';
import { PropertyService, ClientDataService } from '../../services/property.service';
import { PropertyCard } from '../PropertyCard';
import { CircularProgress, Button, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { geocodeAddress, reverseGeocode } from '../../services/geocoding.service';

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
    onFilterChange?: (filters: PropertyFilterParams) => void;
}

// Controller to handle automatic map bounds based on properties
const MapBoundsController = ({ properties, activeState, activeCounty, geocodedProps }: { properties: any[], activeState: string | undefined, activeCounty: string | undefined, geocodedProps: Record<string, {lat: number, lng: number}> }) => {
    const map = useMap();

    // 1. Zoom/Pan to active state and/or county immediately when they change in the filters
    useEffect(() => {
        if (!activeState) return;
        const zoomToRegion = async () => {
            const regionStr = activeCounty ? `${activeCounty} County, ${activeState}` : activeState;
            try {
                const coords = await geocodeAddress(regionStr);
                if (coords) {
                    map.setView([coords.lat, coords.lng], activeCounty ? 10 : 6);
                }
            } catch (err) {
                console.error("Failed to zoom to region:", err);
            }
        };
        zoomToRegion();
    }, [activeState, activeCounty, map]);

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

const MapClickHandler = ({ onMapClick, active }: { onMapClick: (e: any) => void, active: boolean }) => {
    useMapEvents({
        click(e) {
            if (active) {
                onMapClick(e);
            }
        }
    });
    return null;
};

// Controller to handle flying to a selected property
const MapFocusController = ({ selectedId, selectedProperty, properties, geocodedProps }: { selectedId: string | number | null, selectedProperty: any | null, properties: any[], geocodedProps: Record<string, {lat: number, lng: number}> }) => {
    const map = useMap();
    useEffect(() => {
        if (!selectedId) return;
        
        let p = selectedProperty || properties.find((prop) => (prop.id || prop.parcel_id) === selectedId);
        
        if (p) {
            let lat = parseFloat(p.latitude);
            let lng = parseFloat(p.longitude);
            if (isNaN(lat) || isNaN(lng)) {
                const fallback = geocodedProps[selectedId];
                if (fallback) {
                    lat = fallback.lat;
                    lng = fallback.lng;
                }
            }
            if (!isNaN(lat) && !isNaN(lng)) {
                map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
            }
        }
    }, [selectedId, selectedProperty, properties, geocodedProps, map]);
    return null;
};

const customPinIcon = L.divIcon({
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 border-2 border-white shadow-lg text-white"><span class="material-symbols-outlined text-[18px]">pin_drop</span></div>`,
    className: 'custom-filter-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const defaultMarkerIcon = new L.Icon.Default();

const selectedMarkerIcon = L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 border-4 border-white shadow-[0_0_15px_rgba(79,70,229,0.7)] text-white animate-bounce"><span class="material-symbols-outlined text-[20px]">home</span></div>`,
    className: 'custom-selected-pin',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

export const MapPropertySearchLayout: React.FC<MapPropertySearchLayoutProps> = ({ filters, hasActiveFilters, onOpenPropertyDetails, onFilterChange }) => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [geocodedProps, setGeocodedProps] = useState<Record<string, {lat: number, lng: number}>>({});
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    const [isPinDropMode, setIsPinDropMode] = useState(false);
    const [droppedPin, setDroppedPin] = useState<{ lat: number, lng: number } | null>(null);
    const [pinLocationDetails, setPinLocationDetails] = useState<any | null>(null);
    const [isResolvingPin, setIsResolvingPin] = useState(false);

    const handleMapClick = async (e: any) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setDroppedPin({ lat, lng });
        setIsResolvingPin(true);
        setPinLocationDetails(null);
        try {
            const result = await reverseGeocode(lat, lng);
            setPinLocationDetails(result);
        } catch (err) {
            console.error("Failed to reverse geocode clicked coordinates:", err);
        } finally {
            setIsResolvingPin(false);
        }
    };

    const handleApplyPinFilter = () => {
        if (!pinLocationDetails || !onFilterChange) return;
        onFilterChange({
            ...filters,
            state: pinLocationDetails.stateCode || undefined,
            county: pinLocationDetails.county || undefined
        });
        setDroppedPin(null);
        setIsPinDropMode(false);
    };

    const pageSize = 50;
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | number | null>(null);
    const [selectedPropertyDetail, setSelectedPropertyDetail] = useState<any | null>(null);

    // Scroll sidebar to selected property card when it changes
    useEffect(() => {
        if (selectedPropertyId) {
            const element = document.getElementById(`property-card-${selectedPropertyId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedPropertyId]);

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

    // Listen to selection event from search autocomplete
    useEffect(() => {
        const handlePropertySelected = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.id) {
                setSelectedPropertyId(customEvent.detail.id);
                if (customEvent.detail.property) {
                    setSelectedPropertyDetail(customEvent.detail.property);
                }
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('property-selected-from-search', handlePropertySelected);
        return () => {
            window.removeEventListener('property-selected-from-search', handlePropertySelected);
        };
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

            const response = await PropertyService.getProperties(params);
            const items = Array.isArray(response) ? response : ((response as any).items || []);
            const total = Array.isArray(response) ? response.length : ((response as any).total || 0);
            
            // Sort by availability: available first
            const sortedItems = [...items].sort((a: any, b: any) => {
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

            setHasMore(skip + sortedItems.length < total);
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
        setSelectedPropertyId(null);
        setSelectedPropertyDetail(null);
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
                {/* Floating Map Tools */}
                <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setIsPinDropMode(!isPinDropMode);
                            if (isPinDropMode) setDroppedPin(null);
                        }}
                        className={`flex items-center justify-center gap-2 px-4 h-[38px] rounded-xl text-xs font-black border shadow-lg transition-all backdrop-blur-md cursor-pointer ${
                            isPinDropMode
                            ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 active:scale-95'
                            : 'bg-white/95 hover:bg-white text-slate-800 border-slate-200/50 dark:bg-slate-900/95 dark:text-slate-200 dark:border-slate-800/50 dark:hover:bg-slate-900/80 active:scale-95'
                        }`}
                        title={isPinDropMode ? "Cancel Pin Drop" : "Drop Pin to Filter State & County"}
                    >
                        <span className="material-symbols-outlined text-[18px]">{isPinDropMode ? 'close' : 'add_location'}</span>
                        {isPinDropMode ? 'Click map to place pin (or cancel)' : 'Drop Filter Pin'}
                    </button>
                </div>

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

                    <MapClickHandler onMapClick={handleMapClick} active={isPinDropMode} />

                    {droppedPin && (
                        <Marker 
                            position={[droppedPin.lat, droppedPin.lng]}
                            icon={customPinIcon}
                        >
                            <Popup {...({ onClose: () => setDroppedPin(null) } as any)}>
                                <div className="p-1.5 text-left min-w-[200px] select-none font-sans">
                                    <h4 className="font-black text-slate-900 dark:text-white text-xs mb-1.5 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px] text-rose-500">pin_drop</span>
                                        Filter Region Location
                                    </h4>
                                    {isResolvingPin ? (
                                        <div className="flex items-center gap-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                                            <CircularProgress size={12} color="inherit" />
                                            <span className="font-bold">Locating region...</span>
                                        </div>
                                    ) : pinLocationDetails ? (
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Identified Area</span>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                    {pinLocationDetails.city ? `${pinLocationDetails.city}, ` : ''}
                                                    {pinLocationDetails.county ? `${pinLocationDetails.county} County, ` : ''}
                                                    {pinLocationDetails.stateCode || pinLocationDetails.state || ''}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="small" 
                                                    variant="contained" 
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-1.5 px-3 normal-case rounded-lg shadow-sm"
                                                    onClick={handleApplyPinFilter}
                                                >
                                                    Apply Filter
                                                </Button>
                                                <Button 
                                                    size="small" 
                                                    variant="outlined" 
                                                    color="error"
                                                    className="text-[10px] font-bold py-1.5 px-3 normal-case rounded-lg"
                                                    onClick={() => setDroppedPin(null)}
                                                >
                                                    Remove Pin
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <p className="text-xs text-rose-500 font-bold">Failed to resolve region.</p>
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                className="text-[10px] font-bold py-1.5 px-3 normal-case rounded-lg"
                                                onClick={() => setDroppedPin(null)}
                                            >
                                                Dismiss
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )}
                    
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

                        const isSelected = selectedPropertyId === (p.id || p.parcel_id);

                        return (
                            <Marker 
                                key={p.id || p.parcel_id} 
                                position={[lat, lng]}
                                icon={isSelected ? selectedMarkerIcon : defaultMarkerIcon}
                                zIndexOffset={isSelected ? 1000 : 0}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedPropertyId(p.id || p.parcel_id);
                                        setSelectedPropertyDetail(p);
                                        setIsSidebarOpen(true);
                                    }
                                }}
                            >
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
                    
                    <MapBoundsController properties={properties} activeState={filters.state} activeCounty={filters.county} geocodedProps={geocodedProps} />
                    <MapFocusController selectedId={selectedPropertyId} selectedProperty={selectedPropertyDetail} properties={properties} geocodedProps={geocodedProps} />
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
                    
                    {properties.map(p => {
                        const isCardSelected = selectedPropertyId === (p.id || p.parcel_id);
                        return (
                            <div 
                                key={p.id || p.parcel_id} 
                                id={`property-card-${p.id || p.parcel_id}`}
                                className="transition-all duration-300"
                            >
                                <PropertyCard 
                                    property={{...p, id: p.id || p.parcel_id, title: p.address || 'Property', status: (p.availability_status || '').toLowerCase() === 'available' ? 'Active' : 'Sold'}}
                                    onView={() => onOpenPropertyDetails && onOpenPropertyDetails(p.id || p.parcel_id, p.parcel_id)}
                                    onFavorite={() => handleToggleFavorite(p)}
                                    onFlyer={(property) => navigate(`/client/properties/${property.id || property.parcel_id}?action=export_flyer`)}
                                    isFavorite={favorites.has(p.id)}
                                    isSelected={isCardSelected}
                                />
                            </div>
                        );
                    })}

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
