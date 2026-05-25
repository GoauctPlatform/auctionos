import React from 'react';
import { Property, AuctionEvent } from '../../types';
import { Gavel, ShieldAlert, FileText, ExternalLink } from 'lucide-react';

interface Props {
    loading: boolean;
    dbTopDeals: Property[];
    deedsAuctions: AuctionEvent[];
    foreclosureAuctions: AuctionEvent[];
    liensAuctions: AuctionEvent[];
    recommendedTab: 'deals' | 'deeds' | 'foreclosures' | 'liens';
    setRecommendedTab: (tab: 'deals' | 'deeds' | 'foreclosures' | 'liens') => void;
    onSelectProperty: (prop: Property) => void;
}

export const RecommendedDealsWidget: React.FC<Props> = ({
    loading,
    dbTopDeals,
    deedsAuctions,
    foreclosureAuctions,
    liensAuctions,
    recommendedTab,
    setRecommendedTab,
    onSelectProperty
}) => {
    return (
        <div className="size-full flex flex-col">
            {/* Tabs headers with live counts */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 pb-2 mb-3 overflow-x-auto gap-1">
                {[
                    { id: 'deals', label: '🥇 Top Deals', count: dbTopDeals.length },
                    { id: 'deeds', label: 'Deeds', count: deedsAuctions.length },
                    { id: 'foreclosures', label: 'Foreclosures', count: foreclosureAuctions.length },
                    { id: 'liens', label: 'Liens', count: liensAuctions.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setRecommendedTab(tab.id as any)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1 ${
                            recommendedTab === tab.id
                                ? 'bg-indigo-500 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[8px] font-black px-1 rounded ${recommendedTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-300/50 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {recommendedTab === 'deals' && (
                    loading ? (
                        <div className="space-y-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : dbTopDeals.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 mt-10">No recommended deals found.</p>
                    ) : (
                        dbTopDeals.map((prop) => (
                            <div
                                key={prop.id}
                                onClick={() => onSelectProperty(prop)}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/50 transition-all cursor-pointer flex justify-between items-center group"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[7.5px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.25 rounded uppercase">Score: {prop.deal_score || 85}</span>
                                        <span className="text-[7.5px] font-black text-slate-400">{prop.parcel_id || 'No Parcel'}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate mt-1 group-hover:text-indigo-500 transition-colors">
                                        {prop.address || 'Address Hidden'}
                                    </p>
                                    <p className="text-[8px] text-slate-455 truncate">
                                        {[prop.county, prop.state].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                    <span className="text-[9px] font-extrabold text-slate-900 dark:text-white block">Est: ${(prop.assessed_value || 150000).toLocaleString()}</span>
                                    <span className="text-[8px] font-bold text-emerald-500 block">Bid: ${(prop.opening_bid || 5000).toLocaleString()}</span>
                                </div>
                            </div>
                        ))
                    )
                )}

                {recommendedTab === 'deeds' && (
                    loading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : deedsAuctions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center mt-10 gap-2">
                            <Gavel size={28} className="text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400">No active deed auctions found.</p>
                        </div>
                    ) : (
                        deedsAuctions.map((a: any) => (
                            <div
                                key={a.id}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-500/40 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-500 transition-colors">{a.name}</p>
                                        <p className="text-[8.5px] text-slate-400 mt-0.5">
                                            {[a.county, a.state].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                        <span className="text-[8.5px] font-black text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {(a.parcels_count || a.properties_count || 0).toLocaleString()} lots
                                        </span>
                                        <span className="text-[7.5px] text-slate-400 whitespace-nowrap">
                                            {a.auction_date ? new Date(a.auction_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                        </span>
                                    </div>
                                </div>
                                {(a.register_link || a.list_link) && (
                                    <a
                                        href={a.register_link || a.list_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="mt-1.5 text-[8px] font-bold text-purple-500 hover:text-purple-600 flex items-center gap-1"
                                    >
                                        <ExternalLink size={8} /> View / Register
                                    </a>
                                )}
                            </div>
                        ))
                    )
                )}

                {recommendedTab === 'foreclosures' && (
                    loading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : foreclosureAuctions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center mt-10 gap-2">
                            <ShieldAlert size={28} className="text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400">No active foreclosure auctions found.</p>
                        </div>
                    ) : (
                        foreclosureAuctions.map((a: any) => (
                            <div
                                key={a.id}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-red-500/40 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate group-hover:text-red-500 transition-colors">{a.name}</p>
                                        <p className="text-[8.5px] text-slate-400 mt-0.5">
                                            {[a.county, a.state].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                        <span className="text-[8.5px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {(a.parcels_count || a.properties_count || 0).toLocaleString()} lots
                                        </span>
                                        <span className="text-[7.5px] text-slate-400 whitespace-nowrap">
                                            {a.auction_date ? new Date(a.auction_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                        </span>
                                    </div>
                                </div>
                                {(a.register_link || a.list_link) && (
                                    <a
                                        href={a.register_link || a.list_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="mt-1.5 text-[8px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                                    >
                                        <ExternalLink size={8} /> View / Register
                                    </a>
                                )}
                            </div>
                        ))
                    )
                )}

                {recommendedTab === 'liens' && (
                    loading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : liensAuctions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center mt-10 gap-2">
                            <FileText size={28} className="text-slate-300 dark:text-slate-700" />
                            <p className="text-xs text-slate-400">No active lien auctions found.</p>
                        </div>
                    ) : (
                        liensAuctions.map((a: any) => (
                            <div
                                key={a.id}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-amber-500/40 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">{a.name}</p>
                                        <p className="text-[8.5px] text-slate-400 mt-0.5">
                                            {[a.county, a.state].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                        <span className="text-[8.5px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {(a.parcels_count || a.properties_count || 0).toLocaleString()} lots
                                        </span>
                                        <span className="text-[7.5px] text-slate-400 whitespace-nowrap">
                                            {a.auction_date ? new Date(a.auction_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                                        </span>
                                    </div>
                                </div>
                                {(a.register_link || a.list_link) && (
                                    <a
                                        href={a.register_link || a.list_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="mt-1.5 text-[8px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                                    >
                                        <ExternalLink size={8} /> View / Register
                                    </a>
                                )}
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
};
