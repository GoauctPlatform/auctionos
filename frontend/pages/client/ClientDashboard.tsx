import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuctionService } from '../../services/auction.service';
import { PropertyService, ClientDataService } from '../../services/property.service';
import { AuctionEvent, Property } from '../../types';
import { AuthService } from '../../services/auth.service';
import { useCompany } from '../../context/CompanyContext';
import { recommendProperties, rankAuctions } from '../../intelligence/rankingEngine';
import { calculateDealScore } from '../../intelligence/scoringEngine';
import { getTopScoredProperties, getStateStats, StateStat } from '../../services/scores.service';
import { InvestmentHeatmap } from '../../components/property/InvestmentHeatmap';
import { API_URL } from '../../services/httpClient';

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
  // Use the intelligence layer ranking engine to sort auctions natively
  const ranked = rankAuctions(items);
  // Re-map back to the exact array order dictated by the ranking result string-match,
  // or simply return a slice since rankAuctions structure sorts correctly by Normalized Score.
  // We'll just sort the source items by reading the score from the engine.
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
      icon: 'campaign',
      label: 'Live Auctions',
      desc: 'Browse upcoming auctions',
      path: '/client/auctions',
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
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
        Quick Access
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="group flex flex-col items-start gap-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left"
          >
            <div className={`size-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center shadow-sm`}>
              <span className="material-symbols-outlined text-white text-[20px]">{a.icon}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">
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
      className="flex-shrink-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
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

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-hidden flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
            <span className="material-symbols-outlined text-emerald-500">auto_awesome</span>
            Top Recommended Deals
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Intelligence-filtered opportunities</p>
        </div>
        <button 
          onClick={() => navigate(stateFilter ? `/client/properties?top=true&state=${stateFilter}` : '/client/properties?top=true')}
          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-widest"
        >
          Explore All
        </button>
      </div>

      {/* State Filter */}
      <div className="mb-4">
        <select
          value={stateFilter}
          onChange={(e) => onStateChange(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">🇺🇸 All States</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="h-48 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">inventory_2</span>
            <p className="text-sm font-bold">{stateFilter ? `No top deals for ${stateFilter}` : 'Adjusting Algorithm...'}</p>
            <p className="text-xs mt-1">Run the batch score script to populate recommendations, or try a different state.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {properties.slice(0, 9).map((p) => {
              const score = calculateDealScore(p);
              const displayRating = (p as any).deal_rating || score.rating;
              const displayScore = (p as any).deal_score ?? score.score;
              
              const ratingColor = displayRating.startsWith('A') 
                ? 'bg-emerald-500' 
                : displayRating.startsWith('B') 
                  ? 'bg-blue-500' 
                  : displayRating.startsWith('C') 
                    ? 'bg-amber-500' 
                    : 'bg-slate-400';

              return (
                <div 
                  key={p.parcel_id || (p as any).id}
                  onClick={() => navigate(`/client/properties/${p.parcel_id || (p as any).id}`)}
                  className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-emerald-500/30 rounded-xl transition-all cursor-pointer group hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className={`size-12 rounded-lg flex flex-col items-center justify-center text-white font-black text-xs shadow-sm ${ratingColor}`}>
                      <span className="text-sm">{displayRating}</span>
                      <span className="text-[9px] opacity-80">{Math.round(displayScore)}%</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Deal Match</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{Math.round(displayScore)}%</div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-emerald-600">
                      {p.address || p.parcel_id}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate uppercase tracking-widest font-bold">
                      {p.county || 'Unknown County'}, {(p as any).state || (p as any).state_code}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                       {(p as any).amount_due && (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                          ${Number((p as any).amount_due).toLocaleString()} due
                        </p>
                      )}
                      {(p as any).lot_acres && (
                        <p className="text-[10px] text-slate-400 font-bold whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {Number((p as any).lot_acres).toFixed(2)} acres
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {properties.length > 0 && (
        <button 
          onClick={() => navigate(stateFilter ? `/client/properties?top=true&state=${stateFilter}` : '/client/properties?top=true')}
          className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors uppercase tracking-widest"
        >
          Discover More Opportunities
        </button>
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
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Auction Search (Backend-powered) ────────────────────────────────────────

const AuctionSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [results, setResults] = useState<AuctionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live search — calls backend on each keystroke with 400ms delay
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
        // The backend matches generic terms on the name column reliably for broad queries
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
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
        Search Auctions
      </h2>
      <div className="flex gap-2 flex-wrap">
        {/* Text search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); setResults([]); setSearched(false); } }}
            placeholder="Search by name, state, county…"
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
          {(query || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {loading
                ? <span className="material-symbols-outlined text-[18px] text-slate-400 animate-spin">progress_activity</span>
                : <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-[18px]">close</span></button>
              }
            </div>
          )}
        </div>

        {/* Auction Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
        >
          <option value="">All Types</option>
          <option value="deed">Tax Deed</option>
          <option value="lien">Tax Lien</option>
          <option value="foreclosure">Foreclosure</option>
        </select>
      </div>

      {/* Results */}
      {searched && (
        <div className="mt-3">
          {results.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-[18px]">search_off</span>
              No auctions found{query ? ` for "${query}"` : ''}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {results.length} result{results.length !== 1 ? 's' : ''}{query ? ` for "${query}"` : ''}
                </span>
                <button
                  onClick={() => navigate(`/client/auctions${query ? `?q=${encodeURIComponent(query)}` : ''}`)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  View all auctions →
                </button>
              </div>
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
                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">{a.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {[a.county, a.state].filter(Boolean).join(', ')}
                        {a.auction_date && ` · ${formatDate(String(a.auction_date))}`}
                      </p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>{label}</span>
                    {a.parcels_count ? (
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">home</span>{a.parcels_count}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};


// ─── System Announcements ───────────────────────────────────────────────────

const SystemAnnouncements: React.FC = () => (
  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
    <span className="material-symbols-outlined text-blue-500 mt-0.5">campaign</span>
    <div>
      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">System Announcements</p>
      <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">No active announcements at this time.</p>
    </div>
  </div>
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcomeModal, setShowWelcomeModal] = useState(searchParams.get('welcome') === 'true');
  const user = AuthService.getCurrentUser();
  const { activeCompany } = useCompany();
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
    // Priority 1: Persistent backend scores (if available)
    if (dbTopDeals.length > 0) {
      baseList = dbTopDeals.filter(p => 
        (p.availability_status || '').toLowerCase().trim() === 'available'
      );
    } else {
      // Priority 2: Real-time local scoring fallback
      baseList = recommendProperties(marketInventory, 20); // Get more then slice deterministically
    }

    return baseList
      .sort((a, b) => {
        const ratingMap: Record<string, number> = { 'A+': 1, 'A': 2, 'B': 3, 'C': 4 };
        const ratingA = (a as any).deal_rating || calculateDealScore(a).rating;
        const ratingB = (b as any).deal_rating || calculateDealScore(b).rating;
        
        const rankA = ratingMap[ratingA] || 5;
        const rankB = ratingMap[ratingB] || 5;
        
        if (rankA !== rankB) return rankA - rankB; // A < B < C (lower rank is better)

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
      const today = now.toISOString().split('T')[0];
      
      // Look back 7 days to capture still-active auctions that started recently
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().split('T')[0];
      const future = new Date(now.getTime() + 365 * 86_400_000).toISOString().split('T')[0];

      // 1. Fetch real counts and dedicated slices for each type
      const [deedRes, sheriffRes, foreRes, lienRes, generalRes] = await Promise.all([
        AuctionService.getAuctionEvents({ name: 'deed', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'sheriff', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'foreclosure', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'lien', startDate: sevenDaysAgo, limit: 100, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ startDate: sevenDaysAgo, endDate: future, limit: 100, skip: 0 })
      ]);

      // Merge and de-duplicate Deed items
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

      // 2. Load Top Scored Properties from DB
      const topScored = await getTopScoredProperties(10, { availability_status: 'available' });
      setDbTopDeals(topScored as any[]);

      // 3. Load Regional Aggregated Stats (Heatmap)
      const stats = await getStateStats();
      setStateStats(stats);

      // 4. Fallback: Only fetch raw properties if recommendations are empty
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
    // Auto-refresh every 5 minutes to keep numbers real-time as requested
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // --- Dynamic Dashboard Event: Extract real states/counties from My Lists ---
  // Uses the /lists/preferences endpoint → gets actual states from saved properties
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

        // Only auto-apply if user hasn't manually selected a state
        if (!selectedState && prefs.states.length > 0) {
          // Pick the first state (most common per property frequency)
          setSelectedState(prefs.states[0]);
          setIsPersonalized(true);
        }
      } catch {
        // Fail silently — user may not be logged in or have no lists yet
      }
    };
    loadPreferences();
  }, [activeCompany?.id]); // Re-run when active company changes

  // --- State-filtered top deals ---
  useEffect(() => {
    const loadFilteredDeals = async () => {
      setDealsLoading(true);
      try {
        const params: any = { limit: 10, skip: 0 };
        if (selectedState) params.state = selectedState;
        const topped = await getTopScoredProperties(10, selectedState ? { state: selectedState, availability_status: 'available' } : { availability_status: 'available' });
        setFilteredDeals(topped as any[]);
      } catch {
        // fallback to global top deals
        setFilteredDeals(dbTopDeals);
      } finally {
        setDealsLoading(false);
      }
    };
    loadFilteredDeals();
  }, [selectedState, dbTopDeals]);

  return (
    <div className="p-4 sm:p-6 w-full space-y-8 px-4 sm:px-8 lg:px-12 relative">
      
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome back, <span className="text-primary">{userName}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Here's your investment intelligence dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* System Announcements Rotator */}
      {announcements.length > 0 && (() => {
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
                    className={`h-1.5 rounded-full transition-all ${i === annIndex ? 'w-4 bg-current' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Personalization Banner — shown when Home is filtered by My Lists */}
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

      {/* Auction Search */}
      <AuctionSearch />

      {/* Stats Summary Row */}
      {!loading && allAuctions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: 'gavel', label: 'Deed Auctions', count: stats.deed, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { icon: 'real_estate_agent', label: 'Foreclosures', count: stats.foreclosure, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            { icon: 'receipt_long', label: 'Tax Liens', count: stats.lien, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          ].map((s) => (
            <div key={s.label} className={`flex flex-col items-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 ${s.bg}`}>
              <span className={`material-symbols-outlined ${s.color} text-[24px] mb-1`}>{s.icon}</span>
              <span className={`text-2xl font-extrabold ${s.color}`}>{s.count}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-center">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Intelligence Layer Stack (Mapa acima de Recomendações) */}
      <div className="flex flex-col gap-8">
        {/* State Intelligence Heatmap */}
        <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '520px' }}>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">public</span>
                    National Yield Heatmap
                </h2>
                {selectedState && (
                    <button onClick={() => setSelectedState('')} className="text-[10px] bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-full hover:bg-slate-300/50 transition font-bold">
                        Clear: {selectedState}
                    </button>
                )}
            </div>
            <div className="flex-1 w-full relative" style={{ minHeight: '440px' }}>
                <InvestmentHeatmap
                    stats={stateStats}
                    selectedState={selectedState}
                    onStateClick={(s) => setSelectedState(s)}
                />
            </div>
        </div>

        {/* Suggested Deals Panel */}
        <div className="w-full">
          <SuggestedDeals
            properties={filteredDeals.length > 0 ? filteredDeals : suggestedDeals}
            loading={loading || dealsLoading}
            stateFilter={selectedState}
            onStateChange={(s) => setSelectedState(s)}
          />
        </div>
      </div>

      {/* Top Auctions Sections */}
      <div className="space-y-12">
        <TopAuctions type="deed" allAuctions={typeAuctions.deed} loading={loading} />
        <TopAuctions type="foreclosure" allAuctions={typeAuctions.foreclosure} loading={loading} />
        <TopAuctions type="lien" allAuctions={typeAuctions.lien} loading={loading} />
      </div>
    </div>
  );
};

export default ClientDashboard;
