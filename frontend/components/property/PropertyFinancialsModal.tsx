import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Property } from '../../types';

interface Props {
    property: Property;
    isOpen: boolean;
    onClose: () => void;
}

export const PropertyFinancialsModal: React.FC<Props> = ({ property, isOpen, onClose }) => {
    const details = property.details as any || {};
    
    const amountDue = Number(property.amount_due || 0);
    const assessed = Number(property.assessed_value || details.assessed_value || details.county_appraisal || 0);
    const land = Number(property.land_value || details.land_value || 0);
    const improvements = Number(property.improvement_value || details.improvement_value || 0);
    const estimated = Number(property.estimated_value || details.estimated_value || 0);

    const formatCurrency = (val: number) => val > 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-';

    // ROI Calculator State
    const [targetBid, setTargetBid] = useState<number>(amountDue || 0);
    const [repairCosts, setRepairCosts] = useState<number>(0);
    const [holdingCosts, setHoldingCosts] = useState<number>(0);
    const [targetSalePrice, setTargetSalePrice] = useState<number>(estimated || assessed || 0);

    // ROI Calculations
    const totalInvestment = targetBid + repairCosts + holdingCosts;
    const estimatedProfit = targetSalePrice - totalInvestment;
    const roiPercentage = totalInvestment > 0 ? (estimatedProfit / totalInvestment) * 100 : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detailed Financials & ROI" size="lg">
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Opening Bid</p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                            {formatCurrency(amountDue)}
                        </p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Estimated Value</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {formatCurrency(estimated)}
                        </p>
                    </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Financial Metric</th>
                                <th className="px-4 py-3 font-semibold text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Assessed Value</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(assessed)}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Land Value</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(land)}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">Improvement Value</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(improvements)}</td>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Total Market Value</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                    {formatCurrency((land || 0) + (improvements || 0))}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                
                {/* ROI Calculator Section */}
                <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">calculate</span>
                        Interactive ROI Calculator
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Bid ($)</span>
                            <input 
                                type="number" 
                                value={targetBid} 
                                onChange={(e) => setTargetBid(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Repair / Rehab Costs ($)</span>
                            <input 
                                type="number" 
                                value={repairCosts} 
                                onChange={(e) => setRepairCosts(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Holding Costs / Misc ($)</span>
                            <input 
                                type="number" 
                                value={holdingCosts} 
                                onChange={(e) => setHoldingCosts(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Sale Price ($)</span>
                            <input 
                                type="number" 
                                value={targetSalePrice} 
                                onChange={(e) => setTargetSalePrice(Number(e.target.value))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Investment</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">${totalInvestment.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Estimated Profit</p>
                            <p className={`text-lg font-black mt-1 ${estimatedProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                ${estimatedProfit.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Projected ROI</p>
                            <p className={`text-lg font-black mt-1 ${roiPercentage >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                                {roiPercentage.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                    <p>Note: Values are estimated based on available tax records and third-party data sources. Always verify independently.</p>
                </div>
            </div>
        </Modal>
    );
};
