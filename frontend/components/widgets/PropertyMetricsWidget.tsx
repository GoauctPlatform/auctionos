import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Activity } from 'lucide-react';
import { useLanguage } from "../../context/LanguageContext";

interface MetricsData {
    foreclosure: number;
    lien: number;
    deed: number;
}

export const PropertyMetricsWidget: React.FC = () => {
    const { t } = useLanguage();
    const [data, setData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/v1/dashboard/metrics')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load metrics');
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-xs text-slate-400 italic p-4">Loading metrics...</div>;
    if (error) return <div className="text-xs text-red-400 italic p-4">{error}</div>;

    return (
        <div className="w-full h-full flex flex-col justify-between space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 shrink-0">
                <Activity size={16} className="text-indigo-500" />
                Property Metrics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foreclosures</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{data?.foreclosure || 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax Liens</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{data?.lien || 0}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax Deeds</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{data?.deed || 0}</p>
                </div>
            </div>
        </div>
    );
};
