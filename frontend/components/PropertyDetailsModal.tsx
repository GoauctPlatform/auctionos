import React, { useState } from 'react';
import { Modal } from './Modal';
import { useCompany } from '../context/CompanyContext';
import { PropertyDetails as Property } from '../types';
import { PropertyService } from '../services/property.service';
import { getStreetViewUrl } from '../utils/maps';
import api from '../services/api';

import { PropertyBasicInfo } from './property/PropertyBasicInfo';
import { PropertyPurchaseOptions } from './property/PropertyPurchaseOptions';
import { PropertyEstimatesComps } from './property/PropertyEstimatesComps';
import { PropertyResearchLinks } from './property/PropertyResearchLinks';
import { PropertyUserActions } from './property/PropertyUserActions';
import { PropertyFinancialsModal } from './property/PropertyFinancialsModal';
import { PropertyMetadataModal } from './property/PropertyMetadataModal';
import { PropertyMap } from './property/PropertyMap';

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

    const handleAddToStandardList = async () => {
        if (!property?.id) return;
        try {
            await PropertyService.addPropertyToStandardList(property.id, activeCompany?.id);
            alert(`Property added to Standard List successfully!`);
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

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Property Details: ${property.parcel_id || 'Unknown'}`} size="3xl">
                
                {/* Active refresh controls - preserved from original */}
                <div className="flex justify-end gap-2 mb-4">
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

                {/* Street View Hero Section */}
                <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden mb-6 border border-slate-200 dark:border-slate-800 shadow-sm">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    
                    {/* Main Content Column */}
                    <div className="md:col-span-2 space-y-6">
                        <PropertyBasicInfo 
                            property={property} 
                            onOpenFinancials={() => setIsFinOpen(true)}
                            onOpenMetadata={() => setIsMetaOpen(true)}
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
