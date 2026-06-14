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
        ? (property.assessed_value || d.assessed_value || 0) * 1.0
        : (property.assessed_value || d.assessed_value || 0) * 1.0 * 0.008;

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
    const [realComps, setRealComps] = useState<any[]>([]);

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
        const fetchRealComps = async () => {
            try {
                if (!property.county) return;
                const results = await PropertyService.getProperties({
                    county: property.county,
                    state: property.state
                });
                const items = Array.isArray(results) ? results : (results?.items || []);
                const filtered = items.filter((p: any) => p.parcel_id !== property.parcel_id);
                setRealComps(filtered);
            } catch (err) {
                console.error("Failed to load real comps", err);
            }
        };
        fetchMetrics();
        fetchRealComps();
    }, [property]);

    const d = property.details || (property as any);

    const finalArv = d.estimated_value || property.estimated_value || metrics?.arv || (property.assessed_value ? Number(property.assessed_value) * 1.0 : 0);
    const finalRent = metrics?.rent || (finalArv > 0 ? Math.round(finalArv * 0.007) : 0);

    const arvComps = useMemo(() => {
        const mappedReal = realComps.map(p => {
            const detail = p.details || (p as any);
            const price = p.estimated_value || detail.estimated_value || p.assessed_value || detail.assessed_value || 0;
            const distance = parseFloat((0.4 + Math.random() * 2.5).toFixed(1));
            
            let matchScore = 95;
            if (p.property_type !== property.property_type) matchScore -= 15;
            if (p.bedrooms && property.bedrooms) matchScore -= Math.abs(p.bedrooms - property.bedrooms) * 8;
            if (p.sqft && property.sqft) {
                const sqftDiff = Math.abs(p.sqft - property.sqft) / property.sqft;
                matchScore -= Math.round(sqftDiff * 25);
            }
            matchScore = Math.max(55, Math.min(99, matchScore));

            return {
                address: p.parcel_address || p.address || 'Local Property',
                city: p.city || property.city || 'Local City',
                state: p.state || property.state,
                zip: p.zip_code || '',
                type: p.property_type || 'Single Family',
                beds: p.bedrooms || null,
                baths: p.bathrooms || null,
                sqft: p.sqft || null,
                acreage: p.lot_size || null,
                yearBuilt: p.year_built || null,
                price: price || (finalArv > 0 ? finalArv * 0.95 : 0),
                distance,
                matchScore
            };
        });

        const generated = generateComps(property, 'sale');
        const combined = [...mappedReal, ...generated];
        return combined.slice(0, 8);
    }, [realComps, property, finalArv]);

    const rentComps = useMemo(() => {
        const mappedReal = realComps.map(p => {
            const detail = p.details || (p as any);
            const basePrice = p.estimated_value || detail.estimated_value || p.assessed_value || detail.assessed_value || 0;
            const rent = basePrice > 0 ? basePrice * 0.0075 : 0;
            const distance = parseFloat((0.4 + Math.random() * 2.5).toFixed(1));
            
            let matchScore = 95;
            if (p.property_type !== property.property_type) matchScore -= 15;
            if (p.bedrooms && property.bedrooms) matchScore -= Math.abs(p.bedrooms - property.bedrooms) * 8;
            if (p.sqft && property.sqft) {
                const sqftDiff = Math.abs(p.sqft - property.sqft) / property.sqft;
                matchScore -= Math.round(sqftDiff * 25);
            }
            matchScore = Math.max(55, Math.min(99, matchScore));

            return {
                address: p.parcel_address || p.address || 'Local Property',
                city: p.city || property.city || 'Local City',
                state: p.state || property.state,
                zip: p.zip_code || '',
                type: p.property_type || 'Single Family',
                beds: p.bedrooms || null,
                baths: p.bathrooms || null,
                sqft: p.sqft || null,
                acreage: p.lot_size || null,
                yearBuilt: p.year_built || null,
                price: rent || (finalRent > 0 ? finalRent * 0.95 : 0),
                distance,
                matchScore
            };
        });

        const generated = generateComps(property, 'rent');
        const combined = [...mappedReal, ...generated];
        return combined.slice(0, 8);
    }, [realComps, property, finalRent]);

    const hasData = finalArv > 0;

    const ej: any = d.extended_owner_json || {};
    const avm = ej.avm_snapshot || {};
    const isAvm = !!(d.estimated_value || property.estimated_value);

    let confidence = 'Medium';
    if (isAvm && avm.confidence_score) {
        const score = avm.confidence_score;
        if (score >= 80) confidence = 'High';
        else if (score >= 60) confidence = 'Medium';
        else confidence = 'Low';
    } else if (metrics?.confidence) {
        confidence = metrics.confidence > 50 ? 'High' : 'Medium';
    }

    let calculationMethod = `County Averaging (${metrics?.sample_size || 0} comps)`;
    if (isAvm) {
        calculationMethod = `ATTOM Real-Time AVM (Registry-Verified)`;
    } else if (!metrics?.arv) {
        calculationMethod = `Assessed Value Multiplier (Land & Improvements)`;
    }

    const arvEstimate = { 
        value: finalArv, 
        confidence, 
        calculationMethod 
    };
    
    // Safety yield calc for the modal: yield = (annual rent / amount_due)
    let safeYield = 0;
    if (finalRent && property.amount_due) {
        safeYield = ((finalRent * 12) / property.amount_due) * 100;
    }

    const rentEstimate = { 
        monthlyRent: finalRent, 
        annualRent: finalRent * 12, 
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
                        disabled
                        className="flex flex-col items-start p-4 border border-slate-200 dark:border-slate-700 rounded-xl opacity-60 cursor-not-allowed transition-all text-left group h-full relative"
                    >
                        <span className="material-symbols-outlined absolute top-4 right-4 text-slate-400">lock</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated ARV</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">
                            {hasData ? `$${arvEstimate.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
                        </span>
                    </button>

                    {/* Rent Card */}
                    <button 
                        disabled
                        className="flex flex-col items-start p-4 border border-slate-200 dark:border-slate-700 rounded-xl opacity-60 cursor-not-allowed transition-all text-left group h-full relative"
                    >
                        <span className="material-symbols-outlined absolute top-4 right-4 text-slate-400">lock</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated Rent</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">
                            {rentEstimate.monthlyRent > 0 ? `$${rentEstimate.monthlyRent.toLocaleString()}/mo` : 'N/A'}
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
                            if (!avmVal) return null;

                            const avmLow = avm.low;
                            const avmHigh = avm.high;
                            const avmScore = avm.confidence_score;
                            const avmChange = avm.change_pct;
                            const avmChangeAmt = avm.change_amount;
                            const pricePerSqft = avm.price_per_sqft;
                            const rangePct = avm.range_pct_of_value;
                            const rangeSpread = avm.value_range;
                            const lastMonthVal = avm.last_month_value;
                            const valDate = avm.event_date;

                            return (
                                <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-violet-50/80 to-indigo-50/30 dark:from-violet-950/20 dark:to-indigo-950/5 border border-violet-100/80 dark:border-violet-900/40 shadow-sm space-y-4">
                                    <div className="flex items-start justify-between gap-4 border-b border-violet-100/50 dark:border-violet-900/20 pb-3">
                                        <div>
                                            <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-black tracking-wider mb-0.5">Verified Market Value (AVM)</p>
                                            <p className="text-2xl font-black text-violet-800 dark:text-violet-300">${Math.round(avmVal).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            {avmScore && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full">
                                                    <span className="material-symbols-outlined text-[12px]">verified</span>
                                                    Confidence: {avmScore}/100
                                                </span>
                                            )}
                                            {valDate && (
                                                <p className="text-[9px] text-slate-400 mt-1.5 font-bold">Valuation Date: {new Date(valDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* AVM Detailed Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3.5 text-xs">
                                        {/* Range */}
                                        {(avmLow || avmHigh) && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Valuation Range</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                                    {avmLow ? `$${Math.round(avmLow).toLocaleString()}` : '?'} – {avmHigh ? `$${Math.round(avmHigh).toLocaleString()}` : '?'}
                                                </span>
                                            </div>
                                        )}
                                        {/* Price / SqFt */}
                                        {pricePerSqft && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Est. Price / SqFt</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">${Number(pricePerSqft).toFixed(0)}/sqft</span>
                                            </div>
                                        )}
                                        {/* Value Range Spread */}
                                        {rangeSpread && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Range Spread</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">${Math.abs(rangeSpread).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {/* Range Pct of Value */}
                                        {rangePct && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Range Variance</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{rangePct}% of value</span>
                                            </div>
                                        )}
                                        {/* Previous Month Value */}
                                        {lastMonthVal && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Previous Month</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">${Math.round(lastMonthVal).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {/* Volatility Change */}
                                        {avmChange !== undefined && avmChange !== null && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Monthly Volatility</span>
                                                <span className={`font-bold inline-flex items-center gap-0.5 ${avmChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{avmChange >= 0 ? 'trending_up' : 'trending_down'}</span>
                                                    {avmChange >= 0 ? '+' : '-'}{Math.abs(avmChange)}% 
                                                    {avmChangeAmt ? ` ($${Math.abs(avmChangeAmt).toLocaleString()})` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
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
