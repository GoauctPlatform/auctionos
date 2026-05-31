import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import USMap from '../USMap';
import { InvestmentHeatmap } from '../property/InvestmentHeatmap';
import { StateStat as StateStatData } from '../../services/scores.service';
import { Map, BarChart2 } from 'lucide-react';

interface MapDashboardProps {
    stats: StateStatData[];
    selectedState?: string;
    onStateClick: (stateCode: string) => void;
    mapCustomization: any;
    favoriteStates: Set<string>;
}

class DashboardErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
    public state = { hasError: false, error: null };

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
    stats,
    selectedState,
    onStateClick,
    mapCustomization,
    favoriteStates
}) => {
    const [viewMode, setViewMode] = useState<'map' | 'stats'>('map');

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
                        Multi-County Acquisition Infrastructure
                    </h2>
                    <p className="text-[10px] md:text-xs text-[#93a1a1]/80 font-bold mt-1 uppercase tracking-wider">
                        Distressed Real Estate & Auction Intelligence Monitor
                    </p>
                </div>

                {/* Mobile View Toggle */}
                <div className="flex lg:hidden bg-[#073642]/50 border border-[#1a4554]/30 rounded-xl p-1 gap-1 self-stretch sm:self-auto justify-center">
                    <button
                        onClick={() => setViewMode('map')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                            viewMode === 'map' 
                                ? 'bg-cyan-500 text-white shadow-lg' 
                                : 'text-[#93a1a1] hover:text-white'
                        }`}
                    >
                        <Map size={14} /> Map
                    </button>
                    <button
                        onClick={() => setViewMode('stats')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                            viewMode === 'stats' 
                                ? 'bg-cyan-500 text-white shadow-lg' 
                                : 'text-[#93a1a1] hover:text-white'
                        }`}
                    >
                        <BarChart2 size={14} /> Stats
                    </button>
                </div>
            </div>

            {/* Main Content Dashboard */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden h-full">
                {/* Visual Map Column */}
                <div className={`flex-1 flex flex-col gap-3 min-h-[350px] lg:min-h-0 bg-[#073642]/20 backdrop-blur-md rounded-2xl border border-[#1a4554]/25 p-4 justify-center items-center relative overflow-hidden transition-all duration-500 ${
                    viewMode !== 'map' ? 'hidden lg:flex' : 'flex'
                }`}>
                    {/* Glowing indicators */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-[#002b36]/60 border border-[#1a4554]/40 px-2.5 py-1.5 rounded-lg">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">
                                Favorites Active ({favoriteStates.size})
                            </span>
                        </div>
                    </div>

                    <div className="w-full flex-1 flex items-center justify-center p-2 relative">
                        <USMap 
                            onStateSelect={(state) => onStateClick(state)} 
                            customize={mapCustomization} 
                        />
                    </div>

                    {/* Bottom Status Ticker inside map */}
                    <div className="w-full flex items-center justify-between border-t border-[#1a4554]/10 pt-3 text-[9px] font-bold text-[#586e75] uppercase tracking-widest">
                        <span>Terminal ID: GA-MC-773</span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#859900]" />
                            API STATUS: ACTIVE
                        </span>
                    </div>
                </div>

                {/* Stats Breakdown Column */}
                <div className={`w-full lg:w-[360px] bg-[#073642]/15 backdrop-blur-md rounded-2xl border border-[#1a4554]/20 p-5 flex flex-col h-full overflow-y-auto transition-all duration-500 ${
                    viewMode !== 'stats' ? 'hidden lg:flex' : 'flex'
                }`}>
                    <InvestmentHeatmap 
                        stats={stats} 
                        selectedState={selectedState} 
                        onStateClick={onStateClick} 
                        embedded={true} 
                    />
                </div>
            </div>
        </div>
        </DashboardErrorBoundary>
    );
};
