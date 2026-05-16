import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Clock, Info, ShieldCheck, AlertCircle } from 'lucide-react';

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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-blue-100 dark:border-blue-900/30">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="text-blue-500" size={20} />
                Redemption Intelligence
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Max Interest</label>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{rule.max_interest}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Redemption Period</label>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                        {rule.redemption_months > 0 ? `${rule.redemption_months} Months` : 'No Redemption'}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                    <ShieldCheck size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
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
