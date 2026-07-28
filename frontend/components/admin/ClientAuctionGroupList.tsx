import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, CircularProgress, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AuctionService } from '../../services/auction.service';
import { AuctionEvent } from '../../types';
import GavelIcon from '@mui/icons-material/Gavel';
import MapsHomeWorkIcon from '@mui/icons-material/MapsHomeWork';
import TodayIcon from '@mui/icons-material/Today';

interface ClientAuctionGroupListProps {
    date: string;
    type: string;
    filters: any;
    onClose: () => void;
}

export const ClientAuctionGroupList: React.FC<ClientAuctionGroupListProps> = ({ date, type, filters, onClose }) => {
    const [auctions, setAuctions] = useState<AuctionEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const response = await AuctionService.getAuctionEvents({
                    ...filters,
                    startDate: date,
                    endDate: date,
                    tax_status: type
                });
                setAuctions(response.items || []);
            } catch (err) {
                console.error('Failed to load group auctions', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [date, type, filters]);

    const handleSelect = (evt: AuctionEvent) => {
        window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
            detail: {
                type: 'auction_details',
                title: `🔨 Auction: ${evt.title || 'Workspace'}`,
                data: { eventData: evt }
            }
        }));
    };

    return (
        <div className="size-full flex flex-col bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <IconButton onClick={onClose} size="small" title="Back to Calendar" className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-colors">
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <div className="flex flex-col">
                        <Typography variant="h6" className="font-black text-slate-800 dark:text-white leading-tight flex items-center gap-2">
                            <TodayIcon className="text-blue-500" />
                            {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Typography>
                        <div className="flex items-center gap-2 mt-1">
                            <Chip label={type} size="small" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-bold text-xs" />
                            <Typography variant="caption" className="text-slate-500 dark:text-slate-400 font-medium">
                                {auctions.length} {auctions.length === 1 ? 'Auction' : 'Auctions'} Found
                            </Typography>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <IconButton onClick={onClose} size="small" title="Close" className="text-slate-500 hover:text-red-500 transition-colors">
                        <CloseIcon />
                    </IconButton>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <CircularProgress />
                    </div>
                ) : auctions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <GavelIcon className="text-6xl mb-4 opacity-50" />
                        <Typography variant="h6">No auctions found</Typography>
                        <Typography variant="body2">Try adjusting your filters</Typography>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {auctions.map(auction => (
                            <div 
                                key={auction.id || auction.auction_id}
                                onClick={() => handleSelect(auction)}
                                className="group relative bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 shrink-0">
                                        <GavelIcon fontSize="small" />
                                    </div>
                                    {auction.property_count ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <MapsHomeWorkIcon className="text-[14px] text-slate-500 dark:text-slate-400" />
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {auction.property_count} Prop{auction.property_count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                                
                                <Typography variant="subtitle1" className="font-bold text-slate-800 dark:text-white leading-tight mb-2 line-clamp-2">
                                    {auction.title || `Auction #${auction.id || auction.auction_id}`}
                                </Typography>
                                
                                {auction.county && (
                                    <Typography variant="body2" className="text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">
                                        {auction.county} County
                                    </Typography>
                                )}
                                
                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                        View Workspace &rarr;
                                    </span>
                                    <Chip 
                                        label={auction.status || 'Scheduled'} 
                                        size="small" 
                                        className="h-6 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientAuctionGroupList;
