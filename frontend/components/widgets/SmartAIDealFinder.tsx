import React, { useEffect, useState, useMemo } from 'react';
import { getTopScoredProperties, TopScoredProperty } from '../../services/scores.service';
import { StatesService, StateContact } from '../../services/states.service';
import { countyService } from '../../services/county.service';
import { Brain, Filter, Sparkles, MapPin, ArrowRight, Coins, RefreshCw, Eye } from 'lucide-react';

interface SmartAIDealFinderProps {
    onOpenPropertyDetails: (propertyId: string | number, parcelId: string) => void;
    onPreviewProperty: (propertyId: string | number) => void;
}

export const SmartAIDealFinder: React.FC<SmartAIDealFinderProps> = ({ 
    onOpenPropertyDetails,
    onPreviewProperty
}) => {
    const [deals, setDeals] = useState<TopScoredProperty[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    
    // States and Counties complete loader
    const [stateContacts, setStateContacts] = useState<StateContact[]>([]);
    const [availableCounties, setAvailableCounties] = useState<string[]>([]);
    
    const [selectedState, setSelectedState] = useState<string>('ALL');
    const [selectedCounty, setSelectedCounty] = useState<string>('ALL');

    // 1. Initial hydration and fetch available states list
    useEffect(() => {
        // Load available states from backend database service
        StatesService.getContacts()
            .then(setStateContacts)
            .catch(err => console.error('Error loading states:', err));

        // First try to load from LocalStorage cache
        try {
            const cached = localStorage.getItem('goauct_ai_premium_deals');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setDeals(parsed);
                    setLoading(false);
                }
            }
        } catch (e) {
            console.error('Failed to load cached AI deals:', e);
        }

        // Fetch initial deals
        fetchFreshDeals('ALL');
    }, []);

    // 2. Load counties dynamically when state changes
    useEffect(() => {
        if (selectedState && selectedState !== 'ALL') {
            countyService.getCounties(selectedState)
                .then(setAvailableCounties)
                .catch(() => setAvailableCounties([]));
        } else {
            setAvailableCounties([]);
        }
        setSelectedCounty('ALL');
        
        // Refetch whenever state changes to query backend/Redis live for that state
        fetchFreshDeals(selectedState);
    }, [selectedState]);

    const fetchFreshDeals = async (stateFilter: string) => {
        setLoading(true);
        try {
            const fetched = await getTopScoredProperties(100, { 
                state: stateFilter !== 'ALL' ? stateFilter : undefined,
                minScore: 70 
            });
            // Keep B and above (score >= 70, rating A+, A, B)
            const premiumDeals = fetched.filter(p => {
                const score = p.deal_score || 0;
                const rating = (p.rating || '').toUpperCase();
                return score >= 70 && ['A+', 'A', 'B'].includes(rating);
            });
            setDeals(premiumDeals);
            
            // Only update local storage cache for the default state to avoid polluting general cached lists
            if (stateFilter === 'ALL') {
                localStorage.setItem('goauct_ai_premium_deals', JSON.stringify(premiumDeals));
            }
        } catch (err) {
            console.error('Error loading AI premium deals:', err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Filtered deals to display locally by county (state is filtered on database level for top performance)
    const filteredDeals = useMemo(() => {
        return deals.filter(d => {
            const matchesCounty = selectedCounty === 'ALL' || (d.county && d.county.trim().toUpperCase() === selectedCounty.toUpperCase());
            return matchesCounty;
        });
    }, [deals, selectedCounty]);

    // Helper to get Rating shield color and style
    const getRatingStyle = (rating: string) => {
        const cleanRating = (rating || '').toUpperCase();
        if (cleanRating === 'A+') return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20';
        if (cleanRating === 'A') return 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-cyan-500/20';
        return 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-indigo-500/20';
    };

    // Helper to render type badge
    const renderAuctionTypeBadge = (type: string | null) => {
        const cleanType = (type || '').toLowerCase();
        if (cleanType.includes('deed')) {
            return (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#8B5CF6]/20 text-[#c084fc] border border-[#8B5CF6]/30">
                    Tax Deed
                </span>
            );
        } else if (cleanType.includes('lien')) {
            return (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#F59E0B]/20 text-[#fbbf24] border border-[#F59E0B]/30">
                    Tax Lien
                </span>
            );
        } else {
            return (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#EF4444]/20 text-[#f87171] border border-[#EF4444]/30">
                    Foreclosure
                </span>
            );
        }
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 bg-[#070d1a] text-white p-4 md:p-6 rounded-3xl border border-[#1a4554]/20 shadow-2xl relative overflow-hidden select-none">
            {/* Background Radial Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full blur-3xl bg-indigo-900/30" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl bg-cyan-900/30" />
            </div>

            {/* Header row */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1a4554]/20 pb-4">
                <div>
                    <h2 className="text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-400 flex items-center gap-2">
                        <Brain size={20} className="text-indigo-400 animate-pulse" />
                        Smart AI Deal Finder
                    </h2>
                    <p className="text-[10px] md:text-xs text-[#93a1a1]/80 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={11} className="text-cyan-400" />
                        Real-time Premium Investment Grade B+ Recommendations
                    </p>
                </div>

                {/* Filters and Controls */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* State Selector */}
                    <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1">
                        <Filter size={11} className="text-[#93a1a1]" />
                        <span className="text-[9px] font-black uppercase text-[#93a1a1]/60 tracking-wider mr-1">State:</span>
                        <select
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-cyan-400 focus:outline-none border-none cursor-pointer [&>option]:bg-[#070d1a] [&>option]:text-white"
                        >
                            <option value="ALL">ALL STATES</option>
                            {stateContacts.map(sc => (
                                <option key={sc.state} value={sc.state}>{sc.state.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* County Selector */}
                    {selectedState !== 'ALL' && availableCounties.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1">
                            <Filter size={11} className="text-[#93a1a1]" />
                            <span className="text-[9px] font-black uppercase text-[#93a1a1]/60 tracking-wider mr-1">County:</span>
                            <select
                                value={selectedCounty}
                                onChange={(e) => setSelectedCounty(e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase tracking-wider text-teal-400 focus:outline-none border-none cursor-pointer [&>option]:bg-[#070d1a] [&>option]:text-white"
                            >
                                <option value="ALL">ALL COUNTIES</option>
                                {availableCounties.map(co => (
                                    <option key={co} value={co}>{co.toUpperCase()} COUNTY</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchFreshDeals(selectedState)}
                        disabled={loading}
                        className="p-2 hover:bg-[#073642]/50 border border-[#1a4554]/20 hover:border-cyan-500/35 rounded-xl transition-all text-slate-400 hover:text-white"
                        title="Refresh deals"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Carousel Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
                {loading && deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <RefreshCw className="animate-spin text-cyan-400" size={24} />
                        <span className="text-[10px] font-black tracking-widest text-[#586e75] uppercase">Engaging AI recommendations engine...</span>
                    </div>
                ) : filteredDeals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Brain className="text-slate-600 opacity-20 mb-2" size={36} />
                        <p className="text-xs font-bold text-slate-500">No premium options matching location filters.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Try changing location or refreshing the index.</p>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center overflow-x-auto gap-4 py-2 px-1 scroll-smooth select-text no-scrollbar scrollbar-none">
                        {filteredDeals.map((prop) => (
                            <div
                                key={prop.parcel_id}
                                onClick={() => onPreviewProperty(prop.parcel_id)}
                                className="w-[280px] shrink-0 h-full max-h-[290px] flex flex-col justify-between bg-[#073642]/10 hover:bg-[#073642]/20 backdrop-blur-md border border-[#1a4554]/25 hover:border-cyan-500/35 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-cyan-500/5 cursor-pointer group"
                                title="Click to show Quick View"
                            >
                                {/* Top Badge & Score Row */}
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col gap-1.5">
                                        {renderAuctionTypeBadge(prop.property_type)}
                                        <span className="font-mono text-[8px] font-bold text-slate-400 tracking-wider">
                                            #{prop.parcel_id}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl shadow-lg text-[10px] font-black ${getRatingStyle(prop.rating || 'B')}`}>
                                        <span>🏆</span>
                                        <span>{prop.rating || 'B'}</span>
                                        <span className="text-[8px] opacity-75">({prop.deal_score || 70}%)</span>
                                    </div>
                                </div>

                                {/* Address Details */}
                                <div className="my-3 flex-1 min-h-0 flex flex-col justify-center">
                                    <h4 className="text-[11px] font-bold text-white truncate group-hover:text-cyan-400 transition-colors flex items-start gap-1">
                                        <MapPin size={11} className="text-cyan-400 shrink-0 mt-0.5" />
                                        {prop.address || 'Address Restricted'}
                                    </h4>
                                    <p className="text-[8.5px] text-[#93a1a1] uppercase font-bold tracking-wider mt-1 ml-4 truncate flex items-center gap-1">
                                        <span>{prop.county || 'UNKNOWN'} COUNTY, {prop.state}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-cyan-400 flex items-center gap-0.5 font-black text-[7px] uppercase tracking-widest">
                                            <Eye size={9} />
                                            Preview
                                        </span>
                                    </p>
                                </div>

                                {/* Financial Info */}
                                <div className="grid grid-cols-2 gap-3 border-t border-b border-[#1a4554]/15 py-3 mb-3">
                                    <div>
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Opening Bid</span>
                                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                                            <Coins size={11} className="text-emerald-400" />
                                            ${(prop.amount_due ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Assessed Value</span>
                                        <span className="text-xs font-black text-indigo-300 block mt-0.5">
                                            ${(prop.assessed_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Details Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Avoid triggering card-level preview
                                        onOpenPropertyDetails(prop.parcel_id, prop.parcel_id);
                                    }}
                                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-1.5"
                                >
                                    <span>Dossier details</span>
                                    <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Status Row */}
            <div className="relative z-10 flex items-center justify-between border-t border-[#1a4554]/15 pt-3 text-[9px] font-bold text-[#586e75] uppercase tracking-widest">
                <span>AI MATCH RATE: 100% SECURE</span>
                <span className="flex items-center gap-1 text-cyan-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Premium Opportunities Found: {filteredDeals.length}
                </span>
            </div>
        </div>
    );
};
