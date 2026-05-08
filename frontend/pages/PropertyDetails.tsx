import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AdminService } from '../services/admin.service';
import { API_BASE_URL } from '../services/httpClient';
import { ChevronLeft, PencilLine, RotateCcw } from 'lucide-react';

import { PropertyBasicInfo } from '../components/property/PropertyBasicInfo';
import { PropertyPurchaseOptions } from '../components/property/PropertyPurchaseOptions';
import { PropertyEstimatesComps } from '../components/property/PropertyEstimatesComps';
import { PropertyResearchLinks } from '../components/property/PropertyResearchLinks';
import { PropertyUserActions } from '../components/property/PropertyUserActions';
import { PropertyFinancialsModal } from '../components/property/PropertyFinancialsModal';
import { PropertyMetadataModal } from '../components/property/PropertyMetadataModal';
import { PropertyOverridePanel } from '../components/property/PropertyOverridePanel';
import PropertyMap from '../components/PropertyMap';
import { PropertyExtendedTabs } from '../components/property/PropertyExtendedTabs';
import { PropertyOwnerCard } from '../components/property/PropertyOwnerCard';

import { PropertyService, ClientDataService } from '../services/property.service';
import { useCompany } from '../context/CompanyContext';

const PropertyDetails: React.FC = () => {
    const { activeCompany } = useCompany();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isFinOpen, setIsFinOpen] = useState(false);
    const [isMetaOpen, setIsMetaOpen] = useState(false);

    // ── Override / Edit Mode ──────────────────────────────────────────────────
    // Activated by: ?edit=true URL param (auto-set when user tries to create a dup property)
    // or by clicking the "Customize My View" button manually.
    const searchParams = new URLSearchParams(location.search);
    const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');

    // ── Property Fetch ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchProperty = async () => {
            if (!id) return;
            try {
                const data = await AdminService.getProperty(id);
                setProperty(data);

                // Background Check: Auto-Enrich via ATTOM if crucial details are missing.
                const checkMissing = !data.year_built || !data.bedrooms || !data.owner_name || !data.assessed_value;
                if (checkMissing && data.property_id) {
                    AdminService.enrichProperty(data.property_id)
                        .then(res => {
                            if (res?.enriched_fields && Object.keys(res.enriched_fields).length > 0) {
                                setProperty((prev: any) => ({ ...prev, ...res.enriched_fields }));
                                console.log('ATTOM Auto-Enriched Property:', res.enriched_fields);
                            }
                        })
                        .catch(err => console.debug('ATTOM Enrichment skipped or failed:', err));
                }
            } catch (error) {
                console.error('Failed to fetch property details', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id]);

    const handleAddToStandardList = async () => {
        if (!property?.id) return;
        try {
            await ClientDataService.addPropertyToStandardList(property.id, activeCompany?.id);
            alert('Property added to Standard List successfully!');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    /**
     * Called by PropertyOverridePanel after a successful save.
     * Merges the saved overrides into local state so the UI updates immediately
     * without a full page reload.
     */
    const handleOverrideSaved = (savedFields: Record<string, any>) => {
        setProperty((prev: any) => ({
            ...prev,
            ...savedFields,
            has_overrides: Object.keys(savedFields).length > 0 || prev.has_overrides,
        }));
        // Remove ?edit=true from URL without page reload
        navigate(location.pathname, { replace: true });
    };

    const handleCloseEditMode = () => {
        setIsEditing(false);
        navigate(location.pathname, { replace: true });
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
    if (!property) return <div className="p-8 text-center text-red-500">Property not found.</div>;

    return (
        <div className="w-full px-4 sm:px-8 lg:px-12 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/inventory')}
                    className="flex items-center text-slate-500 hover:text-slate-700 mb-2 transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span>Back to Inventory</span>
                </button>

                {/* ── Edit / Customize Button ─────────────────────────────── */}
                <div className="flex items-center gap-2">
                    {property.has_overrides && !isEditing && (
                        <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full uppercase tracking-wider">
                            <PencilLine size={10} />
                            Customized View
                        </span>
                    )}
                    <button
                        onClick={() => setIsEditing(prev => !prev)}
                        id="btn-customize-property-view"
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-lg transition-all shadow-sm ${
                            isEditing
                                ? 'bg-amber-500 text-white hover:bg-amber-400'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-amber-400'
                        }`}
                    >
                        <PencilLine size={13} />
                        {isEditing ? 'Editing...' : 'Customize My View'}
                    </button>
                </div>
            </div>

            {/* ── Override Panel (conditionally rendered) ────────────────────── */}
            {isEditing && (
                <PropertyOverridePanel
                    property={property}
                    onClose={handleCloseEditMode}
                    onSaved={handleOverrideSaved}
                />
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

                {/* Main Content Column (Left) */}
                <div className="xl:col-span-2 space-y-6">
                    <PropertyBasicInfo
                        property={property}
                        onOpenFinancials={() => setIsFinOpen(true)}
                        onOpenMetadata={() => setIsMetaOpen(true)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PropertyPurchaseOptions property={property} />
                        <PropertyEstimatesComps property={property} />
                    </div>

                    {/* Media Paywall Section */}
                    {property.has_consultant_media && !property.media_unlocked && (
                        <div className="bg-slate-900 rounded-xl p-8 shadow-sm flex flex-col items-center text-center text-white">
                            <span className="material-symbols-outlined text-4xl mb-3 text-slate-400">lock</span>
                            <h3 className="text-lg font-bold mb-1">Exclusive Consultant Media Available</h3>
                            <p className="text-sm text-slate-400 mb-6">Unlock high-quality photos, drone footage, and on-site reports for $100.</p>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`${API_BASE_URL}/api/v1/properties/${property.id}/purchase-media`, {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                        });
                                        if (res.ok) {
                                            alert('Media unlocked successfully!');
                                            window.location.reload();
                                        } else {
                                            const error = await res.json();
                                            alert(error.detail || 'Failed to unlock media');
                                        }
                                    } catch (e: any) {
                                        alert(e.message);
                                    }
                                }}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-colors"
                            >
                                Unlock Media for $100
                            </button>
                        </div>
                    )}

                    {property.media_unlocked && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Unlocked Consultant Media</h3>
                            {property.media_files && property.media_files.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {property.media_files.map((file: any, idx: number) => (
                                        <div key={idx} className="aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden relative group">
                                            {file.url ? (
                                                <img src={file.url} alt="Property Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                                                    <span className="material-symbols-outlined text-3xl">image</span>
                                                    <span className="text-xs mt-2">{file.name || 'Media File'}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Processing media files... They will appear here shortly.</p>
                            )}
                        </div>
                    )}

                    <PropertyExtendedTabs property={property} />

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700 h-[400px] overflow-hidden mt-6">
                        <PropertyMap parcelId={property.parcel_id || null} />
                    </div>
                </div>

                {/* Sidebar Column (Right) */}
                <div className="space-y-6">
                    <PropertyOwnerCard property={property} />
                    <PropertyResearchLinks property={property} />
                    <PropertyUserActions 
                        property={property} 
                        onAddToList={handleAddToStandardList} 
                        onUpdateNotes={async (notes) => {
                            if (property.parcel_id) {
                                await PropertyService.updatePropertyNotes(property.parcel_id, notes);
                            }
                        }}
                    />

                    {/* Admin Actions */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Admin Actions</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate(`/properties/${property.parcel_id}/edit`)}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                            >
                                Edit Property Data
                            </button>
                            <button
                                onClick={() => alert('Validation feature coming soon')}
                                className="w-full py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                            >
                                Run GSI Validation
                            </button>
                        </div>
                    </div>
                </div>
            </div>

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
        </div>
    );
};

export default PropertyDetails;
