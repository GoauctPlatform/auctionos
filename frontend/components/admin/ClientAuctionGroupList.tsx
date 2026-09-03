import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, CircularProgress, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { AuctionService } from '../../services/auction.service';
import { AuctionEvent } from '../../types';
import GavelIcon from '@mui/icons-material/Gavel';
import MapsHomeWorkIcon from '@mui/icons-material/MapsHomeWork';
import TodayIcon from '@mui/icons-material/Today';
import PlaceIcon from '@mui/icons-material/Place';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

const STATE_CODE_MAP: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC', 'Washington, D.C.': 'DC', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

const getStateCode = (stateName: string) => {
    if (!stateName) return 'FL';
    if (stateName.length === 2) return stateName.toUpperCase();
    return STATE_CODE_MAP[stateName] || 'FL';
};

interface ClientAuctionGroupListProps {
    date: string;
    type: string;
    filters: any;
    onClose: () => void;
}

export const ClientAuctionGroupList: React.FC<ClientAuctionGroupListProps> = ({ date, type, filters, onClose }) => {
    const [auctions, setAuctions] = useState<AuctionEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

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
                
                try {
                    const favIds = await AuctionService.getFavorites();
                    setFavorites(new Set(favIds || []));
                } catch (favErr) {
                    console.error('Failed to load favorites', favErr);
                }
            } catch (err) {
                console.error('Failed to load group auctions', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
        
        const handleSync = (e: any) => {
            if (e.detail) setFavorites(new Set(e.detail));
        };
        window.addEventListener('auction-favorites-updated', handleSync);
        
        return () => {
            window.removeEventListener('auction-favorites-updated', handleSync);
        };
    }, [date, type, filters]);

    const handleSelect = (evt: AuctionEvent) => {
        window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
            detail: {
                type: 'auction_details',
                title: `🔨 Auction: ${evt.name || 'Workspace'}`,
                data: { eventData: evt }
            }
        }));
    };

    const toggleFavorite = async (e: React.MouseEvent, auctionId: number) => {
        e.stopPropagation();
        try {
            if (favorites.has(auctionId)) {
                await AuctionService.removeFavorite(auctionId);
                setFavorites(prev => {
                    const next = new Set(prev);
                    next.delete(auctionId);
                    window.dispatchEvent(new CustomEvent('auction-favorites-updated', { detail: Array.from(next) }));
                    return next;
                });
            } else {
                await AuctionService.addFavorite(auctionId);
                setFavorites(prev => {
                    const next = new Set(prev);
                    next.add(auctionId);
                    window.dispatchEvent(new CustomEvent('auction-favorites-updated', { detail: Array.from(next) }));
                    return next;
                });
            }
        } catch (err) {
            console.error('Failed to toggle favorite', err);
        }
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
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Typography>
                        <div className="flex items-center gap-2 mt-1">
                            <Chip label={type} size="small" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-bold text-xs" />
                            <Typography variant="caption" className="text-slate-500 dark:text-slate-400 font-medium">
                                {auctions.length} {auctions.length === 1 ? 'Auction' : 'Auctions'} Found
                            </Typography>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(e, newMode) => newMode && setViewMode(newMode)}
                        size="small"
                        className="bg-slate-100 dark:bg-slate-800"
                    >
                        <ToggleButton value="list" aria-label="list view" className="dark:text-slate-300">
                            <ViewListIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="cards" aria-label="cards view" className="dark:text-slate-300">
                            <ViewModuleIcon fontSize="small" />
                        </ToggleButton>
                    </ToggleButtonGroup>
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
                    <>
                        {viewMode === 'cards' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                                {auctions.map(auction => (
                                    <div 
                                        key={auction.id || (auction as any).auction_id}
                                        onClick={() => handleSelect(auction)}
                                        className="group relative bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500/50 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="absolute -bottom-4 -right-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                            <img 
                                                src={`https://raw.githubusercontent.com/ahuseyn/state-icons/master/icons/${getStateCode(auction.state || '')}.svg`} 
                                                alt={auction.state || 'State'} 
                                                className="w-48 h-48 object-contain filter grayscale dark:invert"
                                            />
                                        </div>
                                        
                                        <div className="relative z-10 flex justify-between items-start mb-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 shrink-0">
                                                <GavelIcon fontSize="small" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {(auction.properties_count || auction.parcels_count) ? (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                        <MapsHomeWorkIcon className="text-[14px] text-slate-500 dark:text-slate-400" />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            {auction.live_available_count !== undefined ? `${auction.live_available_count} / ` : ''}{(auction.properties_count || auction.parcels_count)} Prop{(auction.properties_count || auction.parcels_count) !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                <IconButton 
                                                    size="small" 
                                                    onClick={(e) => toggleFavorite(e, auction.id || (auction as any).auction_id)}
                                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    {favorites.has(auction.id || (auction as any).auction_id) ? (
                                                        <StarIcon fontSize="small" className="text-amber-400" />
                                                    ) : (
                                                        <StarBorderIcon fontSize="small" className="text-slate-400 dark:text-slate-500 hover:text-amber-400 transition-colors" />
                                                    )}
                                                </IconButton>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center mb-2">
                                            <Typography variant="subtitle1" className="relative z-10 font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">
                                                {auction.name || `Auction #${auction.id || (auction as any).auction_id}`}
                                            </Typography>
                                            {auction.deal_rating && (
                                                <Chip 
                                                    label={`Score: ${auction.deal_rating}`} 
                                                    size="small" 
                                                    className={`ml-2 h-5 text-[9px] font-black tracking-wider ${
                                                        auction.deal_rating.startsWith('A') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                                        auction.deal_rating.startsWith('B') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                                        auction.deal_rating.startsWith('C') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                                    }`}
                                                />
                                            )}
                                        </div>
                                        
                                        <Typography variant="body2" className="relative z-10 text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
                                            {auction.county ? `${auction.county} County` : ''} 
                                            {auction.state ? `, ${getStateCode(auction.state)}` : ''}
                                        </Typography>
                                        
                                        <Typography variant="caption" className="relative z-10 text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                                            <TodayIcon fontSize="inherit" />
                                            {new Date(auction.auction_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {auction.tax_status || 'Live Auction'}
                                        </Typography>

                                        {auction.location && (
                                            <Typography variant="caption" className="relative z-10 text-slate-500 dark:text-slate-400 mb-2 flex items-start gap-1 line-clamp-2">
                                                <PlaceIcon fontSize="inherit" className="mt-0.5" />
                                                {auction.location}
                                            </Typography>
                                        )}

                                        {auction.notes && (
                                            <Typography variant="caption" className="relative z-10 text-slate-500 dark:text-slate-400 mb-4 flex items-start gap-1 line-clamp-2 italic">
                                                <InfoOutlinedIcon fontSize="inherit" className="mt-0.5" />
                                                {auction.notes}
                                            </Typography>
                                        )}
                                        
                                        {!auction.notes && !auction.location && <div className="mb-4"></div>}
                                        
                                        <div className="relative z-10 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                                View Workspace &rarr;
                                            </span>
                                            <Chip 
                                                label={(auction as any).status || 'Scheduled'} 
                                                size="small" 
                                                className="h-6 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 pb-20">
                                {auctions.map(auction => (
                                    <div 
                                        key={auction.id || (auction as any).auction_id}
                                        onClick={() => handleSelect(auction)}
                                        className="group bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 cursor-pointer transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-1 min-w-0">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 shrink-0">
                                                <GavelIcon fontSize="small" />
                                            </div>
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => toggleFavorite(e, auction.id || (auction as any).auction_id)}
                                                className="shrink-0 -ml-2"
                                            >
                                                {favorites.has(auction.id || (auction as any).auction_id) ? (
                                                    <StarIcon fontSize="small" className="text-amber-400" />
                                                ) : (
                                                    <StarBorderIcon fontSize="small" className="text-slate-400 dark:text-slate-500 hover:text-amber-400 transition-colors" />
                                                )}
                                            </IconButton>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center">
                                                    <Typography variant="subtitle2" className="font-bold text-slate-800 dark:text-white leading-tight truncate">
                                                        {auction.name || `Auction #${auction.id || (auction as any).auction_id}`}
                                                    </Typography>
                                                </div>
                                                <Typography variant="caption" className="text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-1">
                                                    {auction.county ? `${auction.county} County, ` : ''} {getStateCode(auction.state || '')}
                                                    <span className="mx-1">•</span>
                                                    <TodayIcon fontSize="inherit" />
                                                    {new Date(auction.auction_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {auction.tax_status && <><span className="mx-1">•</span>{auction.tax_status}</>}
                                                </Typography>
                                                {(auction.location || auction.notes) && (
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        {auction.location && (
                                                            <Typography variant="caption" className="text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                                                                <PlaceIcon fontSize="inherit" /> {auction.location}
                                                            </Typography>
                                                        )}
                                                        {auction.notes && (
                                                            <Typography variant="caption" className="text-slate-400 dark:text-slate-500 truncate flex items-center gap-1 italic">
                                                                <InfoOutlinedIcon fontSize="inherit" /> {auction.notes}
                                                            </Typography>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 shrink-0 mt-3 md:mt-0">
                                            {auction.deal_rating && (
                                                <Chip 
                                                    label={`Score: ${auction.deal_rating}`} 
                                                    size="small" 
                                                    className={`h-6 text-[10px] font-black uppercase tracking-wider ${
                                                        auction.deal_rating.startsWith('A') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                                                        auction.deal_rating.startsWith('B') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                                                        auction.deal_rating.startsWith('C') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400'
                                                    }`}
                                                />
                                            )}
                                            {(auction.properties_count || auction.parcels_count) ? (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                    <MapsHomeWorkIcon className="text-[12px] text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        {auction.live_available_count !== undefined ? `${auction.live_available_count} / ` : ''}{(auction.properties_count || auction.parcels_count)} Prop{(auction.properties_count || auction.parcels_count) !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ) : null}
                                            <Chip 
                                                label={(auction as any).status || 'Scheduled'} 
                                                size="small" 
                                                className="h-6 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                            />
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline hidden md:inline-block ml-2">
                                                View &rarr;
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ClientAuctionGroupList;
