import React, { useState } from 'react';
import AuctionList from '../../components/admin/AuctionList';
import AuctionCalendar from '../../components/admin/AuctionCalendar';
import AuctionFilters, { AuctionFilterParams } from '../../components/admin/AuctionFilters';
import { Box, Typography } from '@mui/material';
import { RedemptionIntelligenceBoard } from '../../components/property/RedemptionIntelligenceBoard';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ClientAuctions: React.FC = () => {
    const [filters, setFilters] = useState<AuctionFilterParams>({});
    const [searchParams, setSearchParams] = useSearchParams();

    const { user } = useAuth();
    const navigate = useNavigate();

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
            <Typography variant="h4" className="font-bold text-slate-800 dark:text-white">
                Live Auctions
            </Typography>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500">info</span>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <b>Tip:</b> Click on any auction in the calendar or list to view <b>Redemption Intelligence</b> and matched properties.
                </p>
            </div>

            <AuctionFilters onFilterChange={setFilters} />
            
            <RedemptionIntelligenceBoard />
            
            <Box className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <AuctionCalendar filters={filters} onDateTypeSelect={handleDateTypeSelect} />
            </Box>

            <div className="w-full animate-in fade-in duration-500">
                <Typography variant="h6" className="font-bold text-slate-800 dark:text-white mb-4">
                    {hasActiveFilters ? 'Search Results' : 'Upcoming Auctions'}
                </Typography>
                <Box className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl">
                    <AuctionList filters={filters} readOnly={true} />
                </Box>
            </div>
        </div>
    );
};

export default ClientAuctions;
