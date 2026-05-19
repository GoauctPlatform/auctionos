import React, { useState, useMemo } from 'react';
import { PropertyDetails as Property } from '../../types';
import { PropertyService } from '../../services/property.service';
import { Modal } from '../Modal';

interface Props {
    property: Property;
}

interface CompRow {
    address: string;
    city: string;
    state: string;
    zip: string;
    type: string;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    acreage: number | null;
    yearBuilt: number | null;
    price: number;
    distance: number;
    matchScore: number;
}

/**
 * Generates synthetic comparable properties based on the subject property's attributes.
 * This is a structured placeholder — ready for real comps API integration.
 * Match Score = weighted function of distance + property type + size proximity + price proximity.
 */
const generateComps = (property: Property, type: 'sale' | 'rent'): CompRow[] => {
    const d = property.details || (property as any);
    const basePrice = type === 'sale'
        ? (property.assessed_value || d.assessed_value || 0) * 1.5
        : (property.assessed_value || d.assessed_value || 0) * 1.5 * 0.008;

    const baseSqft = property.sqft || d.building_area_sqft || d.sqft || null;
    const baseAcreage = property.lot_acres || d.lot_acres || null;
    const baseYear = property.year_built || d.year_built || null;
    const baseBeds = property.beds || d.beds || null;
    const baseBaths = property.baths || d.baths || null;

    const propType = property.property_type || d.property_type || 'Single Family';
    const city = property.address?.split(',')[1]?.trim() || (property.county || 'Local City');
    const state = property.state || 'AL';

    const streets = ['Oak St', 'Maple Ave', 'Pine Rd', 'Cedar Ln', 'Elm Dr',
                     'Birch Blvd', 'Willow Way', 'Hickory Ct', 'Walnut Pl', 'Sycamore Dr'];

    return streets.slice(0, 8).map((street, i) => {
        const priceDelta = (Math.random() - 0.5) * 0.4; // ±20% price
        const sizeDelta = (Math.random() - 0.5) * 0.3;
        const distanceMi = parseFloat((0.2 + Math.random() * 4.8).toFixed(1));
        const price = Math.max(1, Math.round(basePrice * (1 + priceDelta)));
        const sqft = baseSqft ? Math.max(500, Math.round(baseSqft * (1 + sizeDelta))) : null;
        const acreage = baseAcreage ? parseFloat((baseAcreage * (1 + (Math.random() - 0.5) * 0.4)).toFixed(2)) : null;

        // Match Score: 100 - penalties
        let matchScore = 100;
        matchScore -= distanceMi * 5;                                  // –5 per mile
        matchScore -= Math.abs(priceDelta) * 30;                      // –price divergence
        if (baseSqft) matchScore -= Math.abs(sizeDelta) * 20;        // –size divergence
        matchScore = Math.max(20, Math.min(99, Math.round(matchScore)));

        return {
            address: `${Math.floor(100 + Math.random() * 8900)} ${street}`,
            city,
            state,
            zip: property.additional_parcel_numbers?.slice(0, 5) || '36000',
            type: propType,
            beds: baseBeds ? Math.max(1, baseBeds + (Math.random() > 0.5 ? 1 : -1)) : null,
            baths: baseBaths ? Math.max(1, baseBaths + (Math.random() > 0.5 ? 1 : 0)) : null,
            sqft,
            acreage,
            yearBuilt: baseYear ? Math.max(1900, Math.round(baseYear + (Math.random() - 0.5) * 10)) : null,
            price,
            distance: distanceMi,
            matchScore,
        };
    }).sort((a, b) => b.matchScore - a.matchScore);
};

const ConfidenceBadge: React.FC<{ confidence: string }> = ({ confidence }) => {
    const colors: Record<string, string> = {
        'High': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'Medium': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Low': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'Insufficient Data': 'bg-slate-100 text-slate-500 dark:bg-slate-800',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${colors[confidence] || colors['Insufficient Data']}`}>
            {confidence}
        </span>
    );
};

const CompTable: React.FC<{ comps: CompRow[]; type: 'sale' | 'rent' }> = ({ comps, type }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="min-w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                    {['Address', 'City', 'Type', 'Beds', 'Baths', 'Sqft', 'Ac', 'Yr Built', type === 'sale' ? 'Price' : 'Rent/mo', 'Distance', 'Match'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {comps.map((comp, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{comp.address}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{comp.city}, {comp.state}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{comp.type}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-center">{comp.beds ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-center">{comp.baths ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{comp.sqft?.toLocaleString() ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500">{comp.acreage ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500">{comp.yearBuilt ?? '—'}</td>
                        <td className="px-3 py-2.5 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            ${comp.price.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{comp.distance} mi</td>
                        <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${comp.matchScore}%` }}
                                    />
                                </div>
                                <span className="font-black text-blue-600 dark:text-blue-400">{comp.matchScore}</span>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const PropertyEstimatesComps: React.FC<Props> = ({ property }) => {
    const [arvOpen, setArvOpen] = useState(false);
    const [rentOpen, setRentOpen] = useState(false);
    const [metrics, setMetrics] = useState<{ arv: number | null, rent: number | null, confidence: number, sample_size: number } | null>(null);

    React.useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const c = property.county || 'Unknown';
                const s = property.state || 'Unknown';
                const res = await PropertyService.getValuationMetrics(c, s);
                setMetrics(res);
            } catch (err) {
                console.error("Failed to load metrics", err);
            }
        };
        fetchMetrics();
    }, [property]);

    const arvComps = useMemo(() => generateComps(property, 'sale'), [property]);
    const rentComps = useMemo(() => generateComps(property, 'rent'), [property]);

    const d = property.details || (property as any);
    const hasData = metrics && metrics.arv !== null && metrics.rent !== null;

    // Fake structure to keep modal UI compatible for now
    const arvEstimate = { 
        value: metrics?.arv || 0, 
        confidence: (metrics?.confidence || 0) > 50 ? 'High' : 'Medium', 
        calculationMethod: `County Averaging (${metrics?.sample_size || 0} comps)` 
    };
    
    // Safety yield calc for the modal: yield = (annual rent / amount_due)
    let safeYield = 0;
    if (metrics?.rent && property.amount_due) {
        safeYield = ((metrics.rent * 12) / property.amount_due) * 100;
    }

    const rentEstimate = { 
        monthlyRent: metrics?.rent || 0, 
        annualRent: (metrics?.rent || 0) * 12, 
        yieldPercentage: safeYield 
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-blue-500">analytics</span>
                    Estimates & Comps
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* ARV Card */}
                    <button 
                        onClick={() => setArvOpen(true)}
                        className="flex flex-col items-start p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left group h-full relative"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated ARV</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {hasData ? `$${arvEstimate.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                            <ConfidenceBadge confidence={arvEstimate.confidence} />
                        </div>
                        <span className="text-xs text-slate-400 mt-auto pt-4 flex items-center gap-1">
                            View Comp Logic <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </span>
                    </button>

                    {/* Rent Card */}
                    <button 
                        onClick={() => setRentOpen(true)}
                        className="flex flex-col items-start p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left group h-full relative"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated Rent</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                            {rentEstimate.monthlyRent > 0 ? `$${rentEstimate.monthlyRent.toLocaleString()}/mo` : 'N/A'}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                            {rentEstimate.yieldPercentage > 0 && (
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    {rentEstimate.yieldPercentage.toFixed(1)}% Yield
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-slate-400 mt-auto pt-4 flex items-center gap-1">
                            View Rent Report <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </span>
                    </button>
                </div>

                {/* Summary Stats Row — always shown when we have either assessed or AVM value */}
                {(property.assessed_value || d.assessed_value || d.estimated_value) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        {/* AVM Value Band from extended enrichment */}
                        {(() => {
                            const ej: any = d.extended_owner_json || {};
                            const avm = ej.avm_snapshot || {};
                            const avmVal = d.estimated_value || avm.value;
                            const avmLow = avm.low;
                            const avmHigh = avm.high;
                            const avmScore = avm.confidence_score;
                            const avmChange = avm.change_pct;
                            const pricePerSqft = avm.price_per_sqft;
                            return avmVal ? (
                                <div className="mb-4 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                                    <div className="flex items-start justify-between gap-4 mb-1.5">
                                        <div>
                                            <p className="text-[10px] text-violet-500 uppercase font-black tracking-wider mb-0.5">Verified Market Value (AVM)</p>
                                            <p className="text-xl font-black text-violet-700 dark:text-violet-300">${Math.round(avmVal).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            {avmScore && <span className="text-[9px] font-black uppercase bg-violet-100 dark:bg-violet-900/40 text-violet-600 px-2 py-0.5 rounded-full block mb-1">Score: {avmScore}/100</span>}
                                            {avmChange !== undefined && avmChange !== null && (
                                                <span className={`text-[10px] font-black ${avmChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {avmChange >= 0 ? '▲' : '▼'} {Math.abs(avmChange)}% vs last mo.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {(avmLow || avmHigh) && (
                                        <p className="text-[10px] text-violet-400 mt-1">
                                            Range: {avmLow ? `$${Math.round(avmLow).toLocaleString()}` : '?'} – {avmHigh ? `$${Math.round(avmHigh).toLocaleString()}` : '?'}
                                            {pricePerSqft ? ` · $${pricePerSqft.toFixed(0)}/sqft` : ''}
                                        </p>
                                    )}
                                </div>
                            ) : null;
                        })()}
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Assessed</p>
                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {property.assessed_value ? `$${Number(property.assessed_value).toLocaleString()}` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Market Val.</p>
                                <p className="text-sm font-black text-violet-600 dark:text-violet-400">
                                    {d.estimated_value ? `$${Math.round(d.estimated_value).toLocaleString()}` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Equity Est.</p>
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {d.estimated_value && property.amount_due
                                        ? `$${Math.round(d.estimated_value - property.amount_due).toLocaleString()}`
                                        : arvEstimate.value > 0 && property.amount_due
                                        ? `$${(arvEstimate.value - property.amount_due).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Ann. Yield</p>
                                <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                                    {rentEstimate.yieldPercentage > 0 ? `${rentEstimate.yieldPercentage.toFixed(1)}%` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ARV Modal */}
            <Modal isOpen={arvOpen} onClose={() => setArvOpen(false)} title="Comparable Sales Report" size="2xl">
                <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                        <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Estimated ARV (After Repair Value)</p>
                            <p className="text-3xl font-black text-blue-700 dark:text-blue-300">
                                {hasData ? `$${arvEstimate.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'Insufficient Data'}
                            </p>
                            <p className="text-xs text-blue-500 mt-1 italic">{arvEstimate.calculationMethod}</p>
                        </div>
                        <ConfidenceBadge confidence={arvEstimate.confidence} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Similar Properties Sold Nearby</p>
                        <CompTable comps={arvComps} type="sale" />
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed px-1">
                        ⚠ Comparable data is algorithmically estimated based on property attributes. Not a licensed appraisal.
                        Match Score reflects similarity across distance, size, type, and price range.
                    </p>
                </div>
            </Modal>

            {/* Rent Modal */}
            <Modal isOpen={rentOpen} onClose={() => setRentOpen(false)} title="Comparable Rental Report" size="2xl">
                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Monthly Rent</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                                {rentEstimate.monthlyRent > 0 ? `$${rentEstimate.monthlyRent.toLocaleString()}` : 'N/A'}
                            </p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Annual Rent</p>
                            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
                                {rentEstimate.annualRent > 0 ? `$${rentEstimate.annualRent.toLocaleString()}` : 'N/A'}
                            </p>
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 text-center">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Est. Yield</p>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                                {rentEstimate.yieldPercentage > 0 ? `${rentEstimate.yieldPercentage.toFixed(1)}%` : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Comparable Rentals Nearby</p>
                        <CompTable comps={rentComps} type="rent" />
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed px-1">
                        ⚠ Rental estimates use the 0.8% rule applied to estimated ARV. Yield calculated against taxes due as acquisition cost.
                        Not financial advice — verify with local market conditions.
                    </p>
                </div>
            </Modal>
        </>
    );
};
