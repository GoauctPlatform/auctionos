import React, { useEffect, useState } from 'react';
import { Drawer, IconButton, CircularProgress, Typography, Divider } from '@mui/material';
import { Close as CloseIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { PropertyService } from '../services/property.service';
import { useNavigate } from 'react-router-dom';
import { getStreetViewUrl } from '../utils/maps';

interface PropertyPreviewDrawerProps {
    open: boolean;
    propertyId: string | number | null;
    onClose: () => void;
    basePath?: string;
}

export const PropertyPreviewDrawer: React.FC<PropertyPreviewDrawerProps> = ({ open, propertyId, onClose, basePath = '/client' }) => {
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (open && propertyId) {
            loadPropertyDetails();
        } else {
            setProperty(null);
        }
    }, [open, propertyId]);

    const loadPropertyDetails = async () => {
        try {
            setLoading(true);
            const data = await PropertyService.getProperty(propertyId!.toString());
            setProperty(data);
        } catch (err) {
            console.error('Failed to load preview:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                className: "w-full sm:w-[500px] md:w-[600px] dark:bg-slate-900 bg-white"
            }}
        >
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <Typography variant="h6" className="font-bold text-slate-800 dark:text-white">
                            Property Preview
                        </Typography>
                        {property?.company_id && (
                            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] uppercase font-black px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/50">
                                Private Property
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <IconButton
                            onClick={() => {
                                if (property?.parcel_id || property?.id) {
                                    navigate(`${basePath}/properties/${property.parcel_id || property.id}`);
                                }
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                            size="small"
                        >
                            <OpenInNewIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={onClose} className="bg-slate-100 dark:bg-slate-800" size="small">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <CircularProgress />
                        </div>
                    ) : property ? (
                        <div className="space-y-6">
                            <div className="relative w-full h-48 -mt-6 -mx-6 mb-6 overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                                 {(() => {
                                    const svUrl = getStreetViewUrl(property, undefined, undefined, undefined, '640x400');
                                    
                                    if (!svUrl) {
                                        return (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined text-4xl mb-2">image_not_supported</span>
                                                <span className="text-xs font-bold uppercase tracking-widest">No Preview Available</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <>
                                            <img 
                                                src={svUrl} 
                                                alt="Street View Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-lg">Street View</span>
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address || '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="bg-white/90 hover:bg-white text-slate-900 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-lg flex items-center gap-1 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">map</span> View Map
                                                    </a>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold dark:text-white">{property.owner_address ? property.owner_address.split('\n')[0] : 'Untitled Property'}</h2>
                                    <p className="text-slate-500 font-mono text-sm">{property.parcel_id}</p>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{property.address || `${property.county}, ${property.state}`}</p>
                                </div>

                                <Divider className="dark:border-slate-800" />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Opening Bid</p>
                                        <p className="text-lg font-bold text-red-600 dark:text-red-400">${property.amount_due?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Assessed Value</p>
                                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">${property.assessed_value?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Lot Acres</p>
                                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{property.lot_acres || 'N/A'}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Status</p>
                                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300 capitalize">{property.availability_status || 'Unknown'}</p>
                                    </div>
                                </div>

                                <Divider className="dark:border-slate-800" />

                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Legal Description</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap italic">
                                        {property.legal_description || property.description || 'No description available.'}
                                    </p>
                                </div>

                                {property.shape_data && property.shape_data.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">Extracted Parcel Data</h3>
                                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg space-y-1">
                                            {property.shape_data.slice(0, 10).map((sd: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-xs border-b border-slate-200 dark:border-slate-700 last:border-0 pb-1">
                                                    <span className="text-slate-500 font-medium">{sd.subcategory}:</span>
                                                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[60%]">{sd.value || '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {property.shape_data.length > 10 && (
                                            <p className="text-xs text-center text-slate-400 mt-2">+ {property.shape_data.length - 10} more properties...</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            No data available
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    );
};
