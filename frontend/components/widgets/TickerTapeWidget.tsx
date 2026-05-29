import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { AuctionService } from '../../services/auction.service';

interface TickerAuction {
    id: number;
    title: string;
    countdown: string;
    type: string;
    address: string;
    state?: string;
}

const resolveStateCode = (stateRaw: string): string => {
    if (!stateRaw) return '';
    const trimmed = stateRaw.trim();
    if (trimmed.length === 2) return trimmed.toUpperCase();
    
    const stateMap: Record<string, string> = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
        'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
        'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
        'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
        'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
        'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
        'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
        'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
    };
    return stateMap[trimmed.toLowerCase()] || trimmed.toUpperCase().slice(0, 2);
};

const StateSilhouetteBadge: React.FC<{ stateCode: string; size?: number }> = ({ stateCode, size = 16 }) => {
    const cleanCode = resolveStateCode(stateCode);
    if (!cleanCode) return null;
    const url = `https://raw.githubusercontent.com/ahuseyn/state-icons/master/icons/${cleanCode}.svg`;
    return (
        <div
            style={{ width: size, height: size }}
            className="relative bg-[#073642] border border-[#1a4554]/60 rounded flex items-center justify-center p-0.5 shrink-0 shadow-sm mr-2"
        >
            <img
                src={url}
                alt={cleanCode}
                className="w-full h-full object-contain opacity-75 dark:brightness-0 dark:invert"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[5.5px] font-black text-white/30 tracking-tighter">{cleanCode}</span>
            </div>
        </div>
    );
};

export const TickerTapeWidget: React.FC = () => {
    // 1. Initialize favorites state from localStorage synchronously
    const [favorites, setFavorites] = useState<Set<number>>(() => {
        const favs = localStorage.getItem('goauct_fav_auctions');
        if (favs) {
            try {
                const parsed = JSON.parse(favs);
                if (Array.isArray(parsed)) {
                    return new Set(parsed.map(Number));
                }
            } catch (e) {}
        }
        return new Set();
    });

    const [upcomingAuctions, setUpcomingAuctions] = useState<TickerAuction[]>([]);
    const [loading, setLoading] = useState(true);

    // 2. Synchronize favorites across component instances via custom event
    useEffect(() => {
        const handleSync = (e: any) => {
            if (e.detail) {
                setFavorites(new Set(e.detail.map(Number)));
            }
        };
        window.addEventListener('auction-favorites-updated', handleSync);
        return () => window.removeEventListener('auction-favorites-updated', handleSync);
    }, []);

    // Timezone-safe UTC countdown helper
    const calculateCountdown = (dateStr: string): string => {
        if (!dateStr) return '';
        
        // Ensure date is treated as UTC
        const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`;
        const auctionDate = new Date(cleanStr);
        if (isNaN(auctionDate.getTime())) return '';
        
        const today = new Date();
        const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
        const utcAuction = Date.UTC(auctionDate.getUTCFullYear(), auctionDate.getUTCMonth(), auctionDate.getUTCDate());
        
        const diffMs = utcAuction - utcToday;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return "Today";
        } else if (diffDays === 1) {
            return "Tomorrow";
        } else if (diffDays > 1) {
            return `${diffDays}d left`;
        } else if (diffDays === -1) {
            return "Yesterday";
        } else {
            return "Ended";
        }
    };

    // 3. Fetch auction events matching favorite IDs
    useEffect(() => {
        const fetchFavoriteAuctions = async () => {
            if (favorites.size === 0) {
                setUpcomingAuctions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const favIds = Array.from(favorites);
                const { items } = await AuctionService.getAuctionEvents({ ids: favIds });
                
                // Map and sort upcoming/active auctions first
                const mapped: TickerAuction[] = items.map(item => ({
                    id: item.id,
                    title: `${item.name} (${item.county || item.state || ''})`,
                    countdown: calculateCountdown(item.auction_date),
                    type: item.tax_status || 'Auction',
                    address: item.location || '',
                    state: item.state || ''
                }));

                // Sort so "Today" and imminent auctions come first, followed by others, then "Ended"
                mapped.sort((a, b) => {
                    const getWeight = (cd: string) => {
                        if (cd === 'Today') return 0;
                        if (cd === 'Tomorrow') return 1;
                        if (cd.endsWith('d left')) {
                            const days = parseInt(cd);
                            return isNaN(days) ? 999 : days + 1;
                        }
                        if (cd === 'Yesterday') return 1000;
                        return 2000; // Ended or other
                    };
                    return getWeight(a.countdown) - getWeight(b.countdown);
                });

                setUpcomingAuctions(mapped);
            } catch (err) {
                console.error("Failed to fetch favorite auctions for ticker", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFavoriteAuctions();
    }, [favorites]);

    const handleTickerClick = () => {
        window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
            detail: {
                type: 'live_auctions',
                title: '📅 Live Auctions Finder'
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-8 bg-[#002b36] text-[#93a1a1] text-xs font-bold border-b border-[#1a4554] select-none">
                Loading Favorite Auctions...
            </div>
        );
    }

    if (upcomingAuctions.length === 0) {
        return (
            <div className="flex items-center justify-center h-8 bg-[#002b36] text-[#93a1a1] text-[10px] font-bold border-b border-[#1a4554] select-none uppercase tracking-wider animate-in fade-in duration-500">
                <span className="text-[#268bd2] mr-2">💡 Tip:</span>
                Add auctions to your favorites to track them in this ticker!
            </div>
        );
    }

    return (
        <div className="relative flex overflow-x-hidden h-8 bg-[#002b36] text-white items-center border-b border-[#1a4554] group whitespace-nowrap select-none w-full pl-[82px] md:pl-[100px]">
            {/* Favorites Badge */}
            <div className="absolute left-0 z-20 px-2 md:px-3 h-full flex items-center bg-[#268bd2] font-black text-[8px] md:text-[9px] uppercase tracking-widest border-r border-[#1a4554]/50 shadow-[4px_0_10px_rgba(0,43,54,0.5)]">
                <Calendar size={10} className="mr-1 md:mr-1.5 shrink-0" /> Favorites
            </div>
            
            <div className="flex animate-[marquee_45s_linear_infinite] group-hover:[animation-play-state:paused] shrink-0 items-center min-w-full">
                {upcomingAuctions.map((auction, idx) => (
                    <div 
                        key={`${auction.id}-${idx}`} 
                        className="flex items-center mx-4 md:mx-6 text-[10px] md:text-xs font-bold cursor-pointer text-[#eee8d5] hover:text-[#268bd2] transition-colors shrink-0"
                        onClick={handleTickerClick}
                    >
                        {auction.state && <StateSilhouetteBadge stateCode={auction.state} size={14} />}
                        <span className="text-[#268bd2] font-black mr-1.5 md:mr-2">•</span>
                        <span>{auction.title}</span>
                        <span className="ml-1.5 md:ml-2 text-[#93a1a1] font-semibold text-[9px] md:text-[10px]">({auction.type})</span>
                        <span className="ml-1.5 md:ml-2 bg-[#073642] border border-[#1a4554] px-1.5 py-0.5 rounded text-[8.5px] md:text-[9.5px] font-black text-[#859900]">
                            {auction.countdown}
                        </span>
                    </div>
                ))}
            </div>

            {/* A second marquee div for seamless looping */}
            <div className="flex animate-[marquee_45s_linear_infinite] group-hover:[animation-play-state:paused] shrink-0 items-center min-w-full" aria-hidden="true">
                {upcomingAuctions.map((auction, idx) => (
                    <div 
                        key={`dup-${auction.id}-${idx}`} 
                        className="flex items-center mx-4 md:mx-6 text-[10px] md:text-xs font-bold cursor-pointer text-[#eee8d5] hover:text-[#268bd2] transition-colors shrink-0"
                        onClick={handleTickerClick}
                    >
                        {auction.state && <StateSilhouetteBadge stateCode={auction.state} size={14} />}
                        <span className="text-[#268bd2] font-black mr-1.5 md:mr-2">•</span>
                        <span>{auction.title}</span>
                        <span className="ml-1.5 md:ml-2 text-[#93a1a1] font-semibold text-[9px] md:text-[10px]">({auction.type})</span>
                        <span className="ml-1.5 md:ml-2 bg-[#073642] border border-[#1a4554] px-1.5 py-0.5 rounded text-[8.5px] md:text-[9.5px] font-black text-[#859900]">
                            {auction.countdown}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};
