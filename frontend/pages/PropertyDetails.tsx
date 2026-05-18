import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AdminService } from '../services/admin.service';
import { API_BASE_URL } from '../services/httpClient';
import api from '../services/api';
import { ChevronLeft, PencilLine, RotateCcw } from 'lucide-react';
import { PhotoViewerLightbox } from '../components/PhotoViewerLightbox';

import { PropertyBasicInfo } from '../components/property/PropertyBasicInfo';
import { PropertyPurchaseOptions } from '../components/property/PropertyPurchaseOptions';
import { PropertyEstimatesComps } from '../components/property/PropertyEstimatesComps';
import { PropertyResearchLinks } from '../components/property/PropertyResearchLinks';
import { PropertyUserActions } from '../components/property/PropertyUserActions';
import { PropertyFinancialsModal } from '../components/property/PropertyFinancialsModal';
import { PropertyMetadataModal } from '../components/property/PropertyMetadataModal';
import { PropertyOverridePanel } from '../components/property/PropertyOverridePanel';
import { PropertyMap } from '../components/property/PropertyMap';
import { PropertyExtendedTabs } from '../components/property/PropertyExtendedTabs';
import { PropertyOwnerCard } from '../components/property/PropertyOwnerCard';
import { PropertyRedemptionCard } from '../components/property/PropertyRedemptionCard';
import { CreateTaskForm } from '../components/property/CreateTaskForm';

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
    const [isBpoOpen, setIsBpoOpen] = useState(false);

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

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

    const handlePurchaseSecondaryBPO = async (purchaseType: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/investor/secondary-market/purchase`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    property_id: property.id,
                    purchase_type: purchaseType
                })
            });
            if (res.ok) {
                const data = await res.json();
                window.location.href = data.checkout_url;
            } else {
                const error = await res.json();
                alert(error.detail || 'Failed to initiate purchase');
            }
        } catch (e: any) {
            alert('Error connecting to payment gateway.');
        }
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

                    {/* BPO Secondary Market Packages */}
                    {property.has_realtor_media && !property.media_unlocked && (
                        <div className="bg-slate-900 rounded-xl p-8 shadow-sm flex flex-col items-center text-center text-white border-2 border-indigo-500/30">
                            <span className="material-symbols-outlined text-4xl mb-3 text-indigo-400">verified_user</span>
                            <h3 className="text-xl font-black mb-1">Verified BPO Data Available</h3>
                            <p className="text-sm text-slate-400 mb-6 max-w-md">A licensed Field Agent has already completed a Due Diligence mission for this property. Purchase the data instantly.</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                                {/* Photos Package */}
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center hover:border-slate-500 transition-colors">
                                    <span className="material-symbols-outlined text-3xl text-emerald-400 mb-2">photo_camera</span>
                                    <h4 className="font-bold text-sm">Photos Only</h4>
                                    <p className="text-emerald-400 font-black text-xl my-2">$20</p>
                                    <button
                                        onClick={() => handlePurchaseSecondaryBPO('photos')}
                                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors mt-auto"
                                    >
                                        Buy Photos
                                    </button>
                                </div>
                                {/* Checklist Package */}
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center hover:border-slate-500 transition-colors">
                                    <span className="material-symbols-outlined text-3xl text-amber-400 mb-2">fact_check</span>
                                    <h4 className="font-bold text-sm">Checklist Only</h4>
                                    <p className="text-amber-400 font-black text-xl my-2">$30</p>
                                    <button
                                        onClick={() => handlePurchaseSecondaryBPO('checklist')}
                                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors mt-auto"
                                    >
                                        Buy Checklist
                                    </button>
                                </div>
                                {/* Combo Package */}
                                <div className="bg-indigo-900 p-5 rounded-xl border border-indigo-500 flex flex-col items-center transform scale-105 shadow-xl shadow-indigo-900/50 relative">
                                    <span className="absolute -top-3 right-3 bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Best Value</span>
                                    <span className="material-symbols-outlined text-3xl text-white mb-2">diamond</span>
                                    <h4 className="font-bold text-sm">Full Combo</h4>
                                    <p className="text-white font-black text-2xl my-2">$50</p>
                                    <button
                                        onClick={() => handlePurchaseSecondaryBPO('combo')}
                                        className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-xs font-bold transition-colors mt-auto text-white shadow-lg"
                                    >
                                        Unlock All
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {property.media_unlocked && (
                        <div className="glass-card rounded-xl p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Unlocked Realtor Media</h3>
                            {property.media_files && property.media_files.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {(() => {
                                        const allImages = property.media_files
                                            .filter((file: any) => !!file.url)
                                            .map((file: any) => file.url);
                                        return property.media_files.map((file: any, idx: number) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => {
                                                    if (file.url) {
                                                        const imgIndex = allImages.indexOf(file.url);
                                                        setLightboxImages(allImages);
                                                        setLightboxInitialIndex(imgIndex !== -1 ? imgIndex : 0);
                                                        setLightboxOpen(true);
                                                    }
                                                }}
                                                className={`aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden relative group ${file.url ? 'cursor-pointer' : ''}`}
                                            >
                                                {file.url ? (
                                                    <img src={file.url} alt="Property Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                                                        <span className="material-symbols-outlined text-3xl">image</span>
                                                        <span className="text-xs mt-2">{file.name || 'Media File'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Processing media files... They will appear here shortly.</p>
                            )}
                        </div>
                    )}

                    <PropertyExtendedTabs property={property} />

                    <div className="glass-card rounded-xl p-1 h-[400px] overflow-hidden mt-6">
                        <PropertyMap property={property} />
                    </div>
                </div>

                {/* Sidebar Column (Right) */}
                <div className="space-y-6">
                    <PropertyOwnerCard property={property} />
                    <PropertyRedemptionCard stateCode={property.state} auctionType={property.property_category || property.details?.property_category} />
                    <PropertyResearchLinks property={property} />
                    <PropertyUserActions 
                        property={property} 
                        onAddToList={handleAddToStandardList} 
                        onUpdateNotes={async (notes) => {
                            if (property.parcel_id) {
                                await PropertyService.updatePropertyNotes(property.parcel_id, notes);
                            }
                        }}
                        onUploadAttachment={async (file: File) => {
                            try {
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('property_id', property.id.toString());
                                
                                await api.post('/client-data/attachments', formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                const updated = await AdminService.getProperty(property.id.toString());
                                setProperty(updated);
                            } catch (error: any) {
                                alert(`Failed to upload file: ${error.response?.data?.detail || error.message}`);
                            }
                        }}
                    />

                    {/* BPO Due Diligence Marketplace */}
                    <div className="bg-indigo-900 rounded-xl p-6 shadow-sm border border-indigo-800 text-white">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined">real_estate_agent</span>
                            BPO Due Diligence
                        </h3>
                        <p className="text-sm text-indigo-200 mb-4">Request a local field agent to perform a property condition check and take custom photos.</p>
                        <button
                            onClick={() => setIsBpoOpen(true)}
                            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg transition-colors shadow-sm"
                        >
                            Request Field Mission
                        </button>
                    </div>

                    {/* Admin Actions */}
                    <div className="glass-card rounded-xl p-6">
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

            {isBpoOpen && (
                <CreateTaskForm 
                    propertyId={property.id} 
                    propertyAddress={property.address || property.parcel_id} 
                    onClose={() => setIsBpoOpen(false)} 
                />
            )}

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

            <PhotoViewerLightbox 
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                images={lightboxImages}
                initialIndex={lightboxInitialIndex}
            />
        </div>
    );
};

export default PropertyDetails;
