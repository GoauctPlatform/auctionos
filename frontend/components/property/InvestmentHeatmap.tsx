import React, { useMemo } from 'react';
import { Typography, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { StateStat as StateStatData } from '../../services/scores.service';

interface StateStat extends StateStatData {
    color: string;
}

interface InvestmentHeatmapProps {
    stats: StateStatData[];
    selectedState?: string;
    onStateClick?: (stateCode: string) => void;
    embedded?: boolean;
}

const GET_COLOR = (score: number) => {
    if (score > 85) return 'bg-emerald-600';
    if (score > 70) return 'bg-emerald-500';
    if (score > 50) return 'bg-emerald-400';
    return 'bg-amber-400';
};

export const InvestmentHeatmap: React.FC<InvestmentHeatmapProps> = ({ stats: rawStats, selectedState, onStateClick, embedded = false }) => {
    
    // All available states for the dropdown
    const availableStates = useMemo(() => {
        return [...rawStats].sort((a, b) => b.volume - a.volume);
    }, [rawStats]);

    // The currently focused state data
    const focusedState = useMemo(() => {
        if (!selectedState) return null;
        const found = rawStats.find(s => s.state_code === selectedState);
        if (!found) return null;
        
        return {
            ...found,
            score: Math.round(found.average_score),
            color: GET_COLOR(found.average_score)
        };
    }, [rawStats, selectedState]);

    return (
        <div className={embedded 
            ? "p-0 h-full flex flex-col overflow-hidden transition-all duration-300 bg-transparent border-0 shadow-none" 
            : "bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-full flex flex-col overflow-hidden transition-all duration-300"
        }>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500 text-2xl">monitoring</span>
                        Market Intelligence
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Select a state to inspect deal quality</p>
                </div>
                
                <FormControl size="small" className="min-w-[140px]">
                    <Select
                        value={selectedState || ""}
                        onChange={(e) => onStateClick?.(e.target.value)}
                        displayEmpty
                        sx={{
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(226, 232, 240, 1)',
                            },
                        }}
                    >
                        <MenuItem value=""><em>Select State</em></MenuItem>
                        {availableStates.map(s => (
                            <MenuItem key={s.state_code} value={s.state_code}>
                                {s.state_code} ({s.volume})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {!focusedState ? (
                    <div className="text-center py-10 opacity-60">
                        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 animate-bounce">location_on</span>
                        <Typography variant="h6" className="text-slate-400 dark:text-slate-500 font-bold">Select a State</Typography>
                        <Typography variant="caption" className="text-slate-400">Choose a state above to see local scoring intelligence</Typography>
                    </div>
                ) : (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* State Header Card */}
                        <div className={`flex items-center justify-between p-5 rounded-2xl border mb-6 group hover:shadow-lg transition-all duration-500 ${
                            embedded 
                                ? 'bg-[#002b36]/30 dark:bg-[#073642]/30 border-[#1a4554]/40 hover:bg-[#002b36]/50 dark:hover:bg-[#073642]/50' 
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50'
                        }`}>
                            <div className="flex items-center gap-5">
                                <div className={`size-16 rounded-2xl ${focusedState.color} flex flex-col items-center justify-center text-white shadow-xl shadow-emerald-500/10 group-hover:scale-105 transition-transform duration-500`}>
                                    <span className="text-2xl font-black">{focusedState.state_code.toUpperCase()}</span>
                                    <span className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Market</span>
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white">{focusedState.score}%</span>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">Av. Grade</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 font-bold text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">home</span>
                                            {focusedState.volume.toLocaleString()} Properties
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Volume Rank</div>
                                <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                    #{availableStates.findIndex(s => s.state_code === focusedState.state_code) + 1}
                                </div>
                            </div>
                        </div>

                        {/* Grade Distribution */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Inventory Quality Breakdown</h4>
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Scoring rule-v2</span>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-3">
                                {[
                                    { grade: 'A', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30' },
                                    { grade: 'B', color: 'bg-blue-500', shadow: 'shadow-blue-500/30' },
                                    { grade: 'C', color: 'bg-amber-500', shadow: 'shadow-amber-500/30' },
                                    { grade: 'D', color: 'bg-orange-500', shadow: 'shadow-orange-500/30' },
                                    { grade: 'F', color: 'bg-red-500', shadow: 'shadow-red-500/30' }
                                ].map((item) => {
                                    const count = (focusedState.distribution?.[item.grade] as number) || 0;
                                    const percentage = focusedState.volume > 0 ? (count / focusedState.volume) * 100 : 0;
                                    
                                    return (
                                        <div key={item.grade} className="flex flex-col items-center">
                                             <div className={`relative w-full h-32 rounded-xl overflow-hidden mb-2 ${
                                                 embedded ? 'bg-[#002b36]/40 dark:bg-[#073642]/40' : 'bg-slate-100 dark:bg-slate-700/50'
                                             }`}>
                                                <div 
                                                    className={`absolute bottom-0 left-0 right-0 ${item.color} ${item.shadow} shadow-lg transition-all duration-1000 ease-out flex items-center justify-center`}
                                                    style={{ height: `${Math.max(percentage, 5)}%` }}
                                                >
                                                    {percentage > 20 && (
                                                        <span className="text-[10px] font-black text-white/50 -rotate-90">{Math.round(percentage)}%</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-xs font-black text-slate-800 dark:text-slate-200">{item.grade}</div>
                                            <div className="text-[9px] font-bold text-slate-400">{count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!embedded && (
                <button
                    onClick={() => onStateClick?.('')}
                    className="w-full mt-6 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 group"
                >
                    <span className="material-symbols-outlined text-[16px] group-hover:rotate-180 transition-transform duration-500">sync</span>
                    Reset All Filters
                </button>
            )}
        </div>
    );
};
