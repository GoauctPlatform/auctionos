import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { AuctionEvent } from '../../types';
import { Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TickerTapeWidget: React.FC = () => {
    const [upcomingAuctions, setUpcomingAuctions] = useState<AuctionEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTicker = async () => {
            try {
                const res = await api.get('/api/v1/dashboard/ticker');
                // The API returns countdown, type, address etc. Let's map it.
                const tickerData = res.data.map((item: any) => ({
                    id: item.id,
                    county: item.title, // "title" in backend is address or auction_name, let's just use title
                    state: 'FL',
                    type: item.type,
                    item_count: item.countdown // Using item_count field to show countdown
                }));
                setUpcomingAuctions(tickerData);
            } catch (err) {
                console.error("Failed to fetch dashboard ticker", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTicker();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-8 bg-slate-900 text-slate-400 text-xs font-bold border-b border-slate-800">
                Loading Upcoming Auctions...
            </div>
        );
    }

    if (upcomingAuctions.length === 0) {
        return (
            <div className="flex items-center justify-center h-8 bg-slate-900 text-slate-400 text-xs font-bold border-b border-slate-800">
                No Upcoming Auctions in the Next 30 Days
            </div>
        );
    }

    return (
        <div className="relative flex overflow-x-hidden h-8 bg-slate-900 text-white items-center border-b border-slate-800 group whitespace-nowrap">
            <div className="absolute left-0 z-10 px-3 h-full flex items-center bg-indigo-600 font-black text-[10px] uppercase tracking-widest shadow-[10px_0_20px_rgba(15,23,42,1)]">
                <Calendar size={12} className="mr-1.5" /> Next 30 Days
            </div>
            
            <div className="animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused] flex items-center pl-[120px]">
                {upcomingAuctions.map((auction, idx) => (
                    <div 
                        key={`${auction.id}-${idx}`} 
                        className="flex items-center mx-4 text-xs font-medium cursor-pointer hover:text-indigo-400 transition-colors"
                        onClick={() => navigate('/inventory')}
                    >
                        <span className="text-indigo-500 font-black mr-2">•</span>
                        <span className="font-bold">{auction.county || 'Upcoming Auction'}</span>
                        <span className="ml-2 text-slate-400">({auction.type})</span>
                        <span className="ml-2 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                            {auction.item_count || 'Soon'}
                        </span>
                    </div>
                ))}
            </div>

            {/* A second marquee div for seamless looping */}
            <div className="animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused] flex items-center pr-[100vw]" aria-hidden="true">
                {upcomingAuctions.map((auction, idx) => (
                    <div 
                        key={`dup-${auction.id}-${idx}`} 
                        className="flex items-center mx-4 text-xs font-medium cursor-pointer hover:text-indigo-400 transition-colors"
                        onClick={() => navigate('/inventory')}
                    >
                        <span className="text-indigo-500 font-black mr-2">•</span>
                        <span className="font-bold">{auction.county || 'Upcoming Auction'}</span>
                        <span className="ml-2 text-slate-400">({auction.type})</span>
                        <span className="ml-2 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                            {auction.item_count || 'Soon'}
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
