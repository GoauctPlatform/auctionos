import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PropertyList from '../../components/admin/PropertyList';
import PropertyFilters, { PropertyFilterParams } from '../../components/admin/PropertyFilters';
import { Typography, Button, Dialog, TextField } from '@mui/material';
import { ClientDataService } from '../../services/property.service';
import { countyService } from '../../services/county.service';
import { StatesService, StateContact } from '../../services/states.service';
import { Autocomplete } from '@mui/material';

import { useAuth } from '../../context/AuthContext';

const ClientProperties: React.FC = () => {
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

    // availability='available' is the default — always show results when it's set
    const hasActiveFilters = filters.availability !== undefined || 
        Object.entries(filters).some(([k, v]) => k !== 'availability' && v !== undefined && v !== '');

    return (
        <div className="p-6 w-full space-y-6 px-4 sm:px-8 lg:px-12">
            <div className="flex justify-between items-center">
                <Typography variant="h4" className="font-bold text-slate-800 dark:text-white">
                    Property Search
                </Typography>
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
            <div id="tour-properties-filters" className="sticky top-0 z-40 pt-2 pb-1 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
                <PropertyFilters 
                    onFilterChange={setFilters} 
                    readOnly={true} 
                    initialFilters={filters}
                />
            </div>
            
            {hasActiveFilters ? (
                <div className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl h-[calc(100vh-250px)] flex flex-col">
                    <PropertyList 
                        filters={filters} 
                        readOnly={true} 
                        onCreateCustom={() => {
                            if (user?.subscription_tier === 'trial') {
                                alert('Manual creation of properties is not allowed in the Trial plan. Please upgrade to a paid plan.');
                                return;
                            }
                            if (filters.keyword) {
                                // Pre-fill the search term as parcel ID or address
                                setCreateForm(p => ({
                                    ...p, 
                                    parcel_id: filters.keyword || '',
                                    visibility: 'public' // Quick created properties from search should be public by default so Attom can enrich them
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
            )}            {/* Create Custom Property Modal */}
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
                                    navigate(`/client/properties/${res.id}`);
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
        </div>
    );
};

export default ClientProperties;
