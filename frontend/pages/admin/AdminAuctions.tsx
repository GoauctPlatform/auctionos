
import React, { useState } from 'react';
import AuctionCalendar from '../../components/admin/AuctionCalendar';
import AuctionList from '../../components/admin/AuctionList';
import AuctionFilters, { AuctionFilterParams } from '../../components/admin/AuctionFilters';
import PropertyForm from '../../components/admin/PropertyForm';
import PropertyList from '../../components/admin/PropertyList';
import PropertyFilters, { PropertyFilterParams } from '../../components/admin/PropertyFilters';
import SystemAnnouncementForm from '../../components/admin/SystemAnnouncementForm';
import UserList from '../../components/admin/UserList';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { PropertyService } from '../../services/property.service';
import { RedemptionIntelligenceBoard } from '../../components/property/RedemptionIntelligenceBoard';

interface AdminAuctionsProps {
    defaultTab?: 'auctions' | 'properties';
}

export const AdminAuctions: React.FC<AdminAuctionsProps> = ({ defaultTab = 'auctions' }) => {
    const [activeTab, setActiveTab] = useState<'auctions' | 'properties'>(defaultTab as any);
    const [filters, setFilters] = useState<AuctionFilterParams>({});
    const [propertyFilters, setPropertyFilters] = useState<PropertyFilterParams>(() => {
        try {
            const saved = sessionStorage.getItem('admin_property_filters');
            if (saved) {
                const parsed = JSON.parse(saved);
                return Object.keys(parsed).length > 0 ? parsed : { availability: 'available' };
            }
        } catch {}
        return { availability: 'available' };
    });

    React.useEffect(() => {
        sessionStorage.setItem('admin_property_filters', JSON.stringify(propertyFilters));
    }, [propertyFilters]);

    const [, setSearchParams] = useSearchParams();
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const handleForceStatusUpdate = async () => {
        setIsUpdatingStatus(true);
        try {
            const res = await PropertyService.forceStatusUpdate();
            alert(`Status update complete. Processed ${res.processed} properties.`);
        } catch (error) {
            alert('Failed to force status update.');
            console.error(error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Module</h1>
                <button
                    onClick={handleForceStatusUpdate}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors text-sm disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${isUpdatingStatus ? 'animate-spin' : ''}`}>sync</span>
                    {isUpdatingStatus ? 'Updating...' : 'Force Status Auto-Update'}
                </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                <TabButton active={activeTab === 'auctions'} onClick={() => setActiveTab('auctions')} label="Auctions Dashboard" />
                <TabButton active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} label="Property Manager" />
            </div>

            {activeTab === 'auctions' && (
                <div className="flex flex-col gap-4">
                    <AuctionFilters onFilterChange={setFilters} />
                    
                    <RedemptionIntelligenceBoard />

                    <div className="flex flex-col gap-6">
                        <Box className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl">
                            <AuctionList filters={filters} />
                        </Box>

                        <Box className="w-full">
                            <AuctionCalendar filters={filters} onDateTypeSelect={handleDateTypeSelect} />
                        </Box>
                    </div>
                </div>
            )}

            {activeTab === 'properties' && (
                <div className="space-y-6">
                    <PropertyFilters onFilterChange={setPropertyFilters} />
                    <div className="flex flex-col gap-8">
                        <div className="w-full max-w-4xl mx-auto">
                            <PropertyForm onSuccess={() => { }} />
                        </div>
                        <div className="w-full h-[calc(100vh-350px)] flex flex-col min-h-[500px]">
                            <PropertyList filters={propertyFilters} />
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`pb-2 px-4 whitespace-nowrap transition-colors ${active ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
    >
        {label}
    </button>
);

export default AdminAuctions;
