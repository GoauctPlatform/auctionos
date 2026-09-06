import React, { useEffect, useState } from 'react';
import { Drawer, IconButton, CircularProgress, Typography, Divider } from '@mui/material';
import { Close as CloseIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { PropertyService } from '../services/property.service';
import { useNavigate } from 'react-router-dom';
import { getStreetViewUrl } from '../utils/maps';
import { calculateDealScore } from '../intelligence/scoringEngine';
import { useLanguage } from "../context/LanguageContext";

interface PropertyPreviewDrawerProps {
    open: boolean;
    propertyId: string | number | null;
    onClose: () => void;
    basePath?: string;
    onOpenPropertyDetails?: (propertyId: string, propertyId2: string) => void;
}

export const PropertyPreviewDrawer: React.FC<PropertyPreviewDrawerProps> = ({ open, propertyId, onClose, basePath = '/client', onOpenPropertyDetails }) => {
    const { t } = useLanguage();
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
            sx={{ zIndex: 9999 }}
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
                                    if (onOpenPropertyDetails) {
                                        onOpenPropertyDetails(property.parcel_id || property.id, property.parcel_id || property.id);
                                        onClose();
                                    } else {
                                        navigate(`${basePath}/properties/${property.parcel_id || property.id}`);
                                    }
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
                    ) : property ? (() => {
                        // Financial Metrics Calculation matching flyer/system logic
                        const displayScore = calculateDealScore(property);
                        const price = property.amount_due || property.details?.amount_due || property.price || property.opening_bid || 0;
                        const assessedVal = property.assessed_value ? Number(property.assessed_value) : 0;
                        const details = property.details;
                        
                        const arv = details?.estimated_value || property.estimated_value || (assessedVal ? assessedVal * 1.0 : 0);
                        const maxBid = details?.max_bid || (arv * 0.7);
                        const equity = arv - maxBid;
                        const rent = details?.rental_value || arv * 0.008;

                        const isTaxLien = (property.property_category || property.purchase_option_type || property.property_type || property.auction_type || '').toLowerCase().includes('lien');

                        return (
                            <div className="space-y-6">
                                <div className="relative w-full h-52 -mt-6 -mx-6 mb-6 overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
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
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
                                                
                                                {/* Floating Badges */}
                                                <div className="absolute top-4 right-4 flex gap-1.5 max-w-[70%] flex-wrap justify-end">
                                                    {property.availability_status && (
                                                        <span className="bg-emerald-100/90 text-emerald-800 border border-emerald-200 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                                                            {property.availability_status}
                                                        </span>
                                                    )}
                                                    {property.is_qoz && (
                                                        <span className="bg-amber-100/90 text-amber-800 border border-amber-200 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                                                            QOZ
                                                        </span>
                                                    )}
                                                </div>

                                                {/* View Map Link */}
                                                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                                    <span className="bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-lg">Street View</span>
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address || '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="bg-white/95 hover:bg-white text-slate-900 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-lg flex items-center gap-1 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[10px]">map</span> View Map
                                                    </a>
                                                    {(() => {
                                                        const lat = property.latitude || property.details?.latitude;
                                                        const lng = property.longitude || property.details?.longitude;
                                                        if (!lat || !lng) return null;
                                                        return (
                                                            <a 
                                                                href={`https://earth.google.com/web/search/${lat},${lng}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-lg flex items-center gap-1 transition-all"
                                                            >
                                                                <span className="material-symbols-outlined text-[10px]">public</span> Earth 3D
                                                            </a>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Deal Score Widget floated on bottom right */}
                                                {displayScore && (
                                                    <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-xl">
                                                        <div className={`flex items-center justify-center w-7 h-7 rounded-lg border font-black text-xs shadow-sm ${
                                                            displayScore.rating.startsWith('A') ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-250 text-emerald-750 dark:text-emerald-400' :
                                                            displayScore.rating.startsWith('B') ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-250 text-indigo-750 dark:text-indigo-400' :
                                                            'bg-amber-50 dark:bg-amber-950/30 border-amber-250 text-amber-750 dark:text-amber-400'
                                                        }`}>
                                                            {displayScore.rating}
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-0.5">Deal Score</span>
                                                            <span className="text-[10px] font-black text-slate-900 dark:text-white leading-none">
                                                                {displayScore.score}/100
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug uppercase">
                                            {property.owner_address ? property.owner_address.split('\n')[0] : (property.title || 'Untitled Property')}
                                        </h2>
                                        <p className="text-[10px] font-mono font-semibold text-slate-450 dark:text-slate-400">{property.parcel_id}</p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[13px] text-indigo-550">location_on</span>
                                            {[property.city, property.county ? `${property.county} County` : '', property.state, property.zip_code].filter(Boolean).join(', ')}
                                        </p>
                                    </div>

                                    <Divider className="dark:border-slate-800" />

                                    {/* Financial Highlights Panel */}
                                    <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/70 dark:border-indigo-900/50 rounded-2xl p-4 space-y-4 shadow-2xs">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-650 dark:text-indigo-400 border-b border-indigo-100/60 dark:border-indigo-900/40 pb-2">
                                            Financial Intelligence
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3.5">
                                            {isTaxLien ? (
                                                <>
                                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Est. Debt Value</span>
                                                        <span className="text-base font-black text-rose-600 dark:text-rose-400 block">
                                                            {price ? `$${price.toLocaleString()}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Target Interest Rate</span>
                                                        <span className="text-base font-black text-amber-600 dark:text-amber-400 block">
                                                            &gt; 16%
                                                        </span>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Assessed Value</span>
                                                        <span className="text-base font-black text-slate-800 dark:text-white block">
                                                            {assessedVal ? `$${Math.round(assessedVal).toLocaleString()}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Opening Bid / Price</span>
                                                        <span className="text-base font-black text-slate-800 dark:text-white block">
                                                            {price ? `$${price.toLocaleString()}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Estimated ARV</span>
                                                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block">
                                                            {arv ? `$${Math.round(arv).toLocaleString()}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Recommended Max Bid</span>
                                                        <span className="text-base font-black text-amber-600 dark:text-amber-400 block">
                                                            {maxBid ? `$${Math.round(maxBid).toLocaleString()}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Estimated Rent / Mo</span>
                                                        <span className="text-base font-black text-slate-800 dark:text-white block">
                                                            {rent ? `$${Math.round(rent).toLocaleString()}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Spread Highlight Bar */}
                                        {isTaxLien ? (
                                            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-3 rounded-xl flex items-center justify-between shadow-3xs">
                                                <div className="space-y-0.5 text-left">
                                                    <span className="text-[8px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest block">Tax Lien Investment</span>
                                                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">Subject to redemption period</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-xl flex items-center justify-between shadow-3xs">
                                                <div className="space-y-0.5 text-left">
                                                    <span className="text-[8px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest block">Potential Equity Spread</span>
                                                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">Spread over Recommended Max Bid</span>
                                                </div>
                                                <span className="text-base font-black text-indigo-650 dark:text-indigo-455">
                                                    {equity ? `$${Math.round(equity).toLocaleString()}` : 'N/A'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <Divider className="dark:border-slate-800" />

                                    {/* Property Profile Panel */}
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-650 dark:text-indigo-400 border-b border-slate-150 dark:border-slate-800/80 pb-2">
                                            Property Profile
                                        </h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Structure</span>
                                                <span className="text-xs font-bold text-slate-850 dark:text-slate-200 block break-words">
                                                    {property.property_type || details?.property_type || 'Residential'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Beds / Baths</span>
                                                <span className="text-xs font-bold text-slate-850 dark:text-slate-200 block">
                                                    {details?.bedrooms || property.bedrooms || '-'} br / {details?.bathrooms || property.bathrooms || '-'} ba
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Building Area</span>
                                                <span className="text-xs font-bold text-slate-855 dark:text-slate-200 block">
                                                    {details?.building_area_sqft || details?.sqft || property.building_area_sqft || property.sqft ? `${(details?.building_area_sqft || details?.sqft || property.building_area_sqft || property.sqft).toLocaleString()} sqft` : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Lot Acreage</span>
                                                <span className="text-xs font-bold text-slate-855 dark:text-slate-200 block">
                                                    {details?.lot_acres ? `${details.lot_acres} acres` : property.lot_sqft ? `${(property.lot_sqft / 43560).toFixed(2)} acres` : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Year Built</span>
                                                <span className="text-xs font-bold text-slate-855 dark:text-slate-200 block">
                                                    {details?.year_built || property.year_built || '1995'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Parcel ID</span>
                                                <span className="text-xs font-mono font-bold text-indigo-650 dark:text-indigo-400 block break-all">
                                                    {property.parcel_id || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Legal description box */}
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-lg space-y-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Legal Description</span>
                                            <p className="text-[10px] font-mono text-slate-650 dark:text-slate-400 leading-normal">
                                                {details?.legal_description || property.legal_description || 'No legal description available for this parcel.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Extracted Parcel Data */}
                                    {property.shape_data && property.shape_data.length > 0 && (
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 space-y-3">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-650 dark:text-indigo-400 border-b border-slate-150 dark:border-slate-800/80 pb-2">
                                                Extracted Parcel Data
                                            </h3>
                                            <div className="space-y-1.5">
                                                {property.shape_data.slice(0, 10).map((sd: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 pb-1.5">
                                                        <span className="text-slate-400 font-bold uppercase text-[9px]">{sd.subcategory}</span>
                                                        <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[60%]">{sd.value || '-'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {property.shape_data.length > 10 && (
                                                <p className="text-[10px] text-center text-slate-450 mt-1 font-semibold">+ {property.shape_data.length - 10} more items...</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            No data available
                        </div>
                    )}
                </div>
            </div>
        </Drawer>
    );
};
