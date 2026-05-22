import React, { useState } from 'react';
import AuctionList from '../../components/admin/AuctionList';
import AuctionCalendar from '../../components/admin/AuctionCalendar';
import AuctionFilters, { AuctionFilterParams } from '../../components/admin/AuctionFilters';
import { Box, Typography } from '@mui/material';
import { RedemptionIntelligenceBoard } from '../../components/property/RedemptionIntelligenceBoard';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';

const ClientAuctions: React.FC = () => {
    const [filters, setFilters] = useState<AuctionFilterParams>({});
    const [searchParams, setSearchParams] = useSearchParams();

    const { user } = useAuth();
    const navigate = useNavigate();
    const { startTour } = useTour();

    // Trial Plan access barrier
    React.useEffect(() => {
        if (user?.subscription_tier === 'trial') {
            navigate('/client/trial-limit', { replace: true });
        }
    }, [user, navigate]);

    // Deep-linking: Initialize filters from URL query parameters
    React.useEffect(() => {
        const name = searchParams.get('name');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const taxStatuses = searchParams.getAll('tax_statuses');
        
        setFilters(prev => ({
            ...prev,
            name: name || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            tax_statuses: taxStatuses.length > 0 ? taxStatuses : undefined
        }));
    }, [searchParams]);

    const handleDateTypeSelect = (date: string, type: string) => {
        setSearchParams(prev => {
            const params = new URLSearchParams(prev);
            params.set('startDate', date);
            params.set('endDate', date);
            if (type) {
                params.set('q', type);
            } else {
                params.delete('q');
            }
            return params;
        });
    };

    const hasActiveFilters = Object.values(filters).some(val => val !== undefined && val !== '');

    return (
        <div className="p-6 w-full space-y-6 px-4 sm:px-8 lg:px-12">
            <div className="flex justify-between items-center">
                <Typography variant="h4" className="font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                    <span className="bg-gradient-to-r from-[#0D8BFF] to-[#13B8B5] bg-clip-text text-transparent">Live</span> Auctions
                </Typography>
                <button
                    onClick={() => startTour('live_auctions')}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 bg-[#0D8BFF] hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(13,139,255,0.4)] text-white border-0 outline-none hover:scale-[1.02]"
                >
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    Page Tour
                </button>
            </div>
            
            <div className="relative overflow-hidden bg-white dark:bg-[#131926]/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 flex items-center gap-4 shadow-xl backdrop-blur-md">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#0D8BFF] to-[#13B8B5]" />
                <div className="size-9 rounded-xl bg-[#0D8BFF]/10 dark:bg-[#0D8BFF]/20 text-[#0D8BFF] flex items-center justify-center shrink-0 border border-[#0D8BFF]/20 dark:border-[#0D8BFF]/30">
                    <span className="material-symbols-outlined text-[20px] font-bold">info</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-[#0D8BFF] mr-1.5">Operational Intelligence Tip:</span>
                    Click on any auction in the calendar or list to view <span className="font-semibold text-slate-800 dark:text-white border-b border-dashed border-slate-400 dark:border-slate-600 pb-0.5">Redemption Intelligence</span> and matched distressed opportunities.
                </p>
            </div>

            <div id="tour-auctions-filters">
                <AuctionFilters onFilterChange={setFilters} />
            </div>
            
            <RedemptionIntelligenceBoard />
            
            <Box id="tour-auctions-calendar" className="w-full bg-white dark:bg-[#131926]/40 border border-slate-200/50 dark:border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
                <AuctionCalendar filters={filters} onDateTypeSelect={handleDateTypeSelect} />
            </Box>

            <div className="w-full animate-in fade-in duration-500">
                <Typography variant="h6" className="font-bold text-slate-800 dark:text-white mb-4">
                    {hasActiveFilters ? 'Search Results' : 'Upcoming Auctions'}
                </Typography>
                <Box className="w-full bg-white dark:bg-[#131926]/40 border border-slate-200/50 dark:border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
                    <AuctionList filters={filters} readOnly={true} />
                </Box>
            </div>
        </div>
    );
};

export default ClientAuctions;
