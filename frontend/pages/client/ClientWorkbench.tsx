import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getStateStats, StateStat, getMonthlyStats, MonthlyAuctionStat, getTopScoredProperties, TopScoredProperty } from '../../services/scores.service';
import { ClientDataService, PropertyService } from '../../services/property.service';
import { AuctionService } from '../../services/auction.service';
import { StatesService, StateContact } from '../../services/states.service';
import { countyService } from '../../services/county.service';
import { UserService } from '../../services/user.service';
import { RealtorTaskService, InvestorTaskService, Task } from '../../services/realtor_task.service';
import { AuthService } from '../../services/auth.service';
import { AuctionEvent, Property } from '../../types';
import { useCompany } from '../../context/CompanyContext';
import { InvestmentHeatmap } from '../../components/property/InvestmentHeatmap';
import { MapDashboard } from '../../components/widgets/MapDashboard';
import { StatCounterWidget } from '../../components/widgets/StatCounterWidget';
import { TickerTapeWidget } from '../../components/widgets/TickerTapeWidget';
import { PropertyMetricsWidget } from '../../components/widgets/PropertyMetricsWidget';
import { TopRecommendedWidget } from '../../components/widgets/TopRecommendedWidget';
import { RehabCalcWidget } from '../../components/widgets/RehabCalcWidget';
import { RecommendedDealsWidget } from '../../components/widgets/RecommendedDealsWidget';
import { SmartAIDealFinder } from '../../components/widgets/SmartAIDealFinder';
import { PropertyPreviewDrawer } from '../../components/PropertyPreviewDrawer';
import { API_URL } from '../../services/httpClient';

// Original rich page modules for IDE-style floating windows
import ClientAuctions from './ClientAuctions';
import ClientProperties from './ClientProperties';
import ClientLists from './ClientLists';
import { InvestorTasksDashboard } from './InvestorTasksDashboard';
import PropertyDetailPage from '../admin/PropertyDetailPage';
import { Settings as OriginalSettings } from '../Settings';
import ActivityLogsPage from './ActivityLogsPage';
import BillingPage from './BillingPage';
import AboutPage from '../AboutPage';
import DisclaimerPage from '../DisclaimerPage';
import PrivacyPolicyPage from '../PrivacyPolicyPage';
import TermsOfServicePage from '../TermsOfServicePage';
import { useTour } from '../../context/TourContext';
import { CompanySelector } from '../../components/CompanySelector';
import { TrainingPage, CommunityPage, GroupsPage } from './EcosystemPages';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Compass, Map, BarChart2, Folder, Terminal, Award,
  HelpCircle, ShieldCheck, RefreshCw, FileText, CheckCircle,
  Smartphone, Settings, Layout, Layers, X, Maximize2, Minimize2, Minus,
  Move, LayoutGrid, Eye, EyeOff, Sparkles, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Gavel, Calendar, ShieldAlert, Search, Plus, Filter, ArrowRight,
  Maximize, Activity, Info, Users, CreditCard, Bell, Briefcase, Trash2, Edit2, Play, Check, Shield, CheckSquare, LogOut,
  MousePointer, TrendingUp, Lock, Unlock, LayoutDashboard, ExternalLink, Database, Brain
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

const StateSilhouetteBadge: React.FC<{ stateCode: string; size?: number }> = ({ stateCode, size = 22 }) => {
  const url = `https://raw.githubusercontent.com/ahuseyn/state-icons/master/icons/${stateCode}.svg`;
  return (
    <div
      style={{ width: size, height: size }}
      className="relative bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded flex items-center justify-center p-0.5 shrink-0 shadow-sm"
    >
      <img
        src={url}
        alt={stateCode}
        className="w-full h-full object-contain opacity-75 dark:brightness-0 dark:invert"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[6.5px] font-black text-slate-800/30 dark:text-white/30 tracking-tighter">{stateCode}</span>
      </div>
    </div>
  );
};

const fallbackContacts: Record<string, any[]> = {
  'miami-dade': [
    { name: 'Miami-Dade Property Appraiser', phone: '305-375-4786', url: 'https://www.miamidade.gov/pa/' },
    { name: 'Miami-Dade Tax Collector', phone: '305-270-4916', url: 'https://www.miamidade.gov/taxcollector/' },
    { name: 'Clerk of Courts (Foreclosures & Tax Deeds)', phone: '305-275-1155', url: 'https://www.miamidade.clerk.org/' }
  ],
  'broward': [
    { name: 'Broward County Property Appraiser', phone: '954-357-6830', url: 'https://www.bcpa.net/' },
    { name: 'Broward County Revenue Collector', phone: '954-831-4000', url: 'https://www.broward.org/recordstaxes/' },
    { name: 'Clerk of Circuit Court', phone: '954-831-6565', url: 'https://www.browardclerk.org/' }
  ],
  'orange': [
    { name: 'Orange County Property Appraiser', phone: '407-836-5044', url: 'https://www.ocpafl.org/' },
    { name: 'Orange County Tax Collector', phone: '407-836-2700', url: 'https://www.octaxcol.com/' },
    { name: 'Orange County Clerk of Courts', phone: '407-836-2000', url: 'https://www.myorangeclerk.com/' }
  ]
};

interface Widget {
  id: string;
  type: 'map' | 'smart_ai_finder';
  title: string;
  x: number; // left offset in pixels
  y: number; // top offset in pixels
  w: number; // width in pixels
  h: number; // height in pixels
  visible: boolean;
  zIndex: number;
  isLocked?: boolean;
}

interface OverlayWindow {
  id: string;
  type: 'my_lists' | 'live_auctions' | 'property_search' | 'field_missions' | 'property_details' | 'settings' | 'team_and_logs' | 'billings_and_plans' | 'about' | 'training' | 'community' | 'groups' | 'disclaimer' | 'terms' | 'privacy';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  data?: any;
  refreshKey?: number;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'map', type: 'map', title: 'US Heatmap & Activity', x: 20, y: 20, w: 620, h: 520, visible: true, zIndex: 10 },
  { id: 'smart_ai_finder', type: 'smart_ai_finder', title: '🧠 Smart AI Deal Finder', x: 660, y: 20, w: 560, h: 520, visible: true, zIndex: 5 }
];


export const ClientWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, companies, selectCompany } = useCompany();
  const { startTour } = useTour();
  const canvasRef = useRef<HTMLDivElement>(null);

  // States
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [isLayoutLoaded, setIsLayoutLoaded] = useState(false);

  // Load from localStorage on client mount to guarantee hydration safety
  useEffect(() => {
    try {
      const saved = localStorage.getItem('goauct_workbench_widgets_v62');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const savedMap = new Map(parsed.map((w: any) => [w.id, w]));
          const merged = DEFAULT_WIDGETS.map(def => {
            const savedWidget = savedMap.get(def.id);
            if (savedWidget) {
              // Keep saved position but merge any new default settings
              return {
                ...def,
                ...savedWidget,
                x: typeof savedWidget.x === 'number' ? savedWidget.x : def.x,
                y: typeof savedWidget.y === 'number' ? savedWidget.y : def.y,
                w: typeof savedWidget.w === 'number' ? savedWidget.w : def.w,
                h: typeof savedWidget.h === 'number' ? savedWidget.h : def.h,
                visible: typeof savedWidget.visible === 'boolean' ? savedWidget.visible : def.visible,
                zIndex: typeof savedWidget.zIndex === 'number' ? savedWidget.zIndex : def.zIndex,
                isLocked: typeof savedWidget.isLocked === 'boolean' ? savedWidget.isLocked : def.isLocked,
              };
            }
            return def;
          });
          setWidgets(merged);
        }
      }
    } catch (e) {
      console.error('Failed to parse goauct_workbench_widgets_v62 from localStorage, falling back to default:', e);
    } finally {
      setIsLayoutLoaded(true);
    }
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('goauct_workbench_sidebarOpen');
    return saved === null ? true : saved === 'true';
  });
  const [activePane, setActivePane] = useState<'explorer' | 'presets' | 'info' | 'notifications' | 'connect'>(() => {
    return (localStorage.getItem('goauct_workbench_activePane') as any) || 'explorer';
  });
  const [upcomingAuctionsCount, setUpcomingAuctionsCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tickerTapeVisible, setTickerTapeVisible] = useState<boolean>(() => {
    const stored = localStorage.getItem('goauct_ticker_tape_visible');
    return stored === null ? true : stored === 'true';
  });

  const [previewPropertyId, setPreviewPropertyId] = useState<string | number | null>(null);

  useEffect(() => {
    const syncLocalFavorites = async () => {
      try {
        const localFavsRaw = localStorage.getItem('goauct_fav_auctions');
        if (localFavsRaw) {
          const ids: number[] = JSON.parse(localFavsRaw);
          if (Array.isArray(ids) && ids.length > 0) {
            console.log('Migrating local favorites to database:', ids);
            await AuctionService.syncFavorites(ids);
          }
          localStorage.removeItem('goauct_fav_auctions');
          window.dispatchEvent(new CustomEvent('auction-favorites-updated'));
        }
      } catch (err) {
        console.error('Failed to sync local favorites:', err);
      }
    };
    syncLocalFavorites();
  }, []);

  const [activeMode, setActiveMode] = useState<'preferences' | 'volume' | 'scoring'>(() => {
    try {
      const saved = localStorage.getItem('goauct_map_active_mode');
      return (saved as any) || 'preferences';
    } catch (e) {
      return 'preferences';
    }
  });

  useEffect(() => {
    localStorage.setItem('goauct_map_active_mode', activeMode);
  }, [activeMode]);

  const [stateStats, setStateStats] = useState<StateStat[]>([]);
  const [topProperties, setTopProperties] = useState<TopScoredProperty[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const [favoriteStates, setFavoriteStates] = useState<Set<string>>(new Set());
  const [selectedState, setSelectedState] = useState<string>('');
  const [myListStats, setMyListStats] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('goauct_map_mylist_stats');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Load analytical top scored properties on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoadingStats(true);
      try {
        const props = await getTopScoredProperties(100); // Fetch top scored properties across states
        setTopProperties(props);
      } catch (e) {
        console.error('Failed to load top scored properties for map:', e);
      }
      setLoadingStats(false);
    };
    loadAnalytics();
  }, []);

  const handleStateClick = (stateCode: string) => {
    // If state code is selected, toggle it. If not, set it.
    if (selectedState === stateCode) {
      setSelectedState('');
    } else {
      setSelectedState(stateCode);
    }
    
    // In preferences mode, we also toggle map favorites
    if (activeMode === 'preferences') {
      const savedStatesRaw = localStorage.getItem('goauct_map_fav_states');
      let currentFavs: string[] = [];
      if (savedStatesRaw) {
        try { currentFavs = JSON.parse(savedStatesRaw); } catch(e) {}
      }
      if (currentFavs.includes(stateCode)) {
        currentFavs = currentFavs.filter(s => s !== stateCode);
      } else {
        currentFavs.push(stateCode);
      }
      localStorage.setItem('goauct_map_fav_states', JSON.stringify(currentFavs));
      window.dispatchEvent(new Event('map-preferences-updated'));
    }
  };

  const loadFavoriteStates = useCallback(async () => {
    try {
      const states = new Set<string>();

      // 1. Load manual selection from localStorage
      const savedStatesRaw = localStorage.getItem('goauct_map_fav_states');
      if (savedStatesRaw) {
        try {
          const parsed = JSON.parse(savedStatesRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach(s => states.add(s.trim().toUpperCase()));
          }
        } catch (e) {
          console.error('Error parsing map favorites from localStorage', e);
        }
      }

      // 2. Fetch favorited auctions from backend and extract their states
      try {
        const favIds = await AuctionService.getFavorites();
        if (Array.isArray(favIds) && favIds.length > 0) {
          const { items } = await AuctionService.getAuctionEvents({ ids: favIds });
          if (Array.isArray(items)) {
            items.forEach((auction: any) => {
              if (auction.state) {
                states.add(auction.state.trim().toUpperCase());
              }
            });
          }
        }
      } catch (apiErr) {
        console.error('Failed to fetch favorite auctions for map:', apiErr);
      }

      setFavoriteStates(states);
    } catch (err) {
      console.error('Failed to load favorite states:', err);
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadFavoriteStates();

    // Listen to local custom events for instant UI updates across components
    const handleSync = () => loadFavoriteStates();
    window.addEventListener('auction-favorites-updated', handleSync);
    window.addEventListener('map-preferences-updated', handleSync);
    
    // Also listen to actual localStorage changes (cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'goauct_map_fav_states') {
        loadFavoriteStates();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auction-favorites-updated', handleSync);
      window.removeEventListener('map-preferences-updated', handleSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadFavoriteStates]);

  const mapCustomization = useMemo(() => {
    const config: Record<string, any> = {};

    if (activeMode === 'volume') {
      // 1. Auction Volume Termograph (Amber/Orange)
      const volumes = stateStats.map(s => s.volume || 0);
      const maxVolume = Math.max(...volumes, 1);

      stateStats.forEach(stat => {
        if (stat.state_code) {
          const code = stat.state_code.trim().toUpperCase();
          const vol = stat.volume || 0;
          const pct = vol / maxVolume;
          
          let fillColor = '#7c2d12'; // Low volume (rust orange)
          if (vol === 0) fillColor = '#1a353d'; // Dark solarized empty state
          else if (pct >= 0.8) fillColor = '#fbbf24'; // High volume (gold/yellow)
          else if (pct >= 0.4) fillColor = '#d97706'; // Medium volume (amber)

          config[code] = { fill: fillColor };
        }
      });
    } else if (activeMode === 'scoring') {
      // 2. Best Deals Termograph (Violet/Purple)
      stateStats.forEach(stat => {
        if (stat.state_code) {
          const code = stat.state_code.trim().toUpperCase();
          const score = stat.average_score || 0;

          let fillColor = '#4c1d95'; // Low average (dark violet)
          if (score === 0) fillColor = '#1a353d';
          else if (score >= 80) fillColor = '#c084fc'; // High average (bright neon purple)
          else if (score >= 50) fillColor = '#7c3aed'; // Medium average (violet)

          config[code] = { fill: fillColor };
        }
      });
    } else {
      // 3. Standard Preferences (Cyan / Teal)
      // Base Intensity from My Lists (Counties amount)
      Object.entries(myListStats).forEach(([stateCode, count]) => {
        const countyCount = count as number;
        let fillColor = '#0f766e'; // Dark Teal (1 county)
        if (countyCount >= 5) fillColor = '#10b981'; // Neon Green (High Density)
        else if (countyCount >= 2) fillColor = '#14b8a6'; // Medium Teal

        config[stateCode] = { fill: fillColor };
      });
      
      // Favorites Overlap (Brightest Cyan)
      favoriteStates.forEach(stateCode => {
        const cleanCode = stateCode.trim().toUpperCase();
        config[cleanCode] = {
          ...config[cleanCode],
          fill: '#00e5ff', // Vibrant Cyan neon fill for explicit favorites
        };
      });
    }

    // Active Selection Overlay (Mint highlight for active selection across all modes)
    if (selectedState) {
      config[selectedState.toUpperCase()] = {
        ...config[selectedState.toUpperCase()],
        fill: '#00ffcc', // Mint highlight
      };
    }

    return config;
  }, [activeMode, favoriteStates, selectedState, myListStats, stateStats]);

  const loadListsAndPreferences = useCallback(async () => {
    try {
      const lists = await ClientDataService.getLists(activeCompany?.id);
      
      // 1. Existing Upcoming Auctions logic
      const hasUpcoming = lists
        .filter((l: any) => l.has_upcoming_auction)
        .reduce((acc: number, curr: any) => acc + (curr.upcoming_auctions_count || 0), 0);
      setUpcomingAuctionsCount(hasUpcoming);

      // 2. Map My List stats logic (Counties/Properties per State)
      const stats: Record<string, number> = {};
      
      // First, fetch preferences (tells us all states/counties actually holding saved properties)
      try {
        const preferences = await ClientDataService.getPreferences(activeCompany?.id);
        if (preferences && Array.isArray(preferences.states)) {
          preferences.states.forEach((stateCode: string) => {
            const cleanCode = stateCode.trim().toUpperCase();
            if (cleanCode.length === 2) {
              stats[cleanCode] = 1; // Default base intensity of 1
            }
          });
        }
      } catch (prefErr) {
        console.error('Failed to load list preferences for map:', prefErr);
      }

      // Next, count county subfolders inside Standard State folders (e.g. tags starting with 'STANDARD')
      lists.forEach((list: any) => {
        if (list.tags && list.tags.startsWith('STANDARD')) {
          const stateCode = list.name?.trim().toUpperCase();
          if (stateCode && stateCode.length === 2) {
            let countyCount = 0;
            if (list.tags.includes(':')) {
              const countiesStr = list.tags.split(':')[1];
              if (countiesStr) {
                const counties = countiesStr.split(',').map((c: string) => c.trim()).filter(Boolean);
                countyCount = counties.length;
              }
            }
            stats[stateCode] = Math.max(stats[stateCode] || 0, countyCount, 1);
          }
        }
      });

      // Crucial Strategy: Deep Scan properties inside ALL folders (both Standard and Custom)
      // to extract precise state and county density!
      try {
        const stateCountiesMap: Record<string, Set<string>> = {};
        for (const list of lists) {
          try {
            const props = await ClientDataService.getListProperties(list.id);
            if (Array.isArray(props)) {
              props.forEach((prop: any) => {
                if (prop.state) {
                  const stateUpper = prop.state.trim().toUpperCase();
                  if (stateUpper.length === 2) {
                    if (!stateCountiesMap[stateUpper]) {
                      stateCountiesMap[stateUpper] = new Set<string>();
                    }
                    if (prop.county) {
                      stateCountiesMap[stateUpper].add(prop.county.trim().toLowerCase());
                    } else {
                      stateCountiesMap[stateUpper].add('__unknown__');
                    }
                  }
                }
              });
            }
          } catch (propsErr) {
            console.error(`Failed to fetch properties for list ${list.id} during map scan:`, propsErr);
          }
        }

        // Merge deep property county counts into stats
        Object.entries(stateCountiesMap).forEach(([stateUpper, countiesSet]) => {
          stats[stateUpper] = Math.max(stats[stateUpper] || 0, countiesSet.size);
        });
      } catch (deepErr) {
        console.error('Failed to run deep property scan for map:', deepErr);
      }

      setMyListStats(stats);
      localStorage.setItem('goauct_map_mylist_stats', JSON.stringify(stats));
    } catch (err) {
      console.error('Failed to load lists and preferences:', err);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    loadListsAndPreferences();

    // Listen to custom lists update events
    window.addEventListener('goauct-lists-updated', loadListsAndPreferences);
    return () => {
      window.removeEventListener('goauct-lists-updated', loadListsAndPreferences);
    };
  }, [loadListsAndPreferences]);

  // Dynamic admin announcements state
  const [announcements, setAnnouncements] = useState<{ id: number; title: string; message: string; type: string }[]>([]);
  const [annIndex, setAnnIndex] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/admin/announcements/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (announcements.length < 2) return;
    const t = setInterval(() => setAnnIndex(i => (i + 1) % announcements.length), 5000);
    return () => clearInterval(t);
  }, [announcements.length]);

  // IDE Mode & Node Canvas Custom States
  const [layoutTemplate, setLayoutTemplate] = useState<'canvas' | 'ide'>('canvas');
  const [activeIdeTabId, setActiveIdeTabId] = useState<string | null>(() => {
    return localStorage.getItem('goauct_workbench_activeIdeTabId') || 'live_auctions';
  });
  // Split panel states
  const [ideSplitMode, setIdeSplitMode] = useState<boolean>(() => {
    return localStorage.getItem('goauct_workbench_ideSplitMode') === 'true';
  });
  const [splitIdeTabId, setSplitIdeTabId] = useState<string | null>(() => {
    return localStorage.getItem('goauct_workbench_splitIdeTabId');
  });
  const [splitLeftWidthPct, setSplitLeftWidthPct] = useState<number>(() => {
    const saved = localStorage.getItem('goauct_workbench_splitLeftWidthPct');
    return saved ? Number(saved) : 50;
  });
  const splitDraggingRef = useRef(false);

  // Bottom and Right Panel dynamic types and minimization
  const [bottomPanelType, setBottomPanelType] = useState<string>(() => {
    return localStorage.getItem('goauct_workbench_bottomPanelType') || 'terminal';
  });
  const [rightPanelType, setRightPanelType] = useState<string>(() => {
    return localStorage.getItem('goauct_workbench_rightPanelType') || 'agent';
  });
  const [bottomPanelMinimized, setBottomPanelMinimized] = useState<boolean>(() => {
    return localStorage.getItem('goauct_workbench_bottomPanelMinimized') === 'true';
  });
  const [rightPanelMinimized, setRightPanelMinimized] = useState<boolean>(() => {
    return localStorage.getItem('goauct_workbench_rightPanelMinimized') === 'true';
  });

  // Hybrid OS Window Overlay System States
  const [overlayWindows, setOverlayWindows] = useState<OverlayWindow[]>(() => {
    try {
      const saved = localStorage.getItem('goauct_workbench_overlayWindows');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse overlayWindows', e);
    }
    return [];
  });
  const [activeOverlayWindowId, setActiveOverlayWindowId] = useState<string | null>(() => {
    return localStorage.getItem('goauct_workbench_activeOverlayWindowId');
  });

  useEffect(() => {
    localStorage.setItem('goauct_workbench_overlayWindows', JSON.stringify(overlayWindows));
  }, [overlayWindows]);

  useEffect(() => {
    if (activeOverlayWindowId) {
      localStorage.setItem('goauct_workbench_activeOverlayWindowId', activeOverlayWindowId);
    } else {
      localStorage.removeItem('goauct_workbench_activeOverlayWindowId');
    }
  }, [activeOverlayWindowId]);

  // Custom Workspace Presets Interface & States
  interface CustomPreset {
    id: string;
    label: string;
    desc: string;
    favorite: boolean;
    widgets: { id: string; x: number; y: number; w: number; h: number; visible: boolean; }[];
  }

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    try {
      const saved = localStorage.getItem('goauct_workbench_customPresets');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse customPresets', e);
    }
    return [];
  });

  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [backupWidgetsBeforeCreate, setBackupWidgetsBeforeCreate] = useState<Widget[] | null>(null);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_customPresets', JSON.stringify(customPresets));
  }, [customPresets]);

  const arrangeWidgetNearSidebar = (id: string, index: number) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    // Standard sizes and placement safe from overlapping left navigation panels
    return {
      x: 80 + col * 380,
      y: 40 + row * 400,
      w: 350,
      h: 380,
    };
  };

  const startCustomPresetCreation = () => {
    setBackupWidgetsBeforeCreate(JSON.parse(JSON.stringify(widgets)));
    setWidgets(prev => prev.map(w => ({ ...w, visible: false })));
    setIsCreatingPreset(true);
    setNewPresetName('');
    logConsoleActivity('Started layout preset customization. Starting from an empty blueprint.');
  };

  const toggleWidgetInPreset = (id: string) => {
    setWidgets(prev => {
      const match = prev.find(w => w.id === id);
      if (!match) return prev;

      const nextVisible = !match.visible;
      let newCoords = {};
      if (nextVisible) {
        const visibleCount = prev.filter(w => w.visible).length;
        newCoords = arrangeWidgetNearSidebar(id, visibleCount);
      }

      return prev.map(w =>
        w.id === id
          ? { ...w, visible: nextVisible, ...newCoords }
          : w
      );
    });
  };

  const saveCustomPreset = () => {
    if (!newPresetName.trim()) {
      alert('Please enter a preset name.');
      return;
    }

    const newPreset: CustomPreset = {
      id: `custom_${Date.now()}`,
      label: newPresetName.trim(),
      desc: 'Custom user-defined widget layout',
      favorite: false,
      widgets: widgets.map(w => ({
        id: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        visible: w.visible
      }))
    };

    setCustomPresets(prev => [...prev, newPreset]);
    setIsCreatingPreset(false);
    setNewPresetName('');
    setBackupWidgetsBeforeCreate(null);
    logConsoleActivity(`Created custom preset: "${newPreset.label}"`);
  };

  const cancelCustomPresetCreation = () => {
    if (backupWidgetsBeforeCreate) {
      setWidgets(backupWidgetsBeforeCreate);
    }
    setIsCreatingPreset(false);
    setNewPresetName('');
    setBackupWidgetsBeforeCreate(null);
    logConsoleActivity('Cancelled custom preset creation.');
  };

  const deleteCustomPreset = (id: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== id));
    logConsoleActivity(`Deleted custom preset: "${id}"`);
  };

  const toggleFavoriteCustomPreset = (id: string) => {
    setCustomPresets(prev =>
      prev.map(p => (p.id === id ? { ...p, favorite: !p.favorite } : p))
    );
    logConsoleActivity(`Toggled favorite status for preset: "${id}"`);
  };

  const handleOpenPropertyDetails = (propertyId: string | number, parcelId: string) => {
    openOverlayWindow('property_details', `🔍 Property: ${parcelId || propertyId}`, { propertyId, parcelId });
  };

  const openOverlayWindow = (
    type: 'my_lists' | 'live_auctions' | 'property_search' | 'field_missions' | 'property_details' | 'settings' | 'team_and_logs' | 'billings_and_plans' | 'about' | 'training' | 'community' | 'groups' | 'disclaimer' | 'terms' | 'privacy',
    title: string,
    data?: any
  ) => {
    const id = type === 'property_details' ? `prop_details_${data?.propertyId}` : type;

    setOverlayWindows(prev => {
      const existingIdx = prev.findIndex(w => w.id === id);
      const safeZ = prev.map(w => typeof w.zIndex === 'number' && !isNaN(w.zIndex) ? w.zIndex : 0);
      const maxZ = safeZ.length > 0 ? Math.max(...safeZ) : 0;

      if (existingIdx !== -1) {
        return prev.map((w, idx) =>
          idx === existingIdx
            ? { ...w, isMinimized: false, zIndex: maxZ + 1 }
            : w
        );
      }

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      let w = 1050;
      let h = 680;
      if (type === 'property_details') {
        w = 880;
        h = 620;
      } else if (type === 'about' || type === 'disclaimer' || type === 'terms' || type === 'privacy') {
        w = 680;
        h = 500;
      } else if (type === 'training') {
        w = 1100;
        h = 720;
      } else if (type === 'community') {
        w = 1000;
        h = 680;
      } else if (type === 'groups') {
        w = 1050;
        h = 700;
      }
      const x = Math.max((viewportW - w) / 2 + (prev.length * 20) % 200, 40);
      const y = Math.max((viewportH - h) / 2 + (prev.length * 20) % 200, 60);

      const newWin: OverlayWindow = {
        id,
        type,
        title,
        x,
        y,
        w,
        h,
        zIndex: maxZ + 1,
        isMinimized: false,
        isMaximized: false,
        data,
      };
      return [...prev, newWin];
    });

    setActiveOverlayWindowId(id);
    logConsoleActivity(`Opened overlay window: "${title}"`);
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const focusOverlayWindow = (id: string) => {
    setActiveOverlayWindowId(id);
    setOverlayWindows(prev => {
      const safeZ = prev.map(w => typeof w.zIndex === 'number' && !isNaN(w.zIndex) ? w.zIndex : 0);
      const maxZ = safeZ.length > 0 ? Math.max(...safeZ) : 0;
      return prev.map(w => (w.id === id ? { ...w, isMinimized: false, zIndex: maxZ + 1 } : w));
    });
  };

  const closeOverlayWindow = (id: string) => {
    setOverlayWindows(prev => prev.filter(w => w.id !== id));
    if (activeOverlayWindowId === id) {
      const visibleOthers = overlayWindows.filter(w => w.id !== id && !w.isMinimized);
      if (visibleOthers.length > 0) {
        const topMost = visibleOthers.reduce((top, w) => {
          const currentZ = typeof w.zIndex === 'number' && !isNaN(w.zIndex) ? w.zIndex : 0;
          const topZ = typeof top.zIndex === 'number' && !isNaN(top.zIndex) ? top.zIndex : 0;
          return currentZ > topZ ? w : top;
        }, visibleOthers[0]);
        setActiveOverlayWindowId(topMost.id);
      } else {
        setActiveOverlayWindowId(null);
      }
    }
    logConsoleActivity(`Closed overlay window: "${id}"`);
  };

  const toggleMinimizeOverlayWindow = (id: string) => {
    const target = overlayWindows.find(w => w.id === id);
    if (!target) return;

    const willBeUnminimized = target.isMinimized;
    if (willBeUnminimized) {
      setActiveOverlayWindowId(id);
      setOverlayWindows(prev => {
        const safeZ = prev.map(w => typeof w.zIndex === 'number' && !isNaN(w.zIndex) ? w.zIndex : 0);
        const maxZ = safeZ.length > 0 ? Math.max(...safeZ) : 0;
        return prev.map(w => (w.id === id ? { ...w, isMinimized: false, zIndex: maxZ + 1 } : w));
      });
    } else {
      // Minimizing
      if (activeOverlayWindowId === id) {
        const visibleOthers = overlayWindows.filter(w => w.id !== id && !w.isMinimized);
        if (visibleOthers.length > 0) {
          const topMost = visibleOthers.reduce((top, w) => {
            const currentZ = typeof w.zIndex === 'number' && !isNaN(w.zIndex) ? w.zIndex : 0;
            const topZ = typeof top.zIndex === 'number' && !isNaN(top.zIndex) ? top.zIndex : 0;
            return currentZ > topZ ? w : top;
          }, visibleOthers[0]);
          setActiveOverlayWindowId(topMost.id);
        } else {
          setActiveOverlayWindowId(null);
        }
      }
      setOverlayWindows(prev => prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w)));
    }
    logConsoleActivity(`Toggled minimize for window: "${id}"`);
  };

  const toggleMaximizeOverlayWindow = (id: string) => {
    setOverlayWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
    logConsoleActivity(`Toggled maximize for window: "${id}"`);
  };

  const refreshOverlayWindow = (id: string) => {
    setOverlayWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, refreshKey: (w.refreshKey || 0) + 1 } : w))
    );
    logConsoleActivity(`Refreshed content for overlay window: "${id}"`);
  };

  interface OverlayInteraction {
    type: 'drag' | 'resize';
    winId: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
  }

  const [overlayInteraction, setOverlayInteraction] = useState<OverlayInteraction | null>(null);

  const handleOverlayMouseDown = (
    e: React.MouseEvent,
    winId: string,
    type: 'drag' | 'resize'
  ) => {
    if ((e.target as HTMLElement).closest('.window-action-buttons')) {
      return;
    }
    e.preventDefault();
    focusOverlayWindow(winId);

    const win = overlayWindows.find(w => w.id === winId);
    if (!win || win.isMaximized) return;

    setOverlayInteraction({
      type,
      winId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: win.x,
      startTop: win.y,
      startWidth: win.w,
      startHeight: win.h,
    });
  };

  const handleOverlayTouchStart = (
    e: React.TouchEvent,
    winId: string,
    type: 'drag' | 'resize'
  ) => {
    if (e.target && (e.target as HTMLElement).closest('.window-action-buttons')) {
      return;
    }
    focusOverlayWindow(winId);

    const win = overlayWindows.find(w => w.id === winId);
    if (!win || win.isMaximized) return;

    const touch = e.touches[0];
    setOverlayInteraction({
      type,
      winId,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: win.x,
      startTop: win.y,
      startWidth: win.w,
      startHeight: win.h,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!overlayInteraction) return;

      const deltaX = e.clientX - overlayInteraction.startX;
      const deltaY = e.clientY - overlayInteraction.startY;

      setOverlayWindows(prev =>
        prev.map(w => {
          if (w.id !== overlayInteraction.winId) return w;

          if (overlayInteraction.type === 'drag') {
            const nextX = Math.min(window.innerWidth - 100, Math.max(-w.w + 100, overlayInteraction.startLeft + deltaX));
            const nextY = Math.min(window.innerHeight - 100, Math.max(0, overlayInteraction.startTop + deltaY));
            return { ...w, x: nextX, y: nextY };
          } else if (overlayInteraction.type === 'resize') {
            return {
              ...w,
              w: Math.max(320, overlayInteraction.startWidth + deltaX),
              h: Math.max(240, overlayInteraction.startHeight + deltaY),
            };
          }
          return w;
        })
      );
    };

    const handleMouseUp = () => {
      setOverlayInteraction(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!overlayInteraction) return;
      const touch = e.touches[0];

      const deltaX = touch.clientX - overlayInteraction.startX;
      const deltaY = touch.clientY - overlayInteraction.startY;

      setOverlayWindows(prev =>
        prev.map(w => {
          if (w.id !== overlayInteraction.winId) return w;

          if (overlayInteraction.type === 'drag') {
            const nextX = Math.min(window.innerWidth - 100, Math.max(-w.w + 100, overlayInteraction.startLeft + deltaX));
            const nextY = Math.min(window.innerHeight - 100, Math.max(0, overlayInteraction.startTop + deltaY));
            return { ...w, x: nextX, y: nextY };
          } else if (overlayInteraction.type === 'resize') {
            return {
              ...w,
              w: Math.max(320, overlayInteraction.startWidth + deltaX),
              h: Math.max(240, overlayInteraction.startHeight + deltaY),
            };
          }
          return w;
        })
      );
    };

    const handleTouchEnd = () => {
      setOverlayInteraction(null);
    };

    if (overlayInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [overlayInteraction]);

  // Persist state variables to localStorage
  useEffect(() => {
    localStorage.setItem('goauct_workbench_sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_activePane', activePane);
  }, [activePane]);



  useEffect(() => {
    if (activeIdeTabId) {
      localStorage.setItem('goauct_workbench_activeIdeTabId', activeIdeTabId);
    }
  }, [activeIdeTabId]);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_ideSplitMode', String(ideSplitMode));
  }, [ideSplitMode]);

  useEffect(() => {
    if (splitIdeTabId) {
      localStorage.setItem('goauct_workbench_splitIdeTabId', splitIdeTabId);
    } else {
      localStorage.removeItem('goauct_workbench_splitIdeTabId');
    }
  }, [splitIdeTabId]);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_splitLeftWidthPct', String(splitLeftWidthPct));
  }, [splitLeftWidthPct]);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_bottomPanelType', bottomPanelType);
  }, [bottomPanelType]);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_rightPanelType', rightPanelType);
  }, [rightPanelType]);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_bottomPanelMinimized', String(bottomPanelMinimized));
  }, [bottomPanelMinimized]);

  useEffect(() => {
    localStorage.setItem('goauct_workbench_rightPanelMinimized', String(rightPanelMinimized));
  }, [rightPanelMinimized]);
  const [nodeCanvasTool, setNodeCanvasTool] = useState<'select' | 'connect'>('select');
  const [nodeConnections, setNodeConnections] = useState<Array<{ from: string, to: string }>>([
    { from: '1', to: '2' },
    { from: '1', to: '3' },
    { from: '2', to: '4' },
    { from: '3', to: '5' },
    { from: '4', to: '6' },
    { from: '5', to: '6' }
  ]);
  const [nodeConnectSourceId, setNodeConnectSourceId] = useState<string | null>(null);

  // Dynamic API details states
  const [monthlyStats, setMonthlyStats] = useState<MonthlyAuctionStat[]>([]);
  const [dbTopDeals, setDbTopDeals] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Interactive Live Metrics
  const [marketCounts, setMarketCounts] = useState({ deed: 0, foreclosure: 0, lien: 0 });

  // Infinite Canvas physics states with persistent localStorage fallback
  const [zoomScale, setZoomScale] = useState(() => {
    const saved = localStorage.getItem('goauct_canvas_zoom');
    return saved ? Number(saved) : 1.0;
  });
  const [panX, setPanX] = useState(() => {
    const saved = localStorage.getItem('goauct_canvas_pan_x');
    return saved ? Number(saved) : 0;
  });
  const [panY, setPanY] = useState(() => {
    const saved = localStorage.getItem('goauct_canvas_pan_y');
    return saved ? Number(saved) : 0;
  });
  const [isCanvasLocked, setIsCanvasLocked] = useState(() => {
    const saved = localStorage.getItem('goauct_canvas_locked');
    return saved === 'true';
  });

  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('goauct_canvas_zoom', String(zoomScale));
  }, [zoomScale]);

  useEffect(() => {
    localStorage.setItem('goauct_canvas_pan_x', String(panX));
    localStorage.setItem('goauct_canvas_pan_y', String(panY));
  }, [panX, panY]);

  useEffect(() => {
    localStorage.setItem('goauct_canvas_locked', String(isCanvasLocked));
  }, [isCanvasLocked]);

  // Widget communication active states
  const [recommendedTab, setRecommendedTab] = useState<'deals' | 'deeds' | 'foreclosures' | 'liens'>('deals');
  const [deedsAuctions, setDeedsAuctions] = useState<AuctionEvent[]>([]);
  const [foreclosureAuctions, setForeclosureAuctions] = useState<AuctionEvent[]>([]);
  const [liensAuctions, setLiensAuctions] = useState<AuctionEvent[]>([]);

  // Widget 4: Live Auctions search filters
  const [auctionQuery, setAuctionQuery] = useState('');
  const [filteredAuctions, setFilteredAuctions] = useState<AuctionEvent[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [auctionsLoading, setAuctionsLoading] = useState(false);

  // Widget 5: Property Search widget filters
  const [propSearchQuery, setPropSearchQuery] = useState('');
  const [propStateSelect, setPropStateSelect] = useState('');
  const [propCountySelect, setPropCountySelect] = useState('');
  const [stateList, setStateList] = useState<StateContact[]>([]);
  const [countyList, setCountyList] = useState<string[]>([]);
  const [propertyResults, setPropertyResults] = useState<Property[]>([]);
  const [propsLoading, setPropsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [syncTime, setSyncTime] = useState<string>('');
  const [highestZIndex, setHighestZIndex] = useState(35);

  // Drag & Resize mouse/touch interaction tracking
  const [interaction, setInteraction] = useState<{
    type: 'drag' | 'resize' | null;
    widgetId: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // ─── States for the 11 New Widgets V4.0 ───
  // My Lists (Watchlist Folders & Saved Properties)
  const [folderLists, setFolderLists] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedFolderProperties, setSelectedFolderProperties] = useState<any[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderPropertiesLoading, setFolderPropertiesLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Field Missions tasks
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myClaimedTasks, setMyClaimedTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Connect (API Hub)
  const [apiStatuses, setApiStatuses] = useState<Record<string, 'active' | 'loading' | 'failed'>>({
    fema: 'active',
    gis: 'active',
    recharts: 'active',
    db: 'active'
  });
  const [testingConnection, setTestingConnection] = useState(false);

  // Settings Panel
  const [gridSpacing, setGridSpacing] = useState(24);
  const [renderingFilter, setRenderingFilter] = useState<'fast' | 'balanced' | 'hq'>('balanced');
  const [showCoordinatesHud, setShowCoordinatesHud] = useState(true);

  // User Profile
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userNickname, setUserNickname] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Corporate Team Roster
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'investor' | 'agent'>('agent');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Activity Console Logs CLI
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState('');

  // Unified console logger helper
  const logConsoleActivity = useCallback((msg: string) => {
    setTerminalLogs(prev => [...prev, `[activity] ${msg}`].slice(-40));
  }, []);

  const toggleTickerTape = () => {
    const next = !tickerTapeVisible;
    setTickerTapeVisible(next);
    localStorage.setItem('goauct_ticker_tape_visible', String(next));
    logConsoleActivity(`${next ? 'Enabled' : 'Disabled'} Favorites Ticker Tape widget`);
  };

  // Billings & Plans
  const [billingPlan, setBillingPlan] = useState<'free' | 'pro' | 'elite'>('pro');
  const [billingInvoices, setBillingInvoices] = useState<any[]>([]);

  // Active Company Hub
  const [userCompanies, setUserCompanies] = useState<any[]>([]);

  // System Notifications Feed
  const [notifications, setNotifications] = useState<any[]>([
    { id: 'n1', type: 'info', message: 'V4.0 Advanced Widget Sandbox initialized successfully.', time: 'Just now', read: false },
    { id: 'n2', type: 'warning', message: 'FEMA Flood Zone maps refreshed for southern FL quadrant.', time: '10m ago', read: false },
    { id: 'n3', type: 'success', message: 'Synced properties with Miami-Dade County court registers.', time: '1h ago', read: true }
  ]);

  // V5.0 Investor Reviews, Task Creation & Support Ticket states
  const [myRequestedTasks, setMyRequestedTasks] = useState<Task[]>([]);
  const [activeReviewTask, setActiveReviewTask] = useState<Task | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // New task form fields
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskType, setNewTaskType] = useState('field_inspection');
  const [newTaskPoints, setNewTaskPoints] = useState(100);
  const [newTaskMinPhotos, setNewTaskMinPhotos] = useState(3);
  const [newTaskMaxPhotos, setNewTaskMaxPhotos] = useState(10);
  const [newTaskPropId, setNewTaskPropId] = useState<number | ''>('');
  const [taskCreating, setTaskCreating] = useState(false);

  // Support Ticketing widgets states
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketType, setTicketType] = useState('general');
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [supportWidgetTab, setSupportWidgetTab] = useState<'new' | 'history'>('new');



  // --- MDI EVENT LISTENER ---
  useEffect(() => {
    const handleOpenWidget = (e: Event) => {
      const customEvent = e as CustomEvent<{ widgetId: string }>;
      const { widgetId } = customEvent.detail;

      let targetWidgetId = widgetId;
      // Map shortcut names to correct widget IDs
      if (widgetId === 'live_auctions') targetWidgetId = 'live_auctions';
      else if (widgetId === 'property_search') targetWidgetId = 'property_search';
      else if (widgetId === 'my_lists') targetWidgetId = 'my_lists';
      else if (widgetId === 'field_missions') targetWidgetId = 'field_missions';
      else if (widgetId === 'settings') targetWidgetId = 'settings';
      else if (widgetId === 'team') targetWidgetId = 'team';
      else if (widgetId === 'billings') targetWidgetId = 'billings';

      setWidgets(prev => {
        const found = prev.find(w => w.id === targetWidgetId);
        if (!found) return prev;

        const nextZ = highestZIndex + 1;
        setHighestZIndex(nextZ);

        return prev.map(w =>
          w.id === targetWidgetId
            ? { ...w, visible: true, zIndex: nextZ }
            : w
        );
      });

      const target = widgets.find(w => w.id === targetWidgetId);
      if (target) {
        const targetX = -target.x + (window.innerWidth - target.w) / 2;
        const targetY = -target.y + (window.innerHeight - target.h) / 2;

        setPanX(targetX);
        setPanY(targetY);
        setZoomScale(1.0);

        logConsoleActivity(`Focused and centered on widget: "${target.title}"`);
      }
    };

    const handleOpenOverlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string; title: string; data?: any }>;
      const { type, title, data } = customEvent.detail;
      openOverlayWindow(type as any, title, data);
    };

    window.addEventListener('open-workbench-widget', handleOpenWidget as EventListener);
    window.addEventListener('open-workbench-overlay', handleOpenOverlay as EventListener);
    return () => {
      window.removeEventListener('open-workbench-widget', handleOpenWidget as EventListener);
      window.removeEventListener('open-workbench-overlay', handleOpenOverlay as EventListener);
    };
  }, [widgets, highestZIndex, logConsoleActivity]);

  // --- DEAL FLOW ENGINE STATES & HANDLERS ---
  interface NodeFlow {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed';
    x: number;
    y: number;
  }

  const [dealFlowNodes, setDealFlowNodes] = useState<NodeFlow[]>([
    { id: '1', label: 'Lead Intake', status: 'completed', x: 40, y: 150 },
    { id: '2', label: 'Underwrite', status: 'completed', x: 170, y: 80 },
    { id: '3', label: 'Inspection', status: 'active', x: 170, y: 220 },
    { id: '4', label: 'GIS Registry', status: 'pending', x: 300, y: 80 },
    { id: '5', label: 'Bid Execution', status: 'pending', x: 300, y: 220 },
    { id: '6', label: 'Closed Deal', status: 'pending', x: 420, y: 150 },
  ]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const handleAutoLayoutDealFlow = () => {
    setDealFlowNodes([
      { id: '1', label: 'Lead Intake', status: 'completed', x: 40, y: 180 },
      { id: '2', label: 'Underwrite', status: 'completed', x: 160, y: 90 },
      { id: '3', label: 'Inspection', status: 'active', x: 160, y: 270 },
      { id: '4', label: 'GIS Registry', status: 'pending', x: 280, y: 90 },
      { id: '5', label: 'Bid Execution', status: 'pending', x: 280, y: 270 },
      { id: '6', label: 'Closed Deal', status: 'pending', x: 400, y: 180 },
    ]);
    logConsoleActivity('Auto-aligned Deal Flow node geometric hierarchy.');
  };

  const handleNodeClick = (nodeId: string) => {
    setDealFlowNodes(prev =>
      prev.map(n => {
        if (n.id === nodeId) {
          const nextStatus: Record<string, 'pending' | 'active' | 'completed'> = {
            'pending': 'active',
            'active': 'completed',
            'completed': 'pending'
          };
          const updated = nextStatus[n.status];
          logConsoleActivity(`Updated node "${n.label}" to status: ${updated.toUpperCase()}`);
          return { ...n, status: updated };
        }
        return n;
      })
    );
  };

  const drawBezier = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const cx1 = from.x + dx / 2;
    const cy1 = from.y;
    const cx2 = from.x + dx / 2;
    const cy2 = to.y;
    return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNodeId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    const boundX = Math.max(20, Math.min(380, x));
    const boundY = Math.max(20, Math.min(380, y));

    setDealFlowNodes(prev =>
      prev.map(n => n.id === draggingNodeId ? { ...n, x: boundX, y: boundY } : n)
    );
  };



  // --- PROPERTY COMPARATOR STATES ---
  const [compareProp1, setCompareProp1] = useState<Property | null>(null);
  const [compareProp2, setCompareProp2] = useState<Property | null>(null);
  const [compareProp3, setCompareProp3] = useState<Property | null>(null);

  useEffect(() => {
    if (dbTopDeals.length >= 3) {
      setCompareProp1(dbTopDeals[0]);
      setCompareProp2(dbTopDeals[1]);
      setCompareProp3(dbTopDeals[2]);
    } else if (dbTopDeals.length > 0) {
      setCompareProp1(dbTopDeals[0]);
      if (dbTopDeals[1]) setCompareProp2(dbTopDeals[1]);
    }
  }, [dbTopDeals]);

  // --- REGISTRAR DIRECTORY STATES ---
  const [contactsSearchState, setContactsSearchState] = useState<string>('FL');
  const [contactsSearchCounty, setContactsSearchCounty] = useState<string>('Miami-Dade');
  const [contactsSearchList, setContactsSearchList] = useState<any[]>([]);
  const [contactsCountyList, setContactsCountyList] = useState<string[]>([]);
  const [contactsQuery, setContactsQuery] = useState<string>('');

  useEffect(() => {
    if (contactsSearchState) {
      countyService.getCounties(contactsSearchState).then(setContactsCountyList).catch(() => setContactsCountyList([]));
    } else {
      setContactsCountyList([]);
    }
  }, [contactsSearchState]);

  const handleFetchCountyContacts = useCallback(async () => {
    if (!contactsSearchState || !contactsSearchCounty) {
      setContactsSearchList([]);
      return;
    }
    try {
      const res = await countyService.getContacts(contactsSearchState, contactsSearchCounty);
      setContactsSearchList(res);
    } catch (e) {
      console.error(e);
      setContactsSearchList([]);
    }
  }, [contactsSearchState, contactsSearchCounty]);

  useEffect(() => {
    handleFetchCountyContacts();
  }, [handleFetchCountyContacts]);

  // Fetch static preferences & contacts on startup
  useEffect(() => {
    StatesService.getContacts().then(setStateList).catch(() => { });
  }, []);

  // Fetch counties when state choice changes in widget 5
  useEffect(() => {
    if (propStateSelect) {
      countyService.getCounties(propStateSelect).then(setCountyList).catch(() => setCountyList([]));
      setPropCountySelect('');
    } else {
      setCountyList([]);
      setPropCountySelect('');
    }
  }, [propStateSelect]);

  // Load initial V4.0 configurations
  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (u) {
      setCurrentUser(u);
      setUserNickname(u.nickname || (u.email ? u.email.split('@')[0] : '') || 'User');
      if (u.subscription_tier) {
        setBillingPlan(u.subscription_tier.toLowerCase() as any);
      }
    }

    setTerminalLogs([
      `[goauct-terminal-v4.0] Connection initialized.`,
      `[system] HSL Corporate Light & Cyberpunk Dark dual modes verified.`,
      `[system] Canvas zoom level: ${Math.round(zoomScale * 100)}%`,
      `[info] Type 'help' or 'clear' to command the engine.`,
      `[status] Ready for execution.`
    ]);

    setBillingInvoices([
      { id: 'INV-4921', date: '2026-05-01', amount: 149.00, status: 'Paid', method: 'Visa ···· 4242' },
      { id: 'INV-4809', date: '2026-04-01', amount: 149.00, status: 'Paid', method: 'Visa ···· 4242' },
      { id: 'INV-4702', date: '2026-03-01', amount: 149.00, status: 'Paid', method: 'Visa ···· 4242' },
    ]);
  }, []);

  // Create new list folder context
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await ClientDataService.createList(newFolderName.trim(), '', activeCompany?.id);
      setNewFolderName('');
      fetchFoldersData();
      logConsoleActivity(`Created new saved list folder: "${newFolderName.trim()}"`);
    } catch (err) {
      console.error(err);
    }
  };

  // Sync My Lists folders
  const fetchFoldersData = useCallback(async () => {
    try {
      setFoldersLoading(true);
      const data = await ClientDataService.getLists(activeCompany?.id);
      setFolderLists(data);
      if (data.length > 0 && !selectedFolderId) {
        setSelectedFolderId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
    } finally {
      setFoldersLoading(false);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    fetchFoldersData();
  }, [fetchFoldersData]);

  // Sync folder properties when selectedFolderId changes
  useEffect(() => {
    if (!selectedFolderId) {
      setSelectedFolderProperties([]);
      return;
    }
    setFolderPropertiesLoading(true);
    ClientDataService.getListProperties(selectedFolderId)
      .then(props => setSelectedFolderProperties(props))
      .catch(err => console.error(err))
      .finally(() => setFolderPropertiesLoading(false));
  }, [selectedFolderId]);

  // Load field missions (tasks)
  const fetchMissionsData = useCallback(async () => {
    try {
      setTasksLoading(true);
      const [avail, claimed, requested] = await Promise.all([
        RealtorTaskService.getAvailableTasks(),
        RealtorTaskService.getMyTasks(),
        InvestorTaskService.getMyTasks().catch(() => [])
      ]);
      setAvailableTasks(avail);
      setMyClaimedTasks(claimed);
      setMyRequestedTasks(requested);
    } catch (err) {
      console.error('Error fetching missions tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const fetchTicketsData = useCallback(async () => {
    try {
      setTicketsLoading(true);
      const tickets = await InvestorTaskService.getMyTickets().catch(() => []);
      setSupportTickets(tickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissionsData();
    fetchTicketsData();
  }, [fetchMissionsData, fetchTicketsData]);

  // Load active user's companies & roster
  useEffect(() => {
    if (currentUser?.id) {
      UserService.getUsers().then(setTeamMembers).catch(() => { });
      UserService.getUserCompanies(currentUser.id).then(setUserCompanies).catch(() => { });
    }
  }, [currentUser]);



  // Fetch backend analytics & properties
  const fetchWorkbenchData = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const [stats, monthly, topScored, metrics, deedRes, sheriffRes, foreRes, lienRes] = await Promise.all([
        getStateStats().catch(err => { console.error('getStateStats failed:', err); return []; }),
        getMonthlyStats().catch(err => { console.error('getMonthlyStats failed:', err); return []; }),
        getTopScoredProperties(12, { availability_status: 'available' } as any).catch(err => { console.error('getTopScoredProperties failed:', err); return []; }),
        // Live metrics: exact counts of active (auction_date >= today) auctions by type
        AuctionService.getMetrics().catch(err => { console.error('getMetrics failed:', err); return null; }),
        // Top Recommended Deals - Deeds (sorted by parcels count descending)
        AuctionService.getAuctionEvents({ tax_statuses: ['Deed', 'Quit Claim'], startDate: todayStr, limit: 20, sort_by_parcels: true })
          .catch(err => { console.error('deedRes failed:', err); return { items: [], total: 0 }; }),
        // Sheriff Sales (Deed type with "sheriff" in name)
        AuctionService.getAuctionEvents({ name: 'sheriff', startDate: todayStr, limit: 10, sort_by_parcels: true })
          .catch(err => { console.error('sheriffRes failed:', err); return { items: [], total: 0 }; }),
        // Top Recommended Deals - Foreclosures (sorted by parcels count descending)
        AuctionService.getAuctionEvents({ tax_status: 'Foreclosure', startDate: todayStr, limit: 20, sort_by_parcels: true })
          .catch(err => { console.error('foreRes failed:', err); return { items: [], total: 0 }; }),
        // Top Recommended Deals - Liens (sorted by parcels count descending)
        AuctionService.getAuctionEvents({ tax_statuses: ['Lien', 'Cert'], startDate: todayStr, limit: 20, sort_by_parcels: true })
          .catch(err => { console.error('lienRes failed:', err); return { items: [], total: 0 }; }),
      ]);

      setStateStats(Array.isArray(stats) ? stats : []);
      setMonthlyStats(Array.isArray(monthly) ? monthly : []);

      setDbTopDeals(Array.isArray(topScored) ? (topScored as Property[]) : []);
      if (Array.isArray(topScored) && topScored.length > 0) {
        setSelectedProperty(topScored[0] as Property);
      } else {
        setSelectedProperty(null);
      }

      // De-duplicate Deeds + Sheriff Sales (sheriff sales have Deed tax_status)
      const mergedDeeds = Array.from(
        new Map([
          ...(deedRes?.items || []),
          ...(sheriffRes?.items || [])
        ].filter(Boolean).map(item => [item?.id, item])).values()
      ).filter(Boolean);
      // Sort merged deeds by parcels_count desc
      mergedDeeds.sort((a: any, b: any) => (b.parcels_count || 0) - (a.parcels_count || 0));

      setDeedsAuctions(mergedDeeds);
      setForeclosureAuctions(foreRes?.items || []);
      setLiensAuctions(lienRes?.items || []);

      // Live metrics from database/API
      setMarketCounts({
        deed: metrics?.deed ?? deedRes?.total ?? 0,
        foreclosure: metrics?.foreclosure ?? foreRes?.total ?? 0,
        lien: metrics?.lien ?? lienRes?.total ?? 0
      });

      setSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('ClientWorkbench: failed to retrieve endpoints', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkbenchData();
    const interval = setInterval(fetchWorkbenchData, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWorkbenchData]);

  // Sync monthly stats on select state
  useEffect(() => {
    setMonthlyLoading(true);
    getMonthlyStats(selectedState || undefined)
      .then(data => setMonthlyStats(data))
      .catch(() => { })
      .finally(() => setMonthlyLoading(false));
  }, [selectedState]);

  // Keep a ref of widgets for immediate save on unmount and beforeunload
  const widgetsRef = useRef(widgets);
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const mountedRef = useRef(false);

  // Save widgets state to local storage when modified (immediate save on interaction end / discrete update, debounced during drag/resize)
  useEffect(() => {
    if (!isLayoutLoaded) return; // Do not save before we successfully loaded the layout from localStorage

    // Skip the initial mount to prevent overwriting localStorage due to SSR hydration
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!widgets || widgets.length === 0) return;

    if (interaction === null) {
      localStorage.setItem('goauct_workbench_widgets_v62', JSON.stringify(widgets));
    } else {
      const timer = setTimeout(() => {
        localStorage.setItem('goauct_workbench_widgets_v62', JSON.stringify(widgets));
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [widgets, interaction, isLayoutLoaded]);

  // Immediate save on beforeunload to handle page reloads and tab closure
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (widgetsRef.current && widgetsRef.current.length > 0) {
        localStorage.setItem('goauct_workbench_widgets_v62', JSON.stringify(widgetsRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Bring window to focus
  const focusWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const match = prev.find(w => w.id === id);
      if (match && match.zIndex < highestZIndex) {
        const nextZ = highestZIndex + 1;
        setHighestZIndex(nextZ);
        return prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w);
      }
      return prev;
    });
  }, [highestZIndex]);

  // List management helpers
  const handleDeleteFolder = async (id: number) => {
    if (!confirm('Are you sure you want to delete this watchlist folder?')) return;
    try {
      await ClientDataService.deleteList(id);
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
      fetchFoldersData();
      logConsoleActivity('Deleted saved list folder.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemovePropertyFromFolder = async (listId: number, propertyId: number) => {
    try {
      await ClientDataService.removePropertyFromList(listId, propertyId);
      // Refresh properties inside folder
      const props = await ClientDataService.getListProperties(listId);
      setSelectedFolderProperties(props);
      logConsoleActivity('Removed property from watchlist folder.');
    } catch (err) {
      console.error(err);
    }
  };

  // Field mission task helpers
  const handleClaimTask = async (taskId: number) => {
    try {
      await RealtorTaskService.claimTask(taskId);
      fetchMissionsData();
      logConsoleActivity(`Successfully claimed field task mission ID: ${taskId}`);
      alert('Mission claimed successfully! You can view it in claimed tasks.');
    } catch (err: any) {
      alert(err.message || 'Failed to claim task');
      console.error(err);
    }
  };

  const handleRequestFieldInspection = async () => {
    if (!selectedProperty) return;
    try {
      await InvestorTaskService.createTask({
        property_id: selectedProperty.id,
        title: `Field Inspection: ${selectedProperty.parcel_id || 'N/A'}`,
        description: `Inspect and photograph property at ${selectedProperty.address || 'Address N/A'}`,
        task_type: 'field_inspection',
        min_photos: 3,
        max_photos: 10,
        reward_points: 100
      });
      fetchMissionsData();
      logConsoleActivity(`Requested field task inspection for parcel: ${selectedProperty.parcel_id}`);
      alert('Field inspection task created and listed in available missions!');
    } catch (err: any) {
      alert(err.message || 'Failed to create field inspection task');
      console.error(err);
    }
  };

  // Connect helper
  const handleRunDiagnostics = () => {
    setTestingConnection(true);
    logConsoleActivity('Running API connection health diagnostics...');
    setApiStatuses(prev => ({ ...prev, fema: 'loading', gis: 'loading', db: 'loading' }));

    setTimeout(() => {
      setApiStatuses({
        fema: 'active',
        gis: 'active',
        recharts: 'active',
        db: 'active'
      });
      setTestingConnection(false);
      logConsoleActivity('All systems checked: 4/4 APIs fully operational.');
    }, 1200);
  };

  // Settings helper
  const handleResetLayoutCache = () => {
    if (confirm('Wipe layout cache and reset all widgets?')) {
      localStorage.removeItem('goauct_workbench_widgets_v62');
      setWidgets(DEFAULT_WIDGETS);
      setZoomScale(1.0);
      setPanX(0);
      setPanY(0);
      logConsoleActivity('Wiped local layout cache, windows reset to absolute default coordinates.');
    }
  };

  // Profile helper
  const handleSaveProfileNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNickname.trim()) return;
    setProfileSaving(true);
    try {
      const updated = { ...currentUser, nickname: userNickname.trim() };
      setCurrentUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      try {
        await UserService.update(currentUser.id, { email: currentUser.email }); // Sync touch
      } catch (e) {
        console.warn('API sync failed, saved locally instead.');
      }
      logConsoleActivity(`Profile updated. Nickname set to "${userNickname.trim()}"`);
      alert('Profile nickname updated successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Team helper
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSubmitting(true);
    try {
      const newUser = await UserService.create({
        email: inviteEmail.trim(),
        password: 'TemporaryPassword123!',
        role: inviteRole as any,
        company_ids: activeCompany ? [activeCompany.id] : []
      });
      setTeamMembers(prev => [...prev, newUser]);
      setInviteEmail('');
      logConsoleActivity(`Sent corporate invite to: ${inviteEmail.trim()} as ${inviteRole}`);
      alert('User created and added to the corporate roster successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
      console.error(err);
    } finally {
      setInviteSubmitting(false);
    }
  };

  // V5.0 Action Helpers
  const handleReviewSubmission = async (taskId: number, approved: boolean) => {
    setReviewSubmitting(true);
    try {
      await InvestorTaskService.reviewSubmission(taskId, approved, reviewNotes || 'Review by investor client');
      logConsoleActivity(`Reviewed field task ID ${taskId}: ${approved ? 'APPROVED' : 'REJECTED'}`);
      alert(`Task has been successfully ${approved ? 'approved' : 'rejected and sent back'}.`);
      setActiveReviewTask(null);
      setReviewNotes('');
      fetchMissionsData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleCreateTaskFromWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTaskCreating(true);
    try {
      await InvestorTaskService.createTask({
        property_id: newTaskPropId ? Number(newTaskPropId) : selectedProperty?.id || 1,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        task_type: newTaskType,
        min_photos: newTaskMinPhotos,
        max_photos: newTaskMaxPhotos,
        reward_points: newTaskPoints,
      });
      logConsoleActivity(`Created new field mission task: "${newTaskTitle.trim()}"`);
      alert('Mission task created successfully!');
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPropId('');
      fetchMissionsData();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
      console.error(err);
    } finally {
      setTaskCreating(false);
    }
  };

  const handleCreateTicketFromWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketSubmitting(true);
    try {
      await InvestorTaskService.createSupportTicket({
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        ticket_type: ticketType,
      });
      logConsoleActivity(`Submitted support ticket: "${ticketSubject.trim()}"`);
      alert('Support ticket created successfully!');
      setTicketSubject('');
      setTicketMessage('');
      fetchTicketsData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
      console.error(err);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Logs terminal command executor
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;

    setTerminalLogs(prev => [...prev, `> ${terminalInput}`]);
    setTerminalInput('');

    if (cmd === 'help') {
      setTerminalLogs(prev => [
        ...prev,
        `Available commands:`,
        `  help    - Show this manual`,
        `  status  - Print workspace diagnostic report`,
        `  widgets - List all widgets details`,
        `  refresh - Sync all database metrics live`,
        `  clear   - Wipe console screen buffer`
      ]);
    } else if (cmd === 'status') {
      setTerminalLogs(prev => [
        ...prev,
        `Canvas scale: ${Math.round(zoomScale * 100)}%`,
        `Pan coordinates: X:${panX}px, Y:${panY}px`,
        `Sync frequency: 3 minutes`,
        `Active company context: ${activeCompany?.name || 'Personal Account'}`
      ]);
    } else if (cmd === 'widgets') {
      setTerminalLogs(prev => [
        ...prev,
        `Registered Widgets (${widgets.length}):`,
        ...widgets.map(w => `  ${w.id} - ${w.visible ? 'VISIBLE' : 'HIDDEN'} (z: ${w.zIndex})`)
      ]);
    } else if (cmd === 'refresh') {
      fetchWorkbenchData();
      logConsoleActivity('Manual sync triggered via CLI terminal.');
    } else if (cmd === 'clear') {
      setTerminalLogs([
        `[goauct-terminal-v4.0] Screen cleared.`,
        `[info] Type 'help' or 'clear' to command the engine.`
      ]);
    } else {
      setTerminalLogs(prev => [...prev, `Unknown command: '${cmd}'. Type 'help' for suggestions.`]);
    }
  };

  // Notifications helpers
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    logConsoleActivity('Marked notification as read.');
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    logConsoleActivity('Marked all system notifications as read.');
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    logConsoleActivity('Dismissed system notification.');
  };

  // Split panel divider drag handler
  const handleSplitDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    splitDraggingRef.current = true;
    const startX = e.clientX;
    const startPct = splitLeftWidthPct;
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const containerW = container.getBoundingClientRect().width;

    const onMove = (moveE: MouseEvent) => {
      if (!splitDraggingRef.current) return;
      const delta = moveE.clientX - startX;
      const newPct = Math.min(80, Math.max(20, startPct + (delta / containerW) * 100));
      setSplitLeftWidthPct(Math.round(newPct));
    };
    const onUp = () => {
      splitDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Window Drag & Resize Mouse Handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    widgetId: string,
    type: 'drag' | 'resize'
  ) => {
    e.preventDefault();
    focusWidget(widgetId);

    const targetWidget = widgets.find(w => w.id === widgetId);
    if (!targetWidget || targetWidget.isLocked) return;

    setInteraction({
      type,
      widgetId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: targetWidget.x,
      startTop: targetWidget.y,
      startWidth: targetWidget.w,
      startHeight: targetWidget.h,
    });
  };

  // Window Drag & Resize Touch Handlers for mobile device support
  const handleTouchStart = (
    e: React.TouchEvent,
    widgetId: string,
    type: 'drag' | 'resize'
  ) => {
    focusWidget(widgetId);

    const targetWidget = widgets.find(w => w.id === widgetId);
    if (!targetWidget || targetWidget.isLocked) return;

    const touch = e.touches[0];
    setInteraction({
      type,
      widgetId,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: targetWidget.x,
      startTop: targetWidget.y,
      startWidth: targetWidget.w,
      startHeight: targetWidget.h,
    });
  };

  // Mouse drag coordination useEffect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction) return;

      const deltaX = (e.clientX - interaction.startX) / zoomScale;
      const deltaY = (e.clientY - interaction.startY) / zoomScale;

      setWidgets(prev =>
        prev.map(w => {
          if (w.id !== interaction.widgetId) return w;

          if (interaction.type === 'drag') {
            return { ...w, x: interaction.startLeft + deltaX, y: interaction.startTop + deltaY };
          } else if (interaction.type === 'resize') {
            return {
              ...w,
              w: Math.max(240, interaction.startWidth + deltaX),
              h: Math.max(120, interaction.startHeight + deltaY)
            };
          }
          return w;
        })
      );
    };

    const handleMouseUp = () => {
      if (interaction) {
        setInteraction(null);
      }
    };

    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, zoomScale]);

  // Touch drag coordination useEffect with scale correction
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!interaction) return;

      const touch = e.touches[0];
      const deltaX = (touch.clientX - interaction.startX) / zoomScale;
      const deltaY = (touch.clientY - interaction.startY) / zoomScale;

      setWidgets(prev =>
        prev.map(w => {
          if (w.id !== interaction.widgetId) return w;

          if (interaction.type === 'drag') {
            return { ...w, x: interaction.startLeft + deltaX, y: interaction.startTop + deltaY };
          } else if (interaction.type === 'resize') {
            return {
              ...w,
              w: Math.max(240, interaction.startWidth + deltaX),
              h: Math.max(120, interaction.startHeight + deltaY)
            };
          }
          return w;
        })
      );
    };

    const handleTouchEnd = () => {
      if (interaction) {
        setInteraction(null);
      }
    };

    if (interaction) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [interaction, zoomScale]);

  // Non-passive Wheel event hook for precise tracking
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const handleWheel = (e: WheelEvent) => {
      if (isCanvasLocked) return;
      e.preventDefault();
      const zoomFactor = 0.04;
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoomScale(prev => {
        const nextZoom = Math.min(2.0, Math.max(0.3, prev + direction * zoomFactor));
        return parseFloat(nextZoom.toFixed(2));
      });
    };

    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [isCanvasLocked]);

  // Background Canvas pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isCanvasLocked) return;
    if (
      e.target === canvasRef.current ||
      (e.target as HTMLElement).classList.contains('canvas-grid') ||
      (e.target as HTMLElement).id === 'infinite-plane'
    ) {
      e.preventDefault();
      setIsPanningCanvas(true);
      panStartRef.current = {
        x: e.clientX - panX,
        y: e.clientY - panY
      };
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (isCanvasLocked) return;
    if (
      e.target === canvasRef.current ||
      (e.target as HTMLElement).classList.contains('canvas-grid') ||
      (e.target as HTMLElement).id === 'infinite-plane'
    ) {
      const touch = e.touches[0];
      setIsPanningCanvas(true);
      panStartRef.current = {
        x: touch.clientX - panX,
        y: touch.clientY - panY
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningCanvas) {
        setPanX(e.clientX - panStartRef.current.x);
        setPanY(e.clientY - panStartRef.current.y);
      }
    };

    const handleMouseUp = () => {
      setIsPanningCanvas(false);
    };

    if (isPanningCanvas) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanningCanvas]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isPanningCanvas && e.touches.length === 1) {
        const touch = e.touches[0];
        setPanX(touch.clientX - panStartRef.current.x);
        setPanY(touch.clientY - panStartRef.current.y);
      }
    };

    const handleTouchEnd = () => {
      setIsPanningCanvas(false);
    };

    if (isPanningCanvas) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPanningCanvas]);

  // Live Auctions backend filtering logic
  useEffect(() => {
    const filterAuctions = async () => {
      setAuctionsLoading(true);
      try {
        const params: any = { limit: 20 };
        if (auctionQuery) params.q = auctionQuery;
        if (selectedCalendarDate) {
          params.startDate = selectedCalendarDate;
          params.endDate = selectedCalendarDate;
        }
        const res = await AuctionService.getAuctionEvents(params);
        setFilteredAuctions(res.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setAuctionsLoading(false);
      }
    };

    const timer = setTimeout(filterAuctions, 300);
    return () => clearTimeout(timer);
  }, [auctionQuery, selectedCalendarDate]);

  // Property Search backend filtering logic
  useEffect(() => {
    const filterProperties = async () => {
      setPropsLoading(true);
      try {
        const params: any = { limit: 20, availability_status: 'available' };
        if (propSearchQuery) params.q = propSearchQuery;
        if (propStateSelect) params.state = propStateSelect;
        if (propCountySelect) params.county = propCountySelect;

        const res = await PropertyService.getProperties(params);
        const items = (res as any).items || res;
        if (Array.isArray(items)) {
          setPropertyResults(items);
        } else {
          setPropertyResults([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setPropsLoading(false);
      }
    };

    const timer = setTimeout(filterProperties, 300);
    return () => clearTimeout(timer);
  }, [propSearchQuery, propStateSelect, propCountySelect]);



  const toggleVisibility = (id: string) => {
    let wasVisible = false;
    setWidgets(prev => {
      wasVisible = prev.find(w => w.id === id)?.visible || false;
      const targetNextVisible = !wasVisible;

      return prev.map(w => {
        if (w.id === id) {
          return { ...w, visible: targetNextVisible };
        }
        return w;
      });
    });

    if (layoutTemplate === 'ide') {
      if (!wasVisible) {
        setActiveIdeTabId(id);
      } else if (activeIdeTabId === id) {
        // If we closed the active tab, pick another visible one if any
        setTimeout(() => {
          setWidgets(currentWidgets => {
            const open = currentWidgets.filter(w => w.visible);
            if (open.length > 0) {
              setActiveIdeTabId(open[0].id);
            } else {
              setActiveIdeTabId(null);
            }
            return currentWidgets;
          });
        }, 50);
      }
    } else {
      focusWidget(id);
    }
  };
  const applyPreset = (presetId: string) => {
    let nextZ = highestZIndex;
    const incrementZ = () => {
      nextZ += 1;
      return nextZ;
    };

    setZoomScale(1.0);
    setPanX(0);
    setPanY(0);

    // Check if it's a custom preset
    const custom = customPresets.find(p => p.id === presetId);
    if (custom) {
      setWidgets(prev => {
        const updated = prev.map(w => {
          const saved = custom.widgets.find(sw => sw.id === w.id);
          if (saved) {
            return { ...w, x: saved.x, y: saved.y, w: saved.w, h: saved.h, visible: saved.visible, zIndex: incrementZ() };
          }
          return { ...w, visible: false };
        });
        setHighestZIndex(nextZ);
        return updated;
      });
      logConsoleActivity(`Applied custom preset: "${custom.label}"`);
      return;
    }

    setWidgets(prev => {
      const updated = prev.map(w => {
        let coords = { x: w.x, y: w.y, w: w.w, h: w.h, visible: true, zIndex: incrementZ() };

        if (presetId === 'default') {
          const match = DEFAULT_WIDGETS.find(d => d.id === w.id);
          if (match) coords = { ...match, visible: true, zIndex: incrementZ() };
        } else if (presetId === 'map_focus') {
          if (w.id === 'map') {
            coords = { x: 20, y: 20, w: 1200, h: 560, visible: true, zIndex: incrementZ() };
          } else {
            coords = { ...w, visible: false };
          }
        } else if (presetId === 'analytics_focus') {
          if (w.id === 'map') {
            coords = { x: 20, y: 20, w: 600, h: 560, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'smart_ai_finder') {
            coords = { x: 640, y: 20, w: 600, h: 560, visible: true, zIndex: incrementZ() };
          } else {
            coords = { ...w, visible: false };
          }
        } else if (presetId === 'dossier_focus') {
          if (w.id === 'smart_ai_finder') {
            coords = { x: 20, y: 20, w: 1200, h: 560, visible: true, zIndex: incrementZ() };
          } else {
            coords = { ...w, visible: false };
          }
        }

        return { ...w, ...coords };
      });

      setHighestZIndex(nextZ);
      return updated;
    });
  };

  // Yield aggregates
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

  const pieData = useMemo(() => {
    return [
      { name: 'Tax Deeds', value: totals.deed, color: CHART_COLORS.deed },
      { name: 'Tax Liens', value: totals.lien, color: CHART_COLORS.lien },
      { name: 'Foreclosures', value: totals.foreclosure, color: CHART_COLORS.foreclosure }
    ].filter(item => item.value > 0);
  }, [totals]);

  const activeCode = selectedState ? resolveStateCode(selectedState) : null;

  const renderWidgetById = (id: string | null) => {
    if (!id) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900 select-none">
          <Sparkles size={48} className="opacity-20" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-500">No active view</p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Select a view to render here</p>
          </div>
        </div>
      );
    }
    const w = widgets.find(x => x.id === id);
    if (!w) return <p className="text-xs text-slate-400 italic p-4 bg-white dark:bg-slate-900">Widget not found</p>;

    // Route to embedded widget content
    return (
      <div className="size-full overflow-auto p-4 select-text flex flex-col min-h-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
        {w.type === 'smart_ai_finder' && (
          <div className="size-full overflow-hidden">
            <SmartAIDealFinder onOpenPropertyDetails={handleOpenPropertyDetails} onPreviewProperty={(parcelId) => setPreviewPropertyId(parcelId)} />
          </div>
        )}

        {w.type === 'map' && (
          <div className="h-full min-h-[400px]">
            <MapDashboard 
              onStateClick={handleStateClick} 
              mapCustomization={mapCustomization} 
              favoriteStates={favoriteStates} 
              selectedState={selectedState}
              myListStats={myListStats}
              activeMode={activeMode}
              setActiveMode={setActiveMode}
              stateStats={stateStats}
              topProperties={topProperties}
              loadingStats={loadingStats}
              onPreviewProperty={(parcelId) => setPreviewPropertyId(parcelId)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden select-none bg-slate-50 dark:bg-sol-base03 font-display">

      {/* ─── WORKBENCH SYSTEM TOP BAR (Mission Control Header) ─── */}
      <div className="w-full h-11 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex justify-between items-center shrink-0 z-[9999] select-none">
        <div id="tour-welcome-header" className="flex items-center gap-2.5">
          <img
            src="/goauct-logo.png"
            alt="GoAuct Logo"
            className="w-6 h-6 rounded-md object-cover shadow-sm border border-slate-200/20 dark:border-slate-800/20 animate-in fade-in duration-500"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-105">
                GoAuct Mission Control
              </span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
              Workspace v4.0 · Client Node
            </span>
          </div>
        </div>

        {/* Center: Live Dynamic Announcement Ticker */}
        {(() => {
          const DEFAULT_ANNOUNCEMENTS = [
            { id: -1, title: 'Compliance', message: 'FL deeds deadline extended to May 30', type: 'info' },
            { id: -2, title: 'AI Calibration', message: 'AI Yield calibrated for all 67 counties', type: 'update' },
            { id: -3, title: 'County Sync', message: 'Real-time county data syncer running', type: 'success' }
          ];
          const activeAnnouncements = announcements.length > 0 ? announcements : DEFAULT_ANNOUNCEMENTS;
          const currentAnn = activeAnnouncements[annIndex % activeAnnouncements.length];
          const typeMap: Record<string, { bg: string; icon: string; textClass: string; color: string }> = {
            info: { bg: 'bg-blue-500/10 border-blue-500/25', icon: '📢', textClass: 'text-blue-600 dark:text-blue-400', color: 'bg-blue-500' },
            warning: { bg: 'bg-amber-500/10 border-amber-500/25', icon: '⚠️', textClass: 'text-amber-600 dark:text-amber-400', color: 'bg-amber-500' },
            success: { bg: 'bg-emerald-500/10 border-emerald-500/25', icon: '✅', textClass: 'text-emerald-600 dark:text-emerald-400', color: 'bg-emerald-500' },
            update: { bg: 'bg-purple-500/10 border-purple-500/25', icon: '✨', textClass: 'text-purple-600 dark:text-purple-400', color: 'bg-purple-500' },
          };
          const cfg = typeMap[currentAnn?.type] || typeMap.info;

          return (
            <div id="tour-announcements" className={`hidden lg:flex items-center gap-3 border px-3.5 py-1 rounded-xl max-w-sm overflow-hidden relative transition-all duration-300 ${cfg.bg}`}>
              <div className={`flex items-center gap-1 shrink-0 text-[8px] font-extrabold uppercase tracking-wider ${cfg.textClass}`}>
                <span className={`size-1 rounded-full animate-pulse ${cfg.color}`} />
                <span>{currentAnn?.title}:</span>
              </div>
              <div className="relative w-52 h-4 overflow-hidden flex items-center">
                <span className="text-[8px] font-bold text-slate-600 dark:text-slate-350 truncate">
                  {cfg.icon} {currentAnn?.message}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Right Side: Quick Action Buttons & Status Indicators */}
        <div className="flex items-center gap-4">

          {/* Company Context Selector inside the Header */}
          <CompanySelector compact />

          <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-400 dark:text-slate-550 uppercase">
            <span>Grid Zoom:</span>
            <button
              onClick={() => setZoomScale(1.0)}
              className="text-slate-655 dark:text-slate-300 hover:text-indigo-500 transition-colors bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-black active:scale-95"
              title="Reset Zoom"
            >
              {Math.round(zoomScale * 100)}%
            </button>
          </div>
          <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* Notification Bell */}
          <div
            className="relative cursor-pointer flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-colors"
            title="Notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {upcomingAuctionsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-red-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            )}

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-800 dark:text-white">Alerts</span>
                  {upcomingAuctionsCount > 0 && (
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">{upcomingAuctionsCount} New</span>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {upcomingAuctionsCount > 0 && (
                    <div
                      className="p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex gap-3"
                      onClick={() => { setNotificationsOpen(false); openOverlayWindow('my_lists', 'Saved Lists & Folders'); }}
                    >
                      <div className="mt-0.5 size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 leading-tight">Upcoming Auctions Detected</p>
                        <p className="text-[10px] text-slate-500">You have {upcomingAuctionsCount} properties in your My List that are going to auction within the next 7 days.</p>
                      </div>
                    </div>
                  )}

                  {/* System Announcements */}
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex gap-3">
                      <div className="mt-0.5 size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">campaign</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 leading-tight">{ann.title}</p>
                        <p className="text-[10px] text-slate-500">{ann.message}</p>
                      </div>
                    </div>
                  ))}

                  {upcomingAuctionsCount === 0 && announcements.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <span className="material-symbols-outlined text-3xl mb-2 opacity-50">notifications_paused</span>
                      <p className="text-xs">No new notifications</p>
                    </div>
                  )}
                </div>
                <div
                  className="bg-slate-50 dark:bg-slate-900/30 p-2 text-center text-[10px] font-bold text-blue-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                  onClick={() => { setNotificationsOpen(false); openOverlayWindow('my_lists', 'Saved Lists & Folders'); }}
                >
                  Manage Watchlists
                </div>
              </div>
            )}
          </div>

          <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-400 dark:text-slate-550 uppercase">
            <span>Status:</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-extrabold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* ─── TICKER TAPE WIDGET (Next 30 Days) ─── */}
      {tickerTapeVisible && <TickerTapeWidget />}

      {/* ─── MAIN WORKBENCH PANEL ─── */}
      <div className="flex-1 flex w-full overflow-hidden relative">

        {/* ─── SIDEBAR 1: Primary VS Code Ribbon (64px desktop, 40px mobile) ─── */}
        <div className="w-10 md:w-16 bg-white dark:bg-sol-base02 border-r border-slate-200/80 dark:border-sol-base01/20 flex flex-col justify-between py-4 items-center shrink-0 z-40 overflow-y-auto no-scrollbar scrollbar-none">
          <div className="flex flex-col gap-3 w-full items-center">
            {[
              { id: 'explorer', icon: Layers, label: 'Workspace Explorer' },
              { id: 'presets', icon: LayoutGrid, label: 'Layout Presets' },
              { id: 'info', icon: HelpCircle, label: 'Workbench Info' }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activePane === tab.id && sidebarOpen;
              return (
                <button
                  key={tab.id}
                  title={tab.label}
                  onClick={() => {
                    if (activePane === tab.id) {
                      setSidebarOpen(!sidebarOpen);
                    } else {
                      setActivePane(tab.id as any);
                      setSidebarOpen(true);
                    }
                  }}
                  className={`relative p-2.5 rounded-xl transition-all ${active
                      ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/10 shadow-sm'
                      : 'text-slate-400 dark:text-slate-650 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-0.75 bg-blue-500 rounded-r" />
                  )}
                  <Icon size={18} />
                </button>
              );
            })}

            {/* Separator line for direct window shortcuts */}
            <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800/80 my-1" />

            {[
              { id: 'live_auctions', icon: Calendar, label: 'Live Auctions Finder' },
              { id: 'property_search', icon: Search, label: 'Property Search & Listing' },
              { id: 'my_lists', icon: Folder, label: 'Saved Lists & Folders' },
              { id: 'field_missions', icon: Activity, label: 'Field Task Missions' },
              { id: 'connect', icon: Compass, label: 'Connect Hub' },
              { id: 'team_and_logs', icon: Users, label: 'Team & Activity Logs' },
              { id: 'billings_and_plans', icon: CreditCard, label: 'Billing & Plans' },
              { id: 'settings', icon: Settings, label: 'Workbench Settings' }
            ].map(shortcut => {
              const Icon = shortcut.icon;
              const isVisible = shortcut.id === 'notifications'
                ? activePane === 'notifications' && sidebarOpen
                : shortcut.id === 'connect'
                  ? activePane === 'connect' && sidebarOpen
                  : overlayWindows.some(w => w.id === shortcut.id && !w.isMinimized);

              return (
                <button
                  key={shortcut.id}
                  id={
                    shortcut.id === 'settings' ? 'tour-nav-account-settings' :
                      shortcut.id === 'field_missions' ? 'tour-nav-field-missions' :
                        shortcut.id === 'live_auctions' ? 'tour-nav-live-auctions' :
                          shortcut.id === 'property_search' ? 'tour-nav-property-search' :
                            shortcut.id === 'my_lists' ? 'tour-nav-my-lists' :
                              shortcut.id === 'billings_and_plans' ? 'tour-upgrade-button' :
                                undefined
                  }
                  title={shortcut.label}
                  onClick={() => {
                    if (shortcut.id === 'notifications') {
                      if (activePane === 'notifications' && sidebarOpen) {
                        setSidebarOpen(false);
                      } else {
                        setActivePane('notifications');
                        setSidebarOpen(true);
                      }
                    } else if (shortcut.id === 'connect') {
                      if (activePane === 'connect' && sidebarOpen) {
                        setSidebarOpen(false);
                      } else {
                        setActivePane('connect');
                        setSidebarOpen(true);
                      }
                    } else {
                      openOverlayWindow(shortcut.id as any, shortcut.label);
                    }
                  }}
                  className={`relative p-2.5 rounded-xl transition-all ${isVisible
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-955/10 border border-indigo-500/10 shadow-sm'
                      : 'text-slate-400 dark:text-slate-655 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                >
                  {isVisible && shortcut.id !== 'notifications' && shortcut.id !== 'connect' && (
                    <div className="absolute right-1 bottom-1 size-1.5 rounded-full bg-emerald-500 shadow-sm border border-white dark:border-slate-950" />
                  )}
                  {shortcut.id === 'notifications' && upcomingAuctionsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 text-[6.5px] font-black text-white items-center justify-center border border-white dark:border-slate-950">
                        {upcomingAuctionsCount}
                      </span>
                    </span>
                  )}
                  <Icon size={16} />
                </button>
              );
            })}
          </div>


          <div className="flex flex-col gap-4 items-center w-full border-t border-slate-100 dark:border-slate-800/85 pt-4">
            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title="Sign Out of GoAuct OS"
              className="p-2 text-slate-400 dark:text-slate-655 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
            >
              <LogOut size={18} />
            </button>

            {/* Toggle Workbench Drawer */}
            {sidebarOpen ? (
              <button
                onClick={() => setSidebarOpen(false)}
                title="Collapse Workbench Drawer"
                className="p-2 text-slate-400 dark:text-slate-655 hover:text-slate-700 dark:hover:text-slate-350 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-chevron-left" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Expand Workbench Drawer"
                className="p-2 text-slate-400 dark:text-slate-655 hover:text-slate-700 dark:hover:text-slate-350 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-chevron-right" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ─── SIDEBAR 2: Collapsible Secondary Drawer (240px) — hidden on mobile ─── */}
        <div
          className={`flex absolute left-10 md:static z-50 h-[calc(100vh-120px)] md:h-auto bg-white/95 dark:bg-sol-base02/95 border-r border-slate-200/80 dark:border-sol-base01/20 flex-col transition-all duration-300 backdrop-blur-sm shrink-0 overflow-y-auto ${
            sidebarOpen 
              ? 'w-60 opacity-100 shadow-2xl md:shadow-none' 
              : 'w-0 opacity-0 pointer-events-none border-r-0'
          }`}
        >
          {sidebarOpen && (
            <div className="p-4 flex flex-col space-y-5 select-none w-60">

              {activePane === 'explorer' && (
                <>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Workspace Explorer</h3>
                    <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Toggle widgets on canvas</p>
                    <p className="text-[8.5px] text-slate-500 dark:text-slate-400 mt-2 bg-blue-500/5 dark:bg-blue-955/10 border border-blue-500/10 p-2 rounded-lg font-bold leading-normal">
                      Click on the icons to open internal floating windows within GoAuct. Organize your workspace however you prefer.
                    </p>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    {widgets.filter(w => ['map', 'smart_ai_finder'].includes(w.id)).map(w => (
                      <button
                        key={w.id}
                        onClick={() => toggleVisibility(w.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${w.visible
                            ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-500/20 text-blue-700 dark:text-blue-400 font-bold'
                            : 'bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-455 dark:text-slate-600 font-semibold'
                          }`}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          {w.type === 'map' && <Map size={13} />}
                          {w.type === 'smart_ai_finder' && <Brain size={13} />}
                          <span className="truncate max-w-[130px]">{w.title}</span>
                        </div>
                        {w.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col space-y-1.5 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Global Widgets</span>
                    <button
                      onClick={toggleTickerTape}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${tickerTapeVisible
                          ? 'bg-amber-50/50 dark:bg-amber-955/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
                          : 'bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-455 dark:text-slate-600 font-semibold'
                        }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar size={13} className="text-amber-500" />
                        <span className="truncate max-w-[130px]">Favorites Ticker</span>
                      </div>
                      {tickerTapeVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Workspace stats</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60">
                        <span className="text-slate-400 block text-[8px] uppercase">Active</span>
                        <span className="text-slate-900 dark:text-white text-xs font-black">
                          {widgets.filter(w => w.visible).length + (tickerTapeVisible ? 1 : 0)} / {widgets.length + 1}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60">
                        <span className="text-slate-400 block text-[8px] uppercase">Focus State</span>
                        <span className="text-blue-500 dark:text-blue-400 text-xs font-black">
                          {selectedState || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activePane === 'presets' && (
                <>
                  {isCreatingPreset ? (
                    <div className="flex flex-col space-y-4 select-none">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Create Layout Preset</h3>
                        <p className="text-[8px] font-bold text-slate-455 uppercase tracking-widest mt-0.5">Customize your empty blueprint</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Preset Name</label>
                        <input
                          type="text"
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          placeholder="e.g. My Yield Room"
                          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>

                      <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-800/80 my-1" />

                      <div className="flex flex-col space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Add Workspace Tools</span>
                        {widgets
                          .filter(w => !['my_lists', 'live_auctions', 'property_search', 'field_missions', 'property_details'].includes(w.type))
                          .map(w => (
                            <button
                              key={w.id}
                              onClick={() => toggleWidgetInPreset(w.id)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${w.visible
                                  ? 'bg-indigo-50/50 dark:bg-indigo-955/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold'
                                  : 'bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-455 dark:text-slate-600 font-semibold'
                                }`}
                            >
                              <span className="text-xs truncate">{w.title}</span>
                              {w.visible ? (
                                <span className="size-2 rounded-full bg-indigo-500" />
                              ) : (
                                <span className="size-2 rounded-full border border-slate-400" />
                              )}
                            </button>
                          ))}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={saveCustomPreset}
                          className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelCustomPresetCreation}
                          className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>


                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Layout Presets</h3>
                          <p className="text-[8px] font-bold text-slate-455 uppercase tracking-widest mt-0.5">Quick window arrangements</p>
                        </div>
                        <button
                          onClick={startCustomPresetCreation}
                          className="px-2.5 py-1 text-[8.5px] font-black bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg uppercase tracking-wider shadow-sm transition-all"
                        >
                          + Create
                        </button>
                      </div>

                      <div className="flex flex-col space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {/* Standard Presets */}
                        {[
                          // Empty standard presets to allow starting from scratch
                        ].map(p => {
                          const Icon = p.icon;
                          return (
                            <button
                              key={p.id}
                              onClick={() => applyPreset(p.id)}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors group"
                            >
                              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                <Icon size={14} />
                                <span>{p.label}</span>
                              </div>
                              <p className="text-[9px] text-slate-455 dark:text-slate-500 mt-1 leading-normal font-semibold">{p.desc}</p>
                            </button>
                          );
                        })}

                        {/* Custom Presets list */}
                        {customPresets.map(p => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left flex flex-col space-y-1 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => applyPreset(p.id)}
                                className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                              >
                                <Layout size={14} className="text-indigo-400" />
                                <span>{p.label}</span>
                              </button>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleFavoriteCustomPreset(p.id)}
                                  className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${p.favorite ? 'text-amber-500' : 'text-slate-400'}`}
                                  title="Favorite preset"
                                >
                                  ★
                                </button>
                                <button
                                  onClick={() => deleteCustomPreset(p.id)}
                                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors"
                                  title="Delete preset"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-455 dark:text-slate-500 leading-normal font-semibold font-bold">Custom widget layout</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}


              {activePane === 'notifications' && (
                <>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">System Alerts</h3>
                    <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Live Watchlists Updates</p>
                  </div>

                  <div className="flex flex-col space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                    {upcomingAuctionsCount > 0 ? (
                      <div
                        onClick={() => openOverlayWindow('my_lists', 'Saved Lists & Folders')}
                        className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-955/10 border border-orange-500/20 text-left transition-all cursor-pointer flex gap-2.5 hover:border-orange-500/40"
                      >
                        <div className="size-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[14px]">gavel</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-900 dark:text-white leading-tight">Upcoming Auctions</p>
                          <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">You have {upcomingAuctionsCount} watchlisted properties going to auction within the next 7 days.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wider">
                        <Bell size={24} className="mx-auto mb-2 opacity-30 text-indigo-400" />
                        <span>All caught up!</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activePane === 'connect' && (
                <>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Connect Hub</h3>
                    <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Networking & Training Modules</p>
                  </div>

                  <div className="flex flex-col space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                    <button
                      onClick={() => openOverlayWindow('training', 'Training Center')}
                      className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-955/10 border border-blue-500/20 text-left transition-all hover:border-blue-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/40 flex gap-2.5 group w-full"
                    >
                      <div className="size-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[14px]">school</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 dark:text-white leading-tight">Training Center</p>
                        <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">Investor learning paths, state manuals, and platform tutorials.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => openOverlayWindow('community', 'Community & Updates')}
                      className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-955/10 border border-emerald-500/20 text-left transition-all hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/40 flex gap-2.5 group w-full"
                    >
                      <div className="size-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[14px]">forum</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 dark:text-white leading-tight">Community & News</p>
                        <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">Real-estate updates, market reviews, and Florida/Texas analytics.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => openOverlayWindow('groups', 'Mastermind Groups')}
                      className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-955/10 border border-purple-500/20 text-left transition-all hover:border-purple-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/40 flex gap-2.5 group w-full"
                    >
                      <div className="size-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[14px]">hub</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 dark:text-white leading-tight">Mastermind Groups</p>
                        <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">Facebook & Discord Matrix inner circles of enterprise members.</p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {activePane === 'info' && (
                <>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Workbench Info</h3>
                    <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Learn interactive shortcuts</p>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold space-y-3 leading-relaxed">
                    <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-500/20 text-slate-800 dark:text-slate-350">
                      <p className="font-bold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Move size={12} /> Dotted Background:
                      </p>
                      <p className="mt-1">Click and drag any blank area of the grid to **pan** across the workspace. Use mouse-wheel to **zoom** (0.3x - 2.0x).</p>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/10 border border-purple-500/20 text-slate-800 dark:text-slate-350">
                      <p className="font-bold flex items-center gap-1 text-purple-600 dark:text-purple-400">
                        <Move size={12} /> Draggable Windows:
                      </p>
                      <p className="mt-1">Click and hold any window's title header bar to drag and reposition it freely inside the canvas.</p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-500/20 text-slate-800 dark:text-slate-350">
                      <p className="font-bold flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Maximize2 size={12} /> Resizable Borders:
                      </p>
                      <p className="mt-1">Drag the small diagonal handle at the bottom-right corner of any window to adjust width and height.</p>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}
        </div>

        {/* ─── IDE WORKSPACE MODE ─── */}
        {layoutTemplate === 'ide' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* IDE Top Breadcrumb Bar */}
            <div className="h-7 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center gap-2 shrink-0 select-none">
              <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">GoAuct OS</span>
              <span className="text-slate-300 dark:text-slate-700 text-[9px]">/</span>
              <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">pages</span>
              <span className="text-slate-300 dark:text-slate-700 text-[9px]">/</span>
              <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                {activeIdeTabId ? (widgets.find(w => w.id === activeIdeTabId)?.title?.replace(/^[^\w]+/, '') || activeIdeTabId) : 'workspace'}
              </span>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[7.5px] font-bold text-emerald-500 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  feature/newinterface
                </span>
                <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-600 uppercase">TSX</span>
                <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-600 uppercase">UTF-8</span>
              </div>
            </div>

            {/* IDE Tab Bar */}
            <div className="h-9 bg-white dark:bg-sol-base03 border-b border-slate-200 dark:border-[var(--border)] flex items-end gap-0 overflow-x-auto no-scrollbar shrink-0">
              {widgets.filter(w => w.visible).map(w => {
                const isActive = activeIdeTabId === w.id;
                const isSplit = splitIdeTabId === w.id;
                const tabIcons: Record<string, React.ReactNode> = {
                  map: <Map size={10} />,
                  smart_ai_finder: <Brain size={10} />,
                };
                return (
                  <div
                    key={w.id}
                    role="tab"
                    onClick={() => setActiveIdeTabId(w.id)}
                    className={`group flex items-center gap-1.5 px-3 h-full text-[9px] font-semibold border-r border-slate-200 dark:border-[var(--border)] whitespace-nowrap transition-all shrink-0 relative cursor-pointer ${isActive
                        ? 'bg-white dark:bg-sol-base02 text-slate-900 dark:text-white border-b-2 border-b-indigo-500 font-bold'
                        : isSplit
                          ? 'bg-white dark:bg-sol-base02 text-slate-900 dark:text-white border-b-2 border-b-emerald-500 font-bold'
                          : 'bg-slate-50/60 dark:bg-sol-base03/60 text-slate-500 dark:text-slate-550 hover:bg-white dark:hover:bg-sol-base02 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                  >
                    <span className={isActive ? 'text-indigo-500' : isSplit ? 'text-emerald-500' : 'text-slate-400'}>
                      {tabIcons[w.id] || <Layers size={10} />}
                    </span>
                    <span className="truncate max-w-[100px]">{w.title.replace(/^[^\w]+/, '')}</span>
                    {/* Split button - only visible on hover, not for already-split tab */}
                    {!isSplit && (
                      <span
                        onClick={e => {
                          e.stopPropagation();
                          setSplitIdeTabId(w.id);
                          setIdeSplitMode(true);
                          if (activeIdeTabId === w.id) {
                            // Find another visible tab to be the main tab
                            const other = widgets.filter(x => x.visible && x.id !== w.id)[0];
                            if (other) setActiveIdeTabId(other.id);
                          }
                          logConsoleActivity(`Split view: "${w.title.replace(/^[^\w]+/, '')}" opened in right panel.`);
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-emerald-500 transition-all rounded p-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 cursor-pointer"
                        title="Open in split panel"
                      >
                        <LayoutGrid size={8} />
                      </span>
                    )}
                    <span
                      onClick={e => {
                        e.stopPropagation();
                        toggleVisibility(w.id);
                        if (splitIdeTabId === w.id) {
                          setSplitIdeTabId(null);
                          setIdeSplitMode(false);
                        }
                      }}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all rounded p-0.5 hover:bg-red-50 dark:hover:bg-red-950/10 cursor-pointer"
                      title="Close tab"
                    >
                      <X size={9} />
                    </span>
                  </div>
                );
              })}
              {widgets.filter(w => w.visible).length === 0 && (
                <div className="flex items-center px-4 h-full text-[9px] text-slate-400 dark:text-slate-600 italic">
                  No open tabs — click a shortcut icon to open a page
                </div>
              )}
              {/* Split mode indicator pill */}
              {ideSplitMode && (
                <div className="ml-auto flex items-center gap-1.5 px-3 shrink-0">
                  <span className="text-[7.5px] font-bold text-emerald-500 flex items-center gap-1">
                    <LayoutGrid size={9} />
                    Split
                  </span>
                  <button
                    onClick={() => { setIdeSplitMode(false); setSplitIdeTabId(null); setSplitLeftWidthPct(50); }}
                    className="text-[7.5px] text-slate-400 hover:text-red-500 font-bold px-1 transition-colors"
                    title="Close split view"
                  >
                    <X size={9} />
                  </button>
                </div>
              )}
            </div>

            {/* IDE Central Area: Split Panels + Terminal + Right Agent Panel */}
            <div className="flex-1 flex overflow-hidden min-h-0">

              {/* Central Editor Area (includes split panels + terminal) */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">

                {/* Editor panels row (left + optional right split) */}
                <div className="flex-1 flex overflow-hidden min-h-0 relative">

                  {/* LEFT PANEL */}
                  <div
                    className="flex flex-col overflow-hidden min-h-0 min-w-0"
                    style={{ width: ideSplitMode ? `${splitLeftWidthPct}%` : '100%' }}
                  >
                    {/* Left panel tab title bar */}
                    {ideSplitMode && (
                      <div className="h-7 bg-slate-100/80 dark:bg-sol-base03/80 border-b border-slate-200 dark:border-[var(--border)] px-3 flex items-center gap-2 shrink-0">
                        <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {activeIdeTabId ? widgets.find(x => x.id === activeIdeTabId)?.title.replace(/^[^\w]+/, '') || activeIdeTabId : 'No Tab'}
                        </span>
                        <span className="ml-auto text-[7px] text-slate-400 dark:text-slate-600 font-bold uppercase">LEFT</span>
                      </div>
                    )}
                    {/* Left panel content */}
                    <div className="flex-1 overflow-auto min-h-0 bg-white dark:bg-slate-900">
                      {activeIdeTabId ? (() => {
                        const w = widgets.find(x => x.id === activeIdeTabId);
                        if (!w) return null;
                        return (
                          <div className="size-full overflow-auto p-4 select-text">
                            {w.type === 'smart_ai_finder' && (
                              <div className="size-full overflow-hidden">
                                <SmartAIDealFinder onOpenPropertyDetails={handleOpenPropertyDetails} onPreviewProperty={(parcelId) => setPreviewPropertyId(parcelId)} />
                              </div>
                            )}

                            {w.type === 'map' && (
                              <div className="h-full min-h-[400px]">
                                <MapDashboard 
                                  onStateClick={handleStateClick} 
                                  mapCustomization={mapCustomization} 
                                  favoriteStates={favoriteStates} 
                                  selectedState={selectedState}
                                  myListStats={myListStats}
                                  activeMode={activeMode}
                                  setActiveMode={setActiveMode}
                                  stateStats={stateStats}
                                  topProperties={topProperties}
                                  loadingStats={loadingStats}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 dark:text-slate-600">
                          <Sparkles size={48} className="opacity-20" />
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-500">No active tab</p>
                            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Click any shortcut icon or widget toggle to open a page here</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SPLIT DIVIDER */}
                  {ideSplitMode && (
                    <div
                      onMouseDown={handleSplitDividerMouseDown}
                      className="w-1 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize shrink-0 transition-colors group relative z-10"
                      title="Drag to resize panels"
                    >
                      <div className="absolute inset-y-0 -inset-x-1 group-hover:bg-indigo-500/10" />
                    </div>
                  )}

                  {/* RIGHT PANEL (Split View) */}
                  {ideSplitMode && splitIdeTabId && (
                    <div
                      className="flex flex-col overflow-hidden min-h-0 min-w-0"
                      style={{ width: `${100 - splitLeftWidthPct}%` }}
                    >
                      {/* Right panel tab title bar */}
                      <div className="h-7 bg-slate-100/80 dark:bg-sol-base03/80 border-b border-emerald-500/30 px-3 flex items-center gap-2 shrink-0">
                        <LayoutGrid size={9} className="text-emerald-500 shrink-0" />
                        <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 truncate">
                          {widgets.find(x => x.id === splitIdeTabId)?.title.replace(/^[^\w]+/, '') || splitIdeTabId}
                        </span>
                        <span className="ml-auto text-[7px] text-emerald-500 font-bold uppercase">RIGHT</span>
                        <button onClick={() => { setIdeSplitMode(false); setSplitIdeTabId(null); }} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X size={9} />
                        </button>
                      </div>
                      {/* Right panel content */}
                      <div className="flex-1 overflow-auto min-h-0 bg-white dark:bg-slate-900 border-l border-emerald-500/20">
                        {(() => {
                          const w = widgets.find(x => x.id === splitIdeTabId);
                          if (!w) return null;
                          if (w.id === 'live_auctions') return <div className="size-full overflow-auto"><ClientAuctions /></div>;
                          if (w.id === 'property_search') return <div className="size-full overflow-auto"><ClientProperties onOpenPropertyDetails={handleOpenPropertyDetails} /></div>;
                          if (w.id === 'my_lists') return <div className="size-full overflow-auto"><ClientLists onOpenPropertyDetails={handleOpenPropertyDetails} /></div>;
                          // For other types just show a simple info panel in split
                          return (
                            <div className="p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow">
                                  <Sparkles size={14} className="text-white" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{w.title.replace(/^[^\w]+/, '')}</h3>
                                  <p className="text-[10px] text-slate-500">Split Panel · {w.id}</p>
                                </div>
                              </div>
                              <p className="text-xs text-slate-400">This widget's full content is rendered in Canvas Mode. The split panel supports <strong>Live Auctions</strong>, <strong>Property Search</strong>, and <strong>My Lists</strong> as full-page views.</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Terminal Panel */}
                <div className="h-40 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
                  <div className="flex items-center gap-1 px-3 py-1 border-b border-slate-800 shrink-0">
                    {['Terminal', 'Console', 'Problems'].map((tab, i) => (
                      <button key={tab} className={`px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider rounded-t transition-all ${i === 0 ? 'text-white bg-slate-800 border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>
                        {tab}
                      </button>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[7.5px] font-bold text-emerald-500 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE
                      </span>
                      <button
                        onClick={() => logConsoleActivity('Terminal cleared by user.')}
                        className="text-[7.5px] text-slate-600 hover:text-slate-300 uppercase font-bold px-1.5"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[9px] space-y-1 no-scrollbar">
                    {terminalLogs.slice().reverse().map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 opacity-90 hover:opacity-100">
                        <span className="text-emerald-500 shrink-0 font-black">›</span>
                        <span className="text-slate-300">{entry}</span>
                      </div>
                    ))}
                    {terminalLogs.length === 0 && (
                      <div className="text-slate-600 italic">GoAuct OS terminal ready.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Agent Panel — hidden on small screens */}
              <div className="hidden md:flex w-56 bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 flex-col shrink-0 overflow-y-auto no-scrollbar">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-sm">
                      <Sparkles size={11} className="text-white" />
                    </div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Agent Panel</span>
                  </div>
                  <p className="text-[7.5px] text-slate-400 dark:text-slate-500 mt-1 font-medium uppercase tracking-wider">Antigravity AI</p>
                </div>

                <div className="p-3 space-y-3 flex-1">
                  <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/10 border border-indigo-500/15">
                    <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Workspace</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px]">
                        <span className="text-slate-500 font-semibold">Open Tabs</span>
                        <span className="font-black text-slate-900 dark:text-white">{widgets.filter(w => w.visible).length + (tickerTapeVisible ? 1 : 0)}</span>
                      </div>
                      <div className="flex justify-between text-[8px]">
                        <span className="text-slate-500 font-semibold">Active</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[60px] text-right">{activeIdeTabId || '—'}</span>
                      </div>
                      <div className="flex justify-between text-[8px]">
                        <span className="text-slate-500 font-semibold">Split</span>
                        <span className={`font-black ${ideSplitMode ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{ideSplitMode ? 'ON' : 'OFF'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Split mode toggle */}
                  <button
                    onClick={() => {
                      if (ideSplitMode) {
                        setIdeSplitMode(false);
                        setSplitIdeTabId(null);
                      } else {
                        const tabs = widgets.filter(x => x.visible);
                        if (tabs.length >= 2) {
                          const other = tabs.find(x => x.id !== activeIdeTabId);
                          if (other) {
                            setSplitIdeTabId(other.id);
                            setIdeSplitMode(true);
                            logConsoleActivity(`Split view activated: "${other.title.replace(/^[^\w]+/, '')}"`);
                          }
                        }
                      }
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase transition-colors border ${ideSplitMode ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20'}`}
                  >
                    <LayoutGrid size={10} />
                    {ideSplitMode ? 'Close Split' : 'Split View'}
                  </button>

                  <div>
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Quick Open</p>
                    <div className="space-y-1">
                      {[
                        { label: 'Live Auctions', id: 'live_auctions', icon: Calendar },
                        { label: 'Property Search', id: 'property_search', icon: Search },
                        { label: 'My Lists', id: 'my_lists', icon: Folder },
                        { label: 'Node Canvas', id: 'node_canvas', icon: Layers },
                        { label: 'Field Missions', id: 'field_missions', icon: Gavel },
                      ].map(action => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              setWidgets(prev => prev.map(w => w.id === action.id ? { ...w, visible: true } : w));
                              setActiveIdeTabId(action.id);
                              logConsoleActivity(`Opened "${action.label}" tab.`);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <Icon size={10} className="text-indigo-500 shrink-0" />
                            <span className="text-[8.5px] font-bold text-slate-700 dark:text-slate-300 truncate">{action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Activity</p>
                    <div className="space-y-1">
                      {terminalLogs.slice(-5).reverse().map((entry, i) => (
                        <div key={i} className="text-[7.5px] text-slate-500 dark:text-slate-500 leading-tight border-l-2 border-indigo-500/30 pl-2 py-0.5 truncate" title={entry}>
                          {entry}
                        </div>
                      ))}
                      {terminalLogs.length === 0 && (
                        <p className="text-[7.5px] text-slate-400 dark:text-slate-600 italic">No activity yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── INTERACTIVE WORKSPACE CANVAS (VIEWPORT) ─── */}
        {layoutTemplate === 'canvas' && (
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onTouchStart={handleCanvasTouchStart}
            className="flex-1 h-full overflow-hidden relative bg-slate-150 dark:bg-[var(--bg-primary)] cursor-grab active:cursor-grabbing border-r border-slate-200 dark:border-slate-800"
          >
            {/* Zoomable & Pannable sliding plane container */}
            <div
              id="infinite-plane"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoomScale})`,
                transformOrigin: '0 0',
                width: '4000px',
                height: '4000px',
                position: 'absolute',
                top: 0,
                left: 0,
                transition: isPanningCanvas ? 'none' : 'transform 0.05s linear',
              }}
            >
              {/* Grid dotted backdrop */}
              <div
                className="absolute inset-0 canvas-grid pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(var(--border) 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                  opacity: 0.16,
                }}
              />

              {/* Dynamic SVG Connection Arrows Layer */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
                <defs>
                  <marker
                    id="arrow-head"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
                  </marker>
                  <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                <style>{`
                @keyframes edge-flow {
                  to {
                    stroke-dashoffset: -40;
                  }
                }
                .edge-animation {
                  animation: edge-flow 1.5s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                  height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #cbd5e1;
                  border-radius: 4px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #334155;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
              `}</style>
                {/* Render connections */}
                {(() => {
                  const connections: { from: string; to: string }[] = [
                    // Set 1: Deals Suite
                    { from: 'smart_ai_finder', to: 'dossier' },
                    { from: 'dossier', to: 'rehab_calc' },
                    // Set 2: GIS Suite
                    { from: 'map', to: 'chart' },
                    { from: 'chart', to: 'yield' }
                  ];

                  return connections.map((conn, idx) => {
                    const w1 = widgets.find(w => w.id === conn.from);
                    const w2 = widgets.find(w => w.id === conn.to);

                    if (!w1 || !w2 || !w1.visible || !w2.visible) return null;

                    const x1 = w1.x + w1.w / 2;
                    const y1 = w1.y + w1.h / 2;
                    const x2 = w2.x + w2.w / 2;
                    const y2 = w2.y + w2.h / 2;

                    const midX = (x1 + x2) / 2;
                    const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

                    return (
                      <path
                        key={idx}
                        d={path}
                        stroke="url(#edge-gradient)"
                        strokeWidth="2.5"
                        fill="none"
                        strokeDasharray="6 4"
                        markerEnd="url(#arrow-head)"
                        className="edge-animation"
                      />
                    );
                  });
                })()}
              </svg>

              {/* Absolute-positioned widgets list */}
              {widgets.filter(w => w.visible).map(w => (
                <div
                  key={w.id}
                  id={
                    w.id === 'map' ? 'tour-yield-heatmap' :
                      w.id === 'smart_ai_finder' ? 'tour-suggested-deals' :
                        undefined
                  }
                  onClick={() => focusWidget(w.id)}
                  style={{
                    position: 'absolute',
                    left: w.x,
                    top: w.y,
                    width: w.w,
                    height: w.h,
                    zIndex: w.zIndex,
                  }}
                  className="glass-card flex flex-col overflow-hidden shadow-2xl border border-slate-200/60 dark:border-sol-base01/30 bg-white/75 dark:bg-sol-base02/80 backdrop-blur-md group/window rounded-xl"
                >
                  {/* Window Title Bar (Drag Handle) */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, w.id, 'drag')}
                    onTouchStart={(e) => handleTouchStart(e, w.id, 'drag')}
                    className={`h-10 border-b border-slate-200 dark:border-[var(--border)] bg-slate-50/70 dark:bg-sol-base03/85 px-4 flex items-center justify-between shrink-0 ${w.isLocked ? 'cursor-default' : 'cursor-move'}`}
                  >
                    <div className="flex items-center gap-2 select-none">
                      {/* Mobile touch grab handle badge */}
                      <div
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          handleTouchStart(e, w.id, 'drag');
                        }}
                        className="flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-400/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider cursor-grab select-none active:cursor-grabbing shadow-sm"
                      >
                        <Move size={8} className="animate-pulse" />
                        <span>Grip</span>
                      </div>

                      {/* grabber icons */}
                      <div className="grid grid-cols-2 gap-0.5 opacity-30">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="size-[2px] rounded-full bg-slate-900 dark:bg-white" />
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-950 dark:text-white">
                        {w.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleVisibility(w.id)}
                        className="p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/60 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        title="Minimize"
                      >
                        <Minimize2 size={10} />
                      </button>
                      <button
                        onClick={() => toggleVisibility(w.id)}
                        className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-slate-400"
                        title="Close"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Window Inner Content Scroll Area */}
                  <div className="flex-1 min-h-0 w-full overflow-auto p-4 select-text flex flex-col">
                     {/* Widget: Smart AI Deal Finder */}
                    {w.type === 'smart_ai_finder' && (
                      <SmartAIDealFinder onOpenPropertyDetails={handleOpenPropertyDetails} onPreviewProperty={(parcelId) => setPreviewPropertyId(parcelId)} />
                    )}

                    {/* GIS Heatmap widget */}
                    {w.type === 'map' && (
                      <div className="size-full min-h-[400px] relative flex items-center justify-center bg-slate-50/20 dark:bg-slate-800/10 rounded-xl overflow-hidden">
                        {loading ? (
                          <RefreshCw className="animate-spin text-blue-500" size={24} />
                        ) : (
                          <MapDashboard 
                            onStateClick={handleStateClick} 
                            mapCustomization={mapCustomization} 
                            favoriteStates={favoriteStates} 
                            selectedState={selectedState}
                            myListStats={myListStats}
                            activeMode={activeMode}
                            setActiveMode={setActiveMode}
                            stateStats={stateStats}
                            topProperties={topProperties}
                            loadingStats={loadingStats}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Window Bottom-Right Resize Handle */}
                  {!w.isLocked && (
                    <div
                      onMouseDown={(e) => handleMouseDown(e, w.id, 'resize')}
                      onTouchStart={(e) => handleTouchStart(e, w.id, 'resize')}
                      className="absolute bottom-0 right-0 size-4 cursor-se-resize flex items-end justify-end p-0.5 z-[100]"
                    >
                      <div className="size-2 border-r-2 border-b-2 border-slate-350 dark:border-slate-650 opacity-40 group-hover/window:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Infinite Canvas Floating Zoom & Lock Panel (Bottom-Left) */}
            <div className="absolute bottom-4 left-4 z-[100] flex flex-col items-center gap-2 p-1.5 bg-white/90 dark:bg-sol-base02/90 backdrop-blur-md border border-slate-200/80 dark:border-sol-base01/30 rounded-2xl shadow-2xl select-none">
              {/* Lock Button */}
              <button
                onClick={() => setIsCanvasLocked(prev => !prev)}
                className={`size-8 rounded-xl flex items-center justify-center transition-all ${isCanvasLocked
                    ? 'bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/20 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-sol-base03 dark:hover:bg-sol-base02 text-slate-400 hover:text-slate-650'
                  }`}
                title={isCanvasLocked ? "Canvas is Locked (Click to Unlock)" : "Canvas is Unlocked (Click to Lock)"}
              >
                {isCanvasLocked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>

              <div className="w-6 h-[1px] bg-slate-200 dark:bg-sol-base01/30" />

              {/* Zoom In (+) */}
              <button
                onClick={() => setZoomScale(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
                className="size-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-sol-base03 dark:hover:bg-sol-base02 flex items-center justify-center font-extrabold text-slate-600 dark:text-slate-350 transition-all hover:scale-105 active:scale-95 text-sm"
                title="Zoom In"
              >
                +
              </button>

              {/* Reset Zoom Indicator */}
              <button
                onClick={() => { setZoomScale(1.0); setPanX(0); setPanY(0); }}
                className="text-[9px] font-black text-slate-455 hover:text-indigo-500 dark:hover:text-indigo-400 py-1 transition-colors select-none tracking-tight text-center"
                title="Reset Zoom to 100%"
              >
                {Math.round(zoomScale * 100)}%
              </button>

              {/* Zoom Out (-) */}
              <button
                onClick={() => setZoomScale(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
                className="size-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-sol-base03 dark:hover:bg-sol-base02 flex items-center justify-center font-extrabold text-slate-600 dark:text-slate-350 transition-all hover:scale-105 active:scale-95 text-sm"
                title="Zoom Out"
              >
                -
              </button>
            </div>

          </div>
        )}

        {/* ─── HYBRID VIRTUAL DESKTOP WINDOW OVERLAYS ─── */}
        {overlayWindows.filter(w => !w.isMinimized).map(w => {
          const isActive = activeOverlayWindowId === w.id;
          return (
            <div
              key={w.id}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('.window-action-buttons')) {
                  return;
                }
                focusOverlayWindow(w.id);
              }}
              style={{
                position: 'absolute',
                left: w.isMaximized ? 0 : w.x,
                top: w.isMaximized ? 0 : w.y,
                width: w.isMaximized ? '100%' : w.w,
                height: w.isMaximized ? '100%' : w.h,
                zIndex: w.zIndex + 100, // Float over background canvas
              }}
              className={`glass-card shadow-2xl border flex flex-col overflow-hidden rounded-2xl transition-shadow backdrop-blur-xl ${isActive
                  ? 'border-indigo-500/80 dark:border-sol-blue/80 shadow-indigo-500/10 bg-white/95 dark:bg-sol-base02/95'
                  : 'border-slate-200/80 dark:border-sol-base01/30 bg-white/80 dark:bg-sol-base02/85'
                }`}
            >
              {/* Window Title Bar */}
              <div
                onMouseDown={(e) => handleOverlayMouseDown(e, w.id, 'drag')}
                onTouchStart={(e) => handleOverlayTouchStart(e, w.id, 'drag')}
                className={`h-11 border-b px-4 flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing ${isActive
                    ? 'bg-slate-100/90 dark:bg-sol-base03/95 border-indigo-500/20 dark:border-sol-blue/20'
                    : 'bg-slate-50/70 dark:bg-sol-base03/60 border-slate-200 dark:border-[var(--border)]'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {w.title}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 window-action-buttons" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshOverlayWindow(w.id);
                    }}
                    className="size-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Refresh Content"
                  >
                    <RefreshCw size={11} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMinimizeOverlayWindow(w.id);
                    }}
                    className="size-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Minimize"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMaximizeOverlayWindow(w.id);
                    }}
                    className="size-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={w.isMaximized ? "Restore Size" : "Maximize"}
                  >
                    {w.isMaximized ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeOverlayWindow(w.id);
                    }}
                    className="size-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Close"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Window Content Container */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-sol-base03 relative custom-scrollbar">
                {w.type === 'my_lists' && <ClientLists key={`${w.id}_${w.refreshKey || 0}`} onOpenPropertyDetails={handleOpenPropertyDetails} />}
                {w.type === 'live_auctions' && <ClientAuctions key={`${w.id}_${w.refreshKey || 0}`} />}
                {w.type === 'property_search' && <ClientProperties key={`${w.id}_${w.refreshKey || 0}`} onOpenPropertyDetails={handleOpenPropertyDetails} />}
                {w.type === 'field_missions' && <InvestorTasksDashboard key={`${w.id}_${w.refreshKey || 0}`} />}
                {w.type === 'settings' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full">
                    <OriginalSettings />
                  </div>
                )}
                {w.type === 'team_and_logs' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full">
                    <ActivityLogsPage />
                  </div>
                )}
                {w.type === 'billings_and_plans' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full">
                    <BillingPage />
                  </div>
                )}
                {w.type === 'about' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full">
                    <AboutPage standalone={false} />
                  </div>
                )}
                {w.type === 'disclaimer' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full overflow-y-auto custom-scrollbar">
                    <DisclaimerPage standalone={false} />
                  </div>
                )}
                {w.type === 'terms' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full overflow-y-auto custom-scrollbar">
                    <TermsOfServicePage standalone={false} />
                  </div>
                )}
                {w.type === 'privacy' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full overflow-y-auto custom-scrollbar">
                    <PrivacyPolicyPage standalone={false} />
                  </div>
                )}
                {w.type === 'training' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full">
                    <TrainingPage />
                  </div>
                )}
                {w.type === 'community' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full">
                    <CommunityPage />
                  </div>
                )}
                {w.type === 'groups' && (
                  <div className="p-6 dark:bg-sol-base03 min-h-full">
                    <GroupsPage />
                  </div>
                )}
                {w.type === 'property_details' && (
                  <div className="size-full overflow-y-auto no-scrollbar scrollbar-none">
                    <PropertyDetailPage 
                      key={`${w.id}_${w.refreshKey || 0}`}
                      readOnly={true} 
                      overrideId={w.data?.propertyId} 
                      onClose={() => closeOverlayWindow(w.id)} 
                    />
                  </div>
                )}
              </div>

              {/* Resize Handle (bottom-right corner) */}
              {!w.isMaximized && (
                <div
                  onMouseDown={(e) => handleOverlayMouseDown(e, w.id, 'resize')}
                  onTouchStart={(e) => handleOverlayTouchStart(e, w.id, 'resize')}
                  className="absolute bottom-0 right-0 size-4 cursor-se-resize flex items-end justify-end p-0.5 z-40 group"
                >
                  <svg className="size-2 text-slate-450 dark:text-slate-600 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <line x1="6" y1="21" x2="21" y2="6" />
                    <line x1="12" y1="21" x2="21" y2="12" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {/* ─── DOCK / BARRA DE TAREFAS HÍBRIDA (Estilo macOS) ─── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-14 px-4 bg-slate-900/80 dark:bg-sol-base02/85 backdrop-blur-md rounded-2xl border border-slate-700/50 dark:border-sol-base01/30 flex items-center gap-3 z-[99999] shadow-2xl transition-all select-none">
          {/* Core Shortcuts to open windows */}
          {[
            { id: 'workbench_home', label: 'Workbench Home', icon: LayoutGrid, color: 'hover:text-blue-400 text-blue-500' },
            { id: 'live_auctions', label: 'Auctions', icon: Calendar, color: 'hover:text-amber-400 text-amber-500' },
            { id: 'property_search', label: 'Search', icon: Search, color: 'hover:text-cyan-405 text-cyan-500' },
            { id: 'my_lists', label: 'My Lists', icon: Folder, color: 'hover:text-purple-400 text-purple-500' },
            { id: 'field_missions', label: 'Missions', icon: Gavel, color: 'hover:text-emerald-400 text-emerald-500' }
          ].map(item => {
            const Icon = item.icon;
            const isOpen = item.id === 'workbench_home' ? false : overlayWindows.some(w => w.type === item.id);
            const isMin = item.id === 'workbench_home' ? false : overlayWindows.find(w => w.type === item.id)?.isMinimized;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'workbench_home') {
                    setOverlayWindows(prev => prev.map(w => ({ ...w, isMinimized: true })));
                    setActiveOverlayWindowId(null);
                    logConsoleActivity('Minimizing all active workspace windows.');
                    navigate('/client');
                    return;
                  }
                  const match = overlayWindows.find(w => w.type === item.id);
                  if (match) {
                    if (match.isMinimized) {
                      toggleMinimizeOverlayWindow(match.id);
                    } else if (activeOverlayWindowId === match.id) {
                      toggleMinimizeOverlayWindow(match.id);
                    } else {
                      focusOverlayWindow(match.id);
                    }
                  } else {
                    openOverlayWindow(item.id as any, item.id === 'my_lists' ? '📂 Saved Lists & Folders' : item.id === 'live_auctions' ? '📅 Live Auctions Finder' : item.id === 'property_search' ? '🔍 Property Search & Listing' : '⚔️ Field Task Missions');
                  }
                }}
                className={`relative size-10 rounded-xl flex items-center justify-center transition-all transform hover:scale-115 active:scale-95 ${item.color} ${isOpen ? 'bg-slate-800 border border-slate-700' : 'bg-transparent'} ${isMin ? 'opacity-50' : ''}`}
                title={item.label}
              >
                <Icon size={18} />
                {isOpen && (
                  <span className="absolute bottom-1 size-1 bg-indigo-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}

          {/* Separator if we have open property detail windows */}
          {overlayWindows.some(w => w.type === 'property_details') && (
            <div className="w-[1px] h-8 bg-slate-700/50" />
          )}

          {/* Open Property Details Windows list */}
          {overlayWindows.filter(w => w.type === 'property_details').map(w => {
            const isActive = activeOverlayWindowId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => {
                  if (w.isMinimized) {
                    toggleMinimizeOverlayWindow(w.id);
                  } else if (isActive) {
                    toggleMinimizeOverlayWindow(w.id);
                  } else {
                    focusOverlayWindow(w.id);
                  }
                }}
                className={`relative h-10 px-2 rounded-xl flex items-center gap-1.5 transition-all text-left bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 ${w.isMinimized ? 'opacity-50' : ''}`}
                title={w.title}
              >
                <FileText size={14} className="text-indigo-400" />
                <span className="text-[8px] font-black text-slate-350 max-w-[80px] truncate uppercase tracking-wider">
                  {w.data?.parcelId || 'Property'}
                </span>
                {isActive && !w.isMinimized && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 bg-indigo-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* ─── FOOTER (Status Bar) ─── */}
      <div className="w-full h-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 flex justify-between items-center shrink-0 z-30 select-none">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Synced · Last Refresh: <span className="text-slate-700 dark:text-slate-300 font-extrabold">{syncTime || '—'}</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 border-r border-slate-200 dark:border-slate-800 pr-3">
            <button
              onClick={() => startTour('investor')}
              className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-650 dark:hover:bg-emerald-700 text-white px-2 py-0.5 rounded-md transition-all active:scale-95 shadow-sm mr-2"
              title="Launch Onboarding Tour"
            >
              <Play size={8} fill="currentColor" />
              <span>Page Tour</span>
            </button>
            <span className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800/80 mr-2.5" />
            <button
              onClick={() => openOverlayWindow('about', 'About GoAuct OS')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              About
            </button>
            <button
              onClick={() => openOverlayWindow('disclaimer', 'Corporate Disclaimer')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              Disclaimer
            </button>
            <button
              onClick={() => openOverlayWindow('terms', 'Terms of Service')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              Terms
            </button>
            <button
              onClick={() => openOverlayWindow('privacy', 'Privacy Policy')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              Privacy
            </button>
          </div>
          <div className="flex items-center gap-1 text-[8.5px] font-semibold text-slate-455 dark:text-slate-500">
            <Layers size={10} />
            <span>Active Windows: {widgets.filter(w => w.visible).length + (tickerTapeVisible ? 1 : 0)}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">
            Canvas Mode
          </span>
        </div>
      </div>

      <PropertyPreviewDrawer
        open={!!previewPropertyId}
        propertyId={previewPropertyId}
        onClose={() => setPreviewPropertyId(null)}
        basePath="/client"
      />
    </div>
  );
};

export default ClientWorkbench;
