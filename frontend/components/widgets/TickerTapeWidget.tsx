import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Calendar } from 'lucide-react';

interface TickerAuction {
    id: number | string;
    title: string;
    countdown: string;
    type: string;
    address: string;
    parcel_id?: string;
}

export const TickerTapeWidget: React.FC = () => {
    const [upcomingAuctions, setUpcomingAuctions] = useState<TickerAuction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTicker = async () => {
            try {
                const res = await api.get('/api/v1/dashboard/ticker');
                setUpcomingAuctions(res.data || []);
            } catch (err) {
                console.error("Failed to fetch dashboard ticker", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTicker();
    }, []);

    const handleTickerClick = (auction: TickerAuction) => {
        if (auction.id && auction.parcel_id) {
            window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
                detail: {
                    type: 'property_details',
                    title: `🔍 Property: ${auction.parcel_id || auction.id}`,
                    data: { propertyId: auction.id, parcelId: auction.parcel_id }
                }
            }));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-8 bg-[#002b36] text-[#93a1a1] text-xs font-bold border-b border-[#1a4554] select-none">
                Loading Watchlist Auctions...
            </div>
        );
    }

    if (upcomingAuctions.length === 0) {
        return (
            <div className="flex items-center justify-center h-8 bg-[#002b36] text-[#93a1a1] text-[10px] font-bold border-b border-[#1a4554] select-none uppercase tracking-wider animate-in fade-in duration-500">
                <span className="text-[#268bd2] mr-2">💡 Tip:</span>
                Add properties to your watchlist to track upcoming auctions in this ticker!
            </div>
        );
    }

    return (
        <div className="relative flex overflow-x-hidden h-8 bg-[#002b36] text-white items-center border-b border-[#1a4554] group whitespace-nowrap select-none">
            <div className="absolute left-0 z-10 px-3 h-full flex items-center bg-[#268bd2] font-black text-[9px] uppercase tracking-widest shadow-[10px_0_20px_rgba(0,43,54,0.85)] border-r border-[#1a4554]/50">
                <Calendar size={11} className="mr-1.5" /> Watchlist
            </div>
            
            <div className="animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused] flex items-center pl-[120px]">
                {upcomingAuctions.map((auction, idx) => (
                    <div 
                        key={`${auction.id}-${idx}`} 
                        className="flex items-center mx-5 text-xs font-bold cursor-pointer text-[#eee8d5] hover:text-[#268bd2] transition-colors"
                        onClick={() => handleTickerClick(auction)}
                    >
                        <span className="text-[#268bd2] font-black mr-2">•</span>
                        <span>{auction.title}</span>
                        <span className="ml-2 text-[#93a1a1] font-semibold text-[10px]">({auction.type})</span>
                        <span className="ml-2 bg-[#073642] border border-[#1a4554] px-1.5 py-0.5 rounded text-[9.5px] font-black text-[#859900]">
                            {auction.countdown}
                        </span>
                    </div>
                ))}
            </div>

            {/* A second marquee div for seamless looping */}
            <div className="animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused] flex items-center pr-[100vw]" aria-hidden="true">
                {upcomingAuctions.map((auction, idx) => (
                    <div 
                        key={`dup-${auction.id}-${idx}`} 
                        className="flex items-center mx-5 text-xs font-bold cursor-pointer text-[#eee8d5] hover:text-[#268bd2] transition-colors"
                        onClick={() => handleTickerClick(auction)}
                    >
                        <span className="text-[#268bd2] font-black mr-2">•</span>
                        <span>{auction.title}</span>
                        <span className="ml-2 text-[#93a1a1] font-semibold text-[10px]">({auction.type})</span>
                        <span className="ml-2 bg-[#073642] border border-[#1a4554] px-1.5 py-0.5 rounded text-[9.5px] font-black text-[#859900]">
                            {auction.countdown}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};
