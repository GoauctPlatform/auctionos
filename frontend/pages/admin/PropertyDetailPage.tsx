import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PropertyService, ClientDataService } from '../../services/property.service';
import { AuthService } from '../../services/auth.service';
import { API_BASE_URL } from '../../services/httpClient';
import { countyService, CountyContact } from '../../services/county.service';
import { Button, CircularProgress, Divider, Menu, MenuItem } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PlusIcon, PencilLine } from 'lucide-react';
import { Property, PropertyDetails, ClientList } from '../../types';
import { calculateDealScore, DealScoreResult } from '../../intelligence/scoringEngine';
import { submitScore } from '../../services/scores.service';
import { getStreetViewUrl } from '../../utils/maps';
import { PropertyOverridePanel } from '../../components/property/PropertyOverridePanel';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { PropertyExportFlyer } from '../../components/property/PropertyExportFlyer';
import { GISMap } from '../../components/property/GISMap';
import { PropertyBasicInfo } from '../../components/property/PropertyBasicInfo';
import { PropertyStructureCard } from '../../components/property/PropertyStructureCard';
import { PropertyEstimatesComps } from '../../components/property/PropertyEstimatesComps';
import { PropertyPurchaseOptions } from '../../components/property/PropertyPurchaseOptions';
import { PropertyRedemptionCard } from '../../components/property/PropertyRedemptionCard';
import { PropertyMap } from '../../components/property/PropertyMap';
import { PropertyResearchLinks } from '../../components/property/PropertyResearchLinks';
import { PropertyNextSteps } from '../../components/property/PropertyNextSteps';
import { PropertyUserActions } from '../../components/property/PropertyUserActions';
import { PropertyContactInfo } from '../../components/property/PropertyContactInfo';
import { CountyContactCard } from '../../components/property/CountyContactCard';
import { PropertyInventoryHistory } from '../../components/property/PropertyInventoryHistory';
import { PropertyFinancialsModal } from '../../components/property/PropertyFinancialsModal';
import { PropertyMetadataModal } from '../../components/property/PropertyMetadataModal';
import { PropertyExtendedTabs } from '../../components/property/PropertyExtendedTabs';
import { PropertyOwnerCard } from '../../components/property/PropertyOwnerCard';
import { useCompany } from '../../context/CompanyContext';
import { CreateTaskForm } from '../../components/property/CreateTaskForm';
import { useTour } from '../../context/TourContext';


interface PropertyDetailPageProps {
    readOnly?: boolean;
    overrideId?: string | number;
    onClose?: () => void;
}

const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({ readOnly = false, overrideId, onClose }) => {
    const { id: paramId } = useParams<{ id: string }>();
    const id = overrideId ? String(overrideId) : paramId;
    const navigate = useNavigate();
    const location = useLocation();
    const { activeCompany } = useCompany();
    const { startTour } = useTour();
    const [property, setProperty] = useState<Property | null>(null);
    const [countyContacts, setCountyContacts] = useState<CountyContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [lists, setLists] = useState<ClientList[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [localScore, setLocalScore] = useState<DealScoreResult | null>(null);

    const [isFinOpen, setIsFinOpen] = useState(false);
    const [isMetaOpen, setIsMetaOpen] = useState(false);
    const [streetViewError, setStreetViewError] = useState(false);
    const [isBpoOpen, setIsBpoOpen] = useState(false);

    const propertyDetailsRef = React.useRef<HTMLDivElement>(null);
    const flyerRef = React.useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    // ── Override / Edit Mode ──────────────────────────────────────────────────
    // Auto-activated via ?edit=true (set when user tries to create a duplicate property)
    const searchParams = new URLSearchParams(location.search);
    const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');

    useEffect(() => {
        if (!id) return;
        loadProperty(id);
        loadLists();
    }, [id, activeCompany?.id]);

    useEffect(() => {
        if (property && searchParams.get('action') === 'export_flyer') {
            const timeout = setTimeout(() => {
                handleExport('pdf');
                const newParams = new URLSearchParams(location.search);
                newParams.delete('action');
                navigate({ search: newParams.toString() }, { replace: true });
            }, 800);
            return () => clearTimeout(timeout);
        }
    }, [property, location.search]);

    const loadLists = async () => {
        try {
            const data = await ClientDataService.getLists(activeCompany?.id);
            setLists(data);
        } catch (err) {
            console.error("Error loading lists", err);
        }
    };

    const loadProperty = async (propertyId: string) => {
        try {
            setLoading(true);
            setStreetViewError(false);
            const data = await PropertyService.getProperty(propertyId);
            setProperty(data);
            setLoading(false);

            fetchSecondaryData(data);
            setError(null);

            // Background Check: Auto-Enrich via ATTOM if crucial details are missing
            const checkMissing = !data.year_built || !data.bedrooms || !data.owner_name || !data.assessed_value;
            if (checkMissing && data.property_id) {
                const token = localStorage.getItem('token');
                fetch(`${API_BASE_URL}/api/v1/properties/${data.property_id}/enrich`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(res => {
                    if (res?.enriched_fields && typeof res.enriched_fields === 'object' && Object.keys(res.enriched_fields).length > 0) {
                        setProperty((prev: any) => prev ? { ...prev, ...res.enriched_fields } : prev);
                        console.log("ATTOM Auto-Enriched Property for Client View:", res.enriched_fields);
                    }
                }).catch(() => {});
            }


            // Auto-sync score to backend (silent, non-blocking)
            // Only compute if backend hasn't stored one yet
            if (data?.parcel_id) {
                const computed = calculateDealScore(data);
                setLocalScore(computed);
                submitScore(data.parcel_id, computed, { 
                    status: data.availability_status,
                    state: data.state,
                    county: data.county
                }); // fire-and-forget
            } else {
                // Use the stored backend score for display consistency
                setLocalScore({
                    score: data.deal_score,
                    rating: data.deal_rating as any,
                    factors: data.score_factors || [],
                });
            }
        } catch (err: any) {
            setError(err.message || 'Error loading property details');
            setLoading(false);
        }
    };

    const fetchSecondaryData = async (data: any) => {
        if (localStorage.getItem('token')) {
            try {
                const favorites = await PropertyService.getFavorites(activeCompany?.id);
                if (data.id && favorites.includes(data.id)) {
                    setIsFavorite(true);
                }
            } catch (favErr) {}
        }

        if (data.state && data.county) {
            try {
                const contacts = await countyService.getContacts(data.state, data.county);
                setCountyContacts(contacts);
            } catch (contactErr) {}
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><CircularProgress /></div>;
    }

    if (error || !property) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2>{error || 'Property not found'}</h2>
                <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
            </div>
        );
    }

    const handlePurchaseOnline = async () => {
        try {
            const { url } = await PropertyService.getAuctionRedirect(property.parcel_id);
            if (url && window.confirm(`Redirecting to official auction site: ${url}\n\nDo you want to proceed?`)) {
                await PropertyService.logAction(property.parcel_id, 'purchase_redirect');
                window.open(url, '_blank');
                return;
            }
        } catch (e) {}

        if (!window.confirm(`Are you sure you want to simulate purchase for ${property.parcel_id}?`)) {
            return;
        }
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/v1/properties/${property.parcel_id}/purchase`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Purchase failed');
            }
            alert("Property successfully simulation purchased!");
            loadProperty(property.parcel_id);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleFavorite = async () => {
        try {
            const res = await PropertyService.toggleFavorite(Number(property.id), activeCompany?.id);
            setIsFavorite(res.is_favorite);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleOpenListMenu = async (event: React.MouseEvent<HTMLButtonElement>) => {
        // Now automatically add to standard list instead of opening a menu
        await handleAddToStandardList();
    };

    const handleCloseListMenu = () => {
        setAnchorEl(null);
    };

    const handleAddToList = async (listId: number) => {
        if (!property?.id) return;
        try {
            setActionLoading(true);
            await ClientDataService.addPropertyToList(listId, Number(property.id));
            alert(`Property added to list safely!`);
            handleCloseListMenu();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddToStandardList = async () => {
        if (!property?.id) return;
        try {
            setActionLoading(true);
            await ClientDataService.addPropertyToStandardList(Number(property.id), activeCompany?.id);
            loadLists(); // Refresh counts
            handleCloseListMenu();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateAndAdd = async () => {
        const name = window.prompt("Enter name for new list:");
        if (!name || !property?.id) return;
        try {
            setActionLoading(true);
            const newList = await ClientDataService.createList(name, undefined, activeCompany?.id);
            await ClientDataService.addPropertyToList(newList.id, Number(property.id));
            alert(`List "${name}" created & property added!`);
            loadLists();
            handleCloseListMenu();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const ownerNameFallback = property.owner_name || (property.owner_address ? property.owner_address.split('\n')[0] : 'UNKNOWN OWNER');

    /** Merges saved overrides into local state without a full page reload. */
    const handleOverrideSaved = (savedFields: Record<string, any>) => {
        setProperty((prev: any) => prev ? {
            ...prev,
            ...savedFields,
            has_overrides: Object.keys(savedFields).length > 0 || prev.has_overrides,
        } : prev);
        navigate(location.pathname, { replace: true });
    };

    const handleCloseEditMode = () => {
        setIsEditing(false);
        navigate(location.pathname, { replace: true });
    };

    const handleExport = async (format: 'jpeg' | 'pdf') => {
        if (!flyerRef.current) return;

        if (format === 'pdf') {
            // Create a temporary hidden iframe for printing
            let iframe = document.getElementById('goauct-print-iframe') as HTMLIFrameElement;
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'goauct-print-iframe';
                iframe.style.position = 'absolute';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = 'none';
                document.body.appendChild(iframe);
            }

            const iframeDoc = iframe.contentWindow?.document;
            if (iframeDoc) {
                iframeDoc.open();
                iframeDoc.write(`
                    <html>
                        <head>
                            <title>GoAuct Property Report</title>
                            ${Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                                .map(el => el.outerHTML)
                                .join('\n')}
                            <style>
                                * {
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                                body {
                                    background-color: #0f172a !important; /* bg-slate-900 equivalent */
                                    margin: 0;
                                    padding: 20px;
                                    display: flex;
                                    justify-content: center;
                                }
                                #property-sales-flyer {
                                    box-shadow: none !important;
                                    border: none !important;
                                }
                            </style>
                        </head>
                        <body>
                            ${flyerRef.current.innerHTML}
                        </body>
                    </html>
                `);
                iframeDoc.close();

                // Wait for styles/images to load inside iframe, then print
                setTimeout(() => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                }, 500);
            }
            return;
        }

        setExporting(true);
        try {
            await new Promise(r => setTimeout(r, 150));
            const canvas = await html2canvas(flyerRef.current, { useCORS: true, scale: 2 });
            
            // Convert to Blob for Web Share API file compatibility
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (blob) {
                const file = new File([blob], `GoAuct-Property-${property.parcel_id || 'Export'}.jpeg`, { type: 'image/jpeg' });
                
                // Try Web Share API (native share on mobile browsers)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `GoAuct Property Report - ${property.parcel_id || 'Property'}`,
                        text: `Check out this investment property report from GoAuct: ${property.address || property.parcel_id}`
                    });
                    return; // Successfully shared natively!
                }
            }

            // Fallback for desktop or non-supported browsers: standard trigger download
            const link = document.createElement('a');
            link.download = `GoAuct-Property-${property.parcel_id || 'Export'}.jpeg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        } catch (e) {
            console.error('Export failed', e);
            alert('Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            {/* Hidden off-screen premium brochure container for JPEG/PDF exports */}
            <div className="absolute top-0 left-0 opacity-0 pointer-events-none -z-50" style={{ width: '800px' }}>
                <div ref={flyerRef}>
                    <PropertyExportFlyer property={property} />
                </div>
            </div>

            <div className="w-full px-4 sm:px-8 lg:px-12 py-6 space-y-6 mb-20 animate-in fade-in duration-700" ref={propertyDetailsRef}>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-2">
                <Button 
                    variant="text" 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => {
                        if (onClose) {
                            onClose();
                        } else {
                            navigate(-1);
                        }
                    }} 
                    className="text-slate-500 hover:text-slate-700 normal-case"
                >
                    {onClose ? 'Close Detail' : 'Back to Inventory'}
                </Button>

                {/* ── Customize My View Button (Client/Manager/Agent) ── */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startTour('property_details')}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-lg transition-all shadow-sm bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse"
                    >
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                        Page Tour
                    </button>
                    {(property as any).has_overrides && !isEditing && (
                        <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full uppercase tracking-wider">
                            <PencilLine size={10} />
                            Customized View
                        </span>
                    )}
                    <button
                        id="btn-customize-property-view"
                        onClick={() => setIsEditing(prev => !prev)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-lg transition-all shadow-sm ${
                            isEditing
                                ? 'bg-amber-500 text-white hover:bg-amber-400'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-amber-400'
                        }`}
                    >
                        <PencilLine size={13} />
                        {isEditing ? 'Editing...' : 'Customize My View'}
                    </button>
                    <div className="relative group">
                        <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-lg transition-all shadow-sm bg-slate-800 text-white hover:bg-slate-700">
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            {exporting ? 'Exporting...' : 'Export'}
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                            <button onClick={() => handleExport('jpeg')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">As JPEG</button>
                            <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">As PDF (Print)</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Override Panel (conditionally rendered) ── */}
            {isEditing && property && (
                <PropertyOverridePanel
                    property={property}
                    onClose={handleCloseEditMode}
                    onSaved={handleOverrideSaved}
                />
            )}

            <div className="w-full mb-6">
                {/* Zillow-style Street View Hero */}
                <div className="relative w-full h-[300px] sm:h-[450px] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg group">
                    {getStreetViewUrl(property) && !streetViewError ? (
                        <img 
                            src={getStreetViewUrl(property)!} 
                            alt="Property Street View"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={() => setStreetViewError(true)}
                        />
                    ) : (
                        <div 
                            className="w-full h-full bg-cover bg-center flex items-center justify-center"
                            style={{ backgroundImage: `url('${property.imageUrl || '/placeholder.png'}')` }}
                        >
                            {!property.imageUrl && (
                                <div className="text-slate-400 flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                                    <span className="text-xs font-bold uppercase tracking-widest">No Preview Available</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Floating Map Link Badge */}
                    {property.map_link && (
                        <a 
                            href={property.map_link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute bottom-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white hover:bg-primary hover:text-white transition-all transform hover:scale-105"
                        >
                            <span className="material-symbols-outlined text-[18px]">map</span>
                            View on Google Maps
                        </a>
                    )}
                </div>
            </div>

            {/* Import Error Banner */}
            {AuthService.getCurrentUser()?.role === 'admin' && property.is_processed === false && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                    <h3 className="text-red-800 dark:text-red-300 font-bold mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">error</span>
                        Import Processing Error
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">{property.import_error_msg || 'An unknown error occurred during the CSV import phase. Please review.'}</p>
                </div>
            )}

            <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                        {ownerNameFallback !== 'UNKNOWN OWNER' ? ownerNameFallback : (property.parcel_address || property.parcel_id)}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{property.county} County, {property.state}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className="text-xs font-mono font-bold text-blue-500">ID: {property.parcel_id}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {property.is_qoz && (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200 dark:border-amber-800">Opportunity Zone</span>
                    )}
                    {!readOnly && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => navigate(`/admin/properties/${property.parcel_id}/edit`)}
                            className="normal-case font-bold text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        >
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                
                {/* Main Content Column (Left/Center) */}
                <div className="xl:col-span-2 space-y-8">
                    <div id="tour-property-basic-info">
                        <PropertyBasicInfo 
                            property={property} 
                            onOpenFinancials={() => setIsFinOpen(true)}
                            onOpenMetadata={() => setIsMetaOpen(true)}
                            dealScore={localScore}
                            onRefresh={() => loadProperty(id!)}
                        />
                    </div>

                    <div id="tour-property-financials" className="space-y-8">
                        <PropertyEstimatesComps property={property as any} />

                        <div className="grid grid-cols-1 gap-8">
                            <PropertyPurchaseOptions 
                                property={property as any} 
                                readOnly={readOnly}
                                actionLoading={actionLoading}
                                onSimulatePurchase={handlePurchaseOnline}
                            />
                        </div>
                    </div>

                    <PropertyExtendedTabs property={property as any} onUpdate={(updated) => setProperty(updated as any)} />

                    <PropertyRedemptionCard stateCode={property.state} auctionType={property.auction_type} />

                    <div id="tour-property-maps" className="space-y-4">
                        <GISMap property={property as any} className="w-full h-[300px] sm:h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg" />
                        <PropertyMap property={property as any} />
                    </div>

                    {/* Preserved Raw Data Block */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 px-6 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-lg">database</span>
                            Full Parcel Features
                        </div>
                        <div className="p-6 px-7">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-8 text-sm text-slate-700 dark:text-slate-300">
                                <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Zoning</span> {property.zoning || 'Residential (Default)'}</div>
                                <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Subdivision</span> {property.subdivision || 'Unrecorded'}</div>
                                <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Sewer Type</span> {property.sewer_type || 'Public'}</div>
                                <div><span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Water Type</span> {property.water_type || 'Municipal'}</div>
                                <div className="col-span-2"><span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest block mb-1">Property Type Detail</span> {property.property_type_detail || property.description || 'Single Family Residence'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column (Right) */}
                <div className="space-y-8 mt-0">
                    <PropertyOwnerCard property={property as any} />
                    <div id="tour-property-actions">
                        <PropertyUserActions 
                            property={property as any} 
                            isFavorite={isFavorite}
                            onToggleFavorite={handleToggleFavorite}
                            onAddToList={handleOpenListMenu}
                            onUpdateNotes={async (noteText) => {
                                try {
                                    await ClientDataService.createNote(Number(property.id), noteText);
                                } catch (err) {}
                            }}
                            onUploadAttachment={async (file) => {
                                try {
                                    await ClientDataService.uploadAttachment(Number(property.id), file);
                                    loadProperty(property.parcel_id);
                                } catch (err: any) { alert(err.message); }
                            }}
                        />
                    </div>
                    <div id="tour-property-research-links">
                        <PropertyResearchLinks property={property as any} />
                    </div>
                    
                    <PropertyNextSteps property={property as any} />

                    {/* BPO Due Diligence Marketplace */}
                    <div className="glass-card rounded-xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">real_estate_agent</span>
                            BPO Due Diligence
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Request a local field agent to perform a property condition check and take custom photos.</p>
                        <button
                            onClick={() => {
                                const currentUser = AuthService.getCurrentUser();
                                if (currentUser?.subscription_tier === 'trial') {
                                    navigate('/client/trial-limit?feature=tasks');
                                } else {
                                    setIsBpoOpen(true);
                                }
                            }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-sm"
                        >
                            Request Field Mission
                        </button>
                    </div>

                    <PropertyContactInfo property={property as any} />

                    <CountyContactCard 
                        contacts={countyContacts} 
                        countyName={property.details?.county || property.county} 
                    />

                    <PropertyInventoryHistory property={property as any} />

                    {/* Admin Actions - Preserved/Minimized */}
                    {!readOnly && (
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">System Administration</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={async () => {
                                        setActionLoading(true);
                                        try {
                                            const res = await PropertyService.validateGSI(property.id.toString());
                                            alert(`GSI Status: ${res.gsi_status}`);
                                            loadProperty(property.parcel_id);
                                        } catch (e) {
                                            alert("GSI Validation failed.");
                                        } finally {
                                            setActionLoading(false);
                                        }
                                    }}
                                    disabled={actionLoading}
                                    className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">verified</span>
                                    Force GSI Validation
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add to List Menu - Removed as it is now automatic */}

            <PropertyFinancialsModal 
                isOpen={isFinOpen} 
                onClose={() => setIsFinOpen(false)} 
                property={property} 
            />
            
            <PropertyMetadataModal 
                isOpen={isMetaOpen} 
                onClose={() => setIsMetaOpen(false)} 
                property={property} 
            />

            {isBpoOpen && (
                <CreateTaskForm 
                    propertyId={Number(property.id)} 
                    propertyAddress={property.parcel_address || property.parcel_id} 
                    onClose={() => setIsBpoOpen(false)} 
                />
            )}
        </div>
       </>
    );
};

export default PropertyDetailPage;
