import React, { useEffect, useState, useRef } from 'react';
import { AuctionService } from '../../services/auction.service';
import { AuctionEvent } from '../../types';
import { Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TickerTapeWidget: React.FC = () => {
    const [upcomingAuctions, setUpcomingAuctions] = useState<AuctionEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAuctions = async () => {
            try {
                // Fetch auctions and filter for next 30 days
                const res = await AuctionService.getAuctionEvents();
                const all = res.items || [];
                const now = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(now.getDate() + 30);

                const next30 = all.filter(a => {
                    if (!a.auction_date) return false;
                    const d = new Date(a.auction_date);
                    return d >= now && d <= thirtyDaysFromNow;
                }).sort((a, b) => new Date(a.auction_date!).getTime() - new Date(b.auction_date!).getTime());

                setUpcomingAuctions(next30);
            } catch (err) {
                console.error("Failed to fetch auctions for ticker tape", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAuctions();
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
                        <span className="text-slate-300 mr-2">{new Date(auction.auction_date!).toLocaleDateString()}</span>
                        <span className="font-bold">{auction.county} County, {auction.state}</span>
                        <span className="ml-2 text-slate-400">({auction.type})</span>
                        <span className="ml-2 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                            {auction.item_count || 0} Items
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
                        <span className="text-slate-300 mr-2">{new Date(auction.auction_date!).toLocaleDateString()}</span>
                        <span className="font-bold">{auction.county} County, {auction.state}</span>
                        <span className="ml-2 text-slate-400">({auction.type})</span>
                        <span className="ml-2 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                            {auction.item_count || 0} Items
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
