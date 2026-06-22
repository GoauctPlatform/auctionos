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
    Sync as SyncIcon
} from '@mui/icons-material';
import AuctionPropertiesList from './AuctionPropertiesList';
import { AdminService } from '../../services/admin.service';
import { PropertyRedemptionCard } from '../property/PropertyRedemptionCard';
import { useAuth } from '../../context/AuthContext';

interface AuctionDetailsSidebarProps {
    eventData: any;
    onClose: () => void;
    isOpen: boolean;
}

export const AuctionDetailsSidebar: React.FC<AuctionDetailsSidebarProps> = ({ eventData, onClose, isOpen }) => {
    const { user } = useAuth();
    const [reconciling, setReconciling] = useState(false);
    const [reconcileCount, setReconcileCount] = useState<number | null>(null);

    if (!isOpen || !eventData) return null;

    const props = eventData.extendedProps || {};
    const auctionId = eventData.id || props.id || props.auction_id;
    const dateStr = eventData.start ? new Date(eventData.start).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '';
    const rawDate = eventData.startStr ? eventData.startStr.split('T')[0] : (eventData.start ? new Date(eventData.start).toISOString().split('T')[0] : undefined);
    const timeStr = eventData.start ? new Date(eventData.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const cleanAuctionName = (eventData.title || '').replace(/\(\d+\)$/, '').trim();

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
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl relative w-full overflow-hidden transition-all">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <Typography variant="h6" className="font-bold text-slate-800 dark:text-white truncate pr-4">
                    {cleanAuctionName}
                </Typography>
                <IconButton aria-label="close" onClick={onClose} size="small" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    <CloseIcon />
                </IconButton>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
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
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
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
                    <div className="mb-4">
                        <PropertyRedemptionCard stateCode={props.state} auctionType={props.tax_status} />
                    </div>
                )}

                {/* Official Links */}
                {(props.register_link || props.list_link) && (
                    <div className="space-y-2">
                        <Typography variant="subtitle2" color="textSecondary" className="text-xs uppercase tracking-wider font-bold">Official Links</Typography>
                        <div className="flex flex-col gap-2">
                            {props.register_link && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    href={props.register_link}
                                    target="_blank"
                                    startIcon={<OpenInNewIcon />}
                                    sx={{ justifyContent: 'flex-start', borderRadius: '8px' }}
                                >
                                    Registration / Instructions
                                </Button>
                            )}
                            {props.list_link && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    href={props.list_link}
                                    target="_blank"
                                    startIcon={<OpenInNewIcon />}
                                    sx={{ justifyContent: 'flex-start', borderRadius: '8px' }}
                                >
                                    Official Property List
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <Divider className="my-6 dark:border-slate-800" />

                {/* Admin Sync Button */}
                {user?.role === 'admin' && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 mb-6">
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
                            sx={{ borderRadius: '8px' }}
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

                {/* Matched Properties */}
                <div className="mt-4">
                    <Typography variant="h6" className="font-bold text-slate-800 dark:text-white mb-4">
                        Matched Properties
                    </Typography>
                    <AuctionPropertiesList
                        auctionName={cleanAuctionName}
                        auctionDate={rawDate}
                        auctionId={auctionId}
                        onClose={() => {}} // Not needed as it's embedded
                        embedded={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default AuctionDetailsSidebar;
