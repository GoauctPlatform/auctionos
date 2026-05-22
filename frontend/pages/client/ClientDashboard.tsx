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

      {/* Welcome Header */}
      <div id="tour-welcome-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome back, <span className="text-primary">{userName}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Here's your investment intelligence dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => startTour('investor')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-lg transition-all shadow-sm bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            Page Tour
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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
        
        {/* LEFT COLUMN: Analytics & Live Counts (col-span-3) */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* 1. Tax Deed Analytics (Area Chart) */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0D8BFF] text-[18px]">analytics</span>
                Tax Deed Analytics
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Lien value & bid-to-value performance</p>
            </div>
            
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D8BFF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0D8BFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
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
                  <Area type="monotone" dataKey="value" stroke="#0D8BFF" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/80">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Lien Values</p>
                <p className="text-xs font-extrabold text-slate-800 dark:text-[#0D8BFF]">$499.3M</p>
              </div>
              <div className="text-center border-x border-slate-200/50 dark:border-slate-800/80 px-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Bid-To-Val</p>
                <p className="text-xs font-extrabold text-[#13B8B5]">19.2%</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Deeds</p>
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{stats.deed}</p>
              </div>
            </div>
          </div>

          {/* 2. Foreclosure Opportunity Indicators (Bar Chart) */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">bar_chart</span>
                Foreclosure Indicators
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Distressed opportunities by asset class</p>
            </div>

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

          {/* 3. Property Intelligence Dashboards (High-Potential Counties / States) */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 text-[18px]">verified</span>
                High-Potential Regions
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">States ranked by average opportunity score</p>
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
                  <div key={s.state_code} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800/40">
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

        {/* CENTER COLUMN: Heatmap & Search (col-span-5) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* 1. National Yield Heatmap Card */}
          <div id="tour-yield-heatmap" className="glass-card-premium rounded-2xl overflow-hidden flex flex-col p-5" style={{ minHeight: '440px' }}>
            <InvestmentHeatmap
              stats={stateStats}
              selectedState={selectedState}
              onStateClick={(s) => setSelectedState(s)}
            />
          </div>

          {/* 2. Sleek and Modern Auction Search */}
          <AuctionSearch />

        </div>

        {/* RIGHT COLUMN: Featured Spotlight & Trends (col-span-4) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* 1. Featured High-Potential Property Spotlight Card */}
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
                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
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

                {/* Blueprint Wireframe Area */}
                <div className="relative overflow-hidden rounded-xl">
                  <svg className="w-full h-36 bg-slate-950/90 border border-slate-850 rounded-xl" viewBox="0 0 400 140">
                    <rect width="100%" height="100%" fill="#0a0e17" />
                    <pattern id="grid-spot" width="16" height="16" patternUnits="userSpaceOnUse">
                      <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(13, 139, 255, 0.05)" strokeWidth="1" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid-spot)" />
                    
                    {/* Dynamic radar rings */}
                    <circle cx="200" cy="70" r="50" fill="none" stroke="rgba(19, 184, 181, 0.05)" strokeWidth="1" />
                    <circle cx="200" cy="70" r="30" fill="none" stroke="rgba(19, 184, 181, 0.08)" strokeWidth="1" />
                    
                    {/* House Wireframe */}
                    <path 
                      d="M 140 105 L 140 70 L 200 35 L 260 70 L 260 105 Z M 140 70 L 260 70" 
                      fill="none" 
                      stroke="#0D8BFF" 
                      strokeWidth="2" 
                      strokeDasharray="4 2" 
                      opacity="0.8" 
                      className="animate-pulse" 
                    />
                    <path 
                      d="M 180 105 L 180 82 L 220 82 L 220 105 Z" 
                      fill="none" 
                      stroke="#13B8B5" 
                      strokeWidth="1.5" 
                      opacity="0.9" 
                    />
                    
                    {/* UI Indicators */}
                    <text x="15" y="20" fill="#0D8BFF" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.7">TARGET: DISTRESSED RESIDENTIAL</text>
                    <text x="15" y="125" fill="#13B8B5" fontSize="7" fontFamily="monospace" letterSpacing="1" opacity="0.7">AI OPPORTUNITY GRADIENT MATCH: {Math.round(displayScore)}%</text>
                    
                    <circle cx="200" cy="35" r="3.5" fill="#0D8BFF" />
                    <circle cx="140" cy="70" r="2.5" fill="#13B8B5" />
                    <circle cx="260" cy="70" r="2.5" fill="#13B8B5" />
                  </svg>
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

          {/* 2. Market Trend Charts (Predictive Line) */}
          <div className="glass-card-premium p-5 rounded-2xl flex flex-col space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">show_chart</span>
                Market Trend Chart
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Quarterly opportunity volume (Q1:21 - Q4:34)</p>
            </div>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOpportunities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#13B8B5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#13B8B5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="quarter" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
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
                  <Area type="monotone" dataKey="opportunities" stroke="#13B8B5" strokeWidth={2} fillOpacity={1} fill="url(#colorOpportunities)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

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
