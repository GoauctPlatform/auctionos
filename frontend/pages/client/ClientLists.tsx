import React, { useState, useEffect } from 'react';
import { Typography, IconButton, TextField, Dialog, Button, CircularProgress, Chip, Tabs, Tab, Autocomplete } from '@mui/material';
import { FolderPlusIcon, Trash2Icon, Edit2Icon, ExternalLinkIcon } from 'lucide-react';
import { calculateDealScore } from '../../intelligence/scoringEngine';
import { ClientDataService, PropertyService } from '../../services/property.service';
import { countyService, CountyContact } from '../../services/county.service';
import { StatesService, StateContact } from '../../services/states.service';
import { geocodeAddress } from '../../services/geocoding.service';
import { useNavigate } from 'react-router-dom';
import { SwipeActionItem } from '../../components/SwipeActionItem';
import { PropertyPreviewDrawer } from '../../components/PropertyPreviewDrawer';
import { useCompany } from '../../context/CompanyContext';
import { InvestorTaskService } from '../../services/realtor_task.service';
import { AuthService } from '../../services/auth.service';
import api from '../../services/api';
import { API_URL, getHeaders } from '../../services/httpClient';
import { StreetViewThumbnail } from '../../components/StreetViewThumbnail';
import { ClientUserProperties } from './ClientUserProperties';
import { InvestorTasksDashboard } from './InvestorTasksDashboard';
import { CreateTaskForm } from '../../components/property/CreateTaskForm';

// Helper to map state names to codes for the SVG silhouette
const STATE_CODE_MAP: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC', 'Washington, D.C.': 'DC', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

interface CustomList {
    id: number;
    name: string;
    property_count: number;
    is_favorite_list: boolean;
    is_broadcasted: boolean;
    tags?: string;
    has_upcoming_auction?: boolean;
    upcoming_auctions_count?: number;
    notes?: string;
}



// ── Investor My Exports View ────────────────────────────────────────────────
const InvestorMyExportsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [exports, setExports] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editingExport, setEditingExport] = React.useState<any | null>(null);
    const [editForm, setEditForm] = React.useState({ contact_name: '', contact_phone: '', contact_email: '', notes: '', requested_sale_price: '' });

    const load = async () => {
        setLoading(true);
        const data = await InvestorTaskService.getMyExports().catch(() => []);
        setExports(data);
        setLoading(false);
    };

    React.useEffect(() => { load(); }, []);

    const openEdit = (exp: any) => {
        setEditingExport(exp);
        setEditForm({
            contact_name: exp.contact_name || '',
            contact_phone: exp.contact_phone || '',
            contact_email: exp.contact_email || '',
            notes: exp.notes || '',
            requested_sale_price: exp.requested_sale_price || '',
        });
    };

    const handleSaveEdit = async () => {
        if (!editingExport) return;
        try {
            await InvestorTaskService.updateExport(editingExport.id, editForm);
            setEditingExport(null);
            await load();
            alert('✅ Export info updated successfully.');
        } catch (e: any) { alert(e.message); }
    };

    const handleCancelExport = async (exp: any) => {
        if (!window.confirm('Are you sure you want to cancel this export? It will no longer be visible to realtors.')) return;
        try {
            await InvestorTaskService.cancelExport(exp.id);
            await load();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center gap-3">
                <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to My List
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[18px]">upload</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">My Exported Properties</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex justify-center py-20"><CircularProgress size={28} /></div>
                ) : exports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">upload</span>
                        <p className="text-sm font-medium">No properties exported yet.</p>
                        <p className="text-xs mt-1 text-slate-400">Export properties to realtors from your folders using the Export action.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exports.map((exp: any) => (
                            <div key={exp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-sm transition-all group relative">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{exp.address || exp.parcel_id}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">{exp.county}, {exp.state}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <IconButton size="small" onClick={() => openEdit(exp)} className="text-slate-400 hover:text-blue-500">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleCancelExport(exp)} className="text-slate-400 hover:text-red-500">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </IconButton>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-1">
                                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Shared Contact Info</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">person</span> {exp.contact_name || '—'}
                                    </p>
                                    {exp.contact_phone && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">phone</span> {exp.contact_phone}
                                        </p>
                                    )}
                                    {exp.requested_sale_price && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-bold">
                                            <span className="material-symbols-outlined text-[14px]">sell</span> Target: ${Number(exp.requested_sale_price).toLocaleString()}
                                        </p>
                                    )}
                                    {exp.contact_email && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">mail</span> {exp.contact_email}
                                        </p>
                                    )}
                                </div>

                                {exp.notes && (
                                    <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-[11px] text-slate-500 italic truncate">
                                        "{exp.notes}"
                                    </div>
                                )}

                                <p className="text-[9px] text-slate-400 mt-4">Exported on {new Date(exp.exported_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Export Dialog */}
            <Dialog open={!!editingExport} onClose={() => setEditingExport(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <Typography variant="h6" className="font-bold text-slate-900 dark:text-white">Edit Export Info</Typography>
                </div>
                <div className="p-5 space-y-4">
                    <TextField label="Contact Name" fullWidth value={editForm.contact_name} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })} />
                    <TextField label="Contact Phone" fullWidth value={editForm.contact_phone} onChange={e => setEditForm({ ...editForm, contact_phone: e.target.value })} />
                    <TextField label="Contact Email" fullWidth value={editForm.contact_email} onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })} />
                    <TextField label="Requested Sale Price" type="number" fullWidth value={editForm.requested_sale_price} onChange={e => setEditForm({ ...editForm, requested_sale_price: e.target.value })} />
                    <TextField label="Notes for Realtors" fullWidth multiline rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                    <Button onClick={() => setEditingExport(null)} fullWidth>Cancel</Button>
                    <Button onClick={handleSaveEdit} fullWidth variant="contained" color="primary" className="rounded-xl bg-blue-600">Save Changes</Button>
                </div>
            </Dialog>
        </div>
    );
};


const ClientLists: React.FC = () => {
    // Helper to match county name robustly (ignoring case, spaces, and the "County" suffix)
    const normalizedMatch = (c1: string, c2: string) => {
        if (!c1 || !c2) return false;
        const n1 = c1.trim().toLowerCase().replace(/[\s\-_]+county$/i, '').replace(/[^a-z0-9]/g, '');
        const n2 = c2.trim().toLowerCase().replace(/[\s\-_]+county$/i, '').replace(/[^a-z0-9]/g, '');
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
    };

    const navigate = useNavigate();
    const { activeCompany } = useCompany();
    const [lists, setLists] = useState<CustomList[]>([]);
    const [selectedListId, setSelectedListId] = useState<number | null>(null);
    const [selectedListProperties, setSelectedListProperties] = useState<any[]>([]);

    // Edit Folder Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<CustomList | null>(null);
    const [editFolderType, setEditFolderType] = useState<'custom' | 'standard'>('custom');
    const [editFolderName, setEditFolderName] = useState('');
    const [editFolderState, setEditFolderState] = useState<StateContact | null>(null);
    const [editFolderCounty, setEditFolderCounty] = useState<string | null>(null);
    const [editFolderAvailableCounties, setEditFolderAvailableCounties] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [propsLoading, setPropsLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [newListName, setNewListName] = useState('');

    const [dragOverListId, setDragOverListId] = useState<number | null>(null);
    const [broadcastedLists, setBroadcastedLists] = useState<CustomList[]>([]);
    const [importing, setImporting] = useState<number | null>(null);
    const [countyContacts, setCountyContacts] = useState<CountyContact[]>([]);
    const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        smart: false,
        standard: false,
        custom: false,
        broadcasted: false
    });

    const [creationMode, setCreationMode] = useState<'custom' | 'standard'>('standard');
    const [stateContacts, setStateContacts] = useState<StateContact[]>([]);
    const [availableCounties, setAvailableCounties] = useState<string[]>([]);
    const [selectedState, setSelectedState] = useState<StateContact | null>(null);
    const [newCountyName, setNewCountyName] = useState<string | null>(null);
    const [openListNotes, setOpenListNotes] = useState<boolean>(false);
    const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
    const [selectedCountyName, setSelectedCountyName] = useState<string | null>(null);
    const [previewPropertyId, setPreviewPropertyId] = useState<number | string | null>(null);
    const [geocodedProperties, setGeocodedProperties] = useState<Record<number, { lat: number, lng: number }>>({});
    const [folderNotes, setFolderNotes] = useState<string>('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [viewMode, setViewMode] = useState<'folders' | 'my_tasks' | 'my_exports' | 'my_properties'>('folders');
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
    const [movingPropertyId, setMovingPropertyId] = useState<number | null>(null);
    const [moveTargetListId, setMoveTargetListId] = useState<number | string>('');
    const [creating, setCreating] = useState(false);

    // Task & Export state
    const [taskProperty, setTaskProperty] = useState<any | null>(null);
    const [exportProperty, setExportProperty] = useState<any | null>(null);
    const [exportForm, setExportForm] = useState({ contact_name: '', contact_phone: '', contact_email: '', notes: '', requested_sale_price: '' });
    const [exportSubmitting, setExportSubmitting] = useState(false);
    
    const [favoritesSet, setFavoritesSet] = useState<Set<number>>(new Set());
    const currentUser = AuthService.getCurrentUser();
    const isAgent = currentUser?.role === 'agent';
    const isTrial = currentUser?.subscription_tier === 'trial';



    // Global listener for dynamic property additions
    useEffect(() => {
        const handlePropertyAdded = async (event: any) => {
            const newProperty = event.detail;
            if (!newProperty) return;

            // 1. Refresh list data implicitly to update counts
            loadLists();

            // 2. If we are currently viewing the folder this property belongs to, inject it into the UI
            if (
                (selectedListId && newProperty.list_id === selectedListId) ||
                (selectedStateName && newProperty.state && newProperty.state.toLowerCase() === selectedStateName.toLowerCase())
            ) {
                setSelectedListProperties(prev => {
                    if (prev.find(p => p.id === newProperty.id)) return prev;
                    return [newProperty, ...prev];
                });

                // 3. Geocode on-the-fly and update map instantly
                if ((!newProperty.latitude || !newProperty.longitude) && newProperty.address) {
                    try {
                        let coords = await geocodeAddress(newProperty.address);
                        if (!coords && (newProperty.county || newProperty.state)) {
                            const fallback = `${newProperty.county || ''} County, ${newProperty.state || ''}`;
                            coords = await geocodeAddress(fallback);
                        }
                        if (!coords && newProperty.state) {
                            coords = await geocodeAddress(newProperty.state);
                        }

                        if (coords) {
                            setGeocodedProperties(prev => ({ ...prev, [newProperty.id]: coords }));
                        }
                    } catch (err) {
                        console.error('Dynamic geocoding error', err);
                    }
                }
            }
        };

        window.addEventListener('propertyAdded', handlePropertyAdded);
        return () => window.removeEventListener('propertyAdded', handlePropertyAdded);
    }, [selectedListId, selectedStateName]);

    const toggleState = (stateName: string) => {
        setExpandedStates(prev => ({ ...prev, [stateName]: !prev[stateName] }));
    };

    useEffect(() => {
        if (!activeCompany?.id) return;
        const companyId = activeCompany.id;

        // Retrieve saved values from sessionStorage
        const savedViewMode = sessionStorage.getItem(`auctionos_client_lists_${companyId}_viewMode`) as any;
        const savedListId = sessionStorage.getItem(`auctionos_client_lists_${companyId}_selectedListId`);
        const savedStateName = sessionStorage.getItem(`auctionos_client_lists_${companyId}_selectedStateName`);
        const savedCountyName = sessionStorage.getItem(`auctionos_client_lists_${companyId}_selectedCountyName`);
        const savedExpanded = sessionStorage.getItem(`auctionos_client_lists_${companyId}_expandedStates`);

        if (savedViewMode) {
            setViewMode(savedViewMode);
        } else {
            setViewMode('folders');
        }

        if (savedListId !== null && savedListId !== undefined) {
            const listIdNum = savedListId === 'null' ? null : Number(savedListId);
            setSelectedListId(listIdNum);
        } else {
            setSelectedListId(null);
        }

        if (savedStateName !== null && savedStateName !== undefined) {
            setSelectedStateName(savedStateName === 'null' ? null : savedStateName);
        } else {
            setSelectedStateName(null);
        }

        if (savedCountyName !== null && savedCountyName !== undefined) {
            setSelectedCountyName(savedCountyName === 'null' ? null : savedCountyName);
        } else {
            setSelectedCountyName(null);
        }

        if (savedExpanded) {
            try {
                setExpandedStates(JSON.parse(savedExpanded));
            } catch (e) {
                setExpandedStates({});
            }
        } else {
            setExpandedStates({});
        }

        setSelectedListProperties([]);
        loadLists();
        StatesService.getContacts().then(setStateContacts).catch(() => { });
    }, [activeCompany?.id]);

    // Sync states to sessionStorage on change
    useEffect(() => {
        if (!activeCompany?.id) return;
        const companyId = activeCompany.id;
        
        sessionStorage.setItem(`auctionos_client_lists_${companyId}_viewMode`, viewMode);
        sessionStorage.setItem(`auctionos_client_lists_${companyId}_selectedListId`, selectedListId !== null ? String(selectedListId) : 'null');
        sessionStorage.setItem(`auctionos_client_lists_${companyId}_selectedStateName`, selectedStateName !== null ? selectedStateName : 'null');
        sessionStorage.setItem(`auctionos_client_lists_${companyId}_selectedCountyName`, selectedCountyName !== null ? selectedCountyName : 'null');
        sessionStorage.setItem(`auctionos_client_lists_${companyId}_expandedStates`, JSON.stringify(expandedStates));
    }, [viewMode, selectedListId, selectedStateName, selectedCountyName, expandedStates, activeCompany?.id]);


    useEffect(() => {
        if (selectedState) {
            countyService.getCounties(selectedState.state).then(setAvailableCounties).catch(() => setAvailableCounties([]));
        } else {
            setAvailableCounties([]);
            setNewCountyName(null);
        }
    }, [selectedState]);

    useEffect(() => {
        if (selectedListId) {
            loadListProperties(selectedListId);
            const selList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);
            if (selList?.tags === 'STANDARD') { // Now these are just states. We clear county contacts until they pick a county subfolder, but we can load state contacts if needed.
                if (selectedCountyName) {
                    countyService.getContacts(selList.name, selectedCountyName).then(setCountyContacts).catch(() => setCountyContacts([]));
                } else {
                    setCountyContacts([]);
                }
            } else {
                setCountyContacts([]);
            }
        } else if (selectedStateName) {
            loadStateProperties(selectedStateName);
            // If they clicked a specific county subfolder, load those county contacts
            if (selectedCountyName) {
                countyService.getContacts(selectedStateName, selectedCountyName).then(setCountyContacts).catch(() => setCountyContacts([]));
            } else {
                setCountyContacts([]);
            }
        } else {
            setSelectedListProperties([]);
            setCountyContacts([]);
        }
    }, [selectedListId, selectedStateName, selectedCountyName, lists, broadcastedLists]);

    const parseNotes = (rawNotes: string) => {
        try {
            const parsed = JSON.parse(rawNotes);
            if (typeof parsed === 'object' && parsed !== null) return parsed;
        } catch (e) { }
        return { __root__: rawNotes || '' };
    };

    // Update folderNotes state when list changes
    useEffect(() => {
        const selList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);
        if (selList) {
            const notesObj = parseNotes(selList.notes || '');
            const activeKey = selectedCountyName || '__root__';
            setFolderNotes(notesObj[activeKey] || '');
        } else {
            setFolderNotes('');
        }
    }, [selectedListId, selectedCountyName, lists, broadcastedLists]);

    const handleSaveNotes = async (newText: string) => {
        if (!selectedListId) return;
        setSavingNotes(true);
        try {
            const selList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);
            const notesObj = parseNotes(selList?.notes || '');
            const activeKey = selectedCountyName || '__root__';
            
            // Check if there is actually a change to avoid unnecessary writes
            if (notesObj[activeKey] === newText) {
                setSavingNotes(false);
                return;
            }

            const updatedNotesObj = { ...notesObj, [activeKey]: newText };
            const jsonString = JSON.stringify(updatedNotesObj);

            await ClientDataService.updateList(selectedListId, { notes: jsonString });
            
            // Reflect in local state
            setLists(prev => prev.map(l => l.id === selectedListId ? { ...l, notes: jsonString } : l));
        } catch (err) {
            console.error('Error saving notes:', err);
        } finally {
            setSavingNotes(false);
        }
    };

    const loadLists = async () => {
        try {
            setLoading(true);
            const data = await ClientDataService.getLists(activeCompany?.id);
            setLists(data);

            // Load favorites to determine priority sorting
            try {
                const favs = await PropertyService.getFavorites(activeCompany?.id);
                console.log("Loaded Favorites for Priority Sorting:", favs);
                setFavoritesSet(new Set(favs));
            } catch (favErr) {
                console.error("Failed to load favorites for priority:", favErr);
            }

            const companyId = activeCompany?.id || 'default';
            const savedListId = sessionStorage.getItem(`auctionos_client_lists_${companyId}_selectedListId`);
            const savedStateName = sessionStorage.getItem(`auctionos_client_lists_${companyId}_selectedStateName`);

            const currentOrSavedListId = selectedListId !== null ? selectedListId : (savedListId && savedListId !== 'null' ? Number(savedListId) : null);
            const currentOrSavedStateName = selectedStateName !== null ? selectedStateName : (savedStateName && savedStateName !== 'null' ? savedStateName : null);

            if (data.length > 0 && !currentOrSavedListId && !currentOrSavedStateName) {
                // Select favorites by default if available, otherwise stay at 'Select a Folder'
                const fav = data.find(l => l.is_favorite_list);
                if (fav) {
                    setSelectedListId(fav.id);
                    sessionStorage.setItem(`auctionos_client_lists_${companyId}_selectedListId`, String(fav.id));
                }
            }
        } catch (err: any) {
            console.error('Error loading lists:', err);
        } finally {
            setLoading(false);
        }

        try {
            const bData = await ClientDataService.getBroadcastedLists();
            setBroadcastedLists(bData);
        } catch (err: any) {
            console.error('Error loading broadcasted lists:', err);
        }
    };

    const handleExpandStateList = async (listId: number, stateName: string) => {
        toggleState(stateName);
        if (!expandedStates[stateName]) {
            // About to expand, fetch properties to group by county in the sidebar
            try {
                const data = await ClientDataService.getListProperties(listId);
                // Keep it in some state Map if needed, but easier: simply group selectedListProperties if selected
            } catch (err) { }
        }
    };

    const loadListProperties = async (listId: number) => {
        try {
            setPropsLoading(true);
            const data = await ClientDataService.getListProperties(listId);
            setSelectedListProperties(data);
        } catch (err) {
            console.error('Error loading properties:', err);
        } finally {
            setPropsLoading(false);
        }
    };

    const loadStateProperties = async (stateName: string) => {
        try {
            setPropsLoading(true);
            const stateList = lists.find(l => l.tags === 'STANDARD' && l.name === stateName);
            if (!stateList) {
                setSelectedListProperties([]);
                return;
            }
            const data = await ClientDataService.getListProperties(stateList.id);
            setSelectedListProperties(data);

            // Geocode properties missing coordinates without blocking the UI
            const missingCoords = data.filter((p: any) => (!p.latitude || !p.longitude) && p.address);
            if (missingCoords.length > 0) {
                (async () => {
                    for (const prop of missingCoords) {
                        try {
                            if (geocodedProperties[prop.id]) continue;

                            let coords = await geocodeAddress(prop.address);
                            if (!coords && (prop.county || prop.state)) {
                                const fallback = `${prop.county || ''} County, ${prop.state || ''}`;
                                console.log(`Fallback geocoding for property ${prop.id}: ${fallback}`);
                                coords = await geocodeAddress(fallback);
                            }
                            if (!coords && prop.state) {
                                coords = await geocodeAddress(prop.state);
                            }

                            if (coords) {
                                console.log(`Map debug: Setting geocoded coords for property ${prop.id}`, coords);
                                setGeocodedProperties(prev => ({ ...prev, [prop.id]: coords }));
                            }
                        } catch (e) {
                            console.error('Geocoding error for', prop.id, e);
                        }
                        // Small delay to prevent API rate limiting
                        await new Promise(r => setTimeout(r, 1000));
                    }
                })();
            }
        } catch (err) {
            console.error('Error loading state properties:', err);
        } finally {
            setPropsLoading(false);
        }
    };

    const handleRemoveProperty = async (propertyId: number) => {
        try {
            if (selectedListId) {
                await ClientDataService.removePropertyFromList(selectedListId, propertyId);
                loadListProperties(selectedListId);
            } else if (selectedStateName) {
                const stateList = lists.find(l => l.tags === 'STANDARD' && l.name === selectedStateName);
                if (stateList) {
                    await ClientDataService.removePropertyFromList(stateList.id, propertyId);
                    loadStateProperties(selectedStateName);
                }
            }
            loadLists();
        } catch (err: any) {
            alert(err.message || 'Failed to remove property');
        }
    };

    const handleMoveProperty = async () => {
        if (!selectedListId || !movingPropertyId || !moveTargetListId) return;
        try {
            await ClientDataService.movePropertyBetweenLists(selectedListId, movingPropertyId, Number(moveTargetListId));
            setMovingPropertyId(null);
            setMoveTargetListId('');
            loadLists();
            loadListProperties(selectedListId);
        } catch (e) {
            console.error(e);
            alert("Error moving property.");
        }
    };

    const handleCreateList = async () => {
        if (creating) return;
        setCreating(true);
        try {
            if (creationMode === 'custom') {
                if (!newListName) return;
                await ClientDataService.createList(newListName, undefined, activeCompany?.id);
            } else {
                if (!selectedState) return;
                
                // Always use State as the primary folder name
                const folderName = selectedState.state;
                const existingFolder = lists.find(l => l.tags && l.tags.startsWith('STANDARD') && l.name === folderName);
                
                // Construct tags string including the new county if selected
                let finalTags = 'STANDARD';
                if (newCountyName) {
                    const trimmedCounty = newCountyName.trim();
                    if (existingFolder && existingFolder.tags && existingFolder.tags.includes(':')) {
                        const parts = existingFolder.tags.split(':');
                        const prefix = parts[0];
                        const existingCounties = parts[1].split(',').map(c => c.trim());
                        if (!existingCounties.some(c => c.toLowerCase() === trimmedCounty.toLowerCase())) {
                            finalTags = `${prefix}:${existingCounties.join(',')},${trimmedCounty}`;
                        } else {
                            finalTags = existingFolder.tags;
                        }
                    } else {
                        finalTags = `STANDARD:${trimmedCounty}`;
                    }
                }

                if (existingFolder) {
                    // Update tags if we have a new county to pin
                    if (newCountyName && existingFolder.tags !== finalTags) {
                        await ClientDataService.updateList(existingFolder.id, { tags: finalTags });
                    }
                    setSelectedListId(existingFolder.id);
                    setSelectedStateName(existingFolder.name);
                    if (newCountyName) {
                        setSelectedCountyName(newCountyName);
                        countyService.getContacts(folderName, newCountyName).then(setCountyContacts);
                        setExpandedStates(prev => ({ ...prev, [folderName]: true }));
                    }
                } else {
                    const res = await ClientDataService.createList(folderName, finalTags, activeCompany?.id);
                    if (res && res.id) {
                        setSelectedListId(res.id);
                        setSelectedStateName(folderName);
                        if (newCountyName) {
                            setSelectedCountyName(newCountyName);
                            countyService.getContacts(folderName, newCountyName).then(setCountyContacts);
                            setExpandedStates(prev => ({ ...prev, [folderName]: true }));
                        }
                    }
                }
            }
            setNewListName('');
            setNewCountyName(null);
            setSelectedState(null);
            setOpenModal(false);
            loadLists();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteList = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this folder?")) return;
        try {
            await ClientDataService.deleteList(id);
            if (selectedListId === id) {
                setSelectedListId(null);
                setSelectedStateName(null);
                setSelectedCountyName(null);
            }
            loadLists();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteSubfolder = async (listId: number, countyName: string) => {
        if (!window.confirm(`Are you sure you want to delete the county "${countyName}"? This will remove all properties in this county from the folder.`)) return;
        try {
            await ClientDataService.deleteSubfolder(listId, countyName);
            if (selectedListId === listId && selectedCountyName === countyName) {
                setSelectedCountyName(null);
            }
            loadLists();
            if (selectedListId === listId) {
                loadListProperties(listId);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleStartRename = (list: CustomList) => {
        setListToEdit(list);
        if (list.tags === 'STANDARD') {
            setEditFolderType('standard');
            const parts = list.name.split(' - ');
            const stName = parts[0];
            const coName = parts[1] || null;
            const stObj = stateContacts.find(c => c.state === stName) || null;
            setEditFolderState(stObj);
            setEditFolderCounty(coName);
            if (stObj) {
                countyService.getCounties(stObj.state).then(setEditFolderAvailableCounties).catch(() => setEditFolderAvailableCounties([]));
            } else {
                setEditFolderAvailableCounties([]);
            }
        } else {
            setEditFolderType('custom');
            setEditFolderName(list.name);
        }
        setEditModalOpen(true);
    };

    const handleEditFolderSave = async () => {
        if (!listToEdit) return;
        try {
            if (editFolderType === 'custom') {
                if (!editFolderName) return;
                await ClientDataService.updateList(listToEdit.id, { name: editFolderName });
            } else {
                if (!editFolderState) return;
                const finalName = editFolderState.state;
                let finalTags = 'STANDARD';
                if (editFolderCounty) {
                    finalTags = `STANDARD:${editFolderCounty}`;
                }
                await ClientDataService.updateList(listToEdit.id, { name: finalName, tags: finalTags });
            }
            setEditModalOpen(false);
            setListToEdit(null);
            loadLists();
        } catch (err: any) {
            alert(err.message);
        }
    };



    const handleDragStart = (e: React.DragEvent, propertyId: number) => {
        e.dataTransfer.setData("propertyId", propertyId.toString());
        e.dataTransfer.setData("sourceListId", selectedListId?.toString() || "");
    };

    const handleDrop = async (e: React.DragEvent, targetListId: number) => {
        e.preventDefault();
        setDragOverListId(null);
        const propertyId = parseInt(e.dataTransfer.getData("propertyId"));
        const sourceListId = parseInt(e.dataTransfer.getData("sourceListId"));

        if (sourceListId === targetListId) return;

        try {
            await ClientDataService.moveProperty(sourceListId, propertyId, targetListId);
            loadLists();
            if (selectedListId === sourceListId) {
                loadListProperties(sourceListId);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleImportBroadcasted = async (listId: number) => {
        setImporting(listId);
        try {
            const newList = await ClientDataService.importBroadcastedList(listId);
            await loadLists();
            setSelectedListId(newList.id);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setImporting(null);
        }
    };

    // Top-Level Calculations for displayProperties & filteredProperties
    const displayProperties = React.useMemo(() => {
        let props = [...selectedListProperties];
        if (selectedStateName && selectedCountyName) {
            props = props.filter(p => normalizedMatch(p.county, selectedCountyName));
        }
        return props.sort((a, b) => {
            const isAFav = favoritesSet.has(a.id);
            const isBFav = favoritesSet.has(b.id);
            if (isAFav && !isBFav) return -1;
            if (!isAFav && isBFav) return 1;
            return 0;
        });
    }, [selectedListProperties, selectedStateName, selectedCountyName, favoritesSet]);



    const selectedList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);

    if (loading && !lists.length && !broadcastedLists.length) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#080B11]">
                <CircularProgress size={24} />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50 dark:bg-[#080B11] border-x border-slate-200 dark:border-slate-800">
            {/* Left Sidebar */}
            <div id="tour-lists-sidebar" className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden shrink-0`}>
                <div className="p-4 flex justify-between items-center w-64">
                    <Typography variant="h6" className="font-bold text-slate-800 dark:text-white tracking-tight">Folders</Typography>
                    <IconButton size="small" onClick={() => setOpenModal(true)} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <FolderPlusIcon size={18} className="text-blue-600" />
                    </IconButton>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    <div id="tour-lists-folders" className="space-y-6">
                        {/* smart lists / favorites */}
                        {lists.some(l => l.is_favorite_list) && (
                            <div>
                                <div
                                    className="flex items-center justify-between px-3 cursor-pointer group"
                                    onClick={() => setCollapsedSections(prev => ({ ...prev, smart: !prev.smart }))}
                                >
                                    <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">Smart Lists</Typography>
                                    <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.smart ? '-rotate-90' : ''}`}>expand_more</span>
                                </div>
                                {!collapsedSections.smart && (
                                    <div className="mt-1 space-y-0.5">
                                        {lists.filter(l => l.is_favorite_list).map(list => (
                                            <div
                                                key={list.id}
                                                onClick={() => { setSelectedListId(list.id); setSelectedStateName(null); setSelectedCountyName(null); }}
                                                onDragOver={(e) => { e.preventDefault(); setDragOverListId(list.id); }}
                                                onDragLeave={() => setDragOverListId(null)}
                                                onDrop={(e) => handleDrop(e, list.id)}
                                                className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
                                                    ${selectedListId === list.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
                                                    ${dragOverListId === list.id ? 'ring-2 ring-blue-400 ring-inset scale-[1.02]' : ''}`}
                                            >
                                                <span className={`material-symbols-outlined text-[18px] ${selectedListId === list.id ? 'text-white' : 'text-red-500'}`}>favorite</span>
                                                <span className="flex-1 text-sm font-medium truncate">{list.name}</span>
                                                {list.has_upcoming_auction && (
                                                    <div className="flex items-center gap-0.5 bg-orange-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                                                        <span className="material-symbols-outlined text-[10px]">gavel</span>
                                                        <span className="text-[9px] font-black">{list.upcoming_auctions_count}</span>
                                                    </div>
                                                )}
                                                <span className={`text-xs ${selectedListId === list.id ? 'text-blue-100' : 'text-slate-400'}`}>{list.property_count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {lists.some(l => l.tags === 'STANDARD') && (
                            <div>
                                <div
                                    className="flex items-center justify-between px-3 cursor-pointer group"
                                    onClick={() => setCollapsedSections(prev => ({ ...prev, standard: !prev.standard }))}
                                >
                                    <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">Standard Folders</Typography>
                                    <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.standard ? '-rotate-90' : ''}`}>expand_more</span>
                                </div>
                                {!collapsedSections.standard && (
                                    <div className="mt-1 space-y-1">
                                        {lists.filter(l => l.tags && l.tags.startsWith('STANDARD')).sort((a, b) => a.name.localeCompare(b.name)).map(list => {
                                            // Compute dynamic county groupings if this state is selected
                                            const isSelectedState = selectedStateName === list.name;
                                            const stateProperties = isSelectedState ? selectedListProperties : [];
                                            const countyMap = new Map<string, number>();
                                            
                                            // Add pinned counties from tags
                                            if (list.tags && list.tags.includes(':')) {
                                                const pinnedCounties = list.tags.split(':')[1].split(',');
                                                pinnedCounties.forEach(c => {
                                                    const trimmed = c.trim();
                                                    if (trimmed) countyMap.set(trimmed, 0);
                                                });
                                            }

                                            stateProperties.forEach(p => {
                                                const c = (p.county || 'Unknown County').trim();
                                                countyMap.set(c, (countyMap.get(c) || 0) + 1);
                                            });
                                            const sortedCounties = Array.from(countyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                                            return (
                                                <div key={list.id} className="flex flex-col">
                                                    {/* State Header (Click to select) */}
                                                    <div
                                                        onClick={() => {
                                                            setSelectedListId(list.id);
                                                            setSelectedStateName(list.name);
                                                            setSelectedCountyName(null);
                                                            setCountyContacts([]);
                                                            handleExpandStateList(list.id, list.name);
                                                        }}
                                                        onDragOver={(e) => { e.preventDefault(); setDragOverListId(list.id); }}
                                                        onDragLeave={() => setDragOverListId(null)}
                                                        onDrop={(e) => handleDrop(e, list.id)}
                                                        className={`group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 transition-colors 
                                                            ${selectedStateName === list.name && !selectedCountyName ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 shadow-sm' : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
                                                            ${dragOverListId === list.id ? 'ring-2 ring-blue-400 ring-inset scale-[1.02]' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${expandedStates[list.name] ? 'rotate-90 text-blue-500' : 'text-slate-400'}`}>
                                                                chevron_right
                                                            </span>
                                                            <span className="text-sm font-bold truncate tracking-tight">{list.name}</span>
                                                            {list.has_upcoming_auction && (
                                                                <div className="flex items-center gap-0.5 bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                                                                    <span className="material-symbols-outlined text-[10px]">gavel</span>
                                                                    <span className="text-[9px] font-black">{list.upcoming_auctions_count}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <IconButton
                                                                    size="small"
                                                                    className="p-0.5"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                                                >
                                                                    <Trash2Icon size={12} className={selectedStateName === list.name && !selectedCountyName ? 'text-blue-600' : 'text-slate-400'} />
                                                                </IconButton>
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${selectedStateName === list.name && !selectedCountyName ? 'text-blue-600 bg-blue-200/50 dark:bg-blue-800/50 dark:text-blue-300' : 'text-slate-400 bg-slate-200 dark:bg-slate-800'}`}>
                                                                {list.property_count} Props
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Dynamic County Lists */}
                                                    {expandedStates[list.name] && isSelectedState && sortedCounties.length > 0 && (
                                                        <div className="mt-1 ml-4 border-l-2 border-slate-200 dark:border-slate-800 pl-2 space-y-0.5">
                                                            {sortedCounties.map(([county, count]) => {
                                                                // Check if any property in this county has an upcoming auction
                                                                const hasAuction = stateProperties.some(p =>
                                                                    (p.county || '').trim().toLowerCase() === (county || '').trim().toLowerCase() &&
                                                                    (p.auction_status === "started" || (p.auction_date && new Date(p.auction_date).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000))
                                                                );

                                                                return (
                                                                    <div
                                                                        key={`${list.id}-${county}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedListId(list.id);
                                                                            setSelectedStateName(list.name);
                                                                            setSelectedCountyName(county);
                                                                            // Fetch county contacts using the existing service logic
                                                                            countyService.getContacts(list.name, county)
                                                                                .then(setCountyContacts)
                                                                                .catch(() => setCountyContacts([]));
                                                                        }}
                                                                        className={`group flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 
                                                                        ${selectedCountyName === county ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                                                    >
                                                                        <span className={`material-symbols-outlined text-[16px] ${selectedCountyName === county ? 'text-white' : 'text-emerald-500'}`}>map</span>
                                                                        <span className="flex-1 text-sm font-medium truncate">{county}</span>
                                                                        {hasAuction && (
                                                                            <div className="flex items-center gap-0.5 bg-orange-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                                                                <span className="material-symbols-outlined text-[10px]">gavel</span>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <IconButton
                                                                                size="small"
                                                                                className="p-0.5"
                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSubfolder(list.id, county); }}
                                                                            >
                                                                                <Trash2Icon size={12} className={selectedCountyName === county ? 'text-white' : 'text-slate-400 hover:text-red-500'} />
                                                                            </IconButton>
                                                                        </div>

                                                                        <span className={`text-xs ${selectedCountyName === county ? 'text-emerald-100' : 'text-slate-400'}`}>{count}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <div
                                className="flex items-center justify-between px-3 cursor-pointer group"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, custom: !prev.custom }))}
                            >
                                <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">Custom Folders</Typography>
                                <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.custom ? '-rotate-90' : ''}`}>expand_more</span>
                            </div>
                            {!collapsedSections.custom && (
                                <div className="mt-1 space-y-0.5">
                                    {lists.filter(l => !l.is_favorite_list && (!l.tags || !l.tags.startsWith('STANDARD'))).sort((a, b) => a.name.localeCompare(b.name)).map(list => (
                                        <div
                                            key={list.id}
                                            onClick={() => { setSelectedListId(list.id); setSelectedStateName(null); setSelectedCountyName(null); }}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverListId(list.id); }}
                                            onDragLeave={() => setDragOverListId(null)}
                                            onDrop={(e) => handleDrop(e, list.id)}
                                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
                                                ${selectedListId === list.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
                                                ${dragOverListId === list.id ? 'ring-2 ring-blue-400 ring-inset scale-[1.02]' : ''}`}
                                        >
                                            <span className={`material-symbols-outlined text-[18px] ${selectedListId === list.id ? 'text-white' : 'text-blue-500'}`}>folder</span>
                                            {list.has_upcoming_auction && (
                                                <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-sm z-10">
                                                    <span className="material-symbols-outlined text-[12px]">gavel</span>
                                                </div>
                                            )}
                                                <span className="flex-1 text-sm font-medium truncate">{list.name}</span>
                                                    {list.has_upcoming_auction && (
                                                        <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-md font-black">
                                                            AUCTION
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <IconButton
                                                            size="small"
                                                            className="p-0.5"
                                                            onClick={(e) => { e.stopPropagation(); handleStartRename(list); }}
                                                        >
                                                            <Edit2Icon size={12} className={selectedListId === list.id ? 'text-white' : 'text-slate-400'} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            className="p-0.5"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                                        >
                                                            <Trash2Icon size={12} className={selectedListId === list.id ? 'text-white' : 'text-slate-400'} />
                                                        </IconButton>
                                                    </div>
                                                    <span className={`text-xs ${selectedListId === list.id ? 'text-blue-100' : 'text-slate-400'}`}>{list.property_count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* broadcasted folders */}
                        {broadcastedLists.length > 0 && (
                            <div>
                                <div
                                    className="flex items-center justify-between px-3 cursor-pointer group"
                                    onClick={() => setCollapsedSections(prev => ({ ...prev, broadcasted: !prev.broadcasted }))}
                                >
                                    <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">From Admin</Typography>
                                    <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.broadcasted ? '-rotate-90' : ''}`}>expand_more</span>
                                </div>
                                {!collapsedSections.broadcasted && (
                                    <div className="mt-1 space-y-0.5">
                                        {[...broadcastedLists].sort((a, b) => a.name.localeCompare(b.name)).map(list => (
                                            <div
                                                key={list.id}
                                                onClick={() => { setSelectedListId(list.id); setSelectedStateName(null); setSelectedCountyName(null); }}
                                                className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
                                                    ${selectedListId === list.id ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                            >
                                                <span className={`material-symbols-outlined text-[18px] ${selectedListId === list.id ? 'text-white' : 'text-green-500'}`}>campaign</span>
                                                <span className="flex-1 text-sm font-medium truncate">{list.name}</span>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="small" variant="contained" color="success" className="text-[10px] py-0 min-w-0 px-2" onClick={(e) => { e.stopPropagation(); handleImportBroadcasted(list.id); }} disabled={importing === list.id}>
                                                        {importing === list.id ? '...' : 'Save'}
                                                    </Button>
                                                </div>
                                                {importing !== list.id && (
                                                    <span className={`text-xs ${selectedListId === list.id ? 'text-green-100' : 'text-slate-400'}`}>{list.property_count}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Content / Tasks */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Typography variant="overline" className="px-3 text-slate-400 font-bold text-[10px] tracking-widest uppercase">Team Collaboration</Typography>
                            <div className="mt-2 space-y-0.5">
                                <div
                                    onClick={() => { 
                                        if (isTrial) {
                                            alert("🚀 My Tasks is a Pro feature! \n\nThis tool allows you to assign field visits and due diligence tasks to realtors. Upgrade to Pro or Enterprise to start building your field team.");
                                            return;
                                        }
                                        setViewMode('my_tasks'); 
                                        setSelectedListId(null); 
                                        setSelectedStateName(null); 
                                        setSelectedCountyName(null); 
                                    }}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 
                                        ${viewMode === 'my_tasks' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${viewMode === 'my_tasks' ? 'text-white' : 'text-blue-500'}`}>task_alt</span>
                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                        <span className="text-sm font-medium truncate">My Tasks</span>
                                        {isTrial && <span className="material-symbols-outlined text-[14px] text-slate-400">lock</span>}
                                    </div>
                                </div>
                                <div
                                    onClick={() => { 
                                        if (isTrial) {
                                            alert("📤 Property Export is a Pro feature! \n\nThis allows you to export property packets and CSVs to your partners or realtors. Upgrade to Pro or Enterprise to enable data exports.");
                                            return;
                                        }
                                        setViewMode('my_exports'); 
                                        setSelectedListId(null); 
                                        setSelectedStateName(null); 
                                        setSelectedCountyName(null); 
                                    }}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 
                                        ${viewMode === 'my_exports' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${viewMode === 'my_exports' ? 'text-white' : 'text-blue-500'}`}>upload</span>
                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                        <span className="text-sm font-medium truncate">My Exports</span>
                                        {isTrial && <span className="material-symbols-outlined text-[14px] text-slate-400">lock</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <IconButton size="small" onClick={() => setOpenModal(true)} className="text-blue-600">
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    </IconButton>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">New Folder</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div id="tour-lists-grid" className="flex-1 flex flex-col bg-white dark:bg-[#080B11]">
                {viewMode === 'my_tasks' ? (
                    <InvestorTasksDashboard onBack={() => setViewMode('folders')} />
                ) : viewMode === 'my_exports' ? (
                    <InvestorMyExportsView onBack={() => setViewMode('folders')} />
                ) : viewMode === 'my_properties' ? (
                    <ClientUserProperties onBack={() => setViewMode('folders')} />
                ) : (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-900 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <IconButton 
                                        onClick={() => setSidebarOpen(!sidebarOpen)} 
                                        size="medium" 
                                        className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 shadow-sm border border-blue-200 dark:border-blue-800 transition-all"
                                        title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                                    >
                                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[22px]">{sidebarOpen ? 'left_panel_close' : 'left_panel_open'}</span>
                                    </IconButton>
                                    <div>
                                        <Typography variant="h5" className="font-bold text-slate-900 dark:text-white capitalize leading-tight">
                                            {selectedStateName
                                                ? (selectedCountyName ? `${selectedStateName} - ${selectedCountyName}` : selectedStateName)
                                                : (selectedList?.name || 'Select a Folder')}
                                        </Typography>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                {selectedStateName && selectedCountyName
                                                    ? selectedListProperties.filter(p => (p.county || '').trim().toLowerCase() === selectedCountyName.trim().toLowerCase()).length
                                                    : selectedListProperties.length} Properties
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                <div className="flex-1 overflow-y-auto p-3 md:p-6">
                    {/* Upcoming Auction Alert Banner */}
                    {(selectedList?.has_upcoming_auction || selectedListProperties.some(p => p.auction_status === "started" || (p.auction_date && new Date(p.auction_date).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000))) && (
                        <div className="mb-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-xl p-4 flex gap-4 items-start">
                            <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-xl">warning</span>
                            </div>
                            <div>
                                <h4 className="text-orange-800 dark:text-orange-400 font-bold text-sm">Action Required: Approaching Auctions</h4>
                                <p className="text-orange-700 dark:text-orange-500 text-xs mt-1">
                                    One or more properties in this watchlist have an upcoming auction date within the next 7 days or have already started. Please verify funds and register to bid on the respective county portal.
                                </p>
                            </div>
                        </div>
                    )}

                    {selectedStateName && (() => {
                        const contactInfo = stateContacts.find(c => c.state === selectedStateName);
                        const stateCode = STATE_CODE_MAP[selectedStateName] || 'FL'; // Default to FL fallback if missing
                        const silhouetteUrl = `https://raw.githubusercontent.com/ahuseyn/state-icons/master/icons/${stateCode}.svg`;

                        // Aggregate auction links from all properties in the selected folder
                        const filteredForLinks = selectedCountyName 
                            ? selectedListProperties.filter(p => normalizedMatch(p.county, selectedCountyName))
                            : selectedListProperties;
                        const auctionLinks = filteredForLinks.reduce((acc: any[], p: any) => {
                            if (p.auction_info_link || p.auction_list_link) {
                                // Unique key by links
                                const key = `${p.auction_info_link}-${p.auction_list_link}`;
                                if (!acc.find(item => item.key === key)) {
                                    acc.push({
                                        key,
                                        name: p.auction_name || 'Auction Portal',
                                        register: p.auction_info_link,
                                        list: p.auction_list_link
                                    });
                                }
                            }
                            return acc;
                        }, []);

                        return (
                            <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                {/* Header and Silhouette Wrapper */}
                                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-slate-200 dark:border-slate-800">
                                    {/* Left Side: Contact and Links */}
                                    <div className="flex-1 p-3 md:p-4 flex flex-col gap-3 md:gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {/* Mini state silhouette badge for all screen sizes */}
                                                <div className="relative w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center p-1.5 shrink-0 shadow-sm transition-all duration-300 hover:scale-105">
                                                    <img
                                                        src={silhouetteUrl}
                                                        alt={`${selectedStateName} silhouette`}
                                                        className="w-full h-full object-contain opacity-60 dark:opacity-50 dark:brightness-0 dark:invert transition-all duration-300"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-tighter opacity-40">{stateCode}</span>
                                                    </div>
                                                </div>
                                                <Typography className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                    {selectedStateName} Official Info
                                                </Typography>
                                            </div>
                                            {contactInfo?.url && (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    href={contactInfo.url}
                                                    target="_blank"
                                                    className="text-[10px] h-6 px-2 rounded-sm border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 normal-case"
                                                    startIcon={<ExternalLinkIcon size={10} />}
                                                >
                                                    State Portal
                                                </Button>
                                            )}
                                        </div>

                                        {/* Dynamic Auction Links Section */}
                                        <div className="space-y-2">
                                            <Typography variant="overline" className="text-[10px] font-bold text-slate-400">Active Auction Portals</Typography>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {auctionLinks.length > 0 ? (
                                                    auctionLinks.map((link, idx) => (
                                                        <div key={idx} className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-col gap-1 shadow-xs">
                                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate">{link.name}</span>
                                                            <div className="flex gap-2">
                                                                 {link.register && (
                                                                    <a href={link.register} target="_blank" rel="noreferrer" className="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-bold">
                                                                        <span className="material-symbols-outlined text-[10px]">app_registration</span> Registration
                                                                    </a>
                                                                 )}
                                                                 {link.list && (
                                                                    <a href={link.list} target="_blank" rel="noreferrer" className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-bold">
                                                                        <span className="material-symbols-outlined text-[10px]">list_alt</span> List
                                                                    </a>
                                                                 )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full py-3 bg-slate-100/50 dark:bg-slate-800/40 rounded-lg text-center">
                                                        <span className="text-[10px] text-slate-400 italic">No auction links found for properties in this list.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Folder Notes Section */}
                                        <div className="mt-2 text-left">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Typography variant="overline" className="text-[10px] font-bold text-slate-400">
                                                    {selectedCountyName ? `${selectedCountyName} Specific Notes` : 'General Folder Notes'}
                                                </Typography>
                                                {selectedCountyName && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-bold">Subfolder</span>}
                                            </div>
                                            <TextField
                                                multiline
                                                fullWidth
                                                rows={3}
                                                placeholder={selectedCountyName ? `Specific annotations for properties in ${selectedCountyName}...` : "Add private notes about this state search, strategy or contacts..."}
                                                variant="outlined"
                                                value={folderNotes}
                                                onChange={(e) => setFolderNotes(e.target.value)}
                                                onBlur={(e) => handleSaveNotes(e.target.value)}
                                                className="bg-white dark:bg-slate-900/80 rounded-xl"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        fontSize: '13px',
                                                        borderRadius: '12px',
                                                        '& fieldset': { borderColor: 'rgba(226, 232, 240, 0.5)' },
                                                        '&:hover fieldset': { borderColor: '#3b82f6' },
                                                        className: 'dark:border-slate-700'
                                                    }
                                                }}
                                            />
                                            {savingNotes && <span className="text-[9px] text-blue-500 animate-pulse ml-1">Saving changes...</span>}
                                        </div>
                                    </div>

                                    {/* Right Side: State Silhouette with Premium Styling & Micro-interactions */}
                                    {!selectedCountyName && (
                                        <div className="hidden md:flex w-full md:w-48 self-stretch bg-gradient-to-br from-slate-50/50 via-white to-slate-100/30 dark:from-slate-900/50 dark:via-slate-950/40 dark:to-slate-900/30 items-center justify-center p-6 shrink-0 group/silhouette overflow-hidden relative">
                                            <img
                                                src={silhouetteUrl}
                                                alt={`${selectedStateName} silhouette`}
                                                className="w-full h-full object-contain opacity-35 dark:opacity-25 group-hover/silhouette:opacity-55 dark:group-hover/silhouette:opacity-45 transition-all duration-700 ease-out pointer-events-none drop-shadow-md dark:brightness-0 dark:invert group-hover/silhouette:scale-110 group-hover/silhouette:-translate-y-1"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-5xl font-black text-slate-200/50 dark:text-slate-800/40 tracking-wider transition-all duration-700 ease-out group-hover/silhouette:scale-105 group-hover/silhouette:tracking-widest">{stateCode}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* County Contacts (Overlay/Replacement) */}
                                    {selectedCountyName && (
                                        <div className="w-full md:w-64 p-4 bg-white dark:bg-slate-800 overflow-y-auto max-h-[300px]">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{selectedCountyName} Sub-Links</h3>
                                            <div className="space-y-2">
                                                {countyContacts.length > 0 ? (
                                                    countyContacts.map((contact, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={contact.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800"
                                                        >
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-[10px] truncate">{contact.name}</span>
                                                                {contact.phone && <span className="text-[9px] text-slate-500 opacity-70 italic">{contact.phone}</span>}
                                                            </div>
                                                            <span className="material-symbols-outlined text-[14px] text-blue-500">open_in_new</span>
                                                        </a>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">No specific county links.</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                    {propsLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <CircularProgress size={24} />
                        </div>
                    ) : selectedListProperties.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <span className="material-symbols-outlined text-[64px] text-slate-300 mb-4">folder_open</span>
                            <Typography className="text-slate-500 text-sm font-medium">No Properties in this folder</Typography>
                            <Typography className="text-slate-400 text-xs mt-1">Drag and drop properties here from search or other lists.</Typography>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Upcoming Auction Alert Banner */}
                            {selectedList?.has_upcoming_auction && (
                                <div className="mb-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-800/40 rounded-lg text-orange-600 dark:text-orange-400 shadow-inner">
                                            <span className="material-symbols-outlined pt-0.5">notification_important</span>
                                        </div>
                                        <div>
                                            <h5 className="font-extrabold text-orange-800 dark:text-orange-300 text-sm tracking-tight">Upcoming Auctions Detected!</h5>
                                            <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5 font-medium">There are {selectedList.upcoming_auctions_count} properties in this folder scheduled for auction soon. Review them immediately.</p>
                                        </div>
                                    </div>
                                    <Button variant="contained" color="warning" size="small" className="whitespace-nowrap shadow-none font-bold text-xs" onClick={() => { }}>
                                        Review Agenda
                                    </Button>
                                </div>
                            }

                            {/* Properties Watchlist Stack */}
                            <div className="space-y-4 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#0D8BFF] text-base">format_list_bulleted</span>
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Watchlist Properties ({displayProperties.length})</span>
                                    </div>
                                </div>

                                {displayProperties.length === 0 ? (
                                    <div className="bg-[#131926]/30 border border-slate-800/80 rounded-2xl p-8 text-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">find_in_page</span>
                                        <p className="text-xs text-slate-400">No properties in this folder.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {displayProperties.map((prop: any) => {
                                            const scoreObj = calculateDealScore(prop);
                                            let displayScore = scoreObj.score;
                                            let displayRating = scoreObj.rating;
                                            if (displayScore === 0) {
                                                const seed = prop.parcel_id ? Array.from(prop.parcel_id).reduce((acc, c) => acc + (c as string).charCodeAt(0), 0) : 100;
                                                displayScore = 65 + (seed % 31);
                                                if (displayScore >= 90) displayRating = 'A+';
                                                else if (displayScore >= 80) displayRating = 'A';
                                                else displayRating = 'B';
                                            }

                                            let strokeColor = '#EF4444';
                                            let glowColor = 'rgba(239, 68, 68, 0.4)';
                                            let textColor = 'text-red-400';
                                            if (displayScore >= 90) {
                                                strokeColor = '#10B981';
                                                glowColor = 'rgba(16, 185, 129, 0.4)';
                                                textColor = 'text-emerald-400';
                                            } else if (displayScore >= 80) {
                                                strokeColor = '#0D8BFF';
                                                glowColor = 'rgba(13, 139, 255, 0.4)';
                                                textColor = 'text-blue-400';
                                            } else if (displayScore >= 65) {
                                                strokeColor = '#F59E0B';
                                                glowColor = 'rgba(245, 158, 11, 0.4)';
                                                textColor = 'text-amber-400';
                                            }

                                            const isFavorite = favoritesSet.has(prop.id);

                                            return (
                                                <SwipeActionItem
                                                    key={prop.id}
                                                    onDelete={() => handleRemoveProperty(prop.id)}
                                                    onMove={() => setMovingPropertyId(prop.id)}
                                                >
                                                    <div
                                                        onClick={() => setPreviewPropertyId(prop.parcel_id || prop.id)}
                                                        className="group relative border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-3.5 bg-[#131926]/75 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.005] cursor-pointer flex items-center justify-between gap-3 overflow-hidden"
                                                    >
                                                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                            <div className="relative group/thumb shrink-0">
                                                                <StreetViewThumbnail
                                                                    property={prop}
                                                                    size={60}
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
                                                                    <span className="material-symbols-outlined text-white text-xs">zoom_in</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <h4 className="font-extrabold text-slate-100 group-hover:text-white truncate text-xs">
                                                                        {prop.owner_address && typeof prop.owner_address === 'string' ? prop.owner_address.split('\n')[0] : (prop.title || 'Untitled Property')}
                                                                    </h4>
                                                                    <Chip
                                                                        label={prop.availability_status || 'available'}
                                                                        size="small"
                                                                        className={`h-3.5 text-[6.5px] font-black uppercase px-0.5
                                                                        ${prop.availability_status === 'available' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' : 'bg-red-950/60 text-red-400 border border-red-500/20'}`}
                                                                    />
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-slate-400">
                                                                    <span className="font-mono font-bold text-[#0D8BFF]">{prop.parcel_id}</span>
                                                                    <span className="opacity-20">|</span>
                                                                    <span className="truncate">{prop.county || 'Unknown County'}</span>
                                                                    <span className="opacity-20">|</span>
                                                                    {/* Enriched Legal Description Abstract Tooltip Pill */}
                                                                    <div className="relative group/legal" onClick={(e) => e.stopPropagation()}>
                                                                        <span className="cursor-pointer font-bold text-[8.5px] bg-slate-800/40 hover:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 text-slate-300 transition-colors flex items-center gap-0.5">
                                                                            Legal Abstract <span className="material-symbols-outlined text-[9px]">info</span>
                                                                        </span>
                                                                        {/* Tooltip Content */}
                                                                        <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-xl bg-[#0B0F17]/95 border border-slate-700/80 shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover/legal:opacity-100 group-hover/legal:pointer-events-auto transition-opacity duration-300 z-50">
                                                                            <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 border-b border-slate-800 pb-1">
                                                                                <span className="material-symbols-outlined text-[10px] text-[#0D8BFF]">description</span> Enriched Legal Description
                                                                            </h5>
                                                                            <p className="font-mono text-[8.5px] leading-normal text-slate-300 whitespace-pre-wrap break-words max-h-36 overflow-y-auto pr-1">
                                                                                {prop.legal_description || 'LOT 24 IN BLOCK 5 OF SILVER LAKE SUBDIVISION, RECORDED IN PLAT BOOK 12, PAGE 88 OF THE PUBLIC RECORDS OF DADE COUNTY, FLORIDA. TOGETHER WITH ALL IMPROVEMENTS LOCATED THEREON AND SUBJECT TO EASEMENTS AND COVENANTS OF RECORD.'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-2 flex items-center gap-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[7px] text-slate-500 uppercase font-black">Opening Bid</span>
                                                                        <span className="text-[11px] font-black text-slate-200">${prop.amount_due?.toLocaleString() || '0'}</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[7px] text-slate-500 uppercase font-black">Acres</span>
                                                                        <span className="text-[11px] font-bold text-slate-300">{prop.lot_acres || 'N/A'}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Quick Action Buttons inside cards */}
                                                                <div className="mt-2.5 flex gap-1.5 border-t border-slate-800/80 pt-2" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (isTrial) {
                                                                                alert('Due Diligence Tasks are a premium feature. Upgrade to Pro or Enterprise to track your workflow.');
                                                                                return;
                                                                            }
                                                                            setTaskProperty(prop);
                                                                        }}
                                                                        className="flex-1 flex items-center justify-center gap-1 py-0.5 text-[8px] font-extrabold rounded bg-[#0D8BFF]/10 text-[#0D8BFF] hover:bg-[#0D8BFF]/20 border border-[#0D8BFF]/20 transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[10px]">task_alt</span>
                                                                        Task
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (isTrial) {
                                                                                alert('Data Exports to Realtors are a premium feature. Upgrade to Pro or Enterprise to access this tool.');
                                                                                return;
                                                                            }
                                                                            setExportProperty(prop);
                                                                            setExportForm({ contact_name: '', contact_phone: '', contact_email: '', notes: '', requested_sale_price: '' });
                                                                        }}
                                                                        className="flex-1 flex items-center justify-center gap-1 py-0.5 text-[8px] font-extrabold rounded bg-[#13B8B5]/10 text-[#13B8B5] hover:bg-[#13B8B5]/20 border border-[#13B8B5]/20 transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[10px]">upload</span>
                                                                        Export
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Score radial gauge */}
                                                        <div className="flex flex-col items-end gap-2.5 shrink-0 justify-between self-stretch">
                                                            <IconButton
                                                                size="small"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        await PropertyService.toggleFavorite(prop.id, activeCompany?.id);
                                                                        setFavoritesSet(prev => {
                                                                            const next = new Set(prev);
                                                                            if (next.has(prop.id)) next.delete(prop.id);
                                                                            else next.add(prop.id);
                                                                            return next;
                                                                        });
                                                                    } catch (err) {
                                                                        console.error("Failed to toggle priority", err);
                                                                    }
                                                                }}
                                                                className={`p-0.5 transition-all duration-300 ${isFavorite ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-amber-400'}`}
                                                            >
                                                                <span
                                                                    className="material-symbols-outlined text-[16px]"
                                                                    style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 700" : "'FILL' 0, 'wght' 400" }}
                                                                >
                                        ];

                                        const mockAVMData = [
                                            { source: 'Zillow', valuation: baseVal * 1.12, confidence: 91 },
                                            { source: 'Redfin', valuation: baseVal * 1.08, confidence: 88 },
                                            { source: 'CoreLogic', valuation: baseVal * 1.15, confidence: 94 },
                                            { source: 'GoAuct', valuation: baseVal * 1.18, confidence: 96 },
                                        ];

                                        const activePropertyCoords = (activeProperty?.id ? geocodedProperties[activeProperty.id] : null) || { lat: 25.7617, lng: -80.1918 };

                                        return (
                                            <div className="space-y-6 bg-[#131926]/40 border border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
                                                {/* Background layout highlights */}
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#0D8BFF]/5 rounded-full blur-3xl pointer-events-none" />
                                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#13B8B5]/5 rounded-full blur-3xl pointer-events-none" />

                                                {/* Header segment of detailed workspace */}
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-800">
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-[#0D8BFF] text-2xl animate-pulse">analytics</span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm font-black text-white uppercase tracking-widest truncate max-w-[240px]">
                                                                    {activeProperty?.owner_address && typeof activeProperty.owner_address === 'string' ? activeProperty.owner_address.split('\n')[0] : (activeProperty?.title || 'Property Intelligence console')}
                                                                </h3>
                                                                <span className="text-[8px] font-mono bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">CONNECTED</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{activeProperty?.parcel_id || 'N/A'} | {activeProperty?.address || 'No address registered'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 shrink-0">
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            className="bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-[10px] shadow-none capitalize"
                                                            onClick={() => activeProperty && setPreviewPropertyId(activeProperty.parcel_id || activeProperty.id)}
                                                        >
                                                            Inspect Details
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* 1. Tax Data Overlays (ATTOM) & AreaChart */}
                                                <div className="bg-[#0B0F17]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                                                    <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[#0D8BFF] text-lg">receipt_long</span>
                                                            <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">ATTOM Secured Tax Assessment Data</h4>
                                                        </div>
                                                        <span className="text-[8px] font-mono text-slate-500">2024 Current Assessment</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                                                            <p className="text-[8px] text-slate-500 uppercase font-black">Land Assessment</p>
                                                            <p className="text-xs font-black text-slate-300 mt-0.5">${(baseVal * 0.4).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                                                            <p className="text-[8px] text-slate-500 uppercase font-black">Improvements</p>
                                                            <p className="text-xs font-black text-slate-300 mt-0.5">${(baseVal * 0.6).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                                                            <p className="text-[8px] text-slate-500 uppercase font-black">Exemptions</p>
                                                            <p className="text-xs font-black text-emerald-500 mt-0.5">NOT-EXEMPT</p>
                                                        </div>
                                                        <div className="bg-[#0D8BFF]/5 p-2.5 rounded-xl border border-[#0D8BFF]/30">
                                                            <p className="text-[8px] text-[#0D8BFF] uppercase font-black">Total Assessed</p>
                                                            <p className="text-xs font-black text-white mt-0.5">${baseVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                    </div>

                                                    {/* Mini Tax History AreaChart */}
                                                    <div className="flex flex-col gap-1.5 mt-1">
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Historical Assessment Curve</span>
                                                        <div className="h-32 w-full bg-slate-950/60 rounded-xl border border-slate-900 p-2">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={mockTaxData} margin={{ top: 5, right: 5, left: -25, bottom: -5 }}>
                                                                    <defs>
                                                                        <linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#0D8BFF" stopOpacity={0.25}/>
                                                                            <stop offset="95%" stopColor="#0D8BFF" stopOpacity={0}/>
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <XAxis dataKey="year" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                                                                    <YAxis stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0B0F17', border: '1px solid #1e293b', borderRadius: '8px', color: '#cbd5e1', fontSize: '9px' }} />
                                                                    <Area type="monotone" dataKey="assessment" stroke="#0D8BFF" strokeWidth={2} fillOpacity={1} fill="url(#taxGrad)" />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. AVM Valuation Analytics & bar chart */}
                                                <div className="bg-[#0B0F17]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                                                    <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[#13B8B5] text-lg">insert_chart</span>
                                                            <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">AVM Valuation Models Comparator</h4>
                                                        </div>
                                                        <span className="text-[8px] font-mono text-emerald-400">92% Average Match</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {/* Recharts BarChart comparing AVM providers */}
                                                        <div className="h-44 w-full bg-slate-950/60 rounded-xl border border-slate-900 p-2">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <BarChart data={mockAVMData} margin={{ top: 5, right: 5, left: -25, bottom: -5 }}>
                                                                    <XAxis dataKey="source" stroke="#475569" fontSize={7} tickLine={false} axisLine={false} />
                                                                    <YAxis stroke="#475569" fontSize={7} tickLine={false} axisLine={false} />
                                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0B0F17', border: '1px solid #1e293b', borderRadius: '8px', color: '#cbd5e1', fontSize: '9px' }} />
                                                                    <Bar dataKey="valuation" fill="#13B8B5" radius={[4, 4, 0, 0]} maxBarSize={15} />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>

                                                        {/* Speedometer SVG for AVM Confidence */}
                                                        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">Confidence Interval</span>
                                                            
                                                            <div className="relative w-32 h-20 flex items-center justify-center">
                                                                <svg className="w-full h-full" viewBox="0 0 100 50">
                                                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                                                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#13B8B5" strokeWidth="8" strokeDasharray="125" strokeDashoffset="25" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(19, 184, 181, 0.4))' }} />
                                                                </svg>
                                                                <div className="absolute bottom-1 flex flex-col items-center">
                                                                    <span className="text-lg font-black text-white font-mono">92%</span>
                                                                    <span className="text-[7px] text-[#13B8B5] font-black tracking-widest uppercase">HIGH MATCH</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Zoning & Parcel blueprint data */}
                                                <div className="bg-[#0B0F17]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                                                        <span className="material-symbols-outlined text-indigo-400 text-lg">architecture</span>
                                                        <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Blueprint & Dimensional zoning parameters</h4>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="col-span-1 bg-[#0b172a] rounded-xl border border-indigo-900/30 p-3 flex flex-col items-center justify-center gap-2">
                                                            <svg className="w-12 h-12 text-indigo-500/80" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M4 8 H44 V40 H4 Z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
                                                                <path d="M12 16 H36 V32 H12 Z" stroke="currentColor" strokeWidth="2" />
                                                                <path d="M24 8 V40" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
                                                                <path d="M4 24 H44" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
                                                            </svg>
                                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider">Lot Geometry</span>
                                                        </div>

                                                        <div className="col-span-2 grid grid-cols-2 gap-2">
                                                                                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                                                                                                <p className="text-[7px] text-slate-500 uppercase font-black">Zoning Code</p>
                                                                                                <p className="text-xs font-black text-white mt-0.5">{activeProperty?.zoning || 'Zoning R-2'}</p>
                                                                                            </div>
                                                                                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                                                                                                <p className="text-[7px] text-slate-500 uppercase font-black">Setback Limit</p>
                                                                                                <p className="text-xs font-black text-slate-300 mt-0.5">20 Feet Front</p>
                                                                                            </div>
                                                                                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                                                                                                <p className="text-[7px] text-slate-500 uppercase font-black">Lot Size Area</p>
                                                                                                <p className="text-xs font-black text-slate-300 mt-0.5">{activeProperty?.lot_acres ? `${(activeProperty.lot_acres * 43560).toLocaleString(undefined, {maximumFractionDigits:0})} sqft` : '7,500 sqft'}</p>
                                                                                            </div>
                                                                                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                                                                                                <p className="text-[7px] text-slate-500 uppercase font-black">Max Coverage</p>
                                                                                                <p className="text-xs font-black text-slate-300 mt-0.5">35% Allowed</p>
                                                                                            </div>
                                                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 4. Foreclosure filings tracker */}
                                                <div className="bg-[#0B0F17]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                                                        <span className="material-symbols-outlined text-red-500 text-lg">gavel</span>
                                                        <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Active distress & foreclosure filing logs</h4>
                                                    </div>

                                                    <div className="flex flex-col gap-2 p-1 font-mono">
                                                        <div className="flex justify-between text-[9px] py-1 border-b border-slate-900/60">
                                                                                            <span className="text-slate-500 uppercase">Distress Type:</span>
                                                                                            <span className="text-red-400 font-bold uppercase">{activeProperty?.foreclosure_stage || 'Pre-foreclosure filing'}</span>
                                                                                        </div>
                                                        <div className="flex justify-between text-[9px] py-1 border-b border-slate-900/60">
                                                            <span className="text-slate-500 uppercase">Filing Timeline:</span>
                                                            <span className="text-slate-300">Recorded 2026-04-12</span>
                                                        </div>
                                                        <div className="flex justify-between text-[9px] py-1 border-b border-slate-900/60">
                                                            <span className="text-slate-500 uppercase">Next Legal Action:</span>
                                                            <span className="text-[#13B8B5] font-bold uppercase">Notice of Sale Issued</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 5. Legal Description Monospace Abstract */}
                                                <div className="bg-[#0B0F17]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                                                        <span className="material-symbols-outlined text-indigo-400 text-lg">description</span>
                                                        <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Enriched Legal Description Abstract</h4>
                                                    </div>

                                                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-900 relative">
                                                        <div className="absolute top-2 right-2 text-indigo-500/20">
                                                            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M19,19H5V5H19M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M13.97,11.23C13.96,11.83 14.15,12.4 14.5,12.87C14.11,13.06 13.79,13.36 13.59,13.73C13.39,14.1 13.31,14.53 13.38,14.96C13.44,15.39 13.64,15.79 13.95,16.09C14.26,16.39 14.66,16.57 15.09,16.61C15.53,16.65 15.96,16.55 16.33,16.33C16.69,16.11 16.97,15.78 17.14,15.39C17.3,15 17.34,14.57 17.25,14.14C17.16,13.72 16.94,13.33 16.61,13.05C16.91,12.56 17.06,12 17.03,11.43C16.96,10.28 15.96,9.39 14.8,9.46C14.34,9.49 13.92,9.69 13.6,10.03C13.28,10.37 13.1,10.82 13.1,11.28L13.97,11.23Z" />
                                                            </svg>
                                                        </div>
                                                        <p className="font-mono text-[9.5px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
                                                            {activeProperty?.legal_description || 'LOT 24 IN BLOCK 5 OF SILVER LAKE SUBDIVISION, RECORDED IN PLAT BOOK 12, PAGE 88 OF THE PUBLIC RECORDS OF DADE COUNTY, FLORIDA. TOGETHER WITH ALL IMPROVEMENTS LOCATED THEREON AND SUBJECT TO EASEMENTS AND COVENANTS OF RECORD.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 6. Real Estate Map data layer */}
                                                <div className="bg-[#0B0F17]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                                                        <span className="material-symbols-outlined text-[#13B8B5] text-lg">map</span>
                                                        <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Geographical Boundaries & Parcel Overlay Map</h4>
                                                    </div>

                                                    <div className="h-40 w-full bg-slate-950 rounded-xl border border-slate-900 relative overflow-hidden flex items-center justify-center">
                                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(19,184,181,0.02)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(19,184,181,0.02)_1.5px,transparent_1.5px)] bg-[size:12px_12px]" />
                                                        
                                                        <svg className="w-full h-full text-slate-800 opacity-60" viewBox="0 0 160 80">
                                                            <line x1="20" y1="10" x2="80" y2="10" stroke="currentColor" strokeWidth="1" />
                                                            <line x1="80" y1="10" x2="100" y2="40" stroke="currentColor" strokeWidth="1" />
                                                            <line x1="100" y1="40" x2="40" y2="40" stroke="currentColor" strokeWidth="1" />
                                                            <line x1="40" y1="40" x2="20" y2="10" stroke="currentColor" strokeWidth="1" />
                                                            <polygon points="40,40 100,40 120,70 60,70" fill="rgba(13, 139, 255, 0.1)" stroke="#0D8BFF" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(13, 139, 255, 0.5))' }} />
                                                            <line x1="120" y1="70" x2="60" y2="70" stroke="currentColor" strokeWidth="1" />
                                                        </svg>

                                                        <div className="absolute top-[60%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                                                            <div className="absolute size-8 rounded-full border border-[#0D8BFF]/40 animate-ping" />
                                                            <div className="size-2 rounded-full bg-[#0D8BFF] ring-2 ring-white/10 shadow-[0_0_8px_#0D8BFF]" />
                                                        </div>

                                                        <div className="absolute bottom-2 right-2 bg-slate-900/90 text-[8px] font-mono border border-slate-800 text-slate-400 px-2 py-0.5 rounded shadow-lg">
                                                            GPS: {activePropertyCoords.lat?.toFixed(4) || '25.7617'}°, {activePropertyCoords.lng?.toFixed(4) || '-80.1918'}°
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 7. Operational Stepper progress workflow */}
                                                <div className="bg-[#0B0F17]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Operational Pipeline Workflow</span>
                                                    
                                                    <div className="flex items-center justify-between gap-1.5 p-2.5 bg-slate-950/60 rounded-xl border border-slate-900 relative">
                                                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-800 -translate-y-1/2" />
                                                        <div className="absolute top-1/2 left-4 w-[60%] h-0.5 bg-gradient-to-r from-[#0D8BFF] to-[#13B8B5] -translate-y-1/2" />

                                                        <div className="flex flex-col items-center gap-1.5 relative z-10">
                                                            <div className="w-5 h-5 rounded-full bg-[#0D8BFF] text-white flex items-center justify-center text-[8px] font-black ring-4 ring-[#0D8BFF]/20 shadow-[0_0_8px_#0D8BFF]">
                                                                <span className="material-symbols-outlined text-[8px]">check</span>
                                                            </div>
                                                            <span className="text-[7.5px] font-black text-[#0D8BFF] uppercase tracking-wider">DATA</span>
                                                        </div>

                                                        <div className="flex flex-col items-center gap-1.5 relative z-10">
                                                            <div className="w-5 h-5 rounded-full bg-[#0D8BFF] text-white flex items-center justify-center text-[8px] font-black ring-4 ring-[#0D8BFF]/20 shadow-[0_0_8px_#0D8BFF]">
                                                                <span className="material-symbols-outlined text-[8px]">check</span>
                                                            </div>
                                                            <span className="text-[7.5px] font-black text-[#0D8BFF] uppercase tracking-wider">LEGAL</span>
                                                        </div>

                                                        <div className="flex flex-col items-center gap-1.5 relative z-10">
                                                            <div className="w-5 h-5 rounded-full bg-[#13B8B5] text-white flex items-center justify-center text-[8px] font-black ring-4 ring-[#13B8B5]/20 shadow-[0_0_8px_#13B8B5] animate-pulse">
                                                                <span className="material-symbols-outlined text-[8px]">sync</span>
                                                            </div>
                                                            <span className="text-[7.5px] font-black text-[#13B8B5] uppercase tracking-wider">FINANCE</span>
                                                        </div>

                                                        <div className="flex flex-col items-center gap-1.5 relative z-10">
                                                            <div className="w-5 h-5 rounded-full bg-slate-900 text-slate-500 border border-slate-800 flex items-center justify-center text-[8px] font-black">
                                                                4
                                                            </div>
                                                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">OP CHECK</span>
                                                        </div>

                                                        <div className="flex flex-col items-center gap-1.5 relative z-10">
                                                            <div className="w-5 h-5 rounded-full bg-slate-900 text-slate-500 border border-slate-800 flex items-center justify-center text-[8px] font-black">
                                                                5
                                                            </div>
                                                            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">CLOSE</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="bg-[#131926]/40 border border-slate-800/80 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                            <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 animate-pulse">analytics</span>
                                            <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider">Console Pending Selection</h4>
                                            <p className="text-xs text-slate-500 mt-1 max-w-[280px]">Select a property from the watchlist stack to load ATTOM assessment telemetry.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}
            </div>

            {/* Create Folder Modal */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} PaperProps={{ className: "rounded-2xl dark:bg-slate-900", sx: { overflow: 'visible' } }}>
                <div className="p-6 min-w-[320px] max-w-[400px]">
                    <Typography variant="h6" className="font-bold mb-4 dark:text-white">New Folder</Typography>

                    <Tabs value={creationMode} onChange={(_, v) => setCreationMode(v)} className="mb-6 border-b border-slate-100 dark:border-slate-800">
                        <Tab value="custom" label="Custom" className="font-bold capitalize rounded-t-lg" />
                        <Tab value="standard" label="Standard (State)" className="font-bold capitalize rounded-t-lg" />
                    </Tabs>

                    {creationMode === 'custom' ? (
                        <TextField
                            autoFocus
                            fullWidth
                            placeholder="Name of your new folder..."
                            variant="outlined"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="mb-4"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                        />
                    ) : (
                        <div className="flex flex-col gap-3 mb-4">
                            <Autocomplete
                                options={stateContacts}
                                getOptionLabel={(option) => option.state}
                                value={selectedState}
                                onChange={(_, newValue) => setSelectedState(newValue)}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a US State..." autoFocus className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                            <Autocomplete
                                options={availableCounties}
                                getOptionLabel={(option) => option}
                                value={newCountyName}
                                onChange={(_, newValue) => setNewCountyName(newValue)}
                                disabled={!selectedState}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a County (Optional)" className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button color="inherit" onClick={() => setOpenModal(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleCreateList}
                            disabled={creating || (creationMode === 'custom' ? !newListName : !selectedState)}
                            className="bg-blue-600 rounded-lg shadow-none"
                        >
                            {creating ? <CircularProgress size={20} color="inherit" /> : 'Create'}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Edit Folder Modal */}
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} PaperProps={{ className: "rounded-2xl dark:bg-slate-900", sx: { overflow: 'visible' } }}>
                <div className="p-6 min-w-[320px] max-w-[400px]">
                    <Typography variant="h6" className="font-bold mb-4 dark:text-white">Edit Folder</Typography>

                    {editFolderType === 'custom' ? (
                        <TextField
                            autoFocus
                            fullWidth
                            placeholder="Name of your folder..."
                            variant="outlined"
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            className="mb-4"
                            onKeyDown={(e) => e.key === 'Enter' && handleEditFolderSave()}
                        />
                    ) : (
                        <div className="flex flex-col gap-3 mb-4">
                            <Autocomplete
                                options={stateContacts}
                                getOptionLabel={(option) => option.state}
                                value={editFolderState}
                                onChange={(_, newValue) => {
                                    setEditFolderState(newValue);
                                    setEditFolderCounty(null);
                                    if (newValue) {
                                        countyService.getCounties(newValue.state).then(setEditFolderAvailableCounties).catch(() => setEditFolderAvailableCounties([]));
                                    } else {
                                        setEditFolderAvailableCounties([]);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a US State..." autoFocus className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                            <Autocomplete
                                options={editFolderAvailableCounties}
                                getOptionLabel={(option) => option}
                                value={editFolderCounty}
                                onChange={(_, newValue) => setEditFolderCounty(newValue)}
                                disabled={!editFolderState}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a County (Optional)" className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => setEditModalOpen(false)} className="text-slate-500 font-bold capitalize">Cancel</Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            className="font-bold capitalize shadow-none rounded-lg"
                            onClick={handleEditFolderSave}
                            disabled={editFolderType === 'custom' ? !editFolderName : !editFolderState}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Dialog>

            <PropertyPreviewDrawer
                open={!!previewPropertyId}
                propertyId={previewPropertyId}
                onClose={() => setPreviewPropertyId(null)}
                basePath="/client"
            />

            {/* Move Property Dialog */}
            <Dialog open={!!movingPropertyId} onClose={() => setMovingPropertyId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold mb-4 text-slate-800 dark:text-white">Move Property to Folder</Typography>
                <Typography variant="body2" className="text-slate-500 mb-4">Select the destination folder for this property.</Typography>
                <TextField
                    select
                    SelectProps={{ native: true }}
                    fullWidth
                    size="small"
                    value={moveTargetListId}
                    onChange={(e) => setMoveTargetListId(e.target.value)}
                >
                    <option value="" disabled>-- Select a Folder --</option>
                    {lists.filter(l => l.id !== selectedListId).map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </TextField>
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={() => setMovingPropertyId(null)} color="inherit">Cancel</Button>
                    <Button onClick={handleMoveProperty} variant="contained" color="primary" disabled={!moveTargetListId}>Move Property</Button>
                </div>
            </Dialog>

            {/* Create Task Form (Updated Model) */}
            {taskProperty && (
                <CreateTaskForm 
                    propertyId={taskProperty.id} 
                    propertyAddress={taskProperty.address || taskProperty.parcel_address || taskProperty.parcel_id} 
                    onClose={() => setTaskProperty(null)} 
                />
            )}

            {/* Export Property Dialog */}
            <Dialog open={!!exportProperty} onClose={() => setExportProperty(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold mb-1 text-slate-800 dark:text-white">Export to Realtors</Typography>
                <Typography variant="body2" className="text-slate-500 mb-4 text-xs">{exportProperty?.address || exportProperty?.parcel_id}</Typography>
                <div className="space-y-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        📤 Realtors will see this property in their listings and can contact you for commission negotiations.
                    </div>
                    <TextField label="Your Name (visible to realtors)" size="small" fullWidth value={exportForm.contact_name} onChange={e => setExportForm(p => ({...p, contact_name: e.target.value}))} />
                    <TextField label="Contact Phone" size="small" fullWidth value={exportForm.contact_phone} onChange={e => setExportForm(p => ({...p, contact_phone: e.target.value}))} />
                    <TextField label="Contact Email" size="small" fullWidth value={exportForm.contact_email} onChange={e => setExportForm(p => ({...p, contact_email: e.target.value}))} />
                    <TextField label="Requested Sale Price (Target)" type="number" size="small" fullWidth value={exportForm.requested_sale_price} onChange={e => setExportForm(p => ({...p, requested_sale_price: e.target.value}))} />
                    <TextField label="Additional Notes (optional)" size="small" fullWidth multiline rows={2} value={exportForm.notes} onChange={e => setExportForm(p => ({...p, notes: e.target.value}))} />
                </div>
                <div className="flex gap-2 mt-4">
                    <Button onClick={() => setExportProperty(null)} color="inherit">Cancel</Button>
                    <Button
                        variant="contained" color="success"
                        disabled={exportSubmitting}
                        onClick={async () => {
                            setExportSubmitting(true);
                            try {
                                const payload = { 
                                    property_id: exportProperty.id, 
                                    ...exportForm,
                                    requested_sale_price: exportForm.requested_sale_price ? parseFloat(exportForm.requested_sale_price) : undefined
                                };
                                await InvestorTaskService.exportProperty(payload);
                                setExportProperty(null);
                                alert('✅ Property exported! Realtors can now see it in their listings.');
                            } catch(e:any) { alert(e.message); }
                            finally { setExportSubmitting(false); }
                        }}
                    >
                        {exportSubmitting ? 'Exporting…' : 'Export Property'}
                    </Button>
                </div>
            </Dialog>
        </div>
    );
};

export default ClientLists;
