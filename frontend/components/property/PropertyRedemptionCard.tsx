import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Clock, Info, Shield, CircleAlert as AlertIcon } from 'lucide-react';

interface RedemptionData {
    state: string;
    auction: string;
    type: string;
    max_interest: string;
    redemption_months: number;
}

interface Props {
    stateCode: string;
    auctionType?: string;
}

export const PropertyRedemptionCard: React.FC<Props> = ({ stateCode, auctionType }) => {
    const [data, setData] = useState<RedemptionData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRedemption = async () => {
            try {
                const res = await api.get(`/properties/redemption-info?state=${stateCode}&auction_type=${auctionType || ''}`);
                setData(res.data.results || []);
            } catch (e) {
                console.error('Failed to load redemption info:', e);
            } finally {
                setLoading(false);
            }
        };
        if (stateCode) fetchRedemption();
    }, [stateCode, auctionType]);

    if (loading || data.length === 0) return null;

    const rule = data[0]; // Take primary match

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-sm mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <Info className="text-white" size={20} />
                </div>
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Redemption Intelligence</h3>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Legal Framework & Timelines</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Max Interest</label>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{rule.max_interest}</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Redemption Period</label>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                        {rule.redemption_months > 0 ? `${rule.redemption_months} Months` : 'No Redemption'}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                    <Shield size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{rule.state} {rule.type} Law</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            {rule.redemption_months > 0 
                                ? `Investors are entitled to a ${rule.max_interest} penalty if the owner redeems within ${rule.redemption_months} months.`
                                : "This is a non-redeemable deed auction. Ownership is final upon auction completion."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 flex gap-2">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight italic">
                    Note: Rules vary by county and specific auction event. Data is for general strategic guidance.
                </p>
            </div>
        </div>
    );
};
