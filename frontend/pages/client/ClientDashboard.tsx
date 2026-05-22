import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuctionService } from '../../services/auction.service';
import { PropertyService, ClientDataService } from '../../services/property.service';
import { AuctionEvent, Property } from '../../types';
import { AuthService } from '../../services/auth.service';
import { useCompany } from '../../context/CompanyContext';
import { recommendProperties, rankAuctions } from '../../intelligence/rankingEngine';
import { useTour } from '../../context/TourContext';
import { calculateDealScore } from '../../intelligence/scoringEngine';
import { getTopScoredProperties, getStateStats, StateStat } from '../../services/scores.service';
import { InvestmentHeatmap } from '../../components/property/InvestmentHeatmap';
import { API_URL } from '../../services/httpClient';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

function getTypeLabel(taxStatus?: string): { label: string; color: string } {
  const s = (taxStatus || '').toLowerCase();
  if (s.includes('deed') || s.includes('tax deed')) return { label: 'Tax Deed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
  if (s.includes('lien') || s.includes('tax lien')) return { label: 'Tax Lien', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  if (s.includes('foreclosure')) return { label: 'Foreclosure', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  return { label: taxStatus || 'Auction', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
}

function filterByType(items: AuctionEvent[], type: 'deed' | 'lien' | 'foreclosure'): AuctionEvent[] {
  return items.filter(a => {
    const s = ((a.tax_status || '') + ' ' + (a.name || '')).toLowerCase();
    if (type === 'deed') {
      return s.includes('deed') || s.includes('sheriff') || s.includes('tax sale') || s.includes('tax-deed') || s.includes('public outcry');
    }
    if (type === 'lien') return s.includes('lien') || s.includes('certificate');
    if (type === 'foreclosure') return s.includes('foreclosure');
    return false;
  });
}

function sortByTopProperties(items: AuctionEvent[], n = 10): AuctionEvent[] {
  const ranked = rankAuctions(items);
  const nameToScore = new Map<string, number>();
  ranked.forEach(r => nameToScore.set(r.name, r.normalizedScore));

  return [...items]
    .sort((a, b) => {
       const scoreA = nameToScore.get(a.name || '') || 0;
       const scoreB = nameToScore.get(b.name || '') || 0;
       return scoreB - scoreA;
    })
    .slice(0, n);
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: 'format_list_bulleted',
      label: 'My Lists',
      desc: 'View your saved properties',
      path: '/client/lists',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: 'real_estate_agent',
      label: 'Field Missions',
      desc: 'Track due diligence',
      path: '/client/tasks',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: 'location_on',
      label: 'Property Search',
      desc: 'Search & filter properties',
      path: '/client/properties',
      color: 'from-violet-500 to-violet-600',
    },
    {
      icon: 'calendar_month',
      label: 'Auction Calendar',
      desc: "See what's scheduled",
      path: '/client/auctions',
      color: 'from-sky-500 to-sky-600',
    },
  ];

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
        Quick Access
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="group flex flex-col items-start gap-2 p-4 bg-white dark:bg-[#131926]/60 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:border-[#0D8BFF]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left"
          >
            <div className={`size-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center shadow-sm`}>
              <span className="material-symbols-outlined text-white text-[20px]">{a.icon}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-[#0D8BFF] transition-colors">
                {a.label}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

// ─── Auction Card ────────────────────────────────────────────────────────────

const AuctionCard: React.FC<{ auction: AuctionEvent }> = ({ auction }) => {
  const { label, color } = getTypeLabel(auction.tax_status);
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        const d = auction.auction_date ? auction.auction_date.split('T')[0] : '';
        navigate(`/client/auctions?name=${encodeURIComponent(auction.name || '')}&startDate=${d}&endDate=${d}`);
      }}
      className="flex-shrink-0 w-64 bg-white dark:bg-[#131926]/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 hover:border-[#0D8BFF]/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
          {label}
        </span>
        {(auction.parcels_count || auction.properties_count) ? (
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">home</span>
            {auction.parcels_count || auction.properties_count}
          </span>
        ) : null}
      </div>

      <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-2">
        {auction.name}
      </p>

      <div className="space-y-1">
        {(auction.state || auction.county) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            <span className="truncate">
              {[auction.county, auction.state].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          <span>{formatDate(auction.auction_date)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Top Auctions Section ────────────────────────────────────────────────────

const sectionMeta = {
  deed: {
    title: 'Top Deed Auctions',
    icon: 'gavel',
    emptyMsg: 'No deed auctions available',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  foreclosure: {
    title: 'Top Foreclosure Auctions',
    icon: 'real_estate_agent',
    emptyMsg: 'No foreclosure auctions available',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  lien: {
    title: 'Top Tax Lien Auctions',
    icon: 'receipt_long',
    emptyMsg: 'No tax lien auctions available',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
};

// ─── Suggested Deals Section ─────────────────────────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

const SuggestedDeals: React.FC<{ properties: Property[], loading: boolean, stateFilter: string, onStateChange: (s: string) => void }> = ({ properties, loading, stateFilter, onStateChange }) => {
  const navigate = useNavigate();

  // Exclude the first featured property from the scrollable list if there are multiple,
  // so that the first one is the Spotlight and others are browsed in the carousel.
  const displayProperties = properties.length > 1 ? properties.slice(1) : properties;

  return (
    <section className="glass-card-premium p-6 rounded-2xl overflow-hidden flex flex-col space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wide">
            <span className="material-symbols-outlined text-[#13B8B5]">auto_awesome</span>
            High-Potential Recommended Deals
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Intelligence-filtered distressed opportunities</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={stateFilter}
            onChange={(e) => onStateChange(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1626]/50 text-slate-700 dark:text-slate-355 focus:outline-none focus:ring-1 focus:ring-[#0D8BFF]"
          >
            <option value="">🇺🇸 All States</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button 
            onClick={() => navigate(stateFilter ? `/client/properties?top=true&state=${stateFilter}` : '/client/properties?top=true')}
            className="text-[10px] font-bold text-[#0D8BFF] hover:underline uppercase tracking-widest"
          >
            Explore All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-36 bg-slate-100 dark:bg-slate-900/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayProperties.length === 0 ? (
        <div className="h-36 bg-slate-50 dark:bg-[#131926]/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
          <span className="material-symbols-outlined text-3xl mb-1 text-slate-550">inventory_2</span>
          <p className="text-xs font-bold">{stateFilter ? `No additional deals for ${stateFilter}` : 'Adjusting Algorithm...'}</p>
          <p className="text-[10px] mt-0.5">Select a different state or run the scoring seed script.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-250 dark:scrollbar-thumb-slate-800">
          {displayProperties.map((p) => {
            const score = calculateDealScore(p);
            const displayRating = (p as any).deal_rating || score.rating;
            const displayScore = (p as any).deal_score ?? score.score;
            
            const ratingColor = displayRating.startsWith('A') 
              ? 'bg-emerald-500 shadow-emerald-500/20' 
              : displayRating.startsWith('B') 
                ? 'bg-blue-500 shadow-blue-500/20' 
                : 'bg-amber-500 shadow-amber-500/20';

            return (
              <div 
                key={p.parcel_id || (p as any).id}
                onClick={() => navigate(`/client/properties/${p.parcel_id || (p as any).id}`)}
                className="flex-shrink-0 w-72 p-4 bg-slate-50/50 dark:bg-[#0f1626]/30 border border-slate-150 dark:border-slate-850 hover:border-[#0D8BFF]/40 rounded-xl transition-all cursor-pointer group hover:shadow-lg flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className={`size-10 rounded-xl flex flex-col items-center justify-center text-white font-black text-xs shadow-md ${ratingColor}`}>
                    <span>{displayRating}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block">AI Match</span>
                    <span className="text-xs font-extrabold text-[#13B8B5]">{Math.round(displayScore)}%</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-[#0D8BFF] transition-colors">
                    {p.address || p.parcel_id}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold mt-0.5 truncate">
                    {p.county || 'Unknown County'}, {(p as any).state || (p as any).state_code}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                   {(p as any).amount_due && (
                    <p className="text-[9px] text-[#13B8B5] font-bold whitespace-nowrap bg-emerald-500/5 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                      ${Number((p as any).amount_due).toLocaleString()} Bid
                    </p>
                  )}
                  {(p as any).assessed_value && (
                    <p className="text-[9px] text-[#0D8BFF] font-bold whitespace-nowrap bg-blue-500/5 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-500/10">
                      ${Number((p as any).assessed_value).toLocaleString()} Value
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

interface TopAuctionsProps {
  type: 'deed' | 'foreclosure' | 'lien';
  allAuctions: AuctionEvent[];
  loading: boolean;
}

const TopAuctions: React.FC<TopAuctionsProps> = ({ type, allAuctions, loading }) => {
  const meta = sectionMeta[type];
  const items = sortByTopProperties(filterByType(allAuctions, type));

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={`size-7 rounded-lg ${meta.bg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-[16px] ${meta.color}`}>{meta.icon}</span>
        </div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">{meta.title}</h2>
        {items.length > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-450">
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-36 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={`flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 ${meta.bg}`}>
          <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
          <p className="text-sm text-slate-500 dark:text-slate-400">{meta.emptyMsg} — data will appear as auctions are imported.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Auction Search (Backend-powered, beautifully redesigned) ─────────────────

const AuctionSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [results, setResults] = useState<AuctionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() && !typeFilter) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params: any = { limit: 10, skip: 0 };
        if (query.trim()) params.q = query.trim();
        if (typeFilter) params.name = typeFilter;
        const res = await AuctionService.getAuctionEvents(params);
        setResults(res.items || []);
        setSearched(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, typeFilter]);

  return (
    <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0D8BFF] text-[18px]">search</span>
          Search Auctions
        </h2>
        <p className="text-[10px] text-slate-400 mt-1">Live querying on national distressed sales registry</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Text search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[18px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); setResults([]); setSearched(false); } }}
            placeholder="Search name, state, county…"
            className="w-full pl-9 pr-9 py-2 bg-white dark:bg-[#0f1626]/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-[#0D8BFF] focus:border-[#0D8BFF] transition-all"
          />
          {(query || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {loading
                ? <span className="material-symbols-outlined text-[16px] text-slate-450 animate-spin">progress_activity</span>
                : <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="text-slate-405 hover:text-slate-650 dark:hover:text-slate-300"><span className="material-symbols-outlined text-[16px]">close</span></button>
              }
            </div>
          )}
        </div>

        {/* Auction Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-2 bg-white dark:bg-[#0f1626]/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-355 focus:outline-none focus:ring-1 focus:ring-[#0D8BFF] min-w-[110px]"
        >
          <option value="">All Types</option>
          <option value="deed">Tax Deed</option>
          <option value="lien">Tax Lien</option>
          <option value="foreclosure">Foreclosure</option>
        </select>
      </div>

      {/* Results */}
      {searched && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-350">
          {results.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs text-slate-500">
              <span className="material-symbols-outlined text-[16px]">search_off</span>
              No auctions found{query ? ` for "${query}"` : ''}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0f1626]/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500">
                  {results.length} result{results.length !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}
                </span>
                <button
                  onClick={() => navigate(`/client/auctions${query ? `?q=${encodeURIComponent(query)}` : ''}`)}
                  className="text-[10px] text-[#0D8BFF] font-semibold hover:underline"
                >
                  View all auctions →
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((a) => {
                  const { label, color } = getTypeLabel(a.tax_status);
                  return (
                    <div
                      key={a.id}
                      onClick={() => {
                        const d = a.auction_date ? String(a.auction_date).split('T')[0] : '';
                        const params = new URLSearchParams();
                        if (a.name) params.append('name', a.name);
                        if (d) {
                          params.append('startDate', d);
                          params.append('endDate', d);
                        }
                        navigate(`/client/auctions?${params.toString()}`);
                      }}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#0f1626]/40 cursor-pointer transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-850 dark:text-slate-200 truncate group-hover:text-[#0D8BFF] transition-colors">{a.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {[a.county, a.state].filter(Boolean).join(', ')}
                          {a.auction_date && ` · ${formatDate(String(a.auction_date))}`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>{label}</span>
                      {a.parcels_count ? (
                        <span className="text-[10px] text-slate-450 font-semibold flex items-center gap-0.5 shrink-0">
                          <span className="material-symbols-outlined text-[12px]">home</span>{a.parcels_count}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcomeModal, setShowWelcomeModal] = useState(searchParams.get('welcome') === 'true');
  const user = AuthService.getCurrentUser();
  const { activeCompany } = useCompany();
  const { startTour } = useTour();
  const formatName = (str?: string) => {
    if (!str) return 'There';
    const base = str.split('@')[0];
    return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  };
  
  const getFirstName = () => {
      // @ts-ignore - full_name may not be typed in current frontend models
      if (user?.full_name) {
          const first = user.full_name.trim().split(' ')[0];
          return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
      }
      return formatName(user?.email);
  };
  const userName = getFirstName();

  const [allAuctions, setAllAuctions] = useState<AuctionEvent[]>([]);
  const [typeAuctions, setTypeAuctions] = useState<{deed: AuctionEvent[], foreclosure: AuctionEvent[], lien: AuctionEvent[]}>({ deed: [], foreclosure: [], lien: [] });
  const [stats, setStats] = useState({ deed: 0, foreclosure: 0, lien: 0 });
  const [rawProperties, setRawProperties] = useState<Property[]>([]);
  const [dbTopDeals, setDbTopDeals] = useState<Property[]>([]);
  const [stateStats, setStateStats] = useState<StateStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('');
  const [filteredDeals, setFilteredDeals] = useState<Property[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [myListsPreferences, setMyListsPreferences] = useState<{ states: string[]; counties: string[]; total: number } | null>(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const isFetchingBus = useRef(false);

  // ─── Announcements ────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<{id:number;title:string;message:string;type:string}[]>([]);
  const [annIndex, setAnnIndex] = useState(0);
  useEffect(() => {
    fetch(`${API_URL}/admin/announcements/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (announcements.length < 2) return;
    const t = setInterval(() => setAnnIndex(i => (i + 1) % announcements.length), 5000);
    return () => clearInterval(t);
  }, [announcements.length]);

  // ─── Reactive Data Pipeline ────────────────────────────────────────────────
  
  const marketInventory = useMemo(() => {
    return rawProperties.filter(p => 
      (p.availability_status || '').toLowerCase().trim() === 'available'
    );
  }, [rawProperties]);

  const suggestedDeals = useMemo(() => {
    let baseList: Property[] = [];
    if (dbTopDeals.length > 0) {
      baseList = dbTopDeals.filter(p => 
        (p.availability_status || '').toLowerCase().trim() === 'available'
      );
    } else {
      baseList = recommendProperties(marketInventory, 20);
    }

    return baseList
      .sort((a, b) => {
        const ratingMap: Record<string, number> = { 'A+': 1, 'A': 2, 'B': 3, 'C': 4 };
        const ratingA = (a as any).deal_rating || calculateDealScore(a).rating;
        const ratingB = (b as any).deal_rating || calculateDealScore(b).rating;
        
        const rankA = ratingMap[ratingA] || 5;
        const rankB = ratingMap[ratingB] || 5;
        
        if (rankA !== rankB) return rankA - rankB;

        const scoreA = (a as any).deal_score || calculateDealScore(a).score;
        const scoreB = (b as any).deal_score || calculateDealScore(b).score;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.parcel_id || '').localeCompare(a.parcel_id || '');
      })
      .slice(0, 10);
  }, [dbTopDeals, marketInventory]);

  const fetchDashboardData = useCallback(async () => {
    if (isFetchingBus.current) return;
    isFetchingBus.current = true;
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().split('T')[0];
      const future = new Date(now.getTime() + 365 * 86_400_000).toISOString().split('T')[0];

      const [deedRes, sheriffRes, foreRes, lienRes, generalRes] = await Promise.all([
        AuctionService.getAuctionEvents({ name: 'deed', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'sheriff', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'foreclosure', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'lien', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ startDate: sevenDaysAgo, endDate: future, limit: 100, skip: 0 })
      ]);

      const mergedDeedItems = Array.from(
        new Map([...deedRes.items, ...sheriffRes.items].map(item => [item.id, item])).values()
      );

      setStats({
        deed: (deedRes.total || 0) + (sheriffRes.total || 0),
        foreclosure: foreRes.total || 0,
        lien: lienRes.total || 0
      });

      setTypeAuctions({
        deed: mergedDeedItems,
        foreclosure: foreRes.items,
        lien: lienRes.items
      });

      setAllAuctions(generalRes.items);

      const topScored = await getTopScoredProperties(10);
      setDbTopDeals(topScored as any[]);

      const statsRes = await getStateStats();
      setStateStats(statsRes);

      if (topScored.length === 0) {
        const propRes = await PropertyService.getProperties({ limit: 50, availability_status: 'available' });
        const allProps = (propRes as any).items || propRes;
        if (Array.isArray(allProps)) {
          setRawProperties(allProps);
        }
      }

    } catch (err) {
      console.error('ClientDashboard: failed to fetch dynamic data', err);
    } finally {
      setLoading(false);
      isFetchingBus.current = false;
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await ClientDataService.getPreferences(activeCompany?.id);
        if (!prefs || prefs.states.length === 0) {
          setMyListsPreferences(null);
          setIsPersonalized(false);
          return;
        }
        setMyListsPreferences({ states: prefs.states, counties: prefs.counties, total: prefs.total_properties });

        if (!selectedState && prefs.states.length > 0) {
          setSelectedState(prefs.states[0]);
          setIsPersonalized(true);
        }
      } catch {
        // Fail silently
      }
    };
    loadPreferences();
  }, [activeCompany?.id]);

  useEffect(() => {
    const loadFilteredDeals = async () => {
      setDealsLoading(true);
      try {
        const topped = await getTopScoredProperties(10, selectedState ? { state: selectedState } : {});
        setFilteredDeals(topped as any[]);
      } catch {
        setFilteredDeals(dbTopDeals);
      } finally {
        setDealsLoading(false);
      }
    };
    loadFilteredDeals();
  }, [selectedState, dbTopDeals]);

  // Area & Bar Charts Data Source
  const analyticsData = useMemo(() => [
    { month: 'Jan', value: 240 },
    { month: 'Feb', value: 320 },
    { month: 'Mar', value: 280 },
    { month: 'Apr', value: 450 },
    { month: 'May', value: 499 },
  ], []);

  const barData = useMemo(() => [
    { name: 'Deeds', count: stats.deed, fill: '#0D8BFF' },
    { name: 'Foreclosures', count: stats.foreclosure, fill: '#13B8B5' },
    { name: 'Liens', count: stats.lien, fill: '#8b5cf6' },
  ], [stats]);

  const trendsData = useMemo(() => [
    { quarter: 'Q1:21', opportunities: 420 },
    { quarter: 'Q2:22', opportunities: 480 },
    { quarter: 'Q3:23', opportunities: 510 },
    { quarter: 'Q4:24', opportunities: 590 },
    { quarter: 'Q1:34', opportunities: 650 },
    { quarter: 'Q2:34', opportunities: 720 },
    { quarter: 'Q3:34', opportunities: 780 },
    { quarter: 'Q4:34', opportunities: 840 },
  ], []);

  // Featured Property spotlight selection
  const featuredProperty = useMemo(() => {
    const list = filteredDeals.length > 0 ? filteredDeals : suggestedDeals;
    return list[0] || null;
  }, [filteredDeals, suggestedDeals]);

  return (
    <div className="p-4 sm:p-6 w-full space-y-6 px-4 sm:px-8 lg:px-12 relative min-h-screen bg-slate-50 dark:bg-[#0B0F17] bg-mesh-premium transition-colors duration-300">
      
      {/* Welcome Modal overlay */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-blue-600 dark:text-blue-400">celebration</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to GoAuct!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your investor account is ready. You're currently on the Trial plan. You can explore upcoming auctions, search for properties, and build your lists. Let's get started!
            </p>
            <button 
              onClick={() => {
                setShowWelcomeModal(false);
                setSearchParams({});
              }} 
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              Start Exploring
            </button>
          </div>
        </div>
      )}

      {/* Redesigned Premium Header Banner */}
      <div id="tour-welcome-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/40">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-[#13B8B5] animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#13B8B5] font-mono">Operations Active // US Core Registry</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Multi-County Acquisition Infrastructure
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Centralize distressed property intelligence across the United States.
          </p>
        </div>

        {/* Powered By GoAuct widget */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operator Console</p>
            <p className="text-xs font-mono text-[#0D8BFF] font-bold mt-0.5">Welcome back, {userName}</p>
          </div>

          <div className="p-3 bg-white dark:bg-[#131926]/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex items-center gap-3 shadow-lg hover:border-[#0D8BFF]/40 transition-colors relative group">
            <div className="absolute inset-0 bg-[#0D8BFF]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-left relative z-10">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">System Engine</span>
              <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">POWERED BY</span>
            </div>
            <div className="size-9 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center relative z-10 shrink-0">
              {/* Glowing SVG GoAuct Icon */}
              <svg className="w-5 h-5 text-[#0D8BFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 2v20" stroke="rgba(19,184,181,0.3)" strokeDasharray="2 2" />
                <path d="M17 14l-5-5-5 5" stroke="#13B8B5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* System Announcements Rotator */}
      <div id="tour-announcements">
        {announcements.length > 0 ? (() => {
          const ann = announcements[annIndex];
          const typeMap: Record<string, {bg: string; icon: string; color: string}> = {
            info:    { bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',       icon: 'info',         color: 'text-blue-600 dark:text-blue-400' },
            warning: { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',   icon: 'warning',      color: 'text-amber-600 dark:text-amber-400' },
            success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon: 'check_circle', color: 'text-emerald-600 dark:text-emerald-400' },
            update:  { bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', icon: 'new_releases', color: 'text-purple-600 dark:text-purple-400' },
          };
          const cfg = typeMap[ann.type] || typeMap.info;
          return (
            <div className={`flex items-start gap-3 px-4 py-3 border rounded-xl transition-all duration-500 ${cfg.bg}`}>
              <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${cfg.color}`}>{ann.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{ann.message}</p>
              </div>
              {announcements.length > 1 && (
                <div className="shrink-0 flex items-center gap-1.5 mt-1">
                  {announcements.map((_, i) => (
                    <button key={i} onClick={() => setAnnIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === annIndex ? 'w-4 bg-current' : 'w-1.5 bg-slate-300 dark:bg-slate-650'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })() : (
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
            <span className="material-symbols-outlined text-blue-500 mt-0.5">campaign</span>
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">System Announcements</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">No active announcements at this time.</p>
            </div>
          </div>
        )}
      </div>

      {/* Personalization Banner */}
      {isPersonalized && myListsPreferences && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <span className="material-symbols-outlined text-blue-500 text-[20px]">auto_awesome</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Personalized for your portfolio
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Showing market data for <strong>{myListsPreferences.states.join(', ')}</strong> based on your {myListsPreferences.total} saved properties.
            </p>
          </div>
          <button
            onClick={() => { setSelectedState(''); setIsPersonalized(false); }}
            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-lg"
          >
            Reset to Global
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions />

      {/* ─── 3-Column Desktop Grid Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Portfolio Status & Foreclosure Analytics (col-span-3) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* 1. Portfolio Status Panel */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0D8BFF] text-[18px]">folder_special</span>
                  Portfolio Status
                </h3>
                <span className="text-[8px] font-black text-[#13B8B5] font-mono tracking-widest bg-[#13B8B5]/10 px-1.5 py-0.5 rounded">Active</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Operational asset tracking & values</p>
            </div>

            {/* Asset Telemetry Stats */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-[#0f1626]/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                <div>
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">A-Grade Assets</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">27</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Value (M)</span>
                  <span className="text-sm font-extrabold text-[#13B8B5]">$29.2M</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-[#0f1626]/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                <div>
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">B-Grade Assets</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">166</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Value (M)</span>
                  <span className="text-sm font-extrabold text-[#0D8BFF]">$455.5M</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-[#0f1626]/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                <div>
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Assets</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">243</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Vol</span>
                  <span className="text-sm font-extrabold text-purple-400">1,542</span>
                </div>
              </div>
            </div>

            {/* Vertical Bar Chart (State-wise volume) */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 font-mono">State-wise Inventory Volume</span>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '8px',
                        fontSize: '10px',
                        color: '#fff'
                      }} 
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 2. Foreclosure Analytics Widget */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">trending_up</span>
                Foreclosure Analytics
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Lien volume & filing performance trackers</p>
            </div>

            {/* Indicator Range Bars */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1">
                  <span>FILINGS</span>
                  <span className="text-[#0D8BFF]">59 Active</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-[#0D8BFF] rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1">
                  <span>DEFAULT RATE</span>
                  <span className="text-[#13B8B5]">3.09%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-[#13B8B5] rounded-full" style={{ width: '45%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1">
                  <span>MARKET VOLUME</span>
                  <span className="text-purple-400">3.60M</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: '80%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1">
                  <span>MARKET TRENDS</span>
                  <span className="text-emerald-400">+3.56%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
            </div>

            {/* Sub-counters grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 text-center font-mono">
              <div>
                <span className="text-[14px] font-black text-slate-900 dark:text-white">233</span>
                <span className="text-[7px] text-slate-500 uppercase font-bold block mt-0.5">FILINGS</span>
              </div>
              <div className="border-x border-slate-200/50 dark:border-slate-800/80 px-1">
                <span className="text-[14px] font-black text-slate-900 dark:text-white">114</span>
                <span className="text-[7px] text-slate-500 uppercase font-bold block mt-0.5">TOTALS</span>
              </div>
              <div>
                <span className="text-[14px] font-black text-slate-900 dark:text-white">20</span>
                <span className="text-[7px] text-slate-500 uppercase font-bold block mt-0.5">MARKETS</span>
              </div>
            </div>
          </div>

          {/* 3. High-Potential Regions */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0D8BFF] text-[18px]">public</span>
                High-Potential Regions
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Average yield performance indicators</p>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {stateStats.slice(0, 5).map((s) => {
                const score = Math.round(s.average_score);
                const ratingColor = score > 80 
                  ? 'text-[#13B8B5]' 
                  : score > 60 
                    ? 'text-[#0D8BFF]' 
                    : 'text-amber-500';
                
                return (
                  <div key={s.state_code} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-[#0f1626]/30 border border-slate-100/50 dark:border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {s.state_code.toUpperCase()}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                        {s.volume} Assets
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-extrabold ${ratingColor}`}>
                        {score}% Match
                      </span>
                    </div>
                  </div>
                );
              })}
              {stateStats.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-450">
                  No state intelligence available yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive US Operations Map & Pipelines (col-span-5) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* 1. US Operations Map Widget */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4 relative overflow-hidden" style={{ minHeight: '440px' }}>
            <div className="flex items-center justify-between z-10">
              <div>
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">satellite_alt</span>
                  US Operations Map
                </h3>
                <span className="text-[8px] font-bold text-[#13B8B5] font-mono tracking-widest mt-1 block">
                  QUERY ID: <span className="text-slate-300">GA-MC-773</span> // SYSTEM: ACTIVE
                </span>
              </div>

              {/* State drop-down selector built matching mockup design */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="text-[10px] font-bold px-2 py-1 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:ring-1 focus:ring-[#0D8BFF]"
              >
                <option value="">🇺🇸 Global Operations</option>
                {stateStats.map(s => (
                  <option key={s.state_code} value={s.state_code}>
                    {s.state_code.toUpperCase()} ({s.volume})
                  </option>
                ))}
              </select>
            </div>

            {/* US SVG Map overlay layout */}
            <div className="flex-1 min-h-[220px] bg-[#070b12] rounded-2xl border border-slate-900 flex flex-col items-center justify-center relative overflow-hidden group">
              
              {/* Monospace overlay HUD grid */}
              <div className="absolute top-2 left-3 font-mono text-[7px] text-[#0D8BFF] opacity-60 tracking-wider flex items-center gap-1.5">
                <span className="size-1 bg-[#0D8BFF] rounded-full animate-ping" />
                <span>GEO-LOCK: [FL, TX, CA, PA, OH, NY]</span>
              </div>
              <div className="absolute bottom-2 right-3 font-mono text-[7px] text-slate-500 opacity-60">
                LAT: 28.5383° // LON: -81.3792°
              </div>
              <div className="absolute bottom-2 left-3 font-mono text-[7px] text-[#13B8B5] opacity-60">
                LATENCY: 12ms // STABILITY: 99.8%
              </div>

              {/* Breathtaking stylized SVG outline map of USA with county nodes and connecting links */}
              <svg className="w-full h-full p-4" viewBox="0 0 600 320" fill="none">
                {/* Tech Radar Sweeper Circles */}
                <circle cx="300" cy="160" r="140" stroke="rgba(19, 184, 181, 0.03)" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="300" cy="160" r="90" stroke="rgba(13, 139, 255, 0.03)" strokeWidth="1" />
                <circle cx="300" cy="160" r="40" stroke="rgba(19, 184, 181, 0.05)" strokeWidth="1.5" />
                
                {/* Coordinate Crosshairs */}
                <line x1="300" y1="0" x2="300" y2="320" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                <line x1="0" y1="160" x2="600" y2="160" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

                {/* Stylized US Outline path representation */}
                <path 
                  d="M 50 120 L 75 75 L 120 70 L 170 50 L 260 50 L 320 65 L 420 55 L 485 30 L 515 50 L 525 85 L 560 110 L 550 170 L 510 205 L 460 215 L 440 250 L 400 240 L 350 265 L 305 285 L 245 280 L 195 240 L 180 240 L 170 205 L 115 190 L 70 195 L 40 180 Z" 
                  fill="rgba(13, 139, 255, 0.02)" 
                  stroke="rgba(13, 139, 255, 0.15)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 2" 
                />

                {/* Regional highlighted state polygons (CA, TX, FL) */}
                {/* CA Highlight */}
                <path d="M 50 120 L 75 75 L 85 90 L 95 145 L 85 185 Z" fill="rgba(19, 184, 181, 0.06)" stroke="rgba(19, 184, 181, 0.3)" strokeWidth="1" />
                {/* TX Highlight */}
                <path d="M 215 190 L 260 190 L 285 245 L 245 280 L 210 235 Z" fill="rgba(19, 184, 181, 0.08)" stroke="rgba(19, 184, 181, 0.4)" strokeWidth="1" />
                {/* FL Highlight */}
                <path d="M 460 215 L 480 215 L 510 265 L 490 260 Z" fill="rgba(19, 184, 181, 0.1)" stroke="rgba(19, 184, 181, 0.5)" strokeWidth="1" />

                {/* Dashed Connecting Line System simulating operational coordinate flows */}
                <path d="M 75 130 L 240 220 L 485 240 L 460 115 L 400 95 L 370 115" stroke="rgba(19, 184, 181, 0.2)" strokeWidth="1.2" strokeDasharray="3 3" />
                <path d="M 240 220 L 400 95 L 485 240" stroke="rgba(13, 139, 255, 0.15)" strokeWidth="1" strokeDasharray="1 3" />

                {/* Glowing County/State Radar Nodes */}
                {/* 1. CA Node */}
                <circle cx="75" cy="130" r="14" fill="rgba(19,184,181,0.06)" className="animate-pulse" />
                <circle cx="75" cy="130" r="8" fill="rgba(19,184,181,0.12)" />
                <circle cx="75" cy="130" r="3.5" fill="#13B8B5" />
                <text x="65" y="112" fill="#13B8B5" fontSize="7" fontFamily="monospace" fontWeight="bold">CA [LOCK]</text>

                {/* 2. TX Node */}
                <circle cx="240" cy="220" r="16" fill="rgba(19,184,181,0.06)" />
                <circle cx="240" cy="220" r="9" fill="rgba(19,184,181,0.15)" />
                <circle cx="240" cy="220" r="4" fill="#13B8B5" />
                <text x="225" y="202" fill="#13B8B5" fontSize="7" fontFamily="monospace" fontWeight="bold">TX [ACTIVE]</text>

                {/* 3. FL Node */}
                <circle cx="485" cy="240" r="20" fill="rgba(13,139,255,0.08)" className="animate-pulse" />
                <circle cx="485" cy="240" r="12" fill="rgba(19,184,181,0.2)" />
                <circle cx="485" cy="240" r="5" fill="#13B8B5" />
                <text x="470" y="222" fill="#13B8B5" fontSize="7" fontFamily="monospace" fontWeight="bold">FL [98% MATCH]</text>

                {/* 4. NY Node */}
                <circle cx="460" cy="115" r="12" fill="rgba(13,139,255,0.05)" />
                <circle cx="460" cy="115" r="3" fill="#0D8BFF" />
                <text x="450" y="100" fill="#0D8BFF" fontSize="7" fontFamily="monospace" fontWeight="bold">NY [SYNC]</text>

                {/* 5. PA Node */}
                <circle cx="400" cy="95" r="10" fill="rgba(13,139,255,0.05)" />
                <circle cx="400" cy="95" r="3" fill="#0D8BFF" />
                <text x="390" y="80" fill="#0D8BFF" fontSize="7" fontFamily="monospace" fontWeight="bold">PA</text>

                {/* 6. OH Node */}
                <circle cx="370" cy="115" r="10" fill="rgba(13,139,255,0.05)" />
                <circle cx="370" cy="115" r="3" fill="#0D8BFF" />
                <text x="360" y="132" fill="#0D8BFF" fontSize="7" fontFamily="monospace" fontWeight="bold">OH</text>
              </svg>

              {/* Active selected state radar crosshair overlay */}
              {selectedState && (
                <div className="absolute inset-0 bg-[#13B8B5]/5 border-2 border-[#13B8B5]/30 backdrop-blur-[0.5px] p-4 flex flex-col justify-end pointer-events-none animate-in fade-in duration-300">
                  <div className="p-3 bg-slate-950/95 border border-[#13B8B5]/40 rounded-xl max-w-[240px] pointer-events-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{selectedState.toUpperCase()} Core Intel</span>
                      <span className="text-[7px] font-mono text-[#13B8B5] bg-[#13B8B5]/10 px-1 rounded">LOCKED</span>
                    </div>
                    {(() => {
                      const stat = stateStats.find(s => s.state_code === selectedState);
                      if (!stat) return <p className="text-[9px] text-slate-500">Querying registry...</p>;
                      return (
                        <div className="space-y-1 text-[9px] font-mono text-slate-400">
                          <p>OPPORTUNITY MATCH: <span className="text-[#13B8B5] font-bold">{Math.round(stat.average_score)}%</span></p>
                          <p>TOTAL INVENTORY: <span className="text-white font-bold">{stat.volume} Properties</span></p>
                          <p>STATUS CODE: <span className="text-[#0D8BFF]">200 OK</span></p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Tax Deed Intelligence / County Intel table */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 font-mono flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#13B8B5] text-[14px]">grid_on</span>
                Tax Deed Intelligence Registry
              </span>
              
              <div className="overflow-x-auto rounded-lg border border-slate-200/40 dark:border-slate-800/60 bg-slate-50/30 dark:bg-[#070b12]/50 font-mono text-[8px] text-slate-350">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900/60 text-slate-450 uppercase font-black tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
                      <th className="p-2">Lien Data</th>
                      <th className="p-2 text-right">Tax History</th>
                      <th className="p-2 text-right">Auction Date</th>
                      <th className="p-2 text-right">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
                    <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-2 text-slate-200">#FL-ORL-2026</td>
                      <td className="p-2 text-right text-[#13B8B5] font-extrabold">$163,337</td>
                      <td className="p-2 text-right">May 24, 2026</td>
                      <td className="p-2 text-right text-emerald-450">98% Match</td>
                    </tr>
                    <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-2 text-slate-200">#TX-HAR-2026</td>
                      <td className="p-2 text-right text-[#13B8B5] font-extrabold">$8,355</td>
                      <td className="p-2 text-right">Jun 02, 2026</td>
                      <td className="p-2 text-right text-emerald-450">95% Match</td>
                    </tr>
                    <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-2 text-slate-200">#CA-LA-2026</td>
                      <td className="p-2 text-right text-[#13B8B5] font-extrabold">$38,565</td>
                      <td className="p-2 text-right">Jun 14, 2026</td>
                      <td className="p-2 text-right text-blue-450">84% Match</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2. Horizontal Acquisition Pipeline flowchart */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">account_tree</span>
                Real Estate Acquisition Pipelines
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Multi-county operational workflow pipeline connections</p>
            </div>

            {/* Pipeline flowchart */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-[#070b12] rounded-xl border border-slate-800/60 relative overflow-hidden">
              
              {/* Connecting pipeline line */}
              <div className="absolute top-1/2 left-8 right-8 h-[1.5px] bg-gradient-to-r from-[#0D8BFF]/40 via-[#13B8B5]/40 to-emerald-500/40 -translate-y-1/2 hidden md:block" />

              {/* Node 1 */}
              <div className="flex flex-col items-center gap-1.5 relative z-10 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg group hover:border-[#0D8BFF]/50 transition-colors">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#0D8BFF] text-base transition-colors">database</span>
                </div>
                <div className="text-center font-mono">
                  <p className="text-[8px] font-black text-slate-200 uppercase tracking-wider">Data Intake</p>
                  <span className="text-[6px] text-slate-500 uppercase font-bold">100% Sync</span>
                </div>
              </div>

              <span className="material-symbols-outlined text-slate-700 text-sm rotate-90 md:rotate-0">arrow_forward</span>

              {/* Node 2 */}
              <div className="flex flex-col items-center gap-1.5 relative z-10 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg group hover:border-[#13B8B5]/50 transition-colors">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#13B8B5] text-base transition-colors">document_scanner</span>
                </div>
                <div className="text-center font-mono">
                  <p className="text-[8px] font-black text-slate-200 uppercase tracking-wider">Due Diligence</p>
                  <span className="text-[6px] text-[#13B8B5] uppercase font-bold animate-pulse">Running</span>
                </div>
              </div>

              <span className="material-symbols-outlined text-slate-700 text-sm rotate-90 md:rotate-0">arrow_forward</span>

              {/* Node 3 */}
              <div className="flex flex-col items-center gap-1.5 relative z-10 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg group hover:border-[#0D8BFF]/50 transition-colors">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#0D8BFF] text-base transition-colors">memory</span>
                </div>
                <div className="text-center font-mono">
                  <p className="text-[8px] font-black text-slate-200 uppercase tracking-wider">Bid Strategy</p>
                  <span className="text-[6px] text-slate-500 uppercase font-bold">Ready</span>
                </div>
              </div>

              <span className="material-symbols-outlined text-slate-700 text-sm rotate-90 md:rotate-0">arrow_forward</span>

              {/* Node 4 */}
              <div className="flex flex-col items-center gap-1.5 relative z-10 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-[#10B981]/50 flex items-center justify-center shadow-lg relative group">
                  <div className="absolute inset-0 bg-[#10B981]/10 blur-xs rounded-xl" />
                  <span className="material-symbols-outlined text-[#10B981] text-base relative z-10">verified</span>
                </div>
                <div className="text-center font-mono">
                  <p className="text-[8px] font-black text-slate-200 uppercase tracking-wider">Acquisition</p>
                  <span className="text-[6px] text-[#10B981] uppercase font-bold">Target Locked</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Field Operation Coordination & Search (col-span-4) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* 1. Field Operation Coordination */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">badge</span>
                Field Operation Coordination
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Geospatial verification & agent locking tracker</p>
            </div>

            {/* Agent Grid Tracker */}
            <div className="space-y-3">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">On-site Agents Telemetry</span>
              
              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-350">
                <div className="p-2.5 bg-slate-50/50 dark:bg-[#070b12]/50 border border-slate-200/40 dark:border-slate-800/60 rounded-xl flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Agent Alpha</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[8px]">LOC: Orlando, FL</p>
                    <p className="text-[#13B8B5] text-[8px] font-bold mt-0.5">GEO-LOCK: SUCCESS</p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50/50 dark:bg-[#070b12]/50 border border-slate-200/40 dark:border-slate-800/60 rounded-xl flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Agent Beta</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[8px]">LOC: Houston, TX</p>
                    <p className="text-[#13B8B5] text-[8px] font-bold mt-0.5">GEO-LOCK: SUCCESS</p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50/50 dark:bg-[#070b12]/50 border border-slate-200/40 dark:border-slate-800/60 rounded-xl flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Agent Gamma</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0D8BFF] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[8px]">LOC: Los Angeles, CA</p>
                    <p className="text-[#0D8BFF] text-[8px] font-bold mt-0.5">IN TRANSIT</p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50/50 dark:bg-[#070b12]/50 border border-slate-200/40 dark:border-slate-800/60 rounded-xl flex flex-col justify-between h-20">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#94a3b8]">Agent Delta</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-750" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[8px]">LOC: Philadelphia, PA</p>
                    <p className="text-slate-500 text-[8px] font-bold mt-0.5">STANDBY</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Inspections queue */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 font-mono flex items-center justify-between">
                <span>Pending Field Inspections</span>
                <span className="text-[#13B8B5]">3 Queue</span>
              </span>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#070b12]/50 border border-slate-900 font-mono text-[8px]">
                  <div>
                    <p className="font-bold text-slate-200">#FL-440263-AP</p>
                    <p className="text-slate-500 text-[7px] mt-0.5">Orange County, FL // Drive-by SOP</p>
                  </div>
                  <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Pending</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#070b12]/50 border border-slate-900 font-mono text-[8px]">
                  <div>
                    <p className="font-bold text-slate-200">#TX-118490-DE</p>
                    <p className="text-slate-500 text-[7px] mt-0.5">Harris County, TX // Photos required</p>
                  </div>
                  <span className="text-[#0D8BFF] font-bold bg-[#0D8BFF]/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Scheduled</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#070b12]/50 border border-slate-900 font-mono text-[8px]">
                  <div>
                    <p className="font-bold text-slate-200">#CA-889312-LA</p>
                    <p className="text-slate-500 text-[7px] mt-0.5">Los Angeles, CA // Occupancy check</p>
                  </div>
                  <span className="text-[#0D8BFF] font-bold bg-[#0D8BFF]/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Scheduled</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sleek and Modern Auction Search */}
          <AuctionSearch />

          {/* 3. Featured Property spotlight select / details */}
          {featuredProperty ? (() => {
            const score = calculateDealScore(featuredProperty);
            const displayRating = (featuredProperty as any).deal_rating || score.rating;
            const displayScore = (featuredProperty as any).deal_score ?? score.score;
            const ratingColor = displayRating.startsWith('A') 
              ? 'bg-emerald-500 shadow-emerald-500/20' 
              : displayRating.startsWith('B') 
                ? 'bg-blue-500 shadow-blue-500/20' 
                : 'bg-amber-500 shadow-amber-500/20';

            return (
              <div 
                onClick={() => navigate(`/client/properties/${featuredProperty.parcel_id || (featuredProperty as any).id}`)}
                className="glass-card-premium p-5 rounded-2xl space-y-4 hover:border-[#0D8BFF]/40 cursor-pointer group hover:shadow-2xl/40 transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] font-black text-[#13B8B5] bg-[#13B8B5]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Featured Opportunity
                    </span>
                    <h3 className="text-sm font-bold text-slate-805 dark:text-white group-hover:text-[#0D8BFF] transition-colors mt-2 leading-tight truncate pr-1">
                      {featuredProperty.address || featuredProperty.parcel_id}
                    </h3>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-0.5">
                      {featuredProperty.county || 'Unknown County'}, {(featuredProperty as any).state || (featuredProperty as any).state_code}
                    </p>
                  </div>
                  
                  <div className={`size-12 shrink-0 rounded-xl flex flex-col items-center justify-center text-white font-black text-xs shadow-lg ${ratingColor} transform group-hover:scale-105 transition-transform duration-300`}>
                    <span className="text-sm">{displayRating}</span>
                    <span className="text-[8px] opacity-80">{Math.round(displayScore)}%</span>
                  </div>
                </div>

                {/* Tabular Stripe-style Metrics Block */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/80 text-xs font-medium">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">Market Value</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                      {featuredProperty.assessed_value ? `$${Number(featuredProperty.assessed_value).toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">Bid Price</span>
                    <span className="text-[#13B8B5] font-extrabold">
                      {featuredProperty.amount_due ? `$${Number(featuredProperty.amount_due).toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">Acres</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                      {featuredProperty.lot_acres ? Number(featuredProperty.lot_acres).toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[8px]">Parcel ID</span>
                    <span className="text-slate-850 dark:text-slate-350 font-bold font-mono text-[9px] truncate max-w-[80px]">
                      {featuredProperty.parcel_id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="glass-card-premium p-6 rounded-2xl text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-500">inventory_2</span>
              <p className="text-sm font-bold">No featured properties found</p>
            </div>
          )}
        </div>
      </div>
      {/* ─── Secondary Carousel Slider below the grid ─── */}
      <div id="tour-suggested-deals" className="w-full">
        <SuggestedDeals
          properties={filteredDeals.length > 0 ? filteredDeals : suggestedDeals}
          loading={loading || dealsLoading}
          stateFilter={selectedState}
          onStateChange={(s) => setSelectedState(s)}
        />
      </div>

      {/* Top Auctions Sections */}
      <div className="space-y-8 pt-4">
        <TopAuctions type="deed" allAuctions={typeAuctions.deed} loading={loading} />
        <TopAuctions type="foreclosure" allAuctions={typeAuctions.foreclosure} loading={loading} />
        <TopAuctions type="lien" allAuctions={typeAuctions.lien} loading={loading} />
      </div>
    </div>
  );
};

export default ClientDashboard;
