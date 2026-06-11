import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyList from '../../components/admin/PropertyList';
import PropertyFilters, { PropertyFilterParams } from '../../components/admin/PropertyFilters';
import { Typography, Button, Dialog, TextField } from '@mui/material';
import { ClientDataService } from '../../services/property.service';
import { countyService } from '../../services/county.service';
import { StatesService, StateContact } from '../../services/states.service';
import { Autocomplete } from '@mui/material';
import { MapPropertySearchLayout } from '../../components/property/MapPropertySearchLayout';

import { useAuth } from '../../context/AuthContext';

interface ClientPropertiesProps {
    onOpenPropertyDetails?: (propertyId: string | number, parcelId: string) => void;
}

const ClientProperties: React.FC<ClientPropertiesProps> = ({ onOpenPropertyDetails }) => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [filters, setFilters] = useState<PropertyFilterParams>(() => {
        try {
            const saved = sessionStorage.getItem('property_search_filters');
            if (saved) {
                const parsed = JSON.parse(saved);
                return Object.keys(parsed).length > 0 ? parsed : { availability: 'available' };
            }
        } catch {}
        return { availability: 'available' };
    });

    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    
    // State/County Dropdown Logic
    const [stateContacts, setStateContacts] = useState<StateContact[]>([]);
    const [availableCounties, setAvailableCounties] = useState<string[]>([]);
    const [selectedState, setSelectedState] = useState<StateContact | null>(null);
    const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({ 
        parcel_id: '', 
        owner_name: '', 
        address: '', 
        state: '', 
        county: '', 
        visibility: 'public' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load available states
    useEffect(() => {
        StatesService.getContacts().then(setStateContacts).catch(() => {});
    }, []);

    // Load counties when state changes
    useEffect(() => {
        if (selectedState) {
            countyService.getCounties(selectedState.state).then(setAvailableCounties).catch(() => setAvailableCounties([]));
        } else {
            setAvailableCounties([]);
            setSelectedCounty(null);
        }
    }, [selectedState]);

    // Save to sessionStorage whenever filters change
    useEffect(() => {
        sessionStorage.setItem('property_search_filters', JSON.stringify(filters));
    }, [filters]);

    // Sync URL params to filter state on mount
    useEffect(() => {
        const stateParam = searchParams.get('state');
        const topParam = searchParams.get('top');
        const initialFilters: PropertyFilterParams = { availability: 'available' };
        
        if (stateParam) initialFilters.state = stateParam;
        if (topParam === 'true') {
            initialFilters.min_score = 70;
        }
        
        const hasSavedSession = sessionStorage.getItem('property_search_filters');
        
        // Apply defaults/URL params only if there's an explicit URL override OR no saved session
        if (stateParam || topParam || !hasSavedSession) {
            if (Object.keys(initialFilters).length > 0) {
                setFilters(prev => {
                    const isDifferent = JSON.stringify(prev) !== JSON.stringify({ ...prev, ...initialFilters });
                    return isDifferent ? { ...prev, ...initialFilters } : prev;
                });
            }
        }
    }, [searchParams]);

    const [viewMode, setViewMode] = useState<'map' | 'list'>(() => {
        try {
            return (sessionStorage.getItem('property_search_view') as 'map' | 'list') || 'map';
        } catch {
            return 'map';
        }
    });

    useEffect(() => {
        sessionStorage.setItem('property_search_view', viewMode);
    }, [viewMode]);

    // availability='available' is the default — always show results when it's set
    const hasActiveFilters = filters.availability !== undefined || 
        Object.entries(filters).some(([k, v]) => k !== 'availability' && v !== undefined && v !== '');

    return (
        <>
            {viewMode === 'map' ? (
                <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden">
                    <MapPropertySearchLayout 
                        filters={filters} 
                        hasActiveFilters={hasActiveFilters} 
                        onOpenPropertyDetails={onOpenPropertyDetails} 
                    />
                    
                    <div className="absolute top-0 left-0 sm:w-[calc(100%-450px)] w-full z-30 pointer-events-none p-3 sm:p-5 flex flex-col gap-2 transition-all">
                        {/* Top Action Bar */}
                        <div className="flex justify-between items-center pointer-events-auto w-full px-2">
                            <Typography variant="h6" className="font-black text-slate-800 dark:text-white drop-shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 py-1.5 rounded-full hidden sm:block border border-white/20">
                                Property Search
                            </Typography>
                            <div className="flex gap-2 ml-auto">
                                <Button 
                                    variant="contained" 
                                    className="bg-white/95 text-slate-800 hover:bg-white backdrop-blur-md shadow-lg rounded-xl font-bold normal-case text-sm"
                                    onClick={() => setViewMode('list')}
                                    startIcon={<span className="material-symbols-outlined text-[18px]">list</span>}
                                >
                                    List View
                                </Button>
                                <Button 
                                    variant="contained" 
                                    color={user?.subscription_tier === 'trial' ? 'inherit' : 'primary'}
                                    className={`${user?.subscription_tier === 'trial' ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'} rounded-xl shadow-lg font-bold normal-case text-sm`}
                                    onClick={() => {
                                        if (user?.subscription_tier === 'trial') {
                                            alert('Manual creation of properties is not allowed in the Trial plan. Please upgrade to a paid plan.');
                                            return;
                                        }
                                        setCreateModalOpen(true);
                                    }}
                                    startIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
                                >
                                    Create Custom
                                </Button>
                            </div>
                        </div>

                        {/* Floating Modern Header Search Bar */}
                        <div className="pointer-events-auto w-full mx-auto mt-2">
                            <PropertyFilters 
                                onFilterChange={setFilters} 
                                readOnly={true} 
                                initialFilters={filters}
                                onOpenPropertyDetails={onOpenPropertyDetails}
                                variant="header"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6 w-full space-y-6 px-4 sm:px-8 lg:px-12">
                    <div className="flex justify-between items-center">
                        <Typography variant="h4" className="font-bold text-slate-800 dark:text-white">
                            Property Search
                        </Typography>
                        <div className="flex gap-2">
                            <Button 
                                variant="outlined" 
                                onClick={() => setViewMode('map')}
                                startIcon={<span className="material-symbols-outlined text-[18px]">map</span>}
                            >
                                Map View
                            </Button>
                            <Button 
                                variant="contained" 
                                color={user?.subscription_tier === 'trial' ? 'inherit' : 'primary'}
                                className={`${user?.subscription_tier === 'trial' ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600'} rounded-lg shadow-none`}
                                onClick={() => {
                                    if (user?.subscription_tier === 'trial') {
                                        alert('Manual creation of properties is not allowed in the Trial plan. Please upgrade to a paid plan.');
                                        return;
                                    }
                                    setCreateModalOpen(true);
                                }}
                                startIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
                            >
                                Create Custom Property
                            </Button>
                        </div>
                    </div>
                    <div id="tour-properties-filters" className="sticky top-0 z-40 pt-2 pb-1 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
                        <PropertyFilters 
                            onFilterChange={setFilters} 
                            readOnly={true} 
                            initialFilters={filters}
                            onOpenPropertyDetails={onOpenPropertyDetails}
                        />
                    </div>
                    
                    {hasActiveFilters ? (
                        <div className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl h-[calc(100vh-250px)] flex flex-col">
                            <PropertyList 
                                filters={filters} 
                                readOnly={true} 
                                onOpenPropertyDetails={onOpenPropertyDetails}
                                onCreateCustom={() => {
                                    if (user?.subscription_tier === 'trial') {
                                        alert('Manual creation of properties is not allowed in the Trial plan. Please upgrade to a paid plan.');
                                        return;
                                    }
                                    if (filters.keyword) {
                                        setCreateForm(p => ({
                                            ...p, 
                                            parcel_id: filters.keyword || '',
                                            visibility: 'public'
                                        }));
                                    }
                                    setCreateModalOpen(true);
                                }} 
                            />
                        </div>
                    ) : (
                        <div className="w-full h-[400px] bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-6xl mb-4 text-slate-300 dark:text-slate-700">search</span>
                            <Typography variant="h6" className="font-semibold text-slate-600 dark:text-slate-400">Search Properties</Typography>
                            <Typography variant="body2" className="mt-1">Use the filters above to find what you are looking for.</Typography>
                        </div>
                    )}
                </div>
            )}

            {/* Create Custom Property Modal */}
            <Dialog open={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold mb-4 text-slate-800 dark:text-white">Create Custom Property</Typography>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <TextField 
                            label="Parcel ID" 
                            fullWidth size="small" 
                            value={createForm.parcel_id} 
                            onChange={e => setCreateForm(p => ({...p, parcel_id: e.target.value}))} 
                        />
                        <TextField 
                            label="Owner Name" 
                            fullWidth size="small" 
                            value={createForm.owner_name} 
                            onChange={e => setCreateForm(p => ({...p, owner_name: e.target.value}))} 
                        />
                    </div>
                    <TextField 
                        label="Address" 
                        fullWidth size="small" 
                        value={createForm.address} 
                        onChange={e => setCreateForm(p => ({...p, address: e.target.value}))} 
                    />
                    <div className="flex flex-col gap-3 mb-4 mt-2">
                        <Autocomplete
                            options={stateContacts}
                            getOptionLabel={(option) => option.state}
                            value={selectedState}
                            onChange={(_, newValue) => setSelectedState(newValue)}
                            renderInput={(params) => (
                                <TextField {...params} variant="outlined" size="small" label="Select State *" className="bg-white dark:bg-slate-800 rounded-lg" />
                            )}
                            fullWidth
                            disablePortal
                        />
                        <Autocomplete
                            options={availableCounties}
                            getOptionLabel={(option) => option}
                            value={selectedCounty}
                            onChange={(_, newValue) => setSelectedCounty(newValue)}
                            renderInput={(params) => (
                                <TextField {...params} variant="outlined" size="small" label="Select County *" className="bg-white dark:bg-slate-800 rounded-lg" />
                            )}
                            fullWidth
                            disablePortal
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={() => setCreateModalOpen(false)} color="inherit">Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        disabled={isSubmitting || !createForm.address || !selectedState || !selectedCounty}
                        className="bg-blue-600 rounded-lg shadow-none"
                        onClick={async () => {
                            setIsSubmitting(true);
                            try {
                                const payload = {
                                    ...createForm,
                                    state: selectedState?.state || '',
                                    county: (selectedCounty || '').replace(/_/g, ' ').trim()
                                };
                                const res = await ClientDataService.createCustomProperty(payload);
                                setCreateModalOpen(false);
                                setCreateForm({ 
                                    parcel_id: '', 
                                    owner_name: '', 
                                    address: '', 
                                    state: '', 
                                    county: '', 
                                    visibility: 'public' 
                                });
                                setSelectedState(null);
                                setSelectedCounty(null);
                                if (res && res.id) {
                                    if (onOpenPropertyDetails) {
                                        onOpenPropertyDetails(res.id, res.parcel_id || '');
                                    } else {
                                        navigate(`/client/properties/${res.id}`);
                                    }
                                } else {
                                    alert("✅ Custom property created.");
                                }
                            } catch (e: any) {
                                alert(e.message);
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Property'}
                    </Button>
                </div>
            </Dialog>
        </>
    );
};

export default ClientProperties;
