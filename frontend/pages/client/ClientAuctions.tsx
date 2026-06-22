import React, { useState } from 'react';
import AuctionList from '../../components/admin/AuctionList';
import AuctionCalendar from '../../components/admin/AuctionCalendar';
import AuctionFilters, { AuctionFilterParams } from '../../components/admin/AuctionFilters';
import { Box, Typography } from '@mui/material';
import AuctionWorkspaceModal from '../../components/admin/AuctionWorkspaceModal';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';

const ClientAuctions: React.FC = () => {
    const [filters, setFilters] = useState<AuctionFilterParams>({});
    const [selectedAuctionEvent, setSelectedAuctionEvent] = useState<any | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const { user } = useAuth();
    const navigate = useNavigate();
    const { startTour } = useTour();



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

    if (user?.subscription_tier === 'trial') {
        return (
            <div className="flex flex-col items-center justify-center p-8 py-16 text-center max-w-lg mx-auto size-full min-h-[60vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl backdrop-blur-md">
                <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-amber-500 animate-bounce">lock</span>
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-extrabold uppercase tracking-widest mb-3 border border-amber-500/20">
                    Premium Feature Locked
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    Live Auctions Calendar
                </h3>
                <p className="text-slate-650 dark:text-slate-400 text-sm leading-relaxed mb-8 font-medium">
                    Your current account is in **Trial Mode**. Detailed county-level Live Auctions calendar and historical bidding timelines are restricted to **Pro** and **Enterprise** subscribers.
                </p>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-workbench-widget', { detail: { widgetId: 'billings_and_plans' } }));
                    }}
                    className="w-full max-w-xs py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                >
                    Upgrade Plan Now
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 w-full space-y-6 px-4 sm:px-8 lg:px-12">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">info</span>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <b>Tip:</b> Click on any auction in the calendar or list to view <b>Redemption Intelligence</b> and matched properties.
                    </p>
                </div>
                <button
                    onClick={() => startTour('live_auctions')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all shadow-sm bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse shrink-0"
                >
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    Page Tour
                </button>
            </div>

            <div id="tour-auctions-filters">
                <AuctionFilters onFilterChange={setFilters} />
            </div>
            
            <div className="flex flex-col relative gap-6 items-start">
                <div className={`flex-1 flex flex-col gap-6 w-full transition-all duration-300`}>
                    <Box id="tour-auctions-calendar" className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <AuctionCalendar filters={filters} onDateTypeSelect={handleDateTypeSelect} onSelectAuction={setSelectedAuctionEvent} />
                    </Box>

                    <div className="w-full animate-in fade-in duration-500">
                        <Typography variant="h6" className="font-bold text-slate-800 dark:text-white mb-4">
                            {hasActiveFilters ? 'Search Results' : 'Upcoming Auctions'}
                        </Typography>
                        <Box className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl overflow-hidden">
                            <AuctionList filters={filters} readOnly={true} onSelectAuction={setSelectedAuctionEvent} />
                        </Box>
                    </div>
                </div>

                {/* Workspace Modal */}
                <AuctionWorkspaceModal 
                    isOpen={!!selectedAuctionEvent} 
                    eventData={selectedAuctionEvent} 
                    onClose={() => setSelectedAuctionEvent(null)} 
                />
            </div>
        </div>
    );
};

export default ClientAuctions;
