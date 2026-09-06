import React, { useEffect, useState } from 'react';
import { CircularProgress, Dialog, IconButton } from '@mui/material';
import { API_URL, getHeaders } from '../../services/httpClient';
import { useLanguage } from "../../context/LanguageContext";

interface ExportedProperty {
  export_id: number;
  property_id: number;
  parcel_id?: string;
  address?: string;
  county?: string;
  state?: string;
  property_type?: string;
  assessed_value?: number;
  amount_due?: number;
  requested_sale_price?: number;
  lot_acres?: number;
  owner_name?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  year_built?: number;
  zoning?: string;
  legal_description?: string;
  tax_amount?: number;
  tax_year?: number;
  num_units?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  export_notes?: string;
  exported_at?: string;
  investor_name?: string;
  latitude?: number;
  longitude?: number;
}

// ── Detail Drawer ──────────────────────────────────────────────────────────────
const PropertyDetailDrawer: React.FC<{ p: ExportedProperty | null; onClose: () => void }> = ({ p, onClose }) => {
    const { t } = useLanguage();
  if (!p) return null;

  const DetailRow: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-xs font-semibold text-slate-800 dark:text-white text-right max-w-[60%]">{value}</span>
      </div>
    );
  };

  const currency = (v?: number | null) => v != null ? `$${Number(v).toLocaleString()}` : null;
  const num = (v?: number | null) => v != null ? String(v) : null;

  return (
    <Dialog open={!!p} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{
      sx: { borderRadius: 3, m: 2, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }
    }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex-1 min-w-0">
          <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">{p.address || p.parcel_id}</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">{p.county}, {p.state}</p>
          {p.parcel_id && (
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{t('PropertyListings.parcel')}{p.parcel_id}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            {t('PropertyListings.ownerExport')}</span>
          <IconButton size="small" onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">{t('PropertyListings.close')}</span>
          </IconButton>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          {[
            { label: 'Requested Sale Price', value: currency(p.requested_sale_price), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Tax Amount', value: currency(p.tax_amount), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Lot Acres', value: p.lot_acres ? `${Number(p.lot_acres).toFixed(2)} ac` : null, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          ].filter(c => c.value).map(card => (
            <div key={card.label} className={`rounded-xl p-3 ${card.bg}`}>
              <p className={`text-sm font-extrabold ${card.color}`}>{card.value}</p>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Property Details */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3">{t('PropertyListings.propertyDetails')}</p>
          <DetailRow label="Property Type" value={p.property_type} />
          <DetailRow label="Bedrooms" value={num(p.bedrooms)} />
          <DetailRow label="Bathrooms" value={num(p.bathrooms)} />
          <DetailRow label="SqFt" value={p.sqft ? `${p.sqft.toLocaleString()} sqft` : null} />
          <DetailRow label="Year Built" value={num(p.year_built)} />
          <DetailRow label="Zoning" value={p.zoning} />
          <DetailRow label="Tax Year" value={num(p.tax_year)} />
          <DetailRow label="Num Units" value={num(p.num_units)} />
          <DetailRow label="Owner" value={p.owner_name} />
          {p.legal_description && (
            <div className="py-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('PropertyListings.legalDescription')}</p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.legal_description}</p>
            </div>
          )}
        </div>

        {/* Investor Contact */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3">{t('PropertyListings.investorContact')}</p>
          <DetailRow label="Name" value={p.contact_name || p.investor_name} />
          {p.contact_phone && (
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">{t('PropertyListings.phone')}</span>
              <a href={`tel:${p.contact_phone}`} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">{p.contact_phone}</a>
            </div>
          )}
          {p.contact_email && (
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">{t('PropertyListings.email')}</span>
              <a href={`mailto:${p.contact_email}`} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate ml-4">{p.contact_email}</a>
            </div>
          )}
          {p.export_notes && (
            <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t('PropertyListings.investorNotes')}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{p.export_notes}</p>
            </div>
          )}
        </div>

        {/* Export Metadata */}
        <div className="px-5 py-4">
          {p.exported_at && (
            <p className="text-[10px] text-slate-400">
              {t('PropertyListings.exportedOn')}{new Date(p.exported_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
};

// ── Property Card ──────────────────────────────────────────────────────────────
const PropertyCard: React.FC<{ p: ExportedProperty; onClick: () => void }> = ({ p, onClick }) => {
    const { t } = useLanguage();
  const currency = (v?: number | null) => v != null ? `$${Number(v).toLocaleString()}` : null;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:border-emerald-400/50 hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{p.address || p.parcel_id}</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
            {[p.county, p.state].filter(Boolean).join(', ')}
          </p>
        </div>
        <span className="shrink-0 text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          {t('PropertyListings.ownerExport')}</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {currency(p.requested_sale_price) && (
          <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
            {t('PropertyListings.targetPrice')}{currency(p.requested_sale_price)}
          </span>
        )}
        {p.property_type && (
          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
            {p.property_type}
          </span>
        )}
        {p.bedrooms && (
          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
            🛏 {p.bedrooms}{t('PropertyListings.bd')}{p.bathrooms}ba
          </span>
        )}
      </div>

      {/* Investor Contact Preview */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1">
        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{t('PropertyListings.investorContact')}</p>
        {(p.contact_name || p.investor_name) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-[13px]">{t('PropertyListings.person')}</span>
            {p.contact_name || p.investor_name}
          </div>
        )}
        {p.contact_phone && (
          <a href={`tel:${p.contact_phone}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
            <span className="material-symbols-outlined text-[13px]">{t('PropertyListings.phone')}</span>
            {p.contact_phone}
          </a>
        )}
      </div>

      {/* View Details CTA */}
      <div className="flex items-center justify-end gap-1 mt-auto pt-1">
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">{t('PropertyListings.viewFullDetails')}</span>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const PropertyListings: React.FC = () => {
    const { t } = useLanguage();
  const [exports, setExports] = useState<ExportedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<ExportedProperty | null>(null);
  const [stateFilter, setStateFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const qs = stateFilter ? `?state=${encodeURIComponent(stateFilter)}` : '';
      const res = await fetch(`${API_URL}/realtor-tasks/exports${qs}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExports(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [stateFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('PropertyListings.propertyListings')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('PropertyListings.propertiesSharedByIn')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            placeholder="Filter by state…"
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40"
          />
          <button
            onClick={load}
            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
          >
            {t('PropertyListings.search')}</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-600 text-[16px]">{t('PropertyListings.upload')}</span>
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
          {exports.length} {exports.length === 1 ? 'property' : 'properties'} {t('PropertyListings.exportedByInvestors')}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><CircularProgress color="success" /></div>
      ) : exports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">{t('PropertyListings.homesearch')}</span>
          <p className="text-sm font-medium">{t('PropertyListings.noPropertiesExported')}</p>
          <p className="text-xs mt-1 text-slate-400">{t('PropertyListings.investorsExportPrope')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exports.map(p => (
            <PropertyCard
              key={p.export_id}
              p={p}
              onClick={() => setSelectedProperty(p)}
            />
          ))}
        </div>
      )}

      {/* Property Detail Drawer */}
      <PropertyDetailDrawer p={selectedProperty} onClose={() => setSelectedProperty(null)} />
    </div>
  );
};

export default PropertyListings;
