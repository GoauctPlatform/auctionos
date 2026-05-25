import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { TrendingUp } from 'lucide-react';

interface RecommendedProperty {
    id: number;
    address: string;
    county: string;
    state: string;
    assessed_value: number;
    deal_score: number;
}

export const TopRecommendedWidget: React.FC = () => {
    const [deals, setDeals] = useState<RecommendedProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/v1/dashboard/recommended')
            .then(res => {
                setDeals(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load recommended deals');
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-xs text-slate-400 italic p-4">Loading deals...</div>;
    if (error) return <div className="text-xs text-red-400 italic p-4">{error}</div>;

    return (
        <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                Top Recommended Deals
            </h2>
            {deals.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No deals found.</p>
            ) : (
                <div className="space-y-2">
                    {deals.map(p => (
                        <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-3 transition-colors hover:border-emerald-500/30">
                            <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
                                <TrendingUp size={14} className="text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.address || 'Property'}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{p.county}, {p.state}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">${(p.assessed_value || 0).toLocaleString()}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Score: {Math.round(p.deal_score * 100)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
