import React, { useState } from 'react';
import { Modal } from './Modal';
import { useCompany } from '../context/CompanyContext';
import { PropertyDetails as Property } from '../types';
import { PropertyService } from '../services/property.service';
import { getStreetViewUrl } from '../utils/maps';
import api from '../services/api';
import html2canvas from 'html2canvas';

import { PropertyBasicInfo } from './property/PropertyBasicInfo';
import { PropertyPurchaseOptions } from './property/PropertyPurchaseOptions';
import { PropertyEstimatesComps } from './property/PropertyEstimatesComps';
import { PropertyResearchLinks } from './property/PropertyResearchLinks';
import { PropertyUserActions } from './property/PropertyUserActions';
import { PropertyFinancialsModal } from './property/PropertyFinancialsModal';
import { PropertyMetadataModal } from './property/PropertyMetadataModal';
import { PropertyMap } from './property/PropertyMap';
import { GISMap } from './property/GISMap';

interface Props {
    property: Property | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (updated: Property) => void;
}

export const PropertyDetailsModal: React.FC<Props> = ({ property: initialProperty, isOpen, onClose, onUpdate }) => {
    const { activeCompany } = useCompany();
    const [property, setProperty] = useState<Property | null>(initialProperty);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Sub-modals state
    const [isFinOpen, setIsFinOpen] = useState(false);
    const [isMetaOpen, setIsMetaOpen] = useState(false);
    const [streetViewError, setStreetViewError] = useState(false);

    React.useEffect(() => {
        setProperty(initialProperty);
        setStreetViewError(false);
    }, [initialProperty]);

    if (!property) return null;

    const handleEnrich = async () => {
        setIsRefreshing(true);
        try {
            const updated = await PropertyService.enrichProperty(property.id.toString());
            setProperty(updated);
            if (onUpdate) onUpdate(updated);
        } catch (error) {
            console.error(error);
            alert("Enrichment failed. Please check status.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        if (!property?.id) return;
        try {
            const updated = await PropertyService.getProperty(property.id.toString());
            setProperty(updated);
            if (onUpdate) onUpdate(updated);
        } catch (error) {
            console.error('Failed to reload property details', error);
        }
    };

    const handleAddToStandardList = async () => {
        if (!property?.id) return;
        try {
            await PropertyService.addPropertyToStandardList(property.id, activeCompany?.id);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleUploadAttachment = async (file: File) => {
        if (!property?.id) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('property_id', property.id.toString());
            
            await api.post('/client-data/attachments', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const updated = await PropertyService.getProperty(property.id.toString());
            setProperty(updated);
            if (onUpdate) onUpdate(updated);
        } catch (error: any) {
            alert(`Failed to upload file: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleUpdateNotes = async (notes: string) => {
        if (!property?.id) return;
        try {
            await api.post('/client-data/notes', {
                property_id: property.id,
                note_text: notes
            });
            const updated = await PropertyService.getProperty(property.id.toString());
            setProperty(updated);
            if (onUpdate) onUpdate(updated);
        } catch (error: any) {
            alert(`Failed to save notes: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleExport = async () => {
        setIsRefreshing(true);
        try {
            const element = document.getElementById('property-export-container');
            if (!element) return;
            const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
            
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

            // Fallback: trigger standard browser download
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const link = document.createElement('a');
            link.download = `property-${property.parcel_id || 'export'}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error(error);
            alert("Export failed.");
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Property Details: ${property.parcel_id || 'Unknown'}`} size="3xl">
                <div id="property-export-container" className="bg-white dark:bg-slate-900 rounded-xl">
                {/* Active refresh controls - preserved from original */}
                <div className="flex justify-end gap-2 mb-4" data-html2canvas-ignore>
                    <button
                        onClick={handleExport}
                        disabled={isRefreshing}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 bg-white hover:bg-slate-50 text-indigo-600 border-slate-200 hover:border-indigo-200 shadow-sm`}
                        title="Export as JPEG"
                    >
                        <span className="material-symbols-outlined text-[16px]">share</span>
                        Export
                    </button>
                    <button
                        onClick={handleEnrich}
                        disabled={isRefreshing || !property.details?.zillow_url}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${isRefreshing
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-white hover:bg-slate-50 text-blue-600 border-slate-200 hover:border-blue-200 shadow-sm'
                            }`}
                        title="Auto-Enrich from Zillow"
                    >
                        <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>
                            {isRefreshing ? 'sync' : 'auto_fix'}
                        </span>
                        Enrich Data
                    </button>
                    <button
                        onClick={async () => {
                            setIsRefreshing(true);
                            try {
                                const res = await PropertyService.validateGSI(property.id.toString());
                                alert(`GSI Status: ${res.gsi_status}`);
                                const updated = await PropertyService.getProperty(property.id.toString());
                                setProperty(updated);
                                if (onUpdate) onUpdate(updated);
                            } catch (e) {
                                alert("GSI Validation failed.");
                            } finally {
                                setIsRefreshing(false);
                            }
                        }}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 rounded-lg border text-sm font-medium bg-white hover:bg-slate-50 text-emerald-600 border-slate-200 hover:border-emerald-200 shadow-sm transition-all flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">verified_user</span>
                        Validate GSI
                    </button>
                </div>

                {/* Street View & GIS Lot Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                        {getStreetViewUrl(property) && !streetViewError ? (
                            <img 
                                src={getStreetViewUrl(property)!} 
                                alt="Property Preview"
                                className="w-full h-full object-cover"
                                onError={() => setStreetViewError(true)}
                            />
                        ) : (
                            <div 
                                className="w-full h-full bg-cover bg-center flex items-center justify-center opacity-50"
                                style={{ backgroundImage: `url('${property.imageUrl || '/placeholder.png'}')` }}
                            >
                                {!property.imageUrl && (
                                    <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                                )}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute bottom-4 left-4 text-white">
                            <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Street View Preview</div>
                            <div className="text-lg font-black tracking-tight">{property.address || property.parcel_id}</div>
                        </div>
                    </div>
                    <GISMap property={property} className="h-64 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    
                    {/* Main Content Column */}
                    <div className="md:col-span-2 space-y-6">
                        <PropertyBasicInfo 
                            property={property} 
                            onOpenFinancials={() => setIsFinOpen(true)}
                            onOpenMetadata={() => setIsMetaOpen(true)}
                            onRefresh={handleRefresh}
                        />

                        <div className="grid grid-cols-1 gap-6">
                            <PropertyPurchaseOptions property={property} />
                            <PropertyEstimatesComps property={property} />
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl h-[300px] overflow-hidden border border-slate-200 dark:border-slate-700">
                            <PropertyMap property={property} />
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        <PropertyResearchLinks property={property} />
                        <PropertyUserActions 
                            property={property} 
                            onAddToList={handleAddToStandardList} 
                            onUploadAttachment={handleUploadAttachment}
                            onUpdateNotes={handleUpdateNotes}
                        />
                    </div>

                </div>
                </div>
            </Modal>

            {/* Sub-modals for deep data view */}
            {isOpen && (
                <>
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
                </>
            )}
        </>
    );
};
