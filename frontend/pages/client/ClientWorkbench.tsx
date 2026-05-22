import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getStateStats, StateStat, getMonthlyStats, MonthlyAuctionStat, getTopScoredProperties } from '../../services/scores.service';
import { ClientDataService, PropertyService } from '../../services/property.service';
import { AuctionService } from '../../services/auction.service';
import { StatesService, StateContact } from '../../services/states.service';
import { countyService } from '../../services/county.service';
import { AuctionEvent, Property } from '../../types';
import { useCompany } from '../../context/CompanyContext';
import { InvestmentHeatmap } from '../../components/property/InvestmentHeatmap';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Compass, Map, BarChart2, Folder, Terminal, Award,
  HelpCircle, ShieldCheck, RefreshCw, FileText, CheckCircle,
  Smartphone, Settings, Layout, Layers, X, Maximize2, Minimize2,
  Move, LayoutGrid, Eye, EyeOff, Sparkles, ChevronLeft, ChevronRight,
  Gavel, Calendar, ShieldAlert, Search, Plus, Filter, ArrowRight,
  Maximize, Activity, Info
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

interface Widget {
  id: string;
  type: 'shortcuts' | 'metrics_deed' | 'metrics_foreclosure' | 'metrics_lien' | 'map' | 'recommended_deals' | 'live_auctions' | 'property_search' | 'chart' | 'dossier' | 'yield';
  title: string;
  x: number; // left offset in pixels
  y: number; // top offset in pixels
  w: number; // width in pixels
  h: number; // height in pixels
  visible: boolean;
  zIndex: number;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'shortcuts', type: 'shortcuts', title: 'Quick Access Tools', x: 20, y: 20, w: 320, h: 480, visible: true, zIndex: 10 },
  { id: 'metrics_deed', type: 'metrics_deed', title: 'Tax Deeds Total', x: 360, y: 20, w: 260, h: 140, visible: true, zIndex: 11 },
  { id: 'metrics_foreclosure', type: 'metrics_foreclosure', title: 'Foreclosures Total', x: 640, y: 20, w: 260, h: 140, visible: true, zIndex: 12 },
  { id: 'metrics_lien', type: 'metrics_lien', title: 'Tax Liens Total', x: 920, y: 20, w: 260, h: 140, visible: true, zIndex: 13 },
  { id: 'map', type: 'map', title: 'National Yield Heatmap', x: 360, y: 180, w: 820, h: 430, visible: true, zIndex: 14 },
  { id: 'recommended_deals', type: 'recommended_deals', title: 'Top Recommended Deals', x: 1200, y: 20, w: 450, h: 590, visible: true, zIndex: 15 },
  { id: 'live_auctions', type: 'live_auctions', title: 'Live Auctions Finder', x: 20, y: 520, w: 450, h: 500, visible: true, zIndex: 16 },
  { id: 'property_search', type: 'property_search', title: 'Property Search & Listing', x: 490, y: 630, w: 695, h: 390, visible: true, zIndex: 17 },
  { id: 'chart', type: 'chart', title: 'Monthly Auction Trends', x: 1200, y: 630, w: 450, h: 390, visible: true, zIndex: 18 },
  { id: 'dossier', type: 'dossier', title: 'Featured Property Dossier', x: 1670, y: 20, w: 380, h: 590, visible: true, zIndex: 19 },
  { id: 'yield', type: 'yield', title: 'Yield Breakdown Analytics', x: 1670, y: 630, w: 380, h: 390, visible: true, zIndex: 20 },
];

export const ClientWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const canvasRef = useRef<HTMLDivElement>(null);

  // States
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('goauct_workbench_widgets_v35');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePane, setActivePane] = useState<'explorer' | 'presets' | 'info'>('explorer');
  const [selectedState, setSelectedState] = useState<string>('');
  
  // Dynamic API details states
  const [stateStats, setStateStats] = useState<StateStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyAuctionStat[]>([]);
  const [dbTopDeals, setDbTopDeals] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Interactive Live Metrics
  const [marketCounts, setMarketCounts] = useState({ deed: 430, foreclosure: 852, lien: 594 });

  // Infinite Canvas physics states
  const [zoomScale, setZoomScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

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
  const [highestZIndex, setHighestZIndex] = useState(25);

  // Drag & Resize mouse interaction tracking
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

  // Fetch static preferences & contacts on startup
  useEffect(() => {
    StatesService.getContacts().then(setStateList).catch(() => {});
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

  // Fetch backend analytics & properties
  const fetchWorkbenchData = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().split('T')[0];

      const [stats, monthly, topScored, deedRes, sheriffRes, foreRes, lienRes] = await Promise.all([
        getStateStats(),
        getMonthlyStats(),
        getTopScoredProperties(12, { availability_status: 'available' }),
        AuctionService.getAuctionEvents({ name: 'deed', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'sheriff', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'foreclosure', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' }),
        AuctionService.getAuctionEvents({ name: 'lien', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' }),
      ]);

      setStateStats(stats);
      setMonthlyStats(monthly);
      setDbTopDeals(topScored as Property[]);

      // De-duplicate Deeds
      const mergedDeeds = Array.from(
        new Map([...deedRes.items, ...sheriffRes.items].map(item => [item.id, item])).values()
      );
      setDeedsAuctions(mergedDeeds);
      setForeclosureAuctions(foreRes.items || []);
      setLiensAuctions(lienRes.items || []);

      // Dynamic Counter Totals
      setMarketCounts({
        deed: (deedRes.total || 0) + (sheriffRes.total || 0) || 430,
        foreclosure: foreRes.total || 852,
        lien: lienRes.total || 594
      });

      if (topScored.length > 0) {
        setSelectedProperty(topScored[0] as Property);
      }

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
      .catch(() => {})
      .finally(() => setMonthlyLoading(false));
  }, [selectedState]);

  // Save widgets state to local storage when modified
  useEffect(() => {
    localStorage.setItem('goauct_workbench_widgets_v35', JSON.stringify(widgets));
  }, [widgets]);

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

  // Window Drag & Resize Handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    widgetId: string,
    type: 'drag' | 'resize'
  ) => {
    e.preventDefault();
    focusWidget(widgetId);

    const targetWidget = widgets.find(w => w.id === widgetId);
    if (!targetWidget) return;

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction) return;

      // Adjust coordinate movement based on zoomScale mapping physics!
      const deltaX = (e.clientX - interaction.startX) / zoomScale;
      const deltaY = (e.clientY - interaction.startY) / zoomScale;

      setWidgets(prev =>
        prev.map(w => {
          if (w.id !== interaction.widgetId) return w;

          if (interaction.type === 'drag') {
            const nextX = interaction.startLeft + deltaX;
            const nextY = interaction.startTop + deltaY;
            return { ...w, x: nextX, y: nextY };
          } else if (interaction.type === 'resize') {
            const nextW = Math.max(240, interaction.startWidth + deltaX);
            const nextH = Math.max(120, interaction.startHeight + deltaY);
            return { ...w, w: nextW, h: nextH };
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

  // Non-passive Wheel event hook for precise tracking
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const handleWheel = (e: WheelEvent) => {
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
  }, []);

  // Background Canvas pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only trigger pan if we clicked the direct dotted canvas backdrop or viewport wrapper
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

  // Toggle widget visibility
  const toggleVisibility = (id: string) => {
    setWidgets(prev =>
      prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    );
    focusWidget(id);
  };

  // Presets arranger
  const applyPreset = (preset: 'default' | 'map_focus' | 'analytics_focus' | 'dossier_focus') => {
    let nextZ = highestZIndex;
    const incrementZ = () => {
      nextZ += 1;
      return nextZ;
    };

    // Zoom and center coordinates reset during preset apply for premium visual setup!
    setZoomScale(1.0);
    setPanX(0);
    setPanY(0);

    setWidgets(prev => {
      const updated = prev.map(w => {
        let coords = { x: w.x, y: w.y, w: w.w, h: w.h, visible: true, zIndex: incrementZ() };

        if (preset === 'default') {
          const match = DEFAULT_WIDGETS.find(d => d.id === w.id);
          if (match) coords = { ...match, zIndex: incrementZ() };
        } else if (preset === 'map_focus') {
          if (w.id === 'map') {
            coords = { x: 20, y: 20, w: 1060, h: 560, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'dossier') {
            coords = { x: 1100, y: 20, w: 380, h: 560, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'metrics_deed') {
            coords = { x: 1100, y: 600, w: 380, h: 260, visible: true, zIndex: incrementZ() };
          } else {
            coords = { ...w, visible: false };
          }
        } else if (preset === 'analytics_focus') {
          if (w.id === 'map') {
            coords = { x: 20, y: 20, w: 760, h: 440, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'chart') {
            coords = { x: 20, y: 480, w: 760, h: 380, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'yield') {
            coords = { x: 800, y: 20, w: 360, h: 320, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'dossier') {
            coords = { x: 800, y: 360, w: 720, h: 500, visible: true, zIndex: incrementZ() };
          } else {
            coords = { ...w, visible: false };
          }
        } else if (preset === 'dossier_focus') {
          if (w.id === 'dossier') {
            coords = { x: 380, y: 20, w: 760, h: 640, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'shortcuts') {
            coords = { x: 20, y: 20, w: 340, h: 500, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'map') {
            coords = { x: 1160, y: 20, w: 320, h: 360, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'chart') {
            coords = { x: 1160, y: 400, w: 320, h: 360, visible: true, zIndex: incrementZ() };
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

  return (
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden select-none bg-slate-50 dark:bg-slate-950 font-display">

      {/* ─── HEADER (Topo) ─── */}
      <div className="w-full h-14 bg-white/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/60 px-5 flex items-center justify-between backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">GoAuct OS</h2>
              <span className="text-[7.5px] font-extrabold uppercase px-1.5 py-0.25 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 rounded-md">V3.5 Infinite Canvas</span>
            </div>
            <p className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
              Pannable zoom viewport with custom analytical widgets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedState && (
            <button
              onClick={() => setSelectedState('')}
              className="text-[8px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              Clear filter ({selectedState})
            </button>
          )}
          <button
            onClick={() => applyPreset('default')}
            className="text-[8px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/15 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Reset Windows
          </button>
          <Link
            to="/client"
            className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 animate-pulse"
          >
            Go Back Dashboard
          </Link>
        </div>
      </div>

      {/* ─── MAIN WORKBENCH PANEL ─── */}
      <div className="flex-1 flex w-full overflow-hidden relative">

        {/* ─── SIDEBAR 1: Primary VS Code Ribbon (64px) ─── */}
        <div className="w-16 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/60 flex flex-col justify-between py-4 items-center shrink-0 z-40">
          <div className="flex flex-col gap-4 w-full items-center">
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
                  className={`relative p-2.5 rounded-xl transition-all ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/10 shadow-sm'
                      : 'text-slate-400 dark:text-slate-650 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-0.75 bg-blue-500 rounded-r" />
                  )}
                  <Icon size={20} />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 items-center w-full">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
              className="p-2 text-slate-400 dark:text-slate-655 hover:text-slate-700 dark:hover:text-slate-350 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40"
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* ─── SIDEBAR 2: Collapsible Secondary Drawer (240px) ─── */}
        <div
          className={`bg-white/95 dark:bg-slate-900/90 border-r border-slate-200/80 dark:border-slate-800/60 flex flex-col transition-all duration-300 backdrop-blur-sm shrink-0 z-35 overflow-y-auto ${
            sidebarOpen ? 'w-60' : 'w-0 pointer-events-none border-r-0'
          }`}
        >
          {sidebarOpen && (
            <div className="p-4 flex flex-col space-y-5 select-none w-60">

              {activePane === 'explorer' && (
                <>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Workspace Explorer</h3>
                    <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Toggle widgets on canvas</p>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    {widgets.map(w => (
                      <button
                        key={w.id}
                        onClick={() => toggleVisibility(w.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${
                          w.visible
                            ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-500/20 text-blue-700 dark:text-blue-400 font-bold'
                            : 'bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-850 text-slate-455 dark:text-slate-600 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          {w.type === 'map' && <Map size={13} />}
                          {w.type === 'chart' && <BarChart2 size={13} />}
                          {w.type.startsWith('metrics_') && <Activity size={13} />}
                          {w.type === 'shortcuts' && <Smartphone size={13} />}
                          {w.type === 'dossier' && <Folder size={13} />}
                          {w.type === 'yield' && <Compass size={13} />}
                          {w.type === 'recommended_deals' && <Award size={13} />}
                          {w.type === 'live_auctions' && <Calendar size={13} />}
                          {w.type === 'property_search' && <Search size={13} />}
                          <span className="truncate max-w-[130px]">{w.title}</span>
                        </div>
                        {w.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Workspace stats</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60">
                        <span className="text-slate-400 block text-[8px] uppercase">Active</span>
                        <span className="text-slate-900 dark:text-white text-xs font-black">
                          {widgets.filter(w => w.visible).length} / {widgets.length}
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
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Layout Presets</h3>
                    <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Quick window arrangements</p>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {[
                      { id: 'default', label: 'Default Layout', desc: 'Full widgets analytical grid', icon: LayoutGrid },
                      { id: 'map_focus', label: '🗺️ Map Focus', desc: 'Maximizes geographical yields', icon: Map },
                      { id: 'analytics_focus', label: '📈 Analytics Center', desc: 'Aligns charts side-by-side', icon: BarChart2 },
                      { id: 'dossier_focus', label: '🏠 Deep Dossier', desc: 'Prioritizes property inspect details', icon: Folder }
                    ].map(p => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => applyPreset(p.id as any)}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors group"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                            <Icon size={14} />
                            <span>{p.label}</span>
                          </div>
                          <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 leading-normal font-semibold">{p.desc}</p>
                        </button>
                      );
                    })}
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

        {/* ─── INTERACTIVE WORKSPACE CANVAS (VIEWPORT) ─── */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          className="flex-1 h-full overflow-hidden relative bg-slate-150 dark:bg-slate-950 cursor-grab active:cursor-grabbing border-r border-slate-200 dark:border-slate-800"
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

            {/* Absolute-positioned widgets list */}
            {widgets.filter(w => w.visible).map(w => (
              <div
                key={w.id}
                onClick={() => focusWidget(w.id)}
                style={{
                  position: 'absolute',
                  left: w.x,
                  top: w.y,
                  width: w.w,
                  height: w.h,
                  zIndex: w.zIndex,
                }}
                className="glass-card flex flex-col overflow-hidden shadow-2xl border border-slate-200/60 dark:border-slate-850 bg-white/75 dark:bg-slate-900/70 backdrop-blur-md group/window rounded-xl"
              >
                {/* Window Title Bar (Drag Handle) */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, w.id, 'drag')}
                  className="h-10 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 px-4 flex items-center justify-between shrink-0 cursor-move"
                >
                  <div className="flex items-center gap-2 select-none">
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
                <div className="flex-1 w-full overflow-auto p-4 select-text">

                  {/* Widget 1: Smartphone shortcuts */}
                  {w.type === 'shortcuts' && (
                    <div className="size-full flex flex-col items-center justify-center">
                      <div className="w-64 border-[6px] border-slate-800 dark:border-slate-700 bg-slate-950 dark:bg-slate-900 rounded-[36px] shadow-2xl p-4 flex flex-col space-y-4 relative select-none">
                        {/* Notch */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <div className="size-1.5 rounded-full bg-slate-900" />
                        </div>

                        {/* Top signals */}
                        <div className="flex justify-between items-center text-[7px] font-black text-slate-400 tracking-wider pt-2 select-none">
                          <span>GoAuct OS</span>
                          <div className="flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active Dev</span>
                          </div>
                        </div>

                        {/* Shortcuts Grid */}
                        <div className="grid grid-cols-3 gap-3.5 pt-2">
                          {[
                            { label: 'Calendar', icon: Calendar, path: '/client/auctions', color: 'from-amber-400 to-orange-500' },
                            { label: 'Search Map', icon: Map, path: '/client/properties', color: 'from-blue-400 to-cyan-500' },
                            { label: 'My Lists', icon: Folder, path: '/client/lists', color: 'from-purple-400 to-pink-500' },
                            { label: 'Missions', icon: Gavel, path: '/client/tasks', color: 'from-emerald-400 to-teal-500' },
                            { label: 'Settings', icon: Settings, path: '/client/settings', color: 'from-slate-400 to-slate-650' },
                            { label: 'Billing', icon: Compass, path: '/client/billing', color: 'from-indigo-400 to-indigo-600' }
                          ].map((app, idx) => {
                            const Icon = app.icon;
                            return (
                              <div
                                key={idx}
                                onClick={() => navigate(app.path)}
                                className="flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
                              >
                                <div className={`size-11 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:shadow-blue-500/20`}>
                                  <Icon size={18} className="text-white" />
                                </div>
                                <span className="text-[7.5px] font-black text-slate-355 truncate w-full text-center tracking-wide uppercase select-none">{app.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Info details inside phone */}
                        <div className="bg-slate-900 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-850 flex items-center gap-2 select-none">
                          <Award className="text-cyan-400 shrink-0" size={14} />
                          <div className="text-[7px] leading-tight">
                            <p className="font-extrabold text-white">SYSTEM ONLINE</p>
                            <p className="text-slate-400 mt-0.5">Real-time stats synced</p>
                          </div>
                        </div>

                        <div className="w-20 h-1 bg-slate-800 dark:bg-slate-700 rounded-full mx-auto mt-2" />
                      </div>
                    </div>
                  )}

                  {/* Widget 2: Tax Deeds Counter */}
                  {w.type === 'metrics_deed' && (
                    <div className="neu-card p-3 flex flex-col justify-between relative overflow-hidden h-full">
                      <div className="absolute right-2 top-2 size-12 bg-purple-500/5 rounded-full" />
                      <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-1">
                        <Gavel size={10} /> Tax Deeds
                      </span>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {marketCounts.deed.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-between mt-1 shrink-0">
                        <span className="text-[7px] text-slate-400 uppercase font-semibold">Active Deeds Mapped</span>
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Widget 2: Foreclosures Counter */}
                  {w.type === 'metrics_foreclosure' && (
                    <div className="neu-card p-3 flex flex-col justify-between relative overflow-hidden h-full">
                      <div className="absolute right-2 top-2 size-12 bg-red-500/5 rounded-full" />
                      <span className="text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                        <ShieldAlert size={10} /> Foreclosures
                      </span>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {marketCounts.foreclosure.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-between mt-1 shrink-0">
                        <span className="text-[7px] text-slate-400 uppercase font-semibold">Distressed Property</span>
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Widget 2: Tax Liens Counter */}
                  {w.type === 'metrics_lien' && (
                    <div className="neu-card p-3 flex flex-col justify-between relative overflow-hidden h-full">
                      <div className="absolute right-2 top-2 size-12 bg-amber-500/5 rounded-full" />
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                        <FileText size={10} /> Tax Liens
                      </span>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {marketCounts.lien.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-between mt-1 shrink-0">
                        <span className="text-[7px] text-slate-400 uppercase font-semibold">Lien Certificates</span>
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* GIS Heatmap widget */}
                  {w.type === 'map' && (
                    <div className="size-full min-h-[160px] relative flex items-center justify-center bg-slate-50/20 dark:bg-slate-955/10 rounded-xl overflow-hidden">
                      {loading ? (
                        <RefreshCw className="animate-spin text-blue-500" size={24} />
                      ) : (
                        <InvestmentHeatmap
                          stats={stateStats}
                          selectedState={selectedState}
                          onStateClick={(s) => setSelectedState(s)}
                        />
                      )}
                    </div>
                  )}

                  {/* Widget 3: Top Recommended Deals & Auctions */}
                  {w.type === 'recommended_deals' && (
                    <div className="size-full flex flex-col">
                      {/* Tabs headers */}
                      <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 pb-2 mb-3 overflow-x-auto gap-1">
                        {[
                          { id: 'deals', label: '🥇 Top Deals' },
                          { id: 'deeds', label: 'Deeds' },
                          { id: 'foreclosures', label: 'Foreclosures' },
                          { id: 'liens', label: 'Liens' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setRecommendedTab(tab.id as any)}
                            className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
                              recommendedTab === tab.id
                                ? 'bg-indigo-500 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Tab content area */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {recommendedTab === 'deals' && (
                          dbTopDeals.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 mt-10">No recommended deals found.</p>
                          ) : (
                            dbTopDeals.map((prop) => (
                              <div
                                key={prop.id}
                                onClick={() => {
                                  setSelectedProperty(prop);
                                  focusWidget('dossier');
                                }}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-500/50 transition-all cursor-pointer flex justify-between items-center group"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[7.5px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.25 rounded uppercase">Score: {prop.deal_score || 85}</span>
                                    <span className="text-[7.5px] font-black text-slate-400">{prop.parcel_id || 'No Parcel'}</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate mt-1 group-hover:text-indigo-500 transition-colors">
                                    {prop.address || 'Address Hidden'}
                                  </p>
                                  <p className="text-[8px] text-slate-455 truncate">
                                    {[prop.county, prop.state].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                  <span className="text-[9px] font-extrabold text-slate-900 dark:text-white block">Est: ${(prop.assessed_value || 150000).toLocaleString()}</span>
                                  <span className="text-[8px] font-bold text-emerald-500 block">Bid: ${(prop.opening_bid || 5000).toLocaleString()}</span>
                                </div>
                              </div>
                            ))
                          )
                        )}

                        {recommendedTab === 'deeds' && (
                          deedsAuctions.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 mt-10">No deed auctions found.</p>
                          ) : (
                            deedsAuctions.map(a => (
                              <div
                                key={a.id}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                                  <p className="text-[8.5px] text-slate-400 mt-0.5">
                                    {[a.county, a.state].filter(Boolean).join(', ')} · {new Date(a.auction_date || '').toLocaleDateString()}
                                  </p>
                                </div>
                                <span className="text-[8.5px] font-black text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full whitespace-nowrap ml-3">
                                  {a.parcels_count || a.properties_count || 0} items
                                </span>
                              </div>
                            ))
                          )
                        )}

                        {recommendedTab === 'foreclosures' && (
                          foreclosureAuctions.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 mt-10">No foreclosure auctions found.</p>
                          ) : (
                            foreclosureAuctions.map(a => (
                              <div
                                key={a.id}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                                  <p className="text-[8.5px] text-slate-400 mt-0.5">
                                    {[a.county, a.state].filter(Boolean).join(', ')} · {new Date(a.auction_date || '').toLocaleDateString()}
                                  </p>
                                </div>
                                <span className="text-[8.5px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full whitespace-nowrap ml-3">
                                  {a.parcels_count || a.properties_count || 0} items
                                </span>
                              </div>
                            ))
                          )
                        )}

                        {recommendedTab === 'liens' && (
                          liensAuctions.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 mt-10">No tax lien auctions found.</p>
                          ) : (
                            liensAuctions.map(a => (
                              <div
                                key={a.id}
                                className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                                  <p className="text-[8.5px] text-slate-455 mt-0.5">
                                    {[a.county, a.state].filter(Boolean).join(', ')} · {new Date(a.auction_date || '').toLocaleDateString()}
                                  </p>
                                </div>
                                <span className="text-[8.5px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap ml-3">
                                  {a.parcels_count || a.properties_count || 0} items
                                </span>
                              </div>
                            ))
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Widget 4: Live Auctions Finder */}
                  {w.type === 'live_auctions' && (
                    <div className="size-full flex flex-col">
                      <div className="flex gap-2 mb-3 shrink-0">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                          <input
                            type="text"
                            value={auctionQuery}
                            onChange={(e) => setAuctionQuery(e.target.value)}
                            placeholder="Search live auctions by state, county..."
                            className="w-full pl-8 pr-3 py-1.5 text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        {selectedCalendarDate && (
                          <button
                            onClick={() => setSelectedCalendarDate('')}
                            className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/20 text-indigo-500 text-[9px] font-extrabold uppercase rounded-lg shrink-0"
                          >
                            Clear Date
                          </button>
                        )}
                      </div>

                      {/* Small visual interactive calendar row */}
                      <div className="mb-3 border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-xl shrink-0">
                        <div className="flex items-center gap-1 justify-between mb-1.5">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={9} /> Mini Datepicker</span>
                          <span className="text-[8px] font-bold text-indigo-500">{selectedCalendarDate || 'Show All Days'}</span>
                        </div>
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                          {[-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(offset => {
                            const d = new Date();
                            d.setDate(d.getDate() + offset);
                            const dayStr = d.toISOString().split('T')[0];
                            const active = selectedCalendarDate === dayStr;
                            const isToday = offset === 0;
                            return (
                              <button
                                key={offset}
                                onClick={() => setSelectedCalendarDate(dayStr)}
                                className={`flex flex-col items-center p-1.5 min-w-[32px] rounded-lg border transition-all ${
                                  active
                                    ? 'bg-indigo-500 text-white border-indigo-600'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                                }`}
                              >
                                <span className="text-[7px] uppercase font-semibold">{d.toLocaleDateString([], { weekday: 'short' })}</span>
                                <span className="text-[10px] font-black">{d.getDate()}</span>
                                {isToday && <span className="size-1 rounded-full bg-cyan-400 mt-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Auctions search results */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {auctionsLoading ? (
                          <div className="flex items-center justify-center py-10"><RefreshCw className="animate-spin text-indigo-500" size={18} /></div>
                        ) : filteredAuctions.length === 0 ? (
                          <p className="text-center text-[10px] text-slate-400 py-10">No upcoming auctions matching query.</p>
                        ) : (
                          filteredAuctions.map(a => {
                            const s = (a.tax_status || '').toLowerCase();
                            const isDeed = s.includes('deed');
                            const isLien = s.includes('lien');
                            return (
                              <div
                                key={a.id}
                                className="p-2.5 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center hover:border-slate-350 dark:hover:border-slate-700 transition-all"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[7px] font-black px-1.5 py-0.25 rounded uppercase ${
                                      isDeed
                                        ? 'bg-purple-100 dark:bg-purple-955/20 text-purple-600 dark:text-purple-400'
                                        : isLien
                                          ? 'bg-amber-100 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400'
                                          : 'bg-red-100 dark:bg-red-955/20 text-red-600 dark:text-red-400'
                                    }`}>{a.tax_status || 'Auction'}</span>
                                    {a.parcels_count && <span className="text-[7.5px] font-bold text-slate-400">{a.parcels_count} parcels</span>}
                                  </div>
                                  <p className="text-[10px] font-extrabold text-slate-900 dark:text-white truncate mt-1">{a.name}</p>
                                  <p className="text-[8px] text-slate-455 font-semibold mt-0.5">
                                    {a.county}, {a.state} · {a.auction_date ? new Date(a.auction_date).toLocaleDateString() : 'Continuous'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => navigate(`/client/auctions?name=${encodeURIComponent(a.name || '')}`)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-lg shrink-0 ml-2"
                                  title="Expand in Main Page"
                                >
                                  <ArrowRight size={13} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Widget 5: Property Search */}
                  {w.type === 'property_search' && (
                    <div className="size-full flex flex-col">
                      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
                        {/* State selector */}
                        <select
                          value={propStateSelect}
                          onChange={(e) => setPropStateSelect(e.target.value)}
                          className="px-2.5 py-1.5 text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">All States</option>
                          {stateList.map(st => (
                            <option key={st.state} value={st.state}>{st.state}</option>
                          ))}
                        </select>

                        {/* County selector */}
                        <select
                          value={propCountySelect}
                          onChange={(e) => setPropCountySelect(e.target.value)}
                          disabled={!propStateSelect}
                          className="px-2.5 py-1.5 text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="">All Counties</option>
                          {countyList.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>

                        {/* Search keyword input */}
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                          <input
                            type="text"
                            value={propSearchQuery}
                            onChange={(e) => setPropSearchQuery(e.target.value)}
                            placeholder="Keyword ID..."
                            className="w-full pl-6 pr-2 py-1.5 text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Properties results high density table */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {propsLoading ? (
                          <div className="flex items-center justify-center py-10"><RefreshCw className="animate-spin text-indigo-500" size={18} /></div>
                        ) : propertyResults.length === 0 ? (
                          <p className="text-center text-[10px] text-slate-400 py-10">No properties found matching criteria.</p>
                        ) : (
                          <div className="border border-slate-200 dark:border-slate-855 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
                            <table className="w-full text-left text-[9px] border-collapse">
                              <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                                  <th className="p-2">Parcel ID</th>
                                  <th className="p-2">Address</th>
                                  <th className="p-2">County</th>
                                  <th className="p-2 text-right">Value</th>
                                  <th className="p-2 text-center">Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {propertyResults.map(p => (
                                  <tr
                                    key={p.id}
                                    onClick={() => {
                                      setSelectedProperty(p);
                                      focusWidget('dossier');
                                    }}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                                  >
                                    <td className="p-2 font-bold text-slate-900 dark:text-white truncate max-w-[80px]">{p.parcel_id || 'N/A'}</td>
                                    <td className="p-2 truncate max-w-[140px] text-slate-600 dark:text-slate-355">{p.address || 'Certified FEMA Zone'}</td>
                                    <td className="p-2 text-slate-500 font-semibold">{p.county}, {p.state}</td>
                                    <td className="p-2 text-right font-extrabold text-emerald-500">${(p.assessed_value || 240000).toLocaleString()}</td>
                                    <td className="p-2 text-center">
                                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-955/20 text-blue-600 dark:text-blue-450 font-black">{p.deal_score || 82}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Monthly Volume Trends line chart */}
                  {w.type === 'chart' && (
                    <div className="size-full min-h-[180px]">
                      {monthlyLoading ? (
                        <div className="size-full flex items-center justify-center">
                          <RefreshCw className="animate-spin text-purple-500" size={20} />
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyStats} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.12} />
                            <XAxis
                              dataKey="month_label"
                              tick={{ fill: 'var(--text-muted)', fontSize: 8, fontWeight: 700 }}
                              axisLine={{ stroke: 'var(--border)', strokeOpacity: 0.15 }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: 'var(--text-muted)', fontSize: 7 }}
                              axisLine={false}
                              tickLine={false}
                              width={25}
                              allowDecimals={false}
                            />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                  <div className="glass-card p-2 shadow-md border border-slate-200 dark:border-slate-800 text-[9px]">
                                    <p className="font-black text-slate-900 dark:text-white mb-1.5">{label}</p>
                                    {payload.map((entry: any) => (
                                      <div key={entry.name} className="flex items-center justify-between gap-3 mb-0.5">
                                        <div className="flex items-center gap-1">
                                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
                                          <span className="text-slate-500 dark:text-slate-400">{entry.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-955 dark:text-white">{entry.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }}
                            />
                            <Line type="monotone" dataKey="deed" name="Tax Deeds" stroke={CHART_COLORS.deed} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="lien" name="Tax Liens" stroke={CHART_COLORS.lien} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="foreclosure" name="Foreclosures" stroke={CHART_COLORS.foreclosure} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {/* Property Featured Dossier card */}
                  {w.type === 'dossier' && (
                    <div className="size-full flex flex-col justify-between">
                      {selectedProperty ? (
                        <div className="flex flex-col space-y-3.5 h-full justify-between">
                          <div className="w-full h-32 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-3 relative overflow-hidden select-none shrink-0">
                            <span className="material-symbols-outlined text-[36px] text-slate-350 dark:text-slate-700">home</span>
                            <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center justify-between border border-white/10">
                              <span className="text-[8px] font-black text-white uppercase tracking-wider">{selectedProperty.parcel_id || 'Parcel ID'}</span>
                              <span className="text-[8px] font-extrabold text-emerald-400 bg-emerald-500/20 px-1 py-0.25 rounded">{selectedProperty.state || 'FL'}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-950 dark:text-white leading-tight">
                              {selectedProperty.address || 'Certified FEMA Zone'}
                            </p>
                            <p className="text-[9.5px] text-slate-455 font-semibold">
                              {selectedProperty.county || 'Miami-Dade County'}, {selectedProperty.state || 'FL'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-slate-50/70 dark:bg-slate-800/10 p-2.5 rounded-xl border border-slate-200/55 dark:border-slate-800/50">
                            <div>
                              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Assessed Est.</span>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                ${(selectedProperty.assessed_value ?? 240000).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Opening Bid</span>
                              <span className="text-xs font-black text-blue-500 dark:text-blue-400">
                                ${(selectedProperty.opening_bid ?? 12500).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[9px] bg-slate-50/30 dark:bg-slate-800/10 px-2 py-1.5 rounded-lg border border-slate-200/30 dark:border-slate-850">
                            <span className="text-slate-550 flex items-center gap-1 font-semibold">
                              <ShieldCheck size={12} className="text-emerald-500 animate-pulse" /> FEMA Hazard:
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Zone X (Low-Risk)</span>
                          </div>

                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => navigate(`/client/properties/${selectedProperty.id}`)}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-[0.97]"
                            >
                              View Dossier details
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-455 dark:text-slate-650 select-none">
                          <Folder className="opacity-30 mb-2" size={32} />
                          <p className="text-xs font-bold">Select property to inspect</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Circular Yield breakdown pie chart */}
                  {w.type === 'yield' && (
                    <div className="size-full flex flex-col justify-between">
                      <div className="h-32 w-full flex items-center justify-center relative">
                        {pieData.length === 0 ? (
                          <p className="text-xs text-slate-400">No chart data available</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={28}
                                outerRadius={44}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                        {pieData.length > 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                              {totals.total.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-1.5 pt-1.5 border-t border-slate-200/25 dark:border-slate-800/40 shrink-0">
                        {pieData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                              <span className="text-slate-455">{item.name}</span>
                            </div>
                            <span className="text-slate-900 dark:text-white">
                              {item.value.toLocaleString()} ({totals.total > 0 ? Math.round((item.value / totals.total) * 100) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Window Bottom-Right Resize Handle */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, w.id, 'resize')}
                  className="absolute bottom-0 right-0 size-4 cursor-se-resize flex items-end justify-end p-0.5 z-[100]"
                >
                  <div className="size-2 border-r-2 border-b-2 border-slate-350 dark:border-slate-650 opacity-40 group-hover/window:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>

          {/* Floating Canvas scale HUD overlay (fixed relative to canvas viewport!) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-950/90 text-white backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-4 border border-slate-805 shadow-2xl select-none font-bold text-[10px]">
            <div className="flex items-center gap-2 border-r border-slate-800 pr-3 text-slate-400">
              <Move size={11} />
              <span>Canvas Center Coordinates:</span>
              <span className="text-slate-100 font-extrabold">{panX}px, {panY}px</span>
            </div>

            <div className="flex items-center gap-2 pr-2">
              <Compass size={11} className="text-indigo-400 animate-spin" />
              <span>Scale Factor:</span>
              <span className="text-indigo-400 font-extrabold">{Math.round(zoomScale * 100)}%</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 rounded-lg p-0.5">
              <button
                onClick={() => setZoomScale(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
                className="size-5 rounded hover:bg-slate-700 flex items-center justify-center text-xs font-black"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={() => {
                  setZoomScale(1.0);
                  setPanX(0);
                  setPanY(0);
                }}
                className="px-2 py-0.5 rounded hover:bg-slate-700 text-[8px] uppercase tracking-wider font-extrabold"
                title="Reset Canvas View"
              >
                100%
              </button>
              <button
                onClick={() => setZoomScale(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
                className="size-5 rounded hover:bg-slate-700 flex items-center justify-center text-xs font-black"
                title="Zoom In"
              >
                +
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ─── FOOTER (Status e Controles) ─── */}
      <div className="w-full h-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 px-5 flex justify-between items-center shrink-0 z-30 select-none">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Synced · Last Refresh: <span className="text-slate-700 dark:text-slate-300 font-extrabold">{syncTime || '04:18 AM'}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[8.5px] font-semibold text-slate-455 dark:text-slate-500">
            <Layers size={10} />
            <span>Active Canvas Windows: {widgets.filter(w => w.visible).length}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            IDE Workbench V3.5
          </span>
        </div>
      </div>

    </div>
  );
};

export default ClientWorkbench;
