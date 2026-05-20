import React, { useState, useEffect } from 'react';
import { Property } from '../../types';
import { PropertyStructureCard } from './PropertyStructureCard';
import { API_BASE_URL } from '../../services/httpClient';

interface Props {
    property: Property;
}

// ─── Shared sub-components ───────────────────────────────────────────────────

const DataRow = ({ label, value }: { label: string, value: string | number | null | undefined }) => {
    if (!value && value !== 0) return null;
    return (
        <div className="flex justify-between items-start py-2.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0 gap-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap pt-0.5">{label}</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 text-right">{value}</span>
        </div>
    );
};

const EmptyState = ({ icon, message }: { icon: string, message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">{icon}</span>
        <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{message}</p>
    </div>
);

const fmt = (val: number | null | undefined, prefix = '$') =>
    val ? `${prefix}${Number(val).toLocaleString()}` : null;

const fmtDate = (d: string | null | undefined) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }); }
    catch { return d; }
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'structure' | 'parcel' | 'sales' | 'taxes' | 'permits' | 'owner';

export const PropertyExtendedTabs: React.FC<Props> = ({ property }) => {
    const activeTabKey = `active_tab_${property.property_id}`;

    const [activeTab, setActiveTab] = useState<Tab>(() => {
        return (sessionStorage.getItem(activeTabKey) as Tab) || 'structure';
    });
    const d = property.details || (property as any);

    // Sync tabs if property changes
    useEffect(() => {
        setActiveTab((sessionStorage.getItem(activeTabKey) as Tab) || 'structure');
    }, [property.property_id]);

    const handleTabClick = (tab: Tab) => {
        setActiveTab(tab);
        sessionStorage.setItem(activeTabKey, tab);
    };

    const tabClass = (tab: Tab, color: string) =>
        `flex-1 py-3 text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
            activeTab === tab
                ? `border-${color}-500 text-${color}-600 dark:text-${color}-400 bg-white dark:bg-slate-800`
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`;

    // ── Parcel amenities renderer ─────────────────────────────────────────────
    const renderAmenities = () => {
        const hasFeatures = d.other_areas || d.other_features || d.amenities || (d.flooring_types && d.flooring_types.length > 0) || d.other_rooms;
        if (!hasFeatures) return <EmptyState icon="format_list_bulleted" message="No extended features or amenities data available." />;

        const renderJsonTags = (data: any, title: string) => {
            if (!data) return null;
            let items: string[] = [];
            if (Array.isArray(data)) items = data.map(String);
            else if (typeof data === 'object') items = Object.entries(data).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
            else if (typeof data === 'string') {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) items = parsed.map(String);
                    else if (typeof parsed === 'object') items = Object.entries(parsed).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
                    else items = [data];
                } catch { items = [data]; }
            }
            if (items.length === 0) return null;
            return (
                <div className="mb-6 last:mb-0">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">{title}</h4>
                    <div className="flex flex-wrap gap-2">
                        {items.map((item, i) => (
                            <span key={i} className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-md capitalize">{item}</span>
                        ))}
                    </div>
                </div>
            );
        };

        return (
            <div className="p-4">
                {renderJsonTags(d.amenities, 'General Amenities')}
                {renderJsonTags(d.other_features, 'Other Features')}
                {renderJsonTags(d.other_areas, 'Extended Areas')}
                {renderJsonTags(d.other_improvements, 'Additional Improvements')}
                {renderJsonTags(d.flooring_types, 'Flooring Types')}
                {renderJsonTags(d.other_rooms, 'Other Rooms')}
            </div>
        );
    };

    // ── Sales History renderer ────────────────────────────────────────────────
    const renderSalesHistory = () => {
        const sales: any[] = d.sales_history_json || [];
        if (sales.length === 0) return <EmptyState icon="history" message="No recorded sales or transfers found for this parcel." />;

        return (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((s, i) => (
                    <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sale Date</span>
                                <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{fmtDate(s.sale_date) || '—'}</p>
                            </div>
                            {s.sale_amount && (
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmt(s.sale_amount)}</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                            {s.buyer_name && <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-black text-slate-400">Buyer: </span>{s.buyer_name}</p>}
                            {s.seller_name && <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-black text-slate-400">Seller: </span>{s.seller_name}</p>}
                            {s.deed_type && <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-black text-slate-400">Deed: </span>{s.deed_type}</p>}
                            {s.recording_date && <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-black text-slate-400">Recorded: </span>{fmtDate(s.recording_date)}</p>}
                            {s.document_number && <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-black text-slate-400">Doc #: </span>{s.document_number}</p>}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ── Tax History renderer ──────────────────────────────────────────────────
    const renderTaxHistory = () => {
        const taxes: any[] = d.tax_history_json || [];
        if (taxes.length === 0) return <EmptyState icon="receipt_long" message="No tax assessment history found." />;

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            {['Year', 'Assessed Value', 'Land Value', 'Improvement', 'Tax Amount', 'Market Value'].map(h => (
                                <th key={h} className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {taxes.sort((a, b) => (b.year || 0) - (a.year || 0)).map((t, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-4 font-black text-slate-700 dark:text-slate-200">{t.year || '—'}</td>
                                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">{fmt(t.assessed_value) || '—'}</td>
                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{fmt(t.land_value) || '—'}</td>
                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{fmt(t.improvement_value) || '—'}</td>
                                <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">{fmt(t.tax_amount) || '—'}</td>
                                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{fmt(t.market_value) || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // ── Permits renderer ─────────────────────────────────────────────────────
    const renderPermits = () => {
        const permits: any[] = d.permits_json || [];
        if (permits.length === 0) return <EmptyState icon="construction" message="No building permits found for this parcel." />;

        return (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {permits.map((p, i) => (
                    <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-4 mb-1">
                            <div className="flex-1">
                                <p className="text-sm font-black text-slate-800 dark:text-white">{p.description || p.type || 'Building Permit'}</p>
                                {p.status && (
                                    <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                        p.status.toLowerCase().includes('final') || p.status.toLowerCase().includes('complete')
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : p.status.toLowerCase().includes('active') || p.status.toLowerCase().includes('open')
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                    }`}>{p.status}</span>
                                )}
                            </div>
                            {p.estimated_cost && (
                                <span className="text-sm font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">{fmt(p.estimated_cost)}</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-2">
                            {p.permit_date && <p className="text-[11px] text-slate-500"><span className="font-black">Date: </span>{fmtDate(p.permit_date)}</p>}
                            {p.permit_number && <p className="text-[11px] text-slate-500"><span className="font-black">Permit #: </span>{p.permit_number}</p>}
                            {p.contractor && <p className="text-[11px] text-slate-500"><span className="font-black">Contractor: </span>{p.contractor}</p>}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ── Owner / Skip Trace renderer ───────────────────────────────────────────
    const renderOwnerProfile = () => {
        const ownerJson: any = d.extended_owner_json || {};
        const o1 = ownerJson.owner1 || {};
        const o2 = ownerJson.owner2;
        const mailing = ownerJson.mailing_address || {};

        const hasData = o1.full_name || o2 || ownerJson.owner3 || ownerJson.owner4 || mailing.one_line || d.owner_name;
        if (!hasData) return <EmptyState icon="person_search" message="Owner profile data not yet available." />;

        return (
            <div className="p-6 space-y-6">
                {/* Primary Owner */}
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        Primary Owner
                    </h4>
                    <div className="space-y-0.5">
                        <DataRow label="Full Name" value={o1.full_name || d.owner_name} />
                        <DataRow label="First Name" value={o1.first_name} />
                        <DataRow label="Last Name" value={o1.last_name} />
                        <DataRow label="Occupancy" value={ownerJson.owner_occupied} />
                        <DataRow label="Corporate Entity" value={ownerJson.corporate_indicator ? 'Yes — Corporate' : ownerJson.corporate_indicator === false ? 'No — Individual' : null} />
                    </div>
                </div>

                {/* Co-Owner / Secondary */}
                {o2 && (o2.full_name || o2.first_name) && (
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            Co-Owner / Secondary
                        </h4>
                        <div className="space-y-0.5">
                            <DataRow label="Full Name" value={o2.full_name} />
                            <DataRow label="First Name" value={o2.first_name} />
                            <DataRow label="Last Name" value={o2.last_name} />
                        </div>
                    </div>
                )}

                {/* Owner 3 */}
                {ownerJson.owner3 && (
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            Owner 3
                        </h4>
                        <div className="space-y-0.5">
                            <DataRow label="Full Name" value={typeof ownerJson.owner3 === 'object' ? ownerJson.owner3.full_name : ownerJson.owner3} />
                            {typeof ownerJson.owner3 === 'object' && (
                                <>
                                    <DataRow label="First Name" value={ownerJson.owner3.first_name} />
                                    <DataRow label="Last Name" value={ownerJson.owner3.last_name} />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Owner 4 */}
                {ownerJson.owner4 && (
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            Owner 4
                        </h4>
                        <div className="space-y-0.5">
                            <DataRow label="Full Name" value={typeof ownerJson.owner4 === 'object' ? ownerJson.owner4.full_name : ownerJson.owner4} />
                            {typeof ownerJson.owner4 === 'object' && (
                                <>
                                    <DataRow label="First Name" value={ownerJson.owner4.first_name} />
                                    <DataRow label="Last Name" value={ownerJson.owner4.last_name} />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Skip Tracing & Marketing Intelligence */}
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">psychology</span>
                        Skip Tracing & Marketing Intelligence
                    </h4>
                    <div className="space-y-0.5">
                        <DataRow label="County Name" value={ownerJson.county_name} />
                        <DataRow label="Subdivision" value={ownerJson.subdivision || d.subdivision} />
                        <DataRow label="Municipality" value={ownerJson.municipality} />
                        <DataRow label="Property Type" value={ownerJson.property_type} />
                        <DataRow label="Property Class" value={ownerJson.property_class} />
                        <DataRow label="Property Subtype" value={ownerJson.property_subtype} />
                        <DataRow 
                            label="Absentee Owner Status" 
                            value={
                                ownerJson.absentee_owner_status === 'A' || ownerJson.absentee_indicator === 'ABSENTEE'
                                    ? 'Absentee Owner (High Lead Priority)' 
                                    : ownerJson.absentee_owner_status === 'O' 
                                    ? 'Owner Occupied' 
                                    : ownerJson.absentee_owner_status === 'U'
                                    ? 'Unknown'
                                    : ownerJson.absentee_indicator || null
                            } 
                        />
                        <DataRow label="Absentee Type" value={ownerJson.absentee_indicator} />
                        <DataRow 
                            label="Corporate Indicator" 
                            value={
                                ownerJson.corporate_indicator === 'Y' || ownerJson.corporate_indicator === true 
                                    ? 'Yes — Corporate Owned' 
                                    : ownerJson.corporate_indicator === 'N' || ownerJson.corporate_indicator === false 
                                    ? 'No — Individual Owned' 
                                    : null
                            } 
                        />
                        <DataRow label="Tax Code Area" value={ownerJson.tax_code_area} />
                        <DataRow label="Municipality Code" value={ownerJson.municipality_code} />
                        <DataRow label="County Land Use Code" value={ownerJson.county_land_use_code} />
                    </div>
                </div>


                {/* Mailing Address */}
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">mail</span>
                        Mailing / Correspondence Address
                    </h4>
                    {(mailing.one_line || d.owner_address) ? (
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{mailing.one_line || d.owner_address}</p>
                            {mailing.street && mailing.one_line !== mailing.street && (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                                    {mailing.street && <span><b>Street:</b> {mailing.street}</span>}
                                    {mailing.city && <span><b>City:</b> {mailing.city}</span>}
                                    {mailing.state && <span><b>State:</b> {mailing.state}</span>}
                                    {mailing.zip && <span><b>ZIP:</b> {mailing.zip}</span>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">Mailing address not available.</p>
                    )}
                </div>

                {/* Last Transfer */}
                {(ownerJson.last_transfer_date || ownerJson.last_transfer_amount) && (
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                            Last Transfer
                        </h4>
                        <div className="space-y-0.5">
                            <DataRow label="Transfer Date" value={fmtDate(ownerJson.last_transfer_date)} />
                            <DataRow label="Transfer Amount" value={fmt(ownerJson.last_transfer_amount)} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4 mt-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Tab Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 px-4 overflow-x-auto gap-4">
                    <div className="flex flex-1 overflow-x-auto">
                        <button onClick={() => handleTabClick('structure')} className={tabClass('structure', 'blue')}>
                            <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[14px]">architecture</span>Structure</span>
                        </button>
                        <button onClick={() => handleTabClick('parcel')} className={tabClass('parcel', 'emerald')}>
                            <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[14px]">landscape</span>Parcel</span>
                        </button>
                        <button onClick={() => handleTabClick('sales')} className={tabClass('sales', 'violet')}>
                            <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[14px]">swap_horiz</span>Sales</span>
                        </button>
                        <button onClick={() => handleTabClick('taxes')} className={tabClass('taxes', 'amber')}>
                            <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[14px]">receipt_long</span>Taxes</span>
                        </button>
                        <button onClick={() => handleTabClick('permits')} className={tabClass('permits', 'rose')}>
                            <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[14px]">construction</span>Permits</span>
                        </button>
                        <button onClick={() => handleTabClick('owner')} className={tabClass('owner', 'indigo')}>
                            <span className="flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[14px]">person_search</span>Owner</span>
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'structure' && (
                        <PropertyStructureCard property={property} isTabContent={true} />
                    )}

                    {activeTab === 'parcel' && (
                        <div className="p-6">
                            <div className="space-y-0.5">
                                <DataRow label="Legal Description" value={d.legal_description} />
                                <DataRow label="Land Use (Std Category)" value={d.standardized_land_use_category} />
                                <DataRow label="Land Use (Std Type)" value={d.standardized_land_use_type} />
                                <DataRow label="County Land Use Code" value={d.county_land_use_code} />
                                <DataRow label="County Land Use Desc" value={d.county_land_use_description} />
                                <DataRow label="Subdivision / Tract" value={d.subdivision} />
                                <DataRow label="Lot Number" value={d.lot_number} />
                                <DataRow label="Municipality" value={d.municipality} />
                                <DataRow label="Township / Range" value={d.section_township_range} />
                                <DataRow label="Zoning" value={d.zoning || property.zoning} />
                            </div>
                            {renderAmenities()}
                        </div>
                    )}

                    {activeTab === 'sales' && renderSalesHistory()}
                    {activeTab === 'taxes' && renderTaxHistory()}
                    {activeTab === 'permits' && renderPermits()}
                    {activeTab === 'owner' && renderOwnerProfile()}
                </div>
            </div>
        </div>
    );
};
