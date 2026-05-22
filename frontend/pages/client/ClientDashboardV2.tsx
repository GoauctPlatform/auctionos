import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getStateStats, StateStat, getMonthlyStats, MonthlyAuctionStat, getTopScoredProperties } from '../../services/scores.service';
import { ClientDataService } from '../../services/property.service';
import { Property } from '../../types';
import { useCompany } from '../../context/CompanyContext';
import { InvestmentHeatmap } from '../../components/property/InvestmentHeatmap';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Compass, Map, BarChart2, Folder, Terminal, Award, 
  HelpCircle, ShieldCheck, RefreshCw, FileText, CheckCircle 
} from 'lucide-react';

const CHART_COLORS = {
  deed: '#8B5CF6',         // violet
  lien: '#F59E0B',         // amber
  foreclosure: '#EF4444',  // rose
};

const STATE_CODE_MAP: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

function resolveStateCode(stateRaw: string): string {
  if (!stateRaw) return '';
  const trimmed = stateRaw.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_CODE_MAP[trimmed] || trimmed.toUpperCase().slice(0, 2);
}

const StateSilhouetteBadge: React.FC<{ stateCode: string; size?: number }> = ({ stateCode, size = 24 }) => {
  const url = `https://raw.githubusercontent.com/ahuseyn/state-icons/master/icons/${stateCode}.svg`;
  return (
    <div
      style={{ width: size, height: size }}
      className="relative bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-lg flex items-center justify-center p-0.5 shrink-0 shadow-sm"
    >
      <img
        src={url}
        alt={stateCode}
        className="w-full h-full object-contain opacity-75 dark:brightness-0 dark:invert"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[7px] font-black text-slate-800/30 dark:text-white/30 tracking-tighter">{stateCode}</span>
      </div>
    </div>
  );
};

export const ClientDashboardV2: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  // Layout State
  const [selectedState, setSelectedState] = useState<string>('');
  const [stateStats, setStateStats] = useState<StateStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyAuctionStat[]>([]);
  const [dbTopDeals, setDbTopDeals] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [syncTime, setSyncTime] = useState<string>('');

  // 1. Fetch primary data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [stats, monthly, topScored] = await Promise.all([
        getStateStats(),
        getMonthlyStats(),
        getTopScoredProperties(10, { availability_status: 'available' })
      ]);
      
      setStateStats(stats);
      setMonthlyStats(monthly);
      setDbTopDeals(topScored as Property[]);
      
      // Auto-focus first top deal on render if available
      if (topScored.length > 0) {
        setSelectedProperty(topScored[0] as Property);
      }

      const now = new Date();
      setSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('ClientDashboardV2: failed to fetch layout stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3 * 60 * 1000); // 3m auto-sync
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Re-fetch monthly stats when state selection changes
  useEffect(() => {
    setMonthlyLoading(true);
    getMonthlyStats(selectedState || undefined)
      .then(data => setMonthlyStats(data))
      .catch(() => {})
      .finally(() => setMonthlyLoading(false));
  }, [selectedState]);

  // Sync right featured property details if selected state changes
  useEffect(() => {
    if (selectedState && dbTopDeals.length > 0) {
      const stateMatch = dbTopDeals.find(p => p.state === selectedState);
      if (stateMatch) {
        setSelectedProperty(stateMatch);
      }
    }
  }, [selectedState, dbTopDeals]);

  // Aggregate current stats
  const totals = useMemo(() => {
    if (selectedState) {
      const match = stateStats.find(s => s.state_code === selectedState);
      if (match) {
        return {
          deed: match.deed_volume ?? 0,
          lien: match.lien_volume ?? 0,
          foreclosure: match.foreclosure_volume ?? 0,
          total: (match.deed_volume ?? 0) + (match.lien_volume ?? 0) + (match.foreclosure_volume ?? 0)
        };
      }
    }
    return stateStats.reduce((acc, curr) => {
      acc.deed += curr.deed_volume ?? 0;
      acc.lien += curr.lien_volume ?? 0;
      acc.foreclosure += curr.foreclosure_volume ?? 0;
      acc.total += (curr.deed_volume ?? 0) + (curr.lien_volume ?? 0) + (curr.foreclosure_volume ?? 0);
      return acc;
    }, { deed: 0, lien: 0, foreclosure: 0, total: 0 });
  }, [stateStats, selectedState]);

  // Pie chart data
  const pieData = useMemo(() => {
    return [
      { name: 'Tax Deeds', value: totals.deed, color: CHART_COLORS.deed },
      { name: 'Tax Liens', value: totals.lien, color: CHART_COLORS.lien },
      { name: 'Foreclosures', value: totals.foreclosure, color: CHART_COLORS.foreclosure }
    ].filter(item => item.value > 0);
  }, [totals]);

  const activeCode = selectedState ? resolveStateCode(selectedState) : null;

  return (
    <div className="w-full flex flex-col space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* ─── 1. HEADER (Topo) ─── */}
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 dark:bg-slate-900/35 border border-slate-200/60 dark:border-slate-800/40 p-5 rounded-[24px] backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <span className="material-symbols-outlined text-[22px] text-white">gavel</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wide text-slate-900 dark:text-white uppercase">GoAuct Analytical Core</h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Experimental Grid V2 Layout · Real-time scoring systems synced
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedState && (
            <button
              onClick={() => setSelectedState('')}
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              Clear filter ({selectedState})
            </button>
          )}
          <Link
            to="/client"
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
          >
            Switch to Layout V1
          </Link>
        </div>
      </div>

      {/* ─── 2. MAIN GRID (3 Columns) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* ==========================================
            LEFT SIDEBAR (col-span-3)
            ========================================== */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* Navigation Card */}
          <div className="glass-card p-4 flex flex-col space-y-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1">
              Quick Navigation
            </p>
            {[
              { label: 'Analytical Center', icon: Compass, active: true },
              { label: 'Map Search', icon: Map, path: '/client/properties' },
              { label: 'Auctions Board', icon: BarChart2, path: '/client/auctions' },
              { label: 'My Saved Portfolios', icon: Folder, path: '/client/lists' },
              { label: 'Platform Settings', icon: Terminal, path: '/client/settings' }
            ].map((n, i) => {
              const Icon = n.icon;
              return n.active ? (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-blue-500/25 bg-blue-50/50 dark:bg-blue-950/15 text-blue-600 dark:text-blue-400 text-xs font-bold"
                >
                  <Icon size={16} />
                  <span>{n.label}</span>
                </div>
              ) : (
                <Link
                  key={i}
                  to={n.path || '#'}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <Icon size={16} />
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick Metrics Cards */}
          <div className="flex flex-col space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">
              Performance Snapshot
            </p>

            {/* Metric 1 */}
            <div className="neu-card p-4 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 size-20 bg-blue-500/5 dark:bg-cyan-500/5 rounded-full" />
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Net Yield Volume</span>
                <span className="inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                  +12.4%
                </span>
              </div>
              <p className="text-xl font-black text-slate-950 dark:text-white mt-1.5">$2,481,950</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Estimated gross yields this year</p>
            </div>

            {/* Metric 2 */}
            <div className="neu-card p-4 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 size-20 bg-purple-500/5 dark:bg-purple-500/5 rounded-full" />
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Active Auctions</span>
                <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
              </div>
              <p className="text-xl font-black text-slate-950 dark:text-white mt-1.5">1,842</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Live events mapped nationwide</p>
            </div>

            {/* Metric 3 */}
            <div className="neu-card p-4 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 size-20 bg-amber-500/5 dark:bg-amber-500/5 rounded-full" />
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">GIS Sync Counties</span>
                <Compass size={12} className="text-slate-400" />
              </div>
              <p className="text-xl font-black text-slate-950 dark:text-white mt-1.5">42</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">FEMA hazard alerts integrated</p>
            </div>

            {/* Metric 4 */}
            <div className="neu-card p-4 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 size-20 bg-red-500/5 dark:bg-red-500/5 rounded-full" />
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Avg FEMA Risk</span>
                <span className="inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                  A+ Stable
                </span>
              </div>
              <p className="text-xl font-black text-slate-950 dark:text-white mt-1.5">Low-Risk</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Flood hazard profiles cleared</p>
            </div>

          </div>

        </div>

        {/* ==========================================
            CENTER COLUMN (col-span-6)
            ========================================== */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          
          {/* Interactive Heatmap Map Card */}
          <div className="glass-card overflow-hidden flex flex-col" style={{ minHeight: 460 }}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/10 px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Map size={18} className="text-blue-500" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">National Yield Heatmap</h3>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Select a state to filter analytics</p>
                </div>
              </div>
              {selectedState && (
                <div className="flex items-center gap-1.5">
                  <StateSilhouetteBadge stateCode={resolveStateCode(selectedState)} size={22} />
                  <span className="text-xs font-black text-slate-950 dark:text-white">{selectedState}</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 w-full bg-slate-50/20 dark:bg-slate-950/10 p-4 relative flex items-center justify-center min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center size-full">
                  <RefreshCw className="animate-spin text-blue-500" size={32} />
                </div>
              ) : (
                <InvestmentHeatmap
                  stats={stateStats}
                  selectedState={selectedState}
                  onStateClick={(s) => setSelectedState(s)}
                />
              )}
            </div>
          </div>

          {/* Historical Line Chart Card */}
          <div className="glass-card flex flex-col p-4" style={{ minHeight: 380 }}>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-purple-500" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                    {selectedState ? `${selectedState} Trends` : 'National Auction Trends'}
                  </h3>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                    Monthly auction volume distribution
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {['deed', 'lien', 'foreclosure'].map((type) => (
                  <div key={type} className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${(CHART_COLORS as any)[type]}12` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: (CHART_COLORS as any)[type] }} />
                    <span className="text-[8px] font-black capitalize" style={{ color: (CHART_COLORS as any)[type] }}>
                      {type === 'deed' ? 'Deeds' : type === 'lien' ? 'Liens' : 'Foreclosures'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full" style={{ minHeight: 280 }}>
              {monthlyLoading ? (
                <div className="size-full flex items-center justify-center">
                  <RefreshCw className="animate-spin text-purple-500" size={24} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyStats} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="month_label"
                      tick={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}
                      axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.2 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-muted)', fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="glass-card p-3 min-w-[150px] shadow-lg border border-slate-200 dark:border-slate-700/55">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white mb-2">{label}</p>
                            {payload.map((entry: any) => (
                              <div key={entry.name} className="flex items-center justify-between gap-3 text-[10px] mb-0.5">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
                                  <span className="text-slate-500 dark:text-slate-400">{entry.name}</span>
                                </div>
                                <span className="font-bold text-slate-950 dark:text-white">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone" dataKey="deed" name="Tax Deeds"
                      stroke={CHART_COLORS.deed} strokeWidth={2.5}
                      dot={false} activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone" dataKey="lien" name="Tax Liens"
                      stroke={CHART_COLORS.lien} strokeWidth={2.5}
                      dot={false} activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone" dataKey="foreclosure" name="Foreclosures"
                      stroke={CHART_COLORS.foreclosure} strokeWidth={2.5}
                      dot={false} activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* ==========================================
            RIGHT SIDEBAR (col-span-3)
            ========================================== */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* Featured Property Showcase Details Card */}
          <div className="glass-card p-4.5 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Featured Asset
              </span>
              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Award size={10} /> Yield A+
              </span>
            </div>

            {selectedProperty ? (
              <div className="flex flex-col space-y-3.5">
                {/* Visual Placeholder for property */}
                <div className="w-full h-32 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-mesh-gradient opacity-20" />
                  <span className="material-symbols-outlined text-[36px] text-slate-300 dark:text-slate-700">home</span>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg flex items-center justify-between">
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">{selectedProperty.parcel_id || 'Parcel ID'}</span>
                    <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.25 rounded">{selectedProperty.state || 'FL'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-950 dark:text-white leading-tight">
                    {selectedProperty.address || '124 FEMA Certified Bypassed Deal'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {selectedProperty.county || 'Miami-Dade County'}, {selectedProperty.state || 'FL'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50/65 dark:bg-slate-800/20 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/55">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Assessed Est.</span>
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      ${(selectedProperty.assessed_value ?? 240000).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Opening Bid</span>
                    <p className="text-xs font-black text-blue-500 dark:text-blue-400">
                      ${(selectedProperty.opening_bid ?? 12500).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] bg-slate-50/30 dark:bg-slate-800/10 px-2 py-1.5 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" /> FEMA Hazard:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Zone X (Low)</span>
                </div>

                <div className="flex flex-col gap-2 pt-1.5">
                  <button
                    onClick={() => navigate(`/client/properties/${selectedProperty.id}`)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-[0.97]"
                  >
                    View Comprehensive Dossier
                  </button>
                  <button
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 dark:border-slate-700 active:scale-[0.97]"
                  >
                    Request Inspection Tour
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                <span className="material-symbols-outlined text-[36px] opacity-40 mb-2">home_work</span>
                <p className="text-xs font-bold">Select property to highlight</p>
              </div>
            )}
          </div>

          {/* Secondary Distribution Pie Chart */}
          <div className="glass-card p-4.5 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Yield breakdown
              </span>
              <Compass size={14} className="text-blue-500" />
            </div>

            <div className="h-44 w-full flex items-center justify-center relative">
              {pieData.length === 0 ? (
                <p className="text-xs text-slate-400">No chart data available</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={56}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {pieData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    {totals.total.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Custom Pie Legend */}
            <div className="flex flex-col space-y-1.5 pt-1 border-t border-slate-200/25 dark:border-slate-700/25">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[9px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white">
                    {item.value.toLocaleString()} ({totals.total > 0 ? Math.round((item.value / totals.total) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ─── 3. FOOTER (Status e Controles) ─── */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/40 dark:bg-slate-900/35 border border-slate-200/60 dark:border-slate-800/40 px-5 py-3.5 rounded-[18px] backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            System Synced · Last Update: <span className="text-slate-900 dark:text-slate-100">{syncTime || '03:59:40'}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500">
            <HelpCircle size={12} />
            <span>Click states in Heatmap to explore monthly trends curves.</span>
          </div>
          <span className="inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Layout V2 Active
          </span>
        </div>
      </div>

    </div>
  );
};

export default ClientDashboardV2;
