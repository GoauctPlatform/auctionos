import React, { useState } from 'react';
import { Activity } from 'lucide-react';

export const RehabCalcWidget: React.FC = () => {
    const [rehabPurchasePrice, setRehabPurchasePrice] = useState(150000);
    const [rehabCost, setRehabCost] = useState(45000);
    const [rehabTaxes, setRehabTaxes] = useState(3500);
    const [rehabARV, setRehabARV] = useState(320000);

    return (
        <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                Rehab & ROI Calculator
            </h2>
            {[
                { label: 'Purchase Price', value: rehabPurchasePrice, set: setRehabPurchasePrice, min: 0, max: 2000000, step: 1000 },
                { label: 'Rehab Cost', value: rehabCost, set: setRehabCost, min: 0, max: 500000, step: 500 },
                { label: 'Annual Taxes', value: rehabTaxes, set: setRehabTaxes, min: 0, max: 50000, step: 500 },
                { label: 'ARV (After Repair)', value: rehabARV, set: setRehabARV, min: 0, max: 3000000, step: 1000 },
            ].map(field => (
                <div key={field.label}>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex justify-between">
                        <span>{field.label}</span>
                        <span className="text-indigo-600">${field.value.toLocaleString()}</span>
                    </label>
                    <input type="range" min={field.min} max={field.max} step={field.step} value={field.value}
                        onChange={e => field.set(Number(e.target.value))}
                        className="w-full mt-1 accent-indigo-500" />
                </div>
            ))}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Net ROI</p>
                <p className={`text-3xl font-black ${rehabARV - rehabPurchasePrice - rehabCost - rehabTaxes > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${(rehabARV - rehabPurchasePrice - rehabCost - rehabTaxes).toLocaleString()}
                </p>
            </div>
        </div>
    );
};
