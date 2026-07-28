import React, { useState } from 'react';
import {
    Typography,
    Box,
    Divider,
    IconButton,
    Chip,
    Button
} from '@mui/material';
import {
    Close as CloseIcon,
    Event as EventIcon,
    LocationOn as LocationIcon,
    Info as InfoIcon,
    OpenInNew as OpenInNewIcon,
    ListAlt as ListIcon,
    Sync as SyncIcon,
    ArrowBack as ArrowBackIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon
} from '@mui/icons-material';
import AuctionPropertiesList from './AuctionPropertiesList';
import { AdminService } from '../../services/admin.service';
import { AuctionService } from '../../services/auction.service';
import { PropertyRedemptionCard } from '../property/PropertyRedemptionCard';
import { useAuth } from '../../context/AuthContext';

interface ClientAuctionDetailsProps {
    eventData: any;
    onClose: () => void;
}

export const ClientAuctionDetails: React.FC<ClientAuctionDetailsProps> = ({ eventData, onClose }) => {
    const { user } = useAuth();
    const [reconciling, setReconciling] = useState(false);
    const [reconcileCount, setReconcileCount] = useState<number | null>(null);
    const [isFav, setIsFav] = React.useState(false);

    const props = eventData?.extendedProps || {};
    const auctionId = eventData?.id || props.id || props.auction_id;
    const dateStr = eventData?.start ? new Date(eventData.start).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '';
    const rawDate = eventData?.startStr ? eventData.startStr.split('T')[0] : (eventData?.start ? new Date(eventData.start).toISOString().split('T')[0] : undefined);
    const timeStr = eventData?.start ? new Date(eventData.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const cleanAuctionName = (eventData?.title || '').replace(/\(\d+\)$/, '').trim();

    React.useEffect(() => {
        if (!auctionId) return;

        AuctionService.getFavorites().then(favIds => {
            setIsFav(new Set(favIds).has(Number(auctionId)));
        }).catch(() => {});

        const handleSync = (e: any) => {
            if (e.detail) {
                setIsFav(new Set(e.detail).has(Number(auctionId)));
            }
        };

        window.addEventListener('auction-favorites-updated', handleSync);
        return () => window.removeEventListener('auction-favorites-updated', handleSync);
    }, [auctionId]);

    if (!eventData) return null;

    const handleToggleFavorite = async () => {
        if (!auctionId) return;
        const newFavStatus = !isFav;
        setIsFav(newFavStatus);
        
        try {
            if (newFavStatus) {
                await AuctionService.addFavorite(Number(auctionId));
            } else {
                await AuctionService.removeFavorite(Number(auctionId));
            }
            AuctionService.getFavorites().then(favIds => {
                window.dispatchEvent(new CustomEvent('auction-favorites-updated', { detail: favIds }));
            });
        } catch (err) {
            setIsFav(!newFavStatus);
            console.error('Failed to toggle favorite', err);
        }
    };

    const handleReconcile = async () => {
        if (!auctionId) {
            console.error("No auction ID found in eventData", eventData);
            alert("This auction record is missing an ID. Try refreshing the calendar.");
            return;
        }
        setReconciling(true);
        try {
            const res = await AdminService.reconcileAuctionProperties(auctionId);
            setReconcileCount(res.linked_count);
        } catch (err: any) {
            alert(`Reconciliation failed: ${err.message}`);
        } finally {
            setReconciling(false);
        }
    };

    return (
        <div className="size-full flex flex-col bg-white dark:bg-slate-950 rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            {/* Header / Top Bar */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0">
                <div className="flex items-center gap-3">
                    <IconButton onClick={onClose} size="small" title="Back to List" className="text-slate-500 hover:text-slate-800 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg">
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="h6" className="font-bold text-slate-800 dark:text-white truncate">
                        {cleanAuctionName}
                    </Typography>
                </div>
                <div className="flex items-center gap-2">
                    <IconButton 
                        onClick={handleToggleFavorite} 
                        size="small" 
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        className={isFav ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-slate-400 hover:text-slate-600"}
                    >
                        {isFav ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                    <IconButton onClick={onClose} size="small" title="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        <CloseIcon />
                    </IconButton>
                </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-white dark:bg-slate-950">
                {/* Left Sidebar */}
                <Box className="w-full max-h-[35vh] md:max-h-none md:w-[350px] shrink-0 border-b md:border-b-0 border-r-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="p-5 space-y-6">
                        {/* Meta Tags */}
                        <div className="flex flex-wrap gap-2">
                            <Chip icon={<EventIcon />} label={`${dateStr} at ${timeStr}`} color="primary" variant="outlined" size="small" />
                            {props.property_count > 0 && (
                                <Chip icon={<ListIcon />} label={`${props.property_count} Total`} color="secondary" variant="outlined" size="small" />
                            )}
                            {props.available_count > 0 && (
                                <Chip icon={<SyncIcon />} label={`${props.available_count} Available`} color="success" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />
                            )}
                            {props.tax_status && (
                                <Chip label={props.tax_status} color={props.tax_status.toLowerCase() === 'deed' ? 'success' : 'error'} variant="filled" size="small" sx={{ fontWeight: 'bold' }} />
                            )}
                        </div>

                        {/* Location and Notes */}
                        <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div>
                                <Typography variant="subtitle2" color="textSecondary" className="flex items-center gap-1 mb-1 text-xs uppercase tracking-wider font-bold">
                                    <LocationIcon fontSize="small" className="text-indigo-500" /> Location / Type
                                </Typography>
                                <Typography variant="body2" className="pl-6 font-medium text-slate-700 dark:text-slate-300">
                                    {props.location || 'Online / Specified upon registration'}
                                </Typography>
                            </div>

                            {props.notes && (
                                <div>
                                    <Typography variant="subtitle2" color="textSecondary" className="flex items-center gap-1 mb-1 text-xs uppercase tracking-wider font-bold">
                                        <InfoIcon fontSize="small" className="text-amber-500" /> Notes
                                    </Typography>
                                    <Typography variant="body2" className="pl-6 text-slate-600 dark:text-slate-400">
                                        {props.notes}
                                    </Typography>
                                </div>
                            )}
                        </div>

                        {/* Redemption Intelligence */}
                        {props.state && (
                            <div>
                                <Typography variant="subtitle2" className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Redemption Terms</Typography>
                                <PropertyRedemptionCard stateCode={props.state} auctionType={props.tax_status} />
                            </div>
                        )}

                        {/* Official Links & Research */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <Typography variant="subtitle2" className="flex items-center gap-1.5 mb-3 text-xs uppercase tracking-wider font-bold text-slate-800 dark:text-white">
                                <span className="material-symbols-outlined text-blue-500 text-[18px]">gavel</span> 
                                Official Links & Research
                            </Typography>
                            <div className="flex flex-col gap-2.5">
                                {props.register_link && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        href={props.register_link}
                                        target="_blank"
                                        startIcon={<OpenInNewIcon />}
                                        sx={{ 
                                            justifyContent: 'flex-start', 
                                            borderRadius: '8px', 
                                            textTransform: 'none', 
                                            fontWeight: 'bold',
                                            bgcolor: 'primary.main',
                                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                                        }}
                                    >
                                        Official Registration
                                    </Button>
                                )}
                                {props.list_link && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        href={props.list_link}
                                        target="_blank"
                                        startIcon={<OpenInNewIcon />}
                                        sx={{ 
                                            justifyContent: 'flex-start', 
                                            borderRadius: '8px', 
                                            textTransform: 'none', 
                                            fontWeight: 'bold',
                                            bgcolor: 'secondary.main',
                                            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)'
                                        }}
                                    >
                                        Official Property List
                                    </Button>
                                )}
                                
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="caption" className="text-slate-500 font-bold mb-1">County Discovery</Typography>
                                
                                <Button
                                    variant="outlined"
                                    size="small"
                                    href={`https://www.google.com/search?q=${encodeURIComponent(`${props.county || ''} County ${props.state || ''} tax sale portal`)}`}
                                    target="_blank"
                                    startIcon={<span className="material-symbols-outlined text-[16px]">travel_explore</span>}
                                    sx={{ justifyContent: 'flex-start', borderRadius: '8px', textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    Search County Portal
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    href={`https://www.google.com/search?q=${encodeURIComponent(`${props.county || ''} County ${props.state || ''} property appraiser assessor`)}`}
                                    target="_blank"
                                    startIcon={<span className="material-symbols-outlined text-[16px]">map</span>}
                                    sx={{ justifyContent: 'flex-start', borderRadius: '8px', textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    County Assessor Site
                                </Button>
                            </div>
                        </div>

                        {/* Admin Sync Button */}
                        {user?.role === 'admin' && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30">
                                <Typography variant="subtitle2" className="text-amber-800 dark:text-amber-500 font-bold mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                                    Admin Controls
                                </Typography>
                                <Button 
                                    startIcon={<SyncIcon />} 
                                    onClick={handleReconcile} 
                                    disabled={reconciling}
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    fullWidth
                                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    {reconciling ? 'Syncing Properties...' : 'Sync Properties from System'}
                                </Button>
                                {reconcileCount !== null && (
                                    <Typography variant="caption" className="text-emerald-600 dark:text-emerald-400 font-bold block mt-2 text-center">
                                        Successfully linked {reconcileCount} properties!
                                    </Typography>
                                )}
                            </div>
                        )}
                    </div>
                </Box>

                {/* Right Main Area (Properties) */}
                <Box className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 p-6">
                    <Typography variant="h6" className="font-bold text-slate-800 dark:text-white mb-4">
                        Auction Properties
                    </Typography>
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <AuctionPropertiesList
                            auctionName={cleanAuctionName}
                            auctionDate={rawDate}
                            auctionId={auctionId}
                            onClose={onClose}
                            embedded={true}
                        />
                    </div>
                </Box>
            </div>
        </div>
    );
};

export default ClientAuctionDetails;
