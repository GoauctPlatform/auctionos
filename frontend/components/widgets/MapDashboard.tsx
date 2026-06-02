import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import USMap from '../USMap';
import { StateStat, TopScoredProperty, getTopScoredProperties, submitScore } from '../../services/scores.service';
import { PropertyService } from '../../services/property.service';
import { calculateDealScore } from '../../intelligence/scoringEngine';
import { Map, Star, Award, Layers, X, RefreshCw } from 'lucide-react';

interface MapDashboardProps {
    selectedState?: string;
    onStateClick: (stateCode: string) => void;
    mapCustomization: any;
    favoriteStates: Set<string>;
    myListStats: Record<string, number>;
    activeMode: 'preferences' | 'volume' | 'scoring';
    setActiveMode: (mode: 'preferences' | 'volume' | 'scoring') => void;
    stateStats: StateStat[];
    topProperties: TopScoredProperty[];
    loadingStats?: boolean;
}

class DashboardErrorBoundary extends React.Component<any, any> {
    state: any;
    props: any;
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("MapDashboard Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-[#070d1a] border border-red-500/30 rounded-3xl p-4 text-center">
                    <p className="text-red-400 font-mono text-sm">Dashboard Error: {String(this.state.error)}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

export const MapDashboard: React.FC<MapDashboardProps> = ({
    onStateClick,
    mapCustomization,
    favoriteStates,
    selectedState,
    myListStats,
    activeMode,
    setActiveMode,
    stateStats,
    topProperties,
    loadingStats = false
}) => {
    // Helper to find stats for active state
    const activeStateStat = selectedState ? stateStats.find(s => s.state_code === selectedState) : null;
    
    // Filter properties for active state
    const activeStateProperties = selectedState 
        ? topProperties.filter(p => p.state?.trim().toUpperCase() === selectedState.trim().toUpperCase())
        : [];

    const [localDeals, setLocalDeals] = useState<TopScoredProperty[]>([]);
    const [loadingLocalDeals, setLoadingLocalDeals] = useState<boolean>(false);

    // Dynamic on-demand scores calculation and loading (Auto-Hydration)
    useEffect(() => {
        if (!selectedState || activeMode !== 'scoring') {
            setLocalDeals([]);
            return;
        }

        const loadDealsForState = async () => {
            setLoadingLocalDeals(true);
            try {
                // A. Query database/Redis for pre-computed scores first
                let fetched = await getTopScoredProperties(100, { 
                    state: selectedState,
                    minScore: 70 
                });
                
                let premiumDeals = fetched.filter(p => {
                    const score = p.deal_score || 0;
                    const rating = (p.rating || '').toUpperCase();
                    return score >= 70 && ['A+', 'A', 'B'].includes(rating);
                });

                // B. FALLBACK (Auto-Hydration): Compute scores from raw properties if empty
                if (premiumDeals.length === 0) {
                    console.log(`MapDashboard: Scores empty for state: ${selectedState}. Computing on-the-fly from properties list...`);
                    const rawProps = await PropertyService.getProperties({ 
                        limit: 100, 
                        availability: 'available',
                        state: selectedState
                    });
                    
                    const scoredProps: TopScoredProperty[] = [];
                    for (const prop of rawProps) {
                        if (!prop.parcel_id) continue;
                        
                        const scoreResult = calculateDealScore(prop);
                        const score = scoreResult.score;
                        const rating = scoreResult.rating;
                        
                        if (score >= 70 && ['A+', 'A', 'B'].includes(rating)) {
                            const topProp: TopScoredProperty = {
                                parcel_id: prop.parcel_id,
                                deal_score: score,
                                rating: rating,
                                score_factors: scoreResult.factors,
                                model_version: 'rule-based-v1',
                                computed_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                address: prop.address || null,
                                county: prop.county || null,
                                state: prop.state || null,
                                amount_due: prop.amount_due ?? null,
                                assessed_value: prop.assessed_value ?? null,
                                availability_status: prop.availability_status || null,
                                property_type: prop.property_type || null,
                                lot_acres: prop.lot_acres ?? null,
                                improvement_value: prop.improvement_value ?? null,
                                owner_address: prop.owner_address || null,
                                purchase_option_type: prop.purchase_option_type || null,
                                property_category: prop.property_category || null
                            };
                            scoredProps.push(topProp);
                            
                            // Auto-Hydration background save
                            submitScore(prop.parcel_id, scoreResult, {
                                status: prop.availability_status,
                                state: prop.state,
                                county: prop.county
                            });
                        }
                    }
                    scoredProps.sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0));
                    premiumDeals = scoredProps;
                }

                setLocalDeals(premiumDeals);
            } catch (err) {
                console.error(`MapDashboard: Failed to load deals for state ${selectedState}`, err);
            } finally {
                setLoadingLocalDeals(false);
            }
        };

        loadDealsForState();
    }, [selectedState, activeMode]);

    return (
        <DashboardErrorBoundary>
        <div className="w-full h-full flex flex-col gap-4 bg-[#070d1a] text-white p-4 md:p-6 rounded-3xl border border-[#1a4554]/20 shadow-2xl select-none relative overflow-hidden">
            {/* Background Radial Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-3xl bg-cyan-900/30" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full blur-3xl bg-teal-900/30" />
            </div>

            {/* Header row */}
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#1a4554]/20 pb-4">
                <div>
                    <h2 className="text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 flex items-center gap-2">
                        <Map size={20} className="text-cyan-400 animate-pulse" />
                        US Preferences Map
                    </h2>
                    <p className="text-[10px] md:text-xs text-[#93a1a1]/80 font-bold mt-1 uppercase tracking-wider">
                        Interactive User Preferences & Activity
                    </p>
                </div>

                {/* Segmented controls for switching modes */}
                <div className="flex bg-[#002b36]/60 p-1 rounded-xl border border-[#1a4554]/30 shrink-0">
                    <button
                        onClick={() => {
                            setActiveMode('preferences');
                            onStateClick(''); // Clear selected state on mode switch
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeMode === 'preferences'
                                ? 'bg-cyan-500 text-[#070d1a] shadow-lg'
                                : 'text-slate-400 hover:text-cyan-400'
                        }`}
                    >
                        <Star size={12} />
                        Activity
                    </button>
                    <button
                        onClick={() => {
                            setActiveMode('volume');
                            onStateClick(''); // Clear selected state on mode switch
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeMode === 'volume'
                                ? 'bg-amber-500 text-[#070d1a] shadow-lg'
                                : 'text-slate-400 hover:text-amber-400'
                        }`}
                    >
                        <Layers size={12} />
                        Auctions
                    </button>
                    <button
                        onClick={() => {
                            setActiveMode('scoring');
                            onStateClick(''); // Clear selected state on mode switch
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeMode === 'scoring'
                                ? 'bg-purple-500 text-[#070d1a] shadow-lg'
                                : 'text-slate-400 hover:text-purple-400'
                        }`}
                    >
                        <Award size={12} />
                        Deals
                    </button>
                </div>
            </div>

            {/* Main Content Dashboard with Split Panel support */}
            <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-4 overflow-hidden h-full">
                {/* Visual Map Area */}
                <div className={`flex-1 flex flex-col gap-3 min-h-[350px] bg-[#073642]/20 backdrop-blur-md rounded-2xl border border-[#1a4554]/25 p-4 justify-center items-center relative overflow-hidden transition-all duration-500 ${selectedState ? 'md:max-w-[65%]' : 'w-full'}`}>
                    
                    {/* Glowing indicators */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {activeMode === 'preferences' && (
                            <div className="flex items-center gap-2 bg-[#002b36]/60 border border-[#1a4554]/40 px-2.5 py-1.5 rounded-lg">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">
                                    Favorited States ({favoriteStates.size})
                                </span>
                            </div>
                        )}
                        {activeMode === 'volume' && (
                            <div className="flex items-center gap-2 bg-[#002b36]/60 border border-[#1a4554]/40 px-2.5 py-1.5 rounded-lg">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
                                    Auction Volume Heatmap
                                </span>
                            </div>
                        )}
                        {activeMode === 'scoring' && (
                            <div className="flex items-center gap-2 bg-[#002b36]/60 border border-[#1a4554]/40 px-2.5 py-1.5 rounded-lg">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400"></span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">
                                    Deal Scores Heatmap
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="w-full flex-1 flex items-center justify-center p-2 relative">
                        {loadingStats ? (
                            <div className="flex flex-col items-center gap-2">
                                <RefreshCw className="animate-spin text-cyan-400" size={24} />
                                <span className="text-[9px] font-black tracking-widest text-[#586e75] uppercase">Hydrating Data...</span>
                            </div>
                        ) : (
                            <USMap 
                                onStateSelect={(state) => onStateClick(state)} 
                                customize={mapCustomization} 
                                selectedState={selectedState}
                            />
                        )}
                    </div>

                    {/* Bottom Status Ticker inside map */}
                    <div className="w-full flex items-center justify-between border-t border-[#1a4554]/10 pt-3 text-[9px] font-bold text-[#586e75] uppercase tracking-widest">
                        <span>Terminal ID: GA-MC-773</span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#859900]" />
                            WIDGET STATUS: ACTIVE
                        </span>
                    </div>
                </div>

                {/* Dynamic Slide-out Sliding Details Panel */}
                {selectedState && (
                    <div className="w-full md:w-[35%] bg-[#002b36]/90 backdrop-blur-md border border-[#1a4554]/30 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto transition-all duration-300">
                        {/* Panel Header */}
                        <div className="flex justify-between items-center border-b border-[#1a4554]/20 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
                                    {selectedState}
                                </span>
                                <span className="text-[9px] text-[#93a1a1]/80 font-bold uppercase tracking-wider">
                                    State Details
                                </span>
                            </div>
                            <button 
                                onClick={() => onStateClick(selectedState)} 
                                className="p-1 hover:bg-[#073642]/50 rounded-lg text-slate-400 hover:text-white transition-colors"
                                title="Close Details"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Panel Body */}
                        {activeMode === 'preferences' && (
                            <div className="flex flex-col gap-4">
                                <div className="bg-[#073642]/30 border border-[#1a4554]/20 rounded-xl p-3">
                                    <h4 className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2">Saved Folders & Counties</h4>
                                    <div className="flex items-baseline justify-between mb-1">
                                        <span className="text-[11px] text-[#93a1a1]">Counties with saved properties:</span>
                                        <span className="text-sm font-black text-white">{myListStats[selectedState] || 0}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 italic">Properties in standard and custom lists grouped under state counties.</p>
                                </div>
                                <div className="bg-[#073642]/30 border border-[#1a4554]/20 rounded-xl p-3">
                                    <h4 className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1">Interaction Settings</h4>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span>Status:</span>
                                        <span className={`font-bold ${favoriteStates.has(selectedState) ? 'text-cyan-400' : 'text-slate-400'}`}>
                                            {favoriteStates.has(selectedState) ? '★ EXPLICIT FAVORITE' : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeMode === 'volume' && (
                            <div className="flex flex-col gap-4">
                                <div className="bg-[#073642]/30 border border-[#1a4554]/20 rounded-xl p-3 flex flex-col gap-2">
                                    <div className="flex items-baseline justify-between border-b border-[#1a4554]/15 pb-1">
                                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Total Active Auctions</span>
                                        <span className="text-lg font-black text-white">{activeStateStat?.volume || 0}</span>
                                    </div>
                                    <div className="flex flex-col gap-2.5 mt-2">
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                                                Tax Deeds:
                                            </span>
                                            <span className="font-bold text-white">{activeStateStat?.deed_volume || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                                                Tax Liens:
                                            </span>
                                            <span className="font-bold text-white">{activeStateStat?.lien_volume || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                                                Foreclosures:
                                            </span>
                                            <span className="font-bold text-white">{activeStateStat?.foreclosure_volume || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeMode === 'scoring' && (
                            <div className="flex flex-col gap-4">
                                <div className="bg-[#073642]/30 border border-[#1a4554]/20 rounded-xl p-3 flex flex-col gap-1">
                                    <h4 className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Average Deal Score</h4>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-[9px] text-slate-400">Model score index:</span>
                                        <span className="text-lg font-black text-purple-400">
                                            {activeStateStat?.average_score ? Math.round(activeStateStat.average_score) : 0}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <h4 className="text-[10px] text-[#93a1a1] font-bold uppercase tracking-wider px-1">Top Rated Deals</h4>
                                    {loadingLocalDeals ? (
                                        <div className="flex flex-col items-center py-6 gap-2 bg-[#073642]/10 border border-[#1a4554]/10 rounded-xl">
                                            <RefreshCw className="animate-spin text-purple-400" size={16} />
                                            <span className="text-[8px] font-black tracking-widest text-[#586e75] uppercase">Analyzing Deals...</span>
                                        </div>
                                    ) : localDeals.length === 0 ? (
                                        <p className="text-[10px] text-slate-400 italic p-2 bg-[#073642]/10 border border-[#1a4554]/10 rounded-xl text-center">No properties evaluated in this state.</p>
                                    ) : (
                                        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-scrollbar scrollbar-none">
                                            {localDeals.slice(0, 4).map((prop, idx) => (
                                                <div key={prop.parcel_id} className="bg-[#073642]/30 border border-[#1a4554]/20 hover:border-purple-500/30 p-2.5 rounded-xl transition-all flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-white truncate">{prop.address || prop.parcel_id}</p>
                                                        <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">{prop.county} County</p>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                        prop.rating === 'A+' || prop.rating === 'A' 
                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    }`}>
                                                        {prop.deal_score} {prop.rating}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        </DashboardErrorBoundary>
    );
};
