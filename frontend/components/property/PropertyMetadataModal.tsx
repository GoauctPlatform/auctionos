import React from 'react';
import { Modal } from '../Modal';
import { Property } from '../../types';

interface Props {
    property: Property;
    isOpen: boolean;
    onClose: () => void;
}

export const PropertyMetadataModal: React.FC<Props> = ({ property, isOpen, onClose }) => {
    const d = property.details || (property as any); // Fallback for flattened API responses

    const DataRow = ({ label, value, highlight = false, copyable = false }: { label: string, value: string | number | boolean | null | undefined, highlight?: boolean, copyable?: boolean }) => {
        const displayValue = value === true ? 'Yes' : value === false ? 'No' : value === 0 ? '0' : value || '—';
        
        const handleCopy = () => {
            if (copyable && value) {
                navigator.clipboard.writeText(value.toString());
            }
        };

        return (
            <div className={`flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0 ${highlight ? 'bg-blue-50/30 dark:bg-blue-900/10 -mx-2 px-2 rounded' : ''}`}>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'} text-right`}>
                        {displayValue}
                    </span>
                    {copyable && value && (
                        <button onClick={handleCopy} className="material-symbols-outlined text-[14px] text-slate-300 hover:text-blue-500 transition-colors cursor-pointer">
                            content_copy
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const assessedValue = property.assessed_value || d.assessed_value || 0;
    // AVM: prefer ATTOM-enriched estimated_value over simple assessed_value multiplier
    const estimatedValue = d.estimated_value || property.estimated_value || (assessedValue > 0 ? assessedValue * 1.5 : 0);
    const amountDue = property.amount_due || 0;
    const equity = estimatedValue > 0 ? estimatedValue - amountDue : null;
    const equityRatio = estimatedValue > 0 && equity !== null ? (equity / estimatedValue) * 100 : null;
    const ltv = equityRatio !== null ? (100 - equityRatio).toFixed(1) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Extended Decision Framework" size="2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 p-2">
                
                {/* 1. INVESTOR METRICS (The Most Important) */}
                <section>
                    <header className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Financial Profile</h4>
                    </header>
                    <div className="space-y-0.5">
                        <DataRow label="Assessed Value" value={`$${assessedValue.toLocaleString()}`} />
                        <DataRow label="AVM / Market Value" value={estimatedValue > 0 ? `$${Math.round(estimatedValue).toLocaleString()}` : null} />
                        <DataRow label="Land Value" value={d.land_value ? `$${Number(d.land_value).toLocaleString()}` : null} />
                        <DataRow label="Improvement Value" value={d.improvement_value ? `$${Number(d.improvement_value).toLocaleString()}` : null} />
                        <DataRow label="Estimated Equity" value={equity !== null ? `$${Math.round(equity).toLocaleString()}` : null} highlight={true} />
                        <DataRow label="LTV Approximation" value={ltv ? `${ltv}%` : null} highlight={true} />
                        <DataRow label="Annual Tax Amount" value={d.tax_amount ? `$${Number(d.tax_amount).toLocaleString()}` : null} />
                        <DataRow label="Tax Year" value={d.tax_year} />
                        <DataRow label="Homestead Exempt" value={d.homestead_exemption} />
                    </div>
                </section>

                {/* 2. PHYSICAL ATTRIBUTES */}
                <section>
                    <header className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 text-lg">home_work</span>
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Physical Attributes</h4>
                    </header>
                    <div className="space-y-0.5">
                        <DataRow label="Property Type" value={property.property_type || d.property_type_detail || d.use_description} />
                        <DataRow label="Structure Style" value={d.structure_style} />
                        <DataRow label="Building SqFt" value={d.building_area_sqft || d.sqft} />
                        <DataRow label="Lot Size (Acres)" value={d.lot_acres || (property.lot_sqft ? (property.lot_sqft / 43560).toFixed(2) : null)} />
                        <DataRow label="Year Built" value={d.year_built} />
                        <DataRow label="Bed/Bath" value={d.bedrooms && d.bathrooms ? `${d.bedrooms} / ${d.bathrooms}` : null} />
                        <DataRow label="Zoning Code" value={d.zoning || d.use_code} />
                    </div>
                </section>

                {/* 3. OWNERSHIP & HISTORY */}
                <section>
                    <header className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-violet-600 text-lg">history_edu</span>
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Ownership & History</h4>
                    </header>
                    <div className="space-y-0.5">
                        <DataRow label="Owner Name" value={property.owner_name || d.owner_name} />
                        <DataRow label="Mailing Address" value={property.owner_address || d.owner_address} />
                        <DataRow label="Last Sale Price" value={d.last_sale_price ? `$${Number(d.last_sale_price).toLocaleString()}` : null} />
                        <DataRow label="Last Sale Date" value={d.last_sale_date} />
                        <DataRow label="Ownership Status" value={property.occupancy || d.owner_occupied} />
                        <DataRow label="Foreclosure Year" value={property.tax_sale_year} />
                    </div>
                </section>

                {/* 4. TECHNICAL DATA */}
                <section>
                    <header className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600 text-lg">pin_drop</span>
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Technical Data</h4>
                    </header>
                    <div className="space-y-0.5">
                        <DataRow label="Latitude" value={property.latitude || d.latitude} copyable={true} />
                        <DataRow label="Longitude" value={property.longitude || d.longitude} copyable={true} />
                        <DataRow label="County FIPS" value={d.county_fips} />
                        <DataRow label="C/S Number" value={property.cs_number} />
                        <DataRow label="Flood Zone" value={d.flood_zone_code} />
                        <DataRow label="Opportunity Zone" value={property.is_qoz} />
                        <DataRow label="Public Registry ID" value={d.attom_id} copyable={true} />
                        <DataRow label="APN (Unformatted)" value={d.apn_unformatted} copyable={true} />
                        <DataRow label="APN (Previous)" value={d.apn_previous} />
                    </div>
                </section>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>Subject Parcel: {property.parcel_id}</span>
                <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span> Verified Data
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span> Sys Update: {property.updated_at ? new Date(property.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                    {d.publishing_date && (
                        <span className="flex items-center gap-1 text-blue-500/80">
                            <span className="material-symbols-outlined text-[12px]">update</span> Data Date: {new Date(d.publishing_date).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>
        </Modal>
    );
};
