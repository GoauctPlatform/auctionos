import React from 'react';
import { X, Info, CheckCircle, TrendingUp, Shield, Map, AlertTriangle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const PropertyScoreModal: React.FC<Props> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const scoringRules = [
        { group: "Base Data", items: [
            { criteria: "Address Verified", points: "+10", details: "Clean, geocoded address found", icon: <Map size={16} className="text-blue-500" /> },
            { criteria: "Property Type", points: "+10", details: "Type identified (Residential, Land, etc)", icon: <Shield size={16} className="text-blue-500" /> },
            { criteria: "Owner Name", points: "+10", details: "Public record owner data present", icon: <CheckCircle size={16} className="text-blue-500" /> },
        ]},
        { group: "Financial Ratio (Tax-to-Value)", items: [
            { criteria: "Ratio < 5%", points: "+45", details: "Exceptional investment deal", icon: <TrendingUp size={16} className="text-emerald-500" /> },
            { criteria: "Ratio < 10%", points: "+35", details: "Excellent opportunity", icon: <TrendingUp size={16} className="text-emerald-500" /> },
            { criteria: "Ratio < 25%", points: "+22", details: "Good potential", icon: <TrendingUp size={16} className="text-emerald-500" /> },
            { criteria: "Ratio < 50%", points: "+10", details: "Fair / Standard investment", icon: <TrendingUp size={16} className="text-emerald-500" /> },
        ]},
        { group: "Structure & Assets", items: [
            { criteria: "Has Improvements", points: "+5", details: "Structure present (not vacant land)", icon: <CheckCircle size={16} className="text-blue-500" /> },
            { criteria: "Large Lot", points: "+5", details: "Property size >= 1.0 Acre", icon: <Map size={16} className="text-blue-500" /> },
        ]},
        { group: "Auction Type / Risk", items: [
            { criteria: "Tax Lien", points: "+8", details: "Lower risk (certificate purchase)", icon: <Shield size={16} className="text-indigo-500" /> },
            { criteria: "Tax Deed", points: "+6", details: "Direct property ownership", icon: <Shield size={16} className="text-indigo-500" /> },
            { criteria: "Foreclosure", points: "+4", details: "Distressed asset opportunity", icon: <Shield size={16} className="text-indigo-500" /> },
        ]},
        { group: "Availability", items: [
            { criteria: "Confirmed Available", points: "+5", details: "Listing is active and actionable", icon: <CheckCircle size={16} className="text-emerald-500" /> },
            { criteria: "Unavailable", points: "-5", details: "Penalty: Property removed/sold", icon: <AlertTriangle size={16} className="text-rose-500" /> },
        ]},
    ];

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-2xl border border-white/20 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                            <Info size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Motor Score Analysis</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Transparency on how we grade property deals</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {scoringRules.map((group, idx) => (
                        <div key={idx} className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{group.group}</h3>
                            <div className="grid gap-2">
                                {group.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 transition-hover hover:border-blue-200 dark:hover:border-blue-900/50">
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.criteria}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.details}</p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-black ${item.points.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                            {item.points}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Scores are computed using real-time market comparisons and county data. The maximum possible score is 100 (Grade A+).
                    </p>
                    <button 
                        onClick={onClose}
                        className="mt-4 px-8 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    );
};
