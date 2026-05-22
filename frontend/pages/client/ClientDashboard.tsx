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
  if (s.includes('deed') || s.includes('tax deed')) return { label: 'Tax Deed', color: 'bg-purple-950/40 text-purple-350 border border-purple-800/30' };
  if (s.includes('lien') || s.includes('tax lien')) return { label: 'Tax Lien', color: 'bg-amber-950/40 text-amber-350 border border-amber-800/30' };
  if (s.includes('foreclosure')) return { label: 'Foreclosure', color: 'bg-red-950/40 text-red-350 border border-red-800/30' };
  return { label: taxStatus || 'Auction', color: 'bg-blue-950/40 text-blue-350 border border-blue-800/30' };
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

// ─── Auction Card ────────────────────────────────────────────────────────────
const AuctionCard: React.FC<{ auction: AuctionEvent }> = ({ auction }) => {
  const { label, color } = getTypeLabel(auction.tax_status);
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        const d = auction.auction_date ? String(auction.auction_date).split('T')[0] : '';
        navigate(`/client/auctions?name=${encodeURIComponent(auction.name || '')}&startDate=${d}&endDate=${d}`);
      }}
      className="flex-shrink-0 w-64 bg-[#0F131C] border border-slate-800/60 rounded-xl p-4 hover:border-[#0D8BFF]/45 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${color}`}>
          {label}
        </span>
        {(auction.parcels_count || auction.properties_count) ? (
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[#0D8BFF]">home</span>
            {auction.parcels_count || auction.properties_count}
          </span>
        ) : null}
      </div>

      <p className="text-xs font-bold text-white leading-tight line-clamp-2 mb-2 font-sans tracking-wide">
        {auction.name}
      </p>

      <div className="space-y-1">
        {(auction.state || auction.county) && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span className="material-symbols-outlined text-[13px] text-[#13B8B5]">location_on</span>
            <span className="truncate">
              {[auction.county, auction.state].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <span className="material-symbols-outlined text-[13px] text-[#0D8BFF]">calendar_today</span>
          <span>{formatDate(String(auction.auction_date))}</span>
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
    color: 'text-purple-400',
    bg: 'bg-purple-950/20 border-purple-800/30',
  },
  foreclosure: {
    title: 'Top Foreclosure Auctions',
    icon: 'real_estate_agent',
    emptyMsg: 'No foreclosure auctions available',
    color: 'text-red-400',
    bg: 'bg-red-950/20 border-red-800/30',
  },
  lien: {
    title: 'Top Tax Lien Auctions',
    icon: 'receipt_long',
    emptyMsg: 'No tax lien auctions available',
    color: 'text-amber-400',
    bg: 'bg-amber-950/20 border-amber-800/30',
  },
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
    <section className="bg-[#0F131C] border border-slate-850 p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <div className={`size-7 rounded-lg ${meta.bg} flex items-center justify-center border`}>
          <span className={`material-symbols-outlined text-[15px] ${meta.color}`}>{meta.icon}</span>
        </div>
        <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans">{meta.title}</h2>
        {items.length > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold font-mono text-slate-350">
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-32 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={`flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/40`}>
          <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
          <p className="text-xs text-slate-400 font-mono">No matching auctions indexed for current operational cycle.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </section>
  );
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
  const displayProperties = properties.length > 1 ? properties.slice(1) : properties;

  return (
    <section className="bg-[#0F131C] border border-slate-850 p-6 rounded-2xl overflow-hidden flex flex-col space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wide font-sans">
            <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">auto_awesome</span>
            High-Potential Recommended Deals
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">// Algorithmic distressed real estate matchmaking</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={stateFilter}
            onChange={(e) => onStateChange(e.target.value)}
            className="text-[10px] font-bold font-mono px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-350 focus:outline-none focus:ring-1 focus:ring-[#0D8BFF]"
          >
            <option value="">🇺🇸 All States</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button 
            onClick={() => navigate(stateFilter ? `/client/properties?top=true&state=${stateFilter}` : '/client/properties?top=true')}
            className="text-[9px] font-black text-[#0D8BFF] border border-[#0D8BFF]/30 hover:bg-[#0D8BFF]/5 px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors"
          >
            Explore All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-36 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayProperties.length === 0 ? (
        <div className="h-36 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
          <span className="material-symbols-outlined text-3xl mb-1 text-slate-600">inventory_2</span>
          <p className="text-xs font-bold font-sans">{stateFilter ? `No additional deals for ${stateFilter}` : 'Initializing Scoring Seed...'}</p>
          <p className="text-[9px] text-slate-500 font-mono mt-0.5">Scoring engines running in background sync mode.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800">
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
                className="flex-shrink-0 w-72 p-4 bg-slate-950/40 border border-slate-850 hover:border-[#0D8BFF]/45 hover:shadow-lg rounded-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className={`size-10 rounded-xl flex flex-col items-center justify-center text-white font-black text-xs shadow-md ${ratingColor}`}>
                    <span>{displayRating}</span>
                  </div>
                  
                  <div className="text-right font-mono">
                    <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest block">AI Match</span>
                    <span className="text-xs font-extrabold text-[#13B8B5]">{Math.round(displayScore)}%</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-white truncate group-hover:text-[#0D8BFF] transition-colors leading-snug">
                    {p.address || p.parcel_id}
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black font-mono mt-0.5 truncate">
                    {p.county || 'Unknown County'}, {(p as any).state || (p as any).state_code}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                   {(p as any).amount_due && (
                    <p className="text-[9px] text-[#13B8B5] font-extrabold whitespace-nowrap bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-mono">
                      ${Number((p as any).amount_due).toLocaleString()} Bid
                    </p>
                  )}
                  {(p as any).assessed_value && (
                    <p className="text-[9px] text-[#0D8BFF] font-extrabold whitespace-nowrap bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 font-mono">
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

// ─── Auction Search ──────────────────────────────────────────────────────────
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
    <div className="bg-[#0F131C] border border-slate-850 p-5 rounded-2xl flex flex-col space-y-4">
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 font-sans">
          <span className="material-symbols-outlined text-[#0D8BFF] text-[18px]">search</span>
          Search Auctions
        </h2>
        <p className="text-[10px] text-slate-400 mt-1 font-mono">// Live querying on national distressed registry</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); setResults([]); setSearched(false); } }}
            placeholder="Search name, state, county…"
            className="w-full pl-9 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0D8BFF] transition-all font-mono"
          />
          {(query || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {loading
                ? <span className="material-symbols-outlined text-[15px] text-slate-550 animate-spin">progress_activity</span>
                : <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="text-slate-500 hover:text-slate-350"><span className="material-symbols-outlined text-[15px]">close</span></button>
              }
            </div>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-none focus:ring-1 focus:ring-[#0D8BFF] min-w-[110px] font-mono"
        >
          <option value="">All Types</option>
          <option value="deed">Tax Deed</option>
          <option value="lien">Tax Lien</option>
          <option value="foreclosure">Foreclosure</option>
        </select>
      </div>

      {searched && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          {results.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-xs text-slate-500 font-mono">
              <span className="material-symbols-outlined text-[16px]">search_off</span>
              No records matched: "{query}"
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden divide-y divide-slate-850 font-mono text-[10px]">
              <div className="px-3 py-1.5 bg-slate-900/40 flex items-center justify-between">
                <span className="font-semibold text-slate-500">
                  {results.length} record{results.length !== 1 ? 's' : ''} parsed
                </span>
                <button
                  onClick={() => navigate(`/client/auctions${query ? `?q=${encodeURIComponent(query)}` : ''}`)}
                  className="text-[#0D8BFF] font-semibold hover:underline"
                >
                  Global View →
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-850">
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
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-900/60 cursor-pointer transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-200 truncate group-hover:text-[#0D8BFF] transition-colors">{a.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                          {[a.county, a.state].filter(Boolean).join(', ')}
                          {a.auction_date && ` · ${formatDate(String(a.auction_date))}`}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>{label}</span>
                      {a.parcels_count ? (
                        <span className="text-slate-400 font-semibold flex items-center gap-0.5 shrink-0">
                          <span className="material-symbols-outlined text-[11px] text-[#0D8BFF]">home</span>{a.parcels_count}
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
  const [selectedState, setSelectedState] = useState('FL'); // Default focus is Florida
  const [filteredDeals, setFilteredDeals] = useState<Property[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [myListsPreferences, setMyListsPreferences] = useState<{ states: string[]; counties: string[]; total: number } | null>(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const isFetchingBus = useRef(false);

  // Map Interactive States
  const [hoveredCounty, setHoveredCounty] = useState<{
    name: string;
    opportunities: number;
    trend: string;
    x: number;
    y: number;
  } | null>(null);
  
  const [selectedCounty, setSelectedCounty] = useState<string>('Miami-Dade');
  const [mapSearchQuery, setMapSearchQuery] = useState('');

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
        const ratingMap: Record<string, text> = { 'A+': 1, 'A': 2, 'B': 3, 'C': 4 };
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

  // ─── Mockup Inspired Chart Data ───────────────────────────────────────────

  // Tax Deed Analytics Card Data
  const taxDeedAnalyticsData = useMemo(() => [
    { name: 'Jan 21', lienValue: 2400, bidToValue: 45 },
    { name: 'Feb 22', lienValue: 3300, bidToValue: 68 },
    { name: 'Jan 23', lienValue: 2800, bidToValue: 55 },
    { name: 'Mar 24', lienValue: 4900, bidToValue: 98 },
  ], []);

  // Foreclosure Opportunity Indicators Data
  const foreclosureBarData = useMemo(() => [
    { name: 'Tax Lien', count: 154140, fill: '#0D8BFF' },
    { name: 'Tax Deed', count: 48501, fill: '#13B8B5' },
    { name: 'Foreclosure', count: 8178, fill: '#8b5cf6' },
    { name: 'Certificate', count: 2436, fill: '#ec4899' },
    { name: 'Other', count: 39, fill: '#10b981' }
  ], []);

  // Market Trend quarterly opportunities Area Graph data
  const marketTrendData = useMemo(() => [
    { quarter: '0', opportunities: 200 },
    { quarter: 'Q1:21', opportunities: 380 },
    { quarter: 'Q2:22', opportunities: 580 },
    { quarter: 'Q3:22', opportunities: 510 },
    { quarter: 'Q4:23', opportunities: 740 },
    { quarter: 'Q4:34', opportunities: 1100 },
  ], []);

  // Featured Property spotlight selection
  const featuredProperty = useMemo(() => {
    const list = filteredDeals.length > 0 ? filteredDeals : suggestedDeals;
    return list[0] || null;
  }, [filteredDeals, suggestedDeals]);

  // Florida County Outline SVG Nodes and coordinates mapping
  const floridaCounties = useMemo(() => [
    { 
      name: 'Miami-Dade', 
      opportunities: 554, 
      trend: '+15%', 
      color: '#0D8BFF',
      path: 'M 255,270 L 290,270 L 285,320 L 250,320 Z',
      cx: 270,
      cy: 295
    },
    { 
      name: 'Broward', 
      opportunities: 360, 
      trend: '+12%', 
      color: '#13B8B5',
      path: 'M 220,180 L 255,180 L 255,215 L 220,215 Z',
      cx: 237,
      cy: 197
    },
    { 
      name: 'Volusia', 
      opportunities: 107, 
      trend: '+8%', 
      color: '#10B981',
      path: 'M 220,215 L 255,215 L 250,245 L 215,245 Z',
      cx: 235,
      cy: 230
    },
    { 
      name: 'Hillsborough', 
      opportunities: 322, 
      trend: '+14%', 
      color: '#8b5cf6',
      path: 'M 180,190 L 220,190 L 215,225 L 175,225 Z',
      cx: 198,
      cy: 207
    },
    { 
      name: 'Duval', 
      opportunities: 199, 
      trend: '+6%', 
      color: '#0D8BFF',
      path: 'M 220,120 L 260,120 L 255,160 L 215,160 Z',
      cx: 238,
      cy: 140
    },
    { 
      name: 'Palm Beach', 
      opportunities: 448, 
      trend: '+11%', 
      color: '#13B8B5',
      path: 'M 250,245 L 285,245 L 280,270 L 245,270 Z',
      cx: 265,
      cy: 257
    }
  ], []);

  // Filtered counties by search box
  const filteredMapCounties = useMemo(() => {
    if (!mapSearchQuery.trim()) return floridaCounties;
    return floridaCounties.filter(c => c.name.toLowerCase().includes(mapSearchQuery.toLowerCase()));
  }, [floridaCounties, mapSearchQuery]);

  // Bottom table mocks matching "Florida Tax Deed Opportunities Increased 18%"
  const highPotentialCounties = [
    { name: 'Miami-Dade', value: '554' },
    { name: 'Palm Beach', value: '448' },
    { name: 'Broward', value: '360' },
    { name: 'Hillsborough', value: '322' },
    { name: 'Marion', value: '251' },
    { name: 'Escambia', value: '209' },
    { name: 'Duval', value: '199' },
    { name: 'Polk', value: '193' }
  ];

  const largeDistressedAssets = [
    { name: 'Miami-Dade Valuation', value: '$458,592,452' },
    { name: 'Broward Valuation', value: '$184,595,940' },
    { name: 'Palm Beach Valuation', value: '$170,132,876' },
    { name: 'Hillsborough Valuation', value: '$105,734,584' },
    { name: 'Lee Valuation', value: '$103,871,706' },
    { name: 'Orange Valuation', value: '$59,086,054' },
    { name: 'Duval Valuation', value: '$56,527,049' },
    { name: 'Polk Valuation', value: '$46,461,007' }
  ];

  return (
    <div className="min-h-screen bg-[#080B11] flex flex-col transition-colors duration-300">
      
      {/* ─── 1. TOP BRANDING CAMPAIGN HEADER BANNER (mockup style) ─── */}
      <header id="tour-welcome-header" className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-4">
          
          {/* Glowing premium badge container */}
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="size-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0D8BFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 14l-5-5-5 5" stroke="#13B8B5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-black text-slate-800 tracking-tight font-sans">
              GOAUCT
            </h1>
          </div>

          {/* Vertical line divider */}
          <div className="hidden sm:block h-8 w-[1.5px] bg-slate-300" />

          {/* Title Headline overlay */}
          <div className="text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Florida Tax Deed Opportunities <span className="text-[#0D8BFF] font-black">Increased 18%</span>
            </h2>
          </div>
        </div>

        {/* Console Operator tag */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operator Console</span>
            <span className="text-xs font-bold text-slate-600 mt-0.5">Welcome back, {userName}</span>
          </div>
          <button 
            onClick={() => startTour()}
            className="text-[10px] font-black text-[#0D8BFF] border border-[#0D8BFF]/30 hover:bg-[#0D8BFF]/5 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors"
          >
            Launch System Tour
          </button>
        </div>
      </header>

      {/* ─── MAIN DASHBOARD INTERACTIVE DESKTOP CARD VIEW ─── */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* Left vertical navigation bar (Bloomberg / Palantir tablet device style) */}
        <aside className="w-16 bg-[#0E131F] border border-slate-850 rounded-2xl py-6 flex flex-col items-center justify-between shadow-xl shrink-0 hidden sm:flex">
          <div className="flex flex-col items-center gap-6 w-full">
            
            {/* System brand trigger */}
            <div className="size-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#13B8B5] cursor-pointer hover:border-[#13B8B5]/50 transition-colors">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>

            {/* Sidebar path options */}
            <nav className="flex flex-col items-center gap-4 w-full">
              <button 
                onClick={() => navigate('/client')} 
                title="Dashboard Console"
                className="size-10 rounded-xl flex items-center justify-center text-[#0D8BFF] bg-[#0D8BFF]/10 border border-[#0D8BFF]/20"
              >
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
              </button>

              <button 
                onClick={() => navigate('/client/lists')} 
                title="My Watchlists"
                className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850/40 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
              </button>

              <button 
                onClick={() => navigate('/client/properties')} 
                title="Property Search"
                className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850/40 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">analytics</span>
              </button>

              <button 
                onClick={() => navigate('/client/tasks')} 
                title="Field Missions"
                className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850/40 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">pin_drop</span>
              </button>
            </nav>
          </div>

          {/* Bottom Settings indicator */}
          <div className="flex flex-col items-center gap-4 w-full">
            <button 
              onClick={() => navigate('/client/password')} 
              title="Account Security"
              className="size-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850/40 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-[#0D8BFF] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
              {userName.charAt(0)}
            </div>
          </div>
        </aside>

        {/* 3-Column main interactive body layout */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">

          {/* Announcements & Dynamic Welcome Modal overlays */}
          {showWelcomeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
              <div className="bg-[#0F131C] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-blue-900/40 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl text-[#0D8BFF]">celebration</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Welcome to GoAuct!</h2>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  Your distressed real estate investment operator account is ready. You are currently on the trial plan with Florida county intelligence enabled.
                </p>
                <button 
                  onClick={() => {
                    setShowWelcomeModal(false);
                    setSearchParams({});
                  }} 
                  className="w-full py-3 bg-[#0D8BFF] hover:bg-blue-650 text-white font-extrabold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
                  Enter Operator Room
                </button>
              </div>
            </div>
          )}

          {/* Announcements system ticker */}
          {announcements.length > 0 && (
            <div id="tour-announcements" className="bg-[#0F131C]/60 border border-slate-850 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#13B8B5] text-[18px]">campaign</span>
              <div className="flex-1 min-w-0 font-mono text-[10px] text-slate-350 flex items-center justify-between">
                <p className="truncate">
                  <strong className="text-white uppercase mr-1.5">// SYSTEM RECORD:</strong>
                  {announcements[annIndex].title} — {announcements[annIndex].message}
                </p>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {announcements.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setAnnIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === annIndex ? 'w-3.5 bg-[#13B8B5]' : 'w-1.5 bg-slate-700'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Primary 3-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* ─── LEFT COLUMN (col-span-3) ─── */}
            <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
              
              {/* 1. Tax Deed Analytics Chart Card */}
              <div className="bg-[#0F131C] border border-slate-850 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-sans">
                      Tax Deed Analytics
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono">
                      <span className="flex items-center gap-1 text-[#0D8BFF]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0D8BFF]" />
                        Lien Value Trends
                      </span>
                      <span className="flex items-center gap-1 text-[#13B8B5]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#13B8B5]" />
                        Bid-to-Value ratio
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-550 text-base cursor-pointer hover:text-white">more_horiz</span>
                </div>

                {/* Dual-axis Recharts telemetry */}
                <div className="h-36 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={taxDeedAnalyticsData} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="lienValGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0D8BFF" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#0D8BFF" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="bidToValGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#13B8B5" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#13B8B5" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        stroke="#475569" 
                        fontSize={8} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={6}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={8} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 5000]}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#0F131C', 
                          border: '1px solid #1e293b', 
                          borderRadius: '8px',
                          fontSize: '9px',
                          color: '#fff',
                          fontFamily: 'monospace'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="lienValue" 
                        stroke="#0D8BFF" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#lienValGrad)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="bidToValue" 
                        stroke="#13B8B5" 
                        strokeWidth={1.5} 
                        fillOpacity={1} 
                        fill="url(#bidToValGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Stat badges row */}
                <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-slate-800/80 text-center font-mono">
                  <div>
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Lien Value</span>
                    <span className="text-xs font-black text-white mt-1 block">$499.32M</span>
                  </div>
                  <div className="border-x border-slate-850 px-1">
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Bid-to-Value</span>
                    <span className="text-xs font-black text-[#13B8B5] mt-1 block">19.2%</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Counties</span>
                    <span className="text-xs font-black text-[#0D8BFF] mt-1 block">595</span>
                  </div>
                </div>
              </div>

              {/* 2. Foreclosure Opportunity Indicators Chart Card */}
              <div className="bg-[#0F131C] border border-slate-850 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-sans">
                      Foreclosure Opportunity Indicators
                    </h3>
                    <p className="text-[9px] text-[#13B8B5] font-mono mt-1">// Growth in other asset types</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-550 text-base cursor-pointer hover:text-white">more_horiz</span>
                </div>

                {/* Vertical bar telemetry */}
                <div className="h-36 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={foreclosureBarData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#475569" 
                        fontSize={7} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={6}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={8} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 1600]}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#0F131C', 
                          border: '1px solid #1e293b', 
                          borderRadius: '8px',
                          fontSize: '9px',
                          color: '#fff',
                          fontFamily: 'monospace'
                        }} 
                      />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {foreclosureBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ─── MIDDLE COLUMN (col-span-6) ─── */}
            <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
              
              {/* Overlay header caption text */}
              <div className="space-y-1 p-1">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Florida Tax Deed Opportunities <span className="text-[#0D8BFF]">Increased 18%</span>
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Operational intelligence for scalable distressed property acquisition.
                </p>
              </div>

              {/* Volume of Tax Deed Opportunities Map Container */}
              <div id="tour-yield-heatmap" className="bg-[#0F131C] border border-slate-850 rounded-2xl p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden flex-1 min-h-[460px]">
                
                {/* Control Ribbon (Mockup style) */}
                <div className="flex flex-wrap items-center justify-between gap-3 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white tracking-wide">
                      Volume of Tax deed Opportunities
                    </span>
                  </div>

                  {/* Active filters overlay button menu */}
                  <div className="flex items-center gap-2">
                    
                    {/* Integrated Search ribbon */}
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">search</span>
                      <input 
                        type="text" 
                        value={mapSearchQuery}
                        onChange={(e) => setMapSearchQuery(e.target.value)}
                        placeholder="Search County..." 
                        className="pl-7 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#0D8BFF] placeholder-slate-600 w-28 transition-all"
                      />
                    </div>

                    <button className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-mono text-slate-400 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[10px]">tune</span>
                      Filters
                    </button>

                    <button className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-mono text-slate-400 hover:text-white transition-colors">
                      Actions
                      <span className="material-symbols-outlined text-[10px]">expand_more</span>
                    </button>
                  </div>
                </div>

                {/* Stylized Vector SVG silhouette of the Florida Peninsula Heatmap */}
                <div className="flex-1 bg-[#090D15] rounded-xl border border-slate-900 flex flex-col items-center justify-center relative overflow-hidden group min-h-[300px]">
                  
                  {/* Grid Lines HUD Overlay */}
                  <div className="absolute inset-0 bg-grid-slate-900/50 opacity-40 pointer-events-none" />
                  
                  <div className="absolute top-3 left-4 font-mono text-[7px] text-[#0D8BFF] opacity-60 tracking-wider flex items-center gap-1.5">
                    <span className="size-1.5 bg-[#0D8BFF] rounded-full animate-ping" />
                    <span>GEO-HUD // CORE LOCK: FLORIDA HEATMAP</span>
                  </div>
                  
                  <div className="absolute bottom-3 right-4 font-mono text-[7px] text-slate-500 opacity-60">
                    SCALE LEVEL: METRO PORTFOLIO
                  </div>

                  {/* Florida interactive vector SVG path grid */}
                  <svg className="w-full h-full max-h-[340px] p-6 relative z-10" viewBox="0 0 320 340" fill="none">
                    
                    {/* Tech radar rings */}
                    <circle cx="210" cy="200" r="110" stroke="rgba(13, 139, 255, 0.02)" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="210" cy="200" r="60" stroke="rgba(19, 184, 181, 0.03)" strokeWidth="1" />

                    {/* Base outline silhouette shadow background for Florida */}
                    <path 
                      d="M 30,120 L 150,120 L 150,150 L 175,180 L 215,220 L 245,280 L 275,340 L 290,320 L 285,270 L 255,200 L 230,120 L 220,120 L 150,120 Z" 
                      fill="rgba(13, 139, 255, 0.015)" 
                      stroke="rgba(13, 139, 255, 0.08)" 
                      strokeWidth="2" 
                      strokeDasharray="4 2" 
                    />

                    {/* Interactive County regions grid map */}
                    {filteredMapCounties.map((c) => {
                      const isActive = selectedCounty === c.name;
                      return (
                        <g 
                          key={c.name}
                          onClick={() => {
                            setSelectedCounty(c.name);
                            if (c.name === 'Miami-Dade') setSelectedState('FL');
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const containerRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            setHoveredCounty({
                              name: c.name,
                              opportunities: c.opportunities,
                              trend: c.trend,
                              x: rect.left - (containerRect?.left || 0) + rect.width / 2,
                              y: rect.top - (containerRect?.top || 0) - 10
                            });
                          }}
                          onMouseLeave={() => setHoveredCounty(null)}
                          className="cursor-pointer"
                        >
                          {/* Main county visual polygon path */}
                          <path 
                            d={c.path}
                            fill={isActive ? 'rgba(19,184,181,0.2)' : 'rgba(13, 139, 255, 0.05)'}
                            stroke={isActive ? '#13B8B5' : 'rgba(13, 139, 255, 0.2)'}
                            strokeWidth={isActive ? 1.5 : 1}
                            className="transition-all duration-300 hover:fill-blue-900/30 hover:stroke-[#0D8BFF]"
                          />

                          {/* Radar pulsing node core */}
                          <circle cx={c.cx} cy={c.cy} r="6" fill={`${c.color}20`} className="animate-ping" />
                          <circle cx={c.cx} cy={c.cy} r="3" fill={c.color} />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Floating tooltip */}
                  {hoveredCounty && (
                    <div 
                      style={{ left: hoveredCounty.x, top: hoveredCounty.y }}
                      className="absolute z-50 bg-[#0F131C] border border-slate-800 rounded-xl p-3 shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col gap-1 font-mono text-[9px] text-white select-none whitespace-nowrap"
                    >
                      <span className="font-extrabold text-[#0D8BFF] tracking-wide uppercase">{hoveredCounty.name}</span>
                      <span className="text-slate-400">Opportunities: <strong className="text-white">{hoveredCounty.opportunities}</strong></span>
                      <span className="text-slate-400">Trend: <strong className="text-[#13B8B5]">{hoveredCounty.trend}</strong></span>
                    </div>
                  )}
                </div>

                {/* Legend Scale */}
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-2 border-t border-slate-900">
                  <span>SCALE OPPORTUNITIES:</span>
                  <div className="flex items-center gap-1">
                    <span>0</span>
                    <div className="w-24 h-1.5 rounded-full bg-gradient-to-r from-blue-950 to-[#0D8BFF]" />
                    <span>4,000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT COLUMN (col-span-3) ─── */}
            <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
              
              {/* 1. Featured High-Potential Property Spotlight */}
              <div className="bg-[#0F131C] border border-slate-850 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-sans">
                      Featured Spotlight
                    </h3>
                    <p className="text-[9px] text-slate-500 font-mono mt-1">// High-potential distressed asset</p>
                  </div>
                  <span className="material-symbols-outlined text-[#13B8B5] text-base cursor-pointer hover:text-white animate-pulse">verified</span>
                </div>

                {/* Property Rendering preview */}
                <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-800">
                  <img 
                    src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80" 
                    alt="Premium distressed skyscraper rendering"
                    className="size-full object-cover brightness-[0.75]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2.5 text-[9px] font-extrabold text-white bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur-xs font-mono">
                    101 Bayshore Drive, Miami, FL
                  </span>
                </div>

                {/* High contrast value indicators */}
                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[7px] text-slate-500 uppercase font-black block">Est. Market Value</span>
                    <span className="text-xs font-black text-white mt-0.5 block">$353.7M</span>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[7px] text-slate-500 uppercase font-black block">Est. Bid Price</span>
                    <span className="text-xs font-black text-[#13B8B5] mt-0.5 block">$1,200</span>
                  </div>
                </div>

                {/* Specs grids */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2.5 border-t border-slate-900 text-[8px] font-mono text-slate-400">
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Address:</span>
                    <span className="text-white font-extrabold truncate max-w-[70px]">Miami-Dade, FL</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Bid Price:</span>
                    <span className="text-[#13B8B5] font-extrabold">$1,200</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Market Value:</span>
                    <span className="text-white font-extrabold">$353,700,000</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Property Count:</span>
                    <span className="text-white font-extrabold">1,450</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Market Valia:</span>
                    <span className="text-white font-extrabold">$353.7M</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Property Utnes:</span>
                    <span className="text-white font-extrabold">Commercial</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Property Reoes:</span>
                    <span className="text-white font-extrabold">Active</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 py-0.5">
                    <span>Bid Count:</span>
                    <span className="text-white font-extrabold">134</span>
                  </div>
                </div>
              </div>

              {/* 2. Market Trend Charts Card */}
              <div className="bg-[#0F131C] border border-slate-850 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-sans">
                      Market Trend Charts
                    </h3>
                    <p className="text-[9px] text-[#13B8B5] font-mono mt-1">// Opportunity growth - 18% quarterly</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-550 text-base cursor-pointer hover:text-white">more_horiz</span>
                </div>

                {/* Glowing area graph */}
                <div className="h-32 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={marketTrendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="marketTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#13B8B5" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#13B8B5" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="quarter" 
                        stroke="#475569" 
                        fontSize={7} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={6}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={8} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 1200]}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#0F131C', 
                          border: '1px solid #1e293b', 
                          borderRadius: '8px',
                          fontSize: '9px',
                          color: '#fff',
                          fontFamily: 'monospace'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="opportunities" 
                        stroke="#13B8B5" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#marketTrendGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>

          {/* ─── BOTTOM ROW: PROPERTY INTELLIGENCE DASHBOARD TABLES (Span 2 layout) ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0F131C] border border-slate-850 p-5 rounded-2xl shadow-xl">
            
            {/* Left Table - High-Potential Counties */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="material-symbols-outlined text-[#0D8BFF] text-base">analytics</span>
                <span className="text-xs font-black text-white uppercase tracking-wider font-sans">High-Potential Counties</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40">
                <table className="w-full text-left font-mono text-[9px] text-slate-300">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-500 uppercase tracking-widest border-b border-slate-900">
                      <th className="p-2.5">County Name</th>
                      <th className="p-2.5 text-right">Opportunities Indexed</th>
                      <th className="p-2.5 text-right">Operational Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {highPotentialCounties.map((county, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-2.5 font-bold text-white">{county.name}</td>
                        <td className="p-2.5 text-right text-[#0D8BFF] font-extrabold">{county.value}</td>
                        <td className="p-2.5 text-right"><span className="text-[#13B8B5] bg-[#13B8B5]/5 px-1.5 py-0.5 rounded font-black text-[7px] border border-[#13B8B5]/10">GEO-LOCK ACTIVE</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Table - Large Distressed Assets */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="material-symbols-outlined text-[#13B8B5] text-base">dashboard_customize</span>
                <span className="text-xs font-black text-white uppercase tracking-wider font-sans">Large Distressed Assets</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40">
                <table className="w-full text-left font-mono text-[9px] text-slate-330">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-500 uppercase tracking-widest border-b border-slate-900">
                      <th className="p-2.5">Asset Classification</th>
                      <th className="p-2.5 text-right">Volume Capacity</th>
                      <th className="p-2.5 text-right">Compliance Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {largeDistressedAssets.map((asset, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-2.5 font-bold text-white">{asset.name}</td>
                        <td className="p-2.5 text-right text-[#13B8B5] font-extrabold">{asset.value}</td>
                        <td className="p-2.5 text-right"><span className="text-[#0D8BFF] bg-[#0D8BFF]/5 px-1.5 py-0.5 rounded font-black text-[7px] border border-[#0D8BFF]/10">0.05% LOW RISK</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ─── Carousel Slider & Custom Subcomponents Below standard grids ─── */}
          <div id="tour-suggested-deals" className="w-full">
            <SuggestedDeals
              properties={filteredDeals.length > 0 ? filteredDeals : suggestedDeals}
              loading={loading || dealsLoading}
              stateFilter={selectedState}
              onStateChange={(s) => setSelectedState(s)}
            />
          </div>

          {/* Top Auctions Sections */}
          <div className="space-y-6 pt-2">
            <TopAuctions type="deed" allAuctions={typeAuctions.deed} loading={loading} />
            <TopAuctions type="foreclosure" allAuctions={typeAuctions.foreclosure} loading={loading} />
            <TopAuctions type="lien" allAuctions={typeAuctions.lien} loading={loading} />
          </div>

          {/* Sleek Modern Auction Search registry query panel */}
          <AuctionSearch />

          {/* ─── SLEEK BOTTOM UTILITY BAR ─── */}
          <footer className="bg-[#0E131F] border border-slate-850 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl select-none font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                <span className="size-2 bg-emerald-500 rounded-full animate-ping" />
                Data feed active
              </span>
              <span className="text-slate-600">|</span>
              <span>Syncing feed: <strong className="text-white">10% latency</strong></span>
            </div>

            <div className="flex items-center gap-5">
              <span>Status: <strong className="text-white">"User current browsers"</strong></span>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5">
                <span>Active Cycle:</span>
                <select className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-white font-bold focus:outline-none">
                  <option>Q4 2026</option>
                  <option>Q1 2027</option>
                </select>
              </div>
            </div>
          </footer>

        </div>

      </main>

    </div>
  );
};

export default ClientDashboard;
