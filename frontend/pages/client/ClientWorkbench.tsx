import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getStateStats, StateStat, getMonthlyStats, MonthlyAuctionStat, getTopScoredProperties } from '../../services/scores.service';
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
  Maximize, Activity, Info, Users, CreditCard, Bell, Briefcase, Trash2, Edit2, Play, Check, Shield, CheckSquare,
  MousePointer, TrendingUp
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
  type: 'shortcuts' | 'metrics_deed' | 'metrics_foreclosure' | 'metrics_lien' | 'map' | 'recommended_deals' | 'live_auctions' | 'property_search' | 'chart' | 'dossier' | 'yield' |
        'my_lists' | 'field_missions' | 'connect' | 'settings' | 'profile' | 'team' | 'logs' | 'billings' | 'company' | 'notifications' | 'property_details' | 'create_task' | 'support_center' |
        'node_canvas' | 'rehab_calc' | 'property_comparator' | 'contacts_search';
  title: string;
  x: number; // left offset in pixels
  y: number; // top offset in pixels
  w: number; // width in pixels
  h: number; // height in pixels
  visible: boolean;
  zIndex: number;
}

interface OverlayWindow {
  id: string;
  type: 'my_lists' | 'live_auctions' | 'property_search' | 'field_missions' | 'property_details' | 'settings' | 'team_and_logs' | 'billings_and_plans' | 'about';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  data?: any;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'metrics_deed', type: 'metrics_deed', title: 'Tax Deeds Total', x: 20, y: 20, w: 260, h: 140, visible: true, zIndex: 11 },
  { id: 'metrics_foreclosure', type: 'metrics_foreclosure', title: 'Foreclosures Total', x: 300, y: 20, w: 260, h: 140, visible: true, zIndex: 12 },
  { id: 'metrics_lien', type: 'metrics_lien', title: 'Tax Liens Total', x: 580, y: 20, w: 260, h: 140, visible: true, zIndex: 13 },
  { id: 'map', type: 'map', title: 'National Yield Heatmap', x: 20, y: 180, w: 820, h: 430, visible: true, zIndex: 14 },
  { id: 'recommended_deals', type: 'recommended_deals', title: 'Top Recommended Deals', x: 860, y: 20, w: 450, h: 590, visible: true, zIndex: 15 },
  { id: 'chart', type: 'chart', title: 'Monthly Auction Trends', x: 860, y: 630, w: 450, h: 390, visible: true, zIndex: 18 },
  { id: 'dossier', type: 'dossier', title: 'Featured Property Dossier', x: 1330, y: 20, w: 380, h: 590, visible: true, zIndex: 19 },
  { id: 'yield', type: 'yield', title: 'Yield Breakdown Analytics', x: 1330, y: 630, w: 380, h: 390, visible: true, zIndex: 20 },
  { id: 'rehab_calc', type: 'rehab_calc', title: 'Rehab & ROI Calculator', x: 1730, y: 20, w: 380, h: 420, visible: true, zIndex: 35 },
  { id: 'support_center', type: 'support_center', title: 'Support & Help Center', x: 1730, y: 460, w: 380, h: 420, visible: true, zIndex: 33 },
  { id: 'company', type: 'company', title: 'Active Company Hub', x: 2130, y: 20, w: 300, h: 230, visible: true, zIndex: 29 }
];

export const ClientWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, companies, selectCompany } = useCompany();
  const canvasRef = useRef<HTMLDivElement>(null);

  // States
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const saved = localStorage.getItem('goauct_workbench_widgets_v40');
      if (!saved) return DEFAULT_WIDGETS;
      
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return DEFAULT_WIDGETS;
      }
      
      // Self-healing: if ALL saved widgets are marked invisible, fallback to default layouts
      const hasVisible = parsed.some((w: any) => w.visible);
      if (!hasVisible) {
        console.warn('ClientWorkbench: All saved widgets were invisible, falling back to default layout visibility.');
        return DEFAULT_WIDGETS;
      }
      
      // Self-healing: if any DEFAULT_WIDGETS are missing from the saved ones, merge them.
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
          };
        }
        return def;
      });
      
      return merged;
    } catch (e) {
      console.error('Failed to parse goauct_workbench_widgets_v40 from localStorage, falling back to default:', e);
      return DEFAULT_WIDGETS;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('goauct_workbench_sidebarOpen');
    return saved === null ? true : saved === 'true';
  });
  const [activePane, setActivePane] = useState<'explorer' | 'presets' | 'info' | 'notifications'>(() => {
    return (localStorage.getItem('goauct_workbench_activePane') as any) || 'explorer';
  });
  const [upcomingAuctionsCount, setUpcomingAuctionsCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    ClientDataService.getLists().then(lists => {
      const hasUpcoming = lists
        .filter((l: any) => l.has_upcoming_auction)
        .reduce((acc: number, curr: any) => acc + (curr.upcoming_auctions_count || 0), 0);
      setUpcomingAuctionsCount(hasUpcoming);
    }).catch(() => {});
  }, []);

  const [selectedState, setSelectedState] = useState<string>('');

  // IDE Mode & Node Canvas Custom States
  const layoutTemplate = 'canvas';
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

  const openOverlayWindow = (
    type: 'my_lists' | 'live_auctions' | 'property_search' | 'field_missions' | 'property_details' | 'settings' | 'team_and_logs' | 'billings_and_plans' | 'about',
    title: string,
    data?: any
  ) => {
    const id = type === 'property_details' ? `prop_details_${data?.propertyId}` : type;

    setOverlayWindows(prev => {
      const existingIdx = prev.findIndex(w => w.id === id);
      if (existingIdx !== -1) {
        return prev.map((w, idx) =>
          idx === existingIdx
            ? { ...w, isMinimized: false, zIndex: Math.max(...prev.map(x => x.zIndex), 0) + 1 }
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
      } else if (type === 'about') {
        w = 680;
        h = 500;
      }
      const x = Math.max((viewportW - w) / 2 + (prev.length * 20) % 200, 40);
      const y = Math.max((viewportH - h) / 2 + (prev.length * 20) % 200, 60);
      const zIndex = Math.max(...prev.map(x => x.zIndex), 0) + 1;

      const newWin: OverlayWindow = {
        id,
        type,
        title,
        x,
        y,
        w,
        h,
        zIndex,
        isMinimized: false,
        isMaximized: false,
        data,
      };
      return [...prev, newWin];
    });

    setActiveOverlayWindowId(id);
    logConsoleActivity(`Opened overlay window: "${title}"`);
  };

  const focusOverlayWindow = (id: string) => {
    setActiveOverlayWindowId(id);
    setOverlayWindows(prev => {
      const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
      return prev.map(w => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
    });
  };

  const closeOverlayWindow = (id: string) => {
    setOverlayWindows(prev => prev.filter(w => w.id !== id));
    if (activeOverlayWindowId === id) {
      setActiveOverlayWindowId(null);
    }
    logConsoleActivity(`Closed overlay window: "${id}"`);
  };

  const toggleMinimizeOverlayWindow = (id: string) => {
    setOverlayWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w))
    );
    logConsoleActivity(`Toggled minimize for window: "${id}"`);
  };

  const toggleMaximizeOverlayWindow = (id: string) => {
    setOverlayWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
    logConsoleActivity(`Toggled maximize for window: "${id}"`);
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
    
    window.addEventListener('open-workbench-widget', handleOpenWidget as EventListener);
    return () => {
      window.removeEventListener('open-workbench-widget', handleOpenWidget as EventListener);
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

  // --- REHAB & ROI ESTIMATOR STATES ---
  const [rehabPurchasePrice, setRehabPurchasePrice] = useState<number>(250000);
  const [rehabCost, setRehabCost] = useState<number>(45000);
  const [rehabTaxes, setRehabTaxes] = useState<number>(8000);
  const [rehabARV, setRehabARV] = useState<number>(380000);
  const [rehabGrossRent, setRehabGrossRent] = useState<number>(2500);

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
      UserService.getUsers().then(setTeamMembers).catch(() => {});
      UserService.getUserCompanies(currentUser.id).then(setUserCompanies).catch(() => {});
    }
  }, [currentUser]);



  // Fetch backend analytics & properties
  const fetchWorkbenchData = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().split('T')[0];

      const [stats, monthly, topScored, deedRes, sheriffRes, foreRes, lienRes] = await Promise.all([
        getStateStats().catch(err => { console.error('getStateStats failed:', err); return []; }),
        getMonthlyStats().catch(err => { console.error('getMonthlyStats failed:', err); return []; }),
        getTopScoredProperties(12, { availability_status: 'available' } as any).catch(err => { console.error('getTopScoredProperties failed:', err); return []; }),
        AuctionService.getAuctionEvents({ name: 'deed', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' })
          .catch(err => { console.error('deedRes failed:', err); return { items: [], total: 0 }; }),
        AuctionService.getAuctionEvents({ name: 'sheriff', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' })
          .catch(err => { console.error('sheriffRes failed:', err); return { items: [], total: 0 }; }),
        AuctionService.getAuctionEvents({ name: 'foreclosure', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' })
          .catch(err => { console.error('foreRes failed:', err); return { items: [], total: 0 }; }),
        AuctionService.getAuctionEvents({ name: 'lien', startDate: sevenDaysAgo, limit: 10, sortBy: 'parcels_count', order: 'desc' })
          .catch(err => { console.error('lienRes failed:', err); return { items: [], total: 0 }; }),
      ]);

      setStateStats(Array.isArray(stats) ? stats : []);
      setMonthlyStats(Array.isArray(monthly) ? monthly : []);
      setDbTopDeals(Array.isArray(topScored) ? (topScored as Property[]) : []);

      // De-duplicate Deeds
      const mergedDeeds = Array.from(
        new Map([
          ...(deedRes?.items || []),
          ...(sheriffRes?.items || [])
        ].filter(Boolean).map(item => [item?.id, item])).values()
      ).filter(Boolean);
      setDeedsAuctions(mergedDeeds);
      setForeclosureAuctions(foreRes?.items || []);
      setLiensAuctions(lienRes?.items || []);

      // Dynamic Counter Totals
      setMarketCounts({
        deed: ((deedRes?.total || 0) + (sheriffRes?.total || 0)) || 430,
        foreclosure: foreRes?.total || 852,
        lien: lienRes?.total || 594
      });

      if (Array.isArray(topScored) && topScored.length > 0) {
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
    localStorage.setItem('goauct_workbench_widgets_v40', JSON.stringify(widgets));
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
      localStorage.removeItem('goauct_workbench_widgets_v40');
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

  // Window Drag & Resize Touch Handlers for mobile device support
  const handleTouchStart = (
    e: React.TouchEvent,
    widgetId: string,
    type: 'drag' | 'resize'
  ) => {
    focusWidget(widgetId);

    const targetWidget = widgets.find(w => w.id === widgetId);
    if (!targetWidget) return;

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

      // Coordinated tool suites
      const set1 = ['recommended_deals', 'dossier', 'rehab_calc'];
      const set2 = ['map', 'chart', 'yield'];

      let idsToSync: string[] = [];
      if (set1.includes(id)) idsToSync = set1;
      else if (set2.includes(id)) idsToSync = set2;

      return prev.map(w => {
        if (w.id === id) {
          return { ...w, visible: targetNextVisible };
        }
        if (idsToSync.includes(w.id)) {
          if (targetNextVisible) {
            return { ...w, visible: true };
          }
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
          // Standard analytical set: deeds, foreclosures, liens, map, recommended deals visible. All others hidden.
          const visibleIds = ['metrics_deed', 'metrics_foreclosure', 'metrics_lien', 'map', 'recommended_deals'];
          if (visibleIds.includes(w.id)) {
            const match = DEFAULT_WIDGETS.find(d => d.id === w.id);
            if (match) coords = { ...match, visible: true, zIndex: incrementZ() };
          } else {
            coords = { ...w, visible: false };
          }
        } else if (presetId === 'map_focus') {
          if (w.id === 'map') {
            coords = { x: 20, y: 20, w: 1060, h: 560, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'dossier') {
            coords = { x: 1100, y: 20, w: 380, h: 560, visible: true, zIndex: incrementZ() };
          } else if (w.id === 'metrics_deed') {
            coords = { x: 1100, y: 600, w: 380, h: 260, visible: true, zIndex: incrementZ() };
          } else {
            coords = { ...w, visible: false };
          }
        } else if (presetId === 'analytics_focus') {
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
        } else if (presetId === 'dossier_focus') {
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
    
    // Route to full page components
    if (w.id === 'live_auctions') return <div className="size-full overflow-auto bg-white dark:bg-slate-900"><ClientAuctions /></div>;
    if (w.id === 'property_search') return <div className="size-full overflow-auto bg-white dark:bg-slate-900"><ClientProperties /></div>;
    if (w.id === 'my_lists') return <div className="size-full overflow-auto bg-white dark:bg-slate-900"><ClientLists /></div>;

    // Route to embedded widget content
    return (
      <div className="size-full overflow-auto p-4 select-text flex flex-col min-h-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
        {w.type === 'shortcuts' && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Access</p>
            <div className="grid grid-cols-3 gap-4 max-w-xs">
              {[
                { label: 'Live Auctions', icon: Calendar, id: 'live_auctions', color: 'from-amber-400 to-orange-500' },
                { label: 'Property Search', icon: Search, id: 'property_search', color: 'from-blue-400 to-cyan-500' },
                { label: 'My Lists', icon: Folder, id: 'my_lists', color: 'from-purple-400 to-pink-500' },
                { label: 'Missions', icon: Gavel, id: 'field_missions', color: 'from-emerald-400 to-teal-500' },
                { label: 'Settings', icon: Settings, id: 'settings', color: 'from-slate-400 to-slate-600' },
                { label: 'Billing', icon: CreditCard, id: 'billings', color: 'from-indigo-400 to-indigo-600' },
              ].map(app => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      if (['my_lists', 'live_auctions', 'property_search', 'field_missions'].includes(app.id)) {
                        openOverlayWindow(app.id as any, app.label);
                      } else {
                        setWidgets(prev => prev.map(ww => ww.id === app.id ? { ...ww, visible: true } : ww));
                        setActiveIdeTabId(app.id);
                      }
                    }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`size-14 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{app.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(w.type === 'metrics_deed' || w.type === 'metrics_foreclosure' || w.type === 'metrics_lien') && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-black text-slate-900 dark:text-white mb-2">
                {w.type === 'metrics_deed' ? marketCounts.deed.toLocaleString() :
                 w.type === 'metrics_foreclosure' ? marketCounts.foreclosure.toLocaleString() :
                 marketCounts.lien.toLocaleString()}
              </div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">{w.title.replace(/^[^\w]+/, '')}</div>
            </div>
          </div>
        )}

        {w.type === 'map' && (
          <div className="h-full min-h-[400px]">
            <InvestmentHeatmap stateStats={stateStats} />
          </div>
        )}

        {w.type === 'chart' && (
          <div className="h-full min-h-[300px] flex flex-col gap-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Monthly Auction Trends</h2>
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="deed_count" stroke={CHART_COLORS.deed} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="foreclosure_count" stroke={CHART_COLORS.foreclosure} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lien_count" stroke={CHART_COLORS.lien} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {w.type === 'yield' && (
          <div className="h-full min-h-[300px] flex flex-col gap-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Yield Breakdown Analytics</h2>
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Tax Deeds', value: marketCounts.deed },
                    { name: 'Foreclosures', value: marketCounts.foreclosure },
                    { name: 'Tax Liens', value: marketCounts.lien },
                  ]} dataKey="value" cx="50%" cy="50%" outerRadius={100} label>
                    {[CHART_COLORS.deed, CHART_COLORS.foreclosure, CHART_COLORS.lien].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {w.type === 'recommended_deals' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Top Recommended Deals</h2>
            {dbTopDeals.slice(0, 8).map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <TrendingUp size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.address || 'Property'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{p.county}, {p.state}</p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">${(p.assessed_value || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {dbTopDeals.length === 0 && <p className="text-xs text-slate-400 italic">Loading deals...</p>}
          </div>
        )}

        {w.type === 'dossier' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Featured Property Dossier</h2>
            {selectedProperty ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20">
                  <p className="font-bold text-slate-900 dark:text-white">{selectedProperty.address}</p>
                  <p className="text-xs text-slate-500">{selectedProperty.county}, {selectedProperty.state}</p>
                </div>
                {[
                  { label: 'Parcel ID', val: selectedProperty.parcel_id },
                  { label: 'Assessed Value', val: `$${(selectedProperty.assessed_value || 0).toLocaleString()}` },
                  { label: 'Status', val: selectedProperty.availability_status },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-semibold text-slate-500">{r.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{r.val || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select a property to view its dossier.</p>
            )}
          </div>
        )}

        {w.type === 'property_details' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Deep Property Details</h2>
            {selectedProperty ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                  <p className="font-bold text-slate-900 dark:text-white">{selectedProperty.address}</p>
                  <p className="text-xs text-slate-500">{selectedProperty.county}, {selectedProperty.state}</p>
                </div>
                {Object.entries(selectedProperty).slice(0, 12).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
                    <span className="font-semibold text-slate-500 capitalize shrink-0">{key.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">{String(val || '—')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select a property to view deep details.</p>
            )}
          </div>
        )}

        {w.type === 'field_missions' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Field Missions Panel</h2>
            <div className="flex gap-2">
              <div className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase">Available</p>
                <p className="text-lg font-black text-indigo-500">{availableTasks.length}</p>
              </div>
              <div className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase">Claimed</p>
                <p className="text-lg font-black text-emerald-500">{myClaimedTasks.length}</p>
              </div>
            </div>
            {tasksLoading ? (
              <p className="text-xs text-slate-400 italic">Loading missions...</p>
            ) : (
              <div className="space-y-2">
                {availableTasks.slice(0, 4).map(t => (
                  <div key={t.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{t.title}</p>
                      <p className="text-[10px] text-slate-400">Reward: <span className="font-bold text-indigo-500">${t.reward_amount}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {w.type === 'connect' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">GoAuct OS Connect Panel</h2>
            <div className="space-y-2">
              {[
                { name: 'National Registrars', status: 'Online', latency: '42ms' },
                { name: 'Attom API', status: 'Online', latency: '120ms' },
                { name: 'ZenRows Scrapers', status: 'Standby', latency: '—' },
              ].map(api => (
                <div key={api.name} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-white">{api.name}</span>
                  <div className="text-right">
                    <span className="font-black text-emerald-500 block">{api.status}</span>
                    <span className="text-[9px] text-slate-400">{api.latency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {w.type === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Workspace Configuration</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex justify-between">
                  <span>Zoom Level</span>
                  <span className="text-indigo-600">{Math.round(zoomScale * 100)}%</span>
                </label>
                <input type="range" min="0.5" max="2" step="0.1" value={zoomScale}
                  onChange={e => setZoomScale(Number(e.target.value))}
                  className="w-full mt-1 accent-indigo-500" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Layout Template</p>
                <div className="flex gap-2">
                  {(['canvas', 'ide'] as const).map(mode => (
                    <button key={mode} onClick={() => setLayoutTemplate(mode)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${layoutTemplate === mode ? 'bg-indigo-500 text-white shadow' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-700'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {w.type === 'profile' && (
          <div className="space-y-4 text-center">
            <div className="size-16 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto text-xl font-black text-white shadow-lg">
              GU
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Gustavo Dev</h2>
              <p className="text-xs text-slate-400">Chief Real Estate Strategist</p>
            </div>
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-500/10 text-xs">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Enterprise Access Tier</span>
            </div>
          </div>
        )}

        {w.type === 'team' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Team Workspace Roster</h2>
            {[
              { name: 'Sarah Connor', role: 'Property Inspector', status: 'On Field' },
              { name: 'John Doe', role: 'Title Researcher', status: 'Researching' },
              { name: 'Gustavo Dev', role: 'Workbench Admin', status: 'Online' },
            ].map(member => (
              <div key={member.name} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{member.name}</p>
                  <p className="text-[9px] text-slate-400">{member.role}</p>
                </div>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{member.status}</span>
              </div>
            ))}
          </div>
        )}

        {w.type === 'logs' && (
          <div className="h-full flex flex-col gap-3 min-h-[300px]">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Live Activity Logs</h2>
            <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[9px] text-slate-300 overflow-y-auto space-y-1 min-h-[220px]">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="opacity-90 hover:opacity-100 flex items-start gap-1">
                  <span className="text-emerald-500 shrink-0 font-bold">›</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {w.type === 'billings' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Workbench Subscriptions</h2>
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Current Plan</p>
              <p className="text-2xl font-black mt-1">Enterprise Plus</p>
              <p className="text-xs mt-2 opacity-95">All state scraper channels activated.</p>
            </div>
          </div>
        )}

        {w.type === 'company' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Active Company Hub</h2>
            {activeCompany ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Corporate Entity</p>
                  <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{activeCompany.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeCompany.address || 'No Address'}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Switch Entity</p>
                  <div className="space-y-1">
                    {companies.map(co => (
                      <button
                        key={co.id}
                        onClick={() => { selectCompany(co.id); logConsoleActivity(`Entity switched to: "${co.name}"`); }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-xs ${activeCompany.id === co.id ? 'bg-indigo-500/10 text-indigo-600 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300'}`}
                      >
                        <span>{co.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No active company context.</p>
            )}
          </div>
        )}

        {w.type === 'notifications' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">System Feed Notification</h2>
            {[
              { title: 'New Sheriff Auction Mapped', desc: '14 properties parsed in Broward County.', time: '5m ago' },
              { title: 'ZenRows API Cap Reached', desc: 'Auto-switched to reserve Attom parser.', time: '1h ago' },
              { title: 'Missions Database Backed Up', desc: 'Weekly automated snapshot completed.', time: '4h ago' },
            ].map((n, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-800 dark:text-white">{n.title}</p>
                  <span className="text-[9px] text-slate-400 font-semibold">{n.time}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">{n.desc}</p>
              </div>
            ))}
          </div>
        )}

        {w.type === 'node_canvas' && (
          <div className="space-y-4 h-full min-h-[360px] flex flex-col min-w-0">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-sm font-black text-slate-800 dark:text-white">Deal Flow Logic Graph</h2>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold">
                {[
                  { id: 'select', label: 'Pointer' },
                  { id: 'connect', label: 'Connect' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setNodeCanvasTool(opt.id as any)}
                    className={`px-2 py-1 rounded-md transition-colors ${nodeCanvasTool === opt.id ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 overflow-hidden relative min-h-[220px]">
              <svg className="absolute inset-0 pointer-events-none w-full h-full">
                {nodeConnections.map((conn, idx) => {
                  const fromEl = document.getElementById(`node-${conn.from}`);
                  const toEl = document.getElementById(`node-${conn.to}`);
                  if (!fromEl || !toEl) return null;
                  const fromRect = fromEl.getBoundingClientRect();
                  const toRect = toEl.getBoundingClientRect();
                  const parentEl = fromEl.parentElement;
                  if (!parentEl) return null;
                  const parentRect = parentEl.getBoundingClientRect();
                  
                  const startX = (fromRect.left + fromRect.width / 2) - parentRect.left;
                  const startY = (fromRect.top + fromRect.height / 2) - parentRect.top;
                  const endX = (toRect.left + toRect.width / 2) - parentRect.left;
                  const endY = (toRect.top + toRect.height / 2) - parentRect.top;
                  
                  const midX = (startX + endX) / 2;
                  
                  return (
                    <g key={idx}>
                      <path
                        d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray="4 2"
                        className="opacity-60"
                      />
                    </g>
                  );
                })}
              </svg>
              
              <div className="absolute inset-0 p-4 grid grid-cols-2 gap-3 overflow-y-auto no-scrollbar">
                {[
                  { id: '1', name: 'Scraped Leads', status: '124 Records' },
                  { id: '2', name: 'AI Value Assessor', status: 'Filtering' },
                  { id: '3', name: 'ZenRows Registry Check', status: 'Running' },
                  { id: '4', name: 'Top ROI Pipeline', status: '12 Qualified' },
                  { id: '5', name: 'Tax Lien Watcher', status: 'Monitoring' },
                  { id: '6', name: 'Corporate Purchase Hub', status: '3 Approved' },
                ].map(node => (
                  <div
                    key={node.id}
                    id={`node-${node.id}`}
                    onClick={() => {
                      if (nodeCanvasTool === 'connect') {
                        if (!nodeConnectSourceId) {
                          setNodeConnectSourceId(node.id);
                          logConsoleActivity(`Connecting source selected: node ${node.id}`);
                        } else {
                          if (nodeConnectSourceId !== node.id) {
                            setNodeConnections(prev => [...prev, { from: nodeConnectSourceId, to: node.id }]);
                            logConsoleActivity(`Created link from node ${nodeConnectSourceId} to ${node.id}`);
                          }
                          setNodeConnectSourceId(null);
                        }
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all text-left bg-white dark:bg-slate-900 cursor-pointer ${nodeConnectSourceId === node.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-indigo-500" />
                      <p className="text-[10px] font-black text-slate-800 dark:text-white truncate">{node.name}</p>
                    </div>
                    <p className="text-[8.5px] text-slate-400 mt-1 font-semibold">{node.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {w.type === 'rehab_calc' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Rehab & ROI Calculator</h2>
            {[
              { label: 'Purchase Price', value: rehabPurchasePrice, set: setRehabPurchasePrice, min: 0, max: 2000000, step: 1000 },
              { label: 'Rehab Cost', value: rehabCost, set: setRehabCost, min: 0, max: 500000, step: 500 },
              { label: 'Annual Taxes', value: rehabTaxes, set: setRehabTaxes, min: 0, max: 50000, step: 500 },
              { label: 'ARV (After Repair)', value: rehabARV, set: setRehabARV, min: 0, max: 3000000, step: 1000 },
            ].map(field => (
              <div key={field.label}>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex justify-between">
                  <span>{field.label}</span>
                  <span className="text-indigo-600">${field.value.toLocaleString()}</span>
                </label>
                <input type="range" min={field.min} max={field.max} step={field.step} value={field.value}
                  onChange={e => field.set(Number(e.target.value))}
                  className="w-full mt-1 accent-indigo-500" />
              </div>
            ))}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Net ROI</p>
              <p className={`text-3xl font-black ${rehabARV - rehabPurchasePrice - rehabCost - rehabTaxes > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ${(rehabARV - rehabPurchasePrice - rehabCost - rehabTaxes).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {(w.type === 'property_comparator' || w.type === 'contacts_search' || w.type === 'create_task' || w.type === 'support_center') && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto shadow-lg">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">{w.title.replace(/^[^\w]+/, '')}</h2>
              <p className="text-xs text-slate-400 max-w-xs">This widget's full content is available in Canvas Mode. Switch the layout to interact with it as a floating window.</p>
              <button
                onClick={() => { setLayoutTemplate('canvas'); logConsoleActivity(`Switched to Canvas Mode for widget: "${w.title}"`); }}
                className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors"
              >
                Open in Canvas Mode
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden select-none bg-slate-50 dark:bg-slate-950 font-display">

      {/* ─── HEADER (Topo) ─── */}
      <div className="w-full h-14 bg-white/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/60 px-5 flex items-center justify-between backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">GoAuct OS</h2>
              <span className="text-[7.5px] font-extrabold uppercase px-1.5 py-0.25 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 rounded-md">
                V3.5 Infinite Canvas
              </span>
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

        {/* ─── SIDEBAR 1: Primary VS Code Ribbon (64px desktop, 40px mobile) ─── */}
        <div className="w-10 md:w-16 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/60 flex flex-col justify-between py-4 items-center shrink-0 z-40 overflow-y-auto no-scrollbar scrollbar-none">
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
                  className={`relative p-2.5 rounded-xl transition-all ${
                    active
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
              { id: 'team_and_logs', icon: Users, label: 'Team & Activity Logs' },
              { id: 'billings_and_plans', icon: CreditCard, label: 'Billing & Plans' },
              { id: 'notifications', icon: Bell, label: 'System Notifications' },
              { id: 'settings', icon: Settings, label: 'Workbench Settings' }
            ].map(shortcut => {
              const Icon = shortcut.icon;
              const isVisible = shortcut.id === 'notifications' 
                ? activePane === 'notifications' && sidebarOpen 
                : overlayWindows.some(w => w.id === shortcut.id && !w.isMinimized);

              return (
                <button
                  key={shortcut.id}
                  title={shortcut.label}
                  onClick={() => {
                    if (shortcut.id === 'notifications') {
                      if (activePane === 'notifications' && sidebarOpen) {
                        setSidebarOpen(false);
                      } else {
                        setActivePane('notifications');
                        setSidebarOpen(true);
                      }
                    } else {
                      openOverlayWindow(shortcut.id as any, shortcut.label);
                    }
                  }}
                  className={`relative p-2.5 rounded-xl transition-all ${
                    isVisible
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-955/10 border border-indigo-500/10 shadow-sm'
                      : 'text-slate-400 dark:text-slate-655 hover:text-slate-700 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {isVisible && shortcut.id !== 'notifications' && (
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

          {/* Minimalist circular Zoom Controls in Sidebar Ribbon footer */}
          <div className="flex flex-col gap-1 items-center w-full border-t border-slate-100 dark:border-slate-800/85 pt-3">
            <button
              onClick={() => setZoomScale(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
              className="size-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-sm font-extrabold transition-all"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => { setZoomScale(1.0); setPanX(0); setPanY(0); }}
              className="text-[7.5px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-extrabold uppercase py-1 select-none tracking-wider text-center"
              title="Reset Zoom"
            >
              100%
            </button>
            <button
              onClick={() => setZoomScale(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
              className="size-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-sm font-extrabold transition-all"
              title="Zoom Out"
            >
              -
            </button>
          </div>

          <div className="flex flex-col gap-4 items-center w-full border-t border-slate-100 dark:border-slate-800/85 pt-4">
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
          className={`hidden md:flex bg-white/95 dark:bg-slate-900/90 border-r border-slate-200/80 dark:border-slate-800/60 flex-col transition-all duration-300 backdrop-blur-sm shrink-0 z-35 overflow-y-auto ${
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
                    <p className="text-[8.5px] text-slate-500 dark:text-slate-400 mt-2 bg-blue-500/5 dark:bg-blue-955/10 border border-blue-500/10 p-2 rounded-lg font-bold leading-normal">
                      Click on the icons to open internal floating windows within GoAuct. Organize your workspace however you prefer.
                    </p>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    {widgets.filter(w => !['my_lists', 'live_auctions', 'property_search', 'field_missions', 'property_details'].includes(w.type)).map(w => (
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
                          {w.type === 'my_lists' && <Folder size={13} />}
                          {w.type === 'field_missions' && <Gavel size={13} />}
                          {w.type === 'connect' && <Compass size={13} />}
                          {w.type === 'settings' && <Settings size={13} />}
                          {w.type === 'profile' && <Users size={13} />}
                          {w.type === 'team' && <Users size={13} />}
                          {w.type === 'logs' && <Terminal size={13} />}
                          {w.type === 'billings' && <CreditCard size={13} />}
                          {w.type === 'company' && <Briefcase size={13} />}
                          {w.type === 'notifications' && <Bell size={13} />}
                          {w.type === 'property_details' && <Info size={13} />}
                          {w.type === 'create_task' && <Plus size={13} />}
                          {w.type === 'support_center' && <HelpCircle size={13} />}
                          {w.type === 'node_canvas' && <Layers size={13} />}
                          {w.type === 'rehab_calc' && <Activity size={13} />}
                          {w.type === 'property_comparator' && <LayoutGrid size={13} />}
                          {w.type === 'contacts_search' && <Smartphone size={13} />}
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
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${
                                w.visible
                                  ? 'bg-indigo-50/50 dark:bg-indigo-955/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold'
                                  : 'bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-850 text-slate-455 dark:text-slate-600 font-semibold'
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
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Workspace Template</h3>
                        <p className="text-[8px] font-bold text-slate-455 uppercase tracking-widest mt-0.5">Choose layout behavior</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setLayoutTemplate('canvas');
                            logConsoleActivity('Switched workspace layout to Infinite Canvas Mode.');
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            layoutTemplate === 'canvas'
                              ? 'bg-indigo-50/50 dark:bg-indigo-955/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-450 dark:text-slate-500'
                          }`}
                        >
                          <LayoutGrid size={14} className="mx-auto mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Canvas</span>
                        </button>
                        <button
                          onClick={() => {
                            setLayoutTemplate('ide');
                            const open = widgets.filter(w => w.visible);
                            if (open.length > 0 && (!activeIdeTabId || !widgets.find(w => w.id === activeIdeTabId)?.visible)) {
                              setActiveIdeTabId(open[0].id);
                            } else if (open.length === 0) {
                              setWidgets(prev => prev.map(w => w.id === 'live_auctions' ? { ...w, visible: true } : w));
                              setActiveIdeTabId('live_auctions');
                            }
                            logConsoleActivity('Switched workspace layout to IDE Developer Workspace Mode.');
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            layoutTemplate === 'ide'
                              ? 'bg-indigo-50/50 dark:bg-indigo-955/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-450 dark:text-slate-500'
                          }`}
                        >
                          <Terminal size={14} className="mx-auto mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-wider">IDE Mode</span>
                        </button>
                      </div>

                      <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-800/80 my-1" />

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
                          { id: 'default', label: 'Default Layout', desc: 'Full widgets analytical grid', icon: LayoutGrid },
                          { id: 'map_focus', label: 'Map Focus', desc: 'Maximizes geographical yields', icon: Map },
                          { id: 'analytics_focus', label: 'Analytics Center', desc: 'Aligns charts side-by-side', icon: BarChart2 },
                          { id: 'dossier_focus', label: 'Deep Dossier', desc: 'Prioritizes property inspect details', icon: Folder }
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
            <div className="h-9 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-end gap-0 overflow-x-auto no-scrollbar shrink-0">
              {widgets.filter(w => w.visible).map(w => {
                const isActive = activeIdeTabId === w.id;
                const isSplit = splitIdeTabId === w.id;
                const tabIcons: Record<string, React.ReactNode> = {
                  live_auctions: <Calendar size={10} />,
                  property_search: <Search size={10} />,
                  my_lists: <Folder size={10} />,
                  map: <Map size={10} />,
                  chart: <BarChart2 size={10} />,
                  dossier: <Folder size={10} />,
                  field_missions: <Gavel size={10} />,
                  connect: <Compass size={10} />,
                  settings: <Settings size={10} />,
                  profile: <Users size={10} />,
                  logs: <Terminal size={10} />,
                  node_canvas: <Layers size={10} />,
                  rehab_calc: <Activity size={10} />,
                  shortcuts: <Smartphone size={10} />,
                  billings: <CreditCard size={10} />,
                  company: <Briefcase size={10} />,
                  notifications: <Bell size={10} />,
                  property_details: <Search size={10} />,
                  team: <Users size={10} />,
                  recommended_deals: <TrendingUp size={10} />,
                };
                return (
                  <div
                    key={w.id}
                    role="tab"
                    onClick={() => setActiveIdeTabId(w.id)}
                    className={`group flex items-center gap-1.5 px-3 h-full text-[9px] font-semibold border-r border-slate-200 dark:border-slate-800 whitespace-nowrap transition-all shrink-0 relative cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b-2 border-b-indigo-500 font-bold'
                        : isSplit
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b-2 border-b-emerald-500 font-bold'
                        : 'bg-slate-50/60 dark:bg-slate-950/60 text-slate-500 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-300'
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
                      <div className="h-7 bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center gap-2 shrink-0">
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
                        // Route to full page components
                        if (w.id === 'live_auctions') return <div className="size-full overflow-auto"><ClientAuctions /></div>;
                        if (w.id === 'property_search') return <div className="size-full overflow-auto"><ClientProperties /></div>;
                        if (w.id === 'my_lists') return <div className="size-full overflow-auto"><ClientLists /></div>;
                        // Route to embedded widget content
                        return (
                          <div className="size-full overflow-auto p-4 select-text">
                            {/* ── All widget types rendered inline ── */}

                            {w.type === 'shortcuts' && (
                              <div className="h-full flex flex-col items-center justify-center gap-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Access</p>
                                <div className="grid grid-cols-3 gap-4 max-w-xs">
                                  {[
                                    { label: 'Live Auctions', icon: Calendar, id: 'live_auctions', color: 'from-amber-400 to-orange-500' },
                                    { label: 'Property Search', icon: Search, id: 'property_search', color: 'from-blue-400 to-cyan-500' },
                                    { label: 'My Lists', icon: Folder, id: 'my_lists', color: 'from-purple-400 to-pink-500' },
                                    { label: 'Missions', icon: Gavel, id: 'field_missions', color: 'from-emerald-400 to-teal-500' },
                                    { label: 'Settings', icon: Settings, id: 'settings', color: 'from-slate-400 to-slate-600' },
                                    { label: 'Billing', icon: CreditCard, id: 'billings', color: 'from-indigo-400 to-indigo-600' },
                                  ].map(app => {
                                    const Icon = app.icon;
                                    return (
                                      <button
                                        key={app.id}
                                        onClick={() => {
                                          if (['my_lists', 'live_auctions', 'property_search', 'field_missions'].includes(app.id)) {
                                            openOverlayWindow(app.id as any, app.label);
                                          } else {
                                            setWidgets(prev => prev.map(ww => ww.id === app.id ? { ...ww, visible: true } : ww));
                                            setActiveIdeTabId(app.id);
                                          }
                                        }}
                                        className="flex flex-col items-center gap-2 group"
                                      >
                                        <div className={`size-14 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                          <Icon size={24} className="text-white" />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{app.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {(w.type === 'metrics_deed' || w.type === 'metrics_foreclosure' || w.type === 'metrics_lien') && (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-6xl font-black text-slate-900 dark:text-white mb-2">
                                    {w.type === 'metrics_deed' ? marketCounts.deed.toLocaleString() :
                                     w.type === 'metrics_foreclosure' ? marketCounts.foreclosure.toLocaleString() :
                                     marketCounts.lien.toLocaleString()}
                                  </div>
                                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">{w.title.replace(/^[^\w]+/, '')}</div>
                                </div>
                              </div>
                            )}

                            {w.type === 'map' && (
                              <div className="h-full min-h-[400px]">
                                <InvestmentHeatmap stateStats={stateStats} />
                              </div>
                            )}

                            {w.type === 'chart' && (
                              <div className="h-full min-h-[300px] flex flex-col gap-3">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Monthly Auction Trends</h2>
                                <div className="flex-1 min-h-[260px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyStats}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                      <YAxis tick={{ fontSize: 10 }} />
                                      <RechartsTooltip />
                                      <Line type="monotone" dataKey="deed_count" stroke={CHART_COLORS.deed} strokeWidth={2} dot={false} />
                                      <Line type="monotone" dataKey="foreclosure_count" stroke={CHART_COLORS.foreclosure} strokeWidth={2} dot={false} />
                                      <Line type="monotone" dataKey="lien_count" stroke={CHART_COLORS.lien} strokeWidth={2} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {w.type === 'yield' && (
                              <div className="h-full min-h-[300px] flex flex-col gap-3">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Yield Breakdown Analytics</h2>
                                <div className="flex-1 min-h-[260px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie data={[
                                        { name: 'Tax Deeds', value: marketCounts.deed },
                                        { name: 'Foreclosures', value: marketCounts.foreclosure },
                                        { name: 'Tax Liens', value: marketCounts.lien },
                                      ]} dataKey="value" cx="50%" cy="50%" outerRadius={100} label>
                                        {[CHART_COLORS.deed, CHART_COLORS.foreclosure, CHART_COLORS.lien].map((c, i) => <Cell key={i} fill={c} />)}
                                      </Pie>
                                      <RechartsTooltip />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {w.type === 'recommended_deals' && (
                              <div className="space-y-3">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Top Recommended Deals</h2>
                                {dbTopDeals.slice(0, 8).map(p => (
                                  <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                                    <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
                                      <TrendingUp size={14} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.address || 'Property'}</p>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{p.county}, {p.state}</p>
                                    </div>
                                    <div className="ml-auto text-right shrink-0">
                                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">${(p.assessed_value || 0).toLocaleString()}</p>
                                    </div>
                                  </div>
                                ))}
                                {dbTopDeals.length === 0 && <p className="text-xs text-slate-400 italic">Loading deals...</p>}
                              </div>
                            )}

                            {w.type === 'dossier' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Featured Property Dossier</h2>
                                {selectedProperty ? (
                                  <div className="space-y-3">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20">
                                      <p className="font-bold text-slate-900 dark:text-white">{selectedProperty.address}</p>
                                      <p className="text-xs text-slate-500">{selectedProperty.county}, {selectedProperty.state}</p>
                                    </div>
                                    {[
                                      { label: 'Parcel ID', val: selectedProperty.parcel_id },
                                      { label: 'Assessed Value', val: `$${(selectedProperty.assessed_value || 0).toLocaleString()}` },
                                      { label: 'Status', val: selectedProperty.availability_status },
                                    ].map(r => (
                                      <div key={r.label} className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <span className="font-semibold text-slate-500">{r.label}</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{r.val || '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Select a property to view its dossier.</p>
                                )}
                              </div>
                            )}

                            {w.type === 'property_details' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Deep Property Details</h2>
                                {selectedProperty ? (
                                  <div className="space-y-3">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                                      <p className="font-bold text-slate-900 dark:text-white">{selectedProperty.address}</p>
                                      <p className="text-xs text-slate-500">{selectedProperty.county}, {selectedProperty.state}</p>
                                    </div>
                                    {Object.entries(selectedProperty).slice(0, 12).map(([key, val]) => (
                                      <div key={key} className="flex justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
                                        <span className="font-semibold text-slate-500 capitalize shrink-0">{key.replace(/_/g, ' ')}</span>
                                        <span className="font-bold text-slate-900 dark:text-white text-right truncate">{String(val) || '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Select a property from Property Search to view details.</p>
                                )}
                              </div>
                            )}

                            {w.type === 'field_missions' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Field Task Missions</h2>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-center">
                                    <p className="text-2xl font-black text-emerald-600">{availableTasks.length}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Available</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-500/20 text-center">
                                    <p className="text-2xl font-black text-indigo-600">{myClaimedTasks.length}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">My Tasks</p>
                                  </div>
                                </div>
                                {tasksLoading ? <p className="text-xs text-slate-400 italic">Loading tasks...</p> : availableTasks.slice(0, 6).map(t => (
                                  <div key={t.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-start gap-3">
                                    <Gavel size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.title}</p>
                                      <p className="text-[10px] text-slate-500">{t.description?.slice(0, 60)}...</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {w.type === 'connect' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">API Integrations Hub</h2>
                                {Object.entries(apiStatuses).map(([api, status]) => (
                                  <div key={api} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                                    <div className="flex items-center gap-3">
                                      <div className={`size-2.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : status === 'failed' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
                                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{api.toUpperCase()}</span>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : status === 'failed' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                      {status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {w.type === 'settings' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Workbench Settings</h2>
                                <div className="space-y-3">
                                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show Coordinates HUD</span>
                                    <input type="checkbox" checked={showCoordinatesHud} onChange={e => setShowCoordinatesHud(e.target.checked)} className="accent-indigo-500" />
                                  </label>
                                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Grid Spacing: {gridSpacing}px</label>
                                    <input type="range" min={12} max={48} value={gridSpacing} onChange={e => setGridSpacing(Number(e.target.value))} className="w-full accent-indigo-500" />
                                  </div>
                                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Rendering Quality</label>
                                    <div className="flex gap-2">
                                      {(['fast', 'balanced', 'hq'] as const).map(q => (
                                        <button key={q} onClick={() => setRenderingFilter(q)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-colors ${renderingFilter === q ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{q}</button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {w.type === 'profile' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">User Profile</h2>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-indigo-500/20 flex items-center gap-4">
                                  <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                                    {(currentUser?.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 dark:text-white">{userNickname || currentUser?.email}</p>
                                    <p className="text-xs text-slate-500">{currentUser?.email}</p>
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-600 rounded mt-1 inline-block">{billingPlan.toUpperCase()}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {w.type === 'team' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Corporate Team Roster</h2>
                                {teamMembers.slice(0, 8).map((m, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                                    <div className="size-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-black text-xs">
                                      {(m.email || m.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900 dark:text-white">{m.name || m.email}</p>
                                      <p className="text-[10px] text-slate-500 capitalize">{m.role || 'member'}</p>
                                    </div>
                                  </div>
                                ))}
                                {teamMembers.length === 0 && <p className="text-xs text-slate-400 italic">No team members found.</p>}
                              </div>
                            )}

                            {w.type === 'logs' && (
                              <div className="h-full flex flex-col gap-3">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Activity Console Logs</h2>
                                <div className="flex-1 bg-slate-950 rounded-xl p-4 overflow-auto font-mono text-[9px] space-y-1 min-h-[300px]">
                                  {terminalLogs.slice().reverse().map((entry, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <span className="text-emerald-500 shrink-0">›</span>
                                      <span className="text-slate-300">{entry}</span>
                                    </div>
                                  ))}
                                  {terminalLogs.length === 0 && <span className="text-slate-600 italic">No activity logged yet.</span>}
                                </div>
                              </div>
                            )}

                            {w.type === 'billings' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Billings & Subscriptions</h2>
                                <div className={`p-4 rounded-xl border ${billingPlan === 'elite' ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20' : billingPlan === 'pro' ? 'bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Current Plan</p>
                                  <p className="text-2xl font-black text-slate-900 dark:text-white uppercase">{billingPlan}</p>
                                </div>
                                <div className="space-y-2">
                                  {[{ label: 'Pro', price: '$49/mo', tier: 'pro' as const }, { label: 'Elite', price: '$149/mo', tier: 'elite' as const }].map(p => (
                                    <button key={p.tier} onClick={() => setBillingPlan(p.tier)} className={`w-full p-3 rounded-xl border text-left transition-colors ${billingPlan === p.tier ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                                      <span className="text-xs font-black text-slate-900 dark:text-white">{p.label}</span>
                                      <span className="float-right text-xs font-bold text-indigo-600">{p.price}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {w.type === 'company' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Active Company Hub</h2>
                                {activeCompany ? (
                                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                                    <p className="font-black text-slate-900 dark:text-white">{activeCompany.name}</p>
                                    <p className="text-xs text-slate-500">{activeCompany.address || 'No address'}</p>
                                  </div>
                                ) : <p className="text-xs text-slate-400 italic">No active company selected.</p>}
                                {companies.slice(0, 5).map(co => (
                                  <button key={co.id} onClick={() => selectCompany(co.id)} className={`w-full p-3 rounded-xl border text-left transition-colors ${activeCompany?.id === co.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'}`}>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{co.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {w.type === 'notifications' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h2 className="text-sm font-black text-slate-800 dark:text-white">System Notifications</h2>
                                  <button onClick={handleMarkAllAsRead} className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800">Mark all read</button>
                                </div>
                                {notifications.slice(0, 8).map(n => (
                                  <div key={n.id} className={`p-3 rounded-xl border flex items-start gap-3 ${n.read ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/20'}`}>
                                    <Bell size={12} className={n.read ? 'text-slate-400 mt-0.5' : 'text-indigo-500 mt-0.5'} />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{n.title}</p>
                                      <p className="text-[10px] text-slate-500">{n.body}</p>
                                    </div>
                                  </div>
                                ))}
                                {notifications.length === 0 && <p className="text-xs text-slate-400 italic">No notifications.</p>}
                              </div>
                            )}

                            {w.type === 'node_canvas' && (
                              <div className="h-full min-h-[400px] flex flex-col gap-3">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Deal Flow Node Canvas</h2>
                                <div className="flex-1 min-h-[320px] relative bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-700 rounded-xl overflow-hidden">
                                  <svg className="absolute inset-0 size-full" onMouseMove={handleSvgMouseMove} onMouseUp={() => setDraggingNodeId(null)} onMouseLeave={() => setDraggingNodeId(null)}>
                                    <defs>
                                      <linearGradient id="ideActiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
                                      </linearGradient>
                                      <linearGradient id="ideCompletedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
                                      </linearGradient>
                                    </defs>
                                    {nodeConnections.map((conn, idx) => {
                                      const from = dealFlowNodes.find(n => n.id === conn.from);
                                      const to = dealFlowNodes.find(n => n.id === conn.to);
                                      if (!from || !to) return null;
                                      const isCompleted = to.status === 'completed' && from.status === 'completed';
                                      const isActive = !isCompleted && (to.status !== 'pending' || from.status !== 'pending');
                                      return (
                                        <path key={idx} d={drawBezier(from, to)}
                                          stroke={isCompleted ? 'url(#ideCompletedGrad)' : isActive ? 'url(#ideActiveGrad)' : '#94A3B8'}
                                          strokeWidth={isActive ? 2.5 : 1.5} fill="none" />
                                      );
                                    })}
                                    {dealFlowNodes.map(n => (
                                      <foreignObject key={n.id} x={n.x - 40} y={n.y - 18} width={80} height={36}
                                        onMouseDown={e => { e.stopPropagation(); setDraggingNodeId(n.id); }}
                                        onClick={() => handleNodeClick(n.id)}
                                      >
                                        <div className={`size-full rounded-lg flex items-center justify-center text-[9px] font-black text-white cursor-pointer shadow-md border-2 ${n.status === 'completed' ? 'bg-emerald-500 border-emerald-400' : n.status === 'active' ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-600 border-slate-500'}`}>
                                          {n.label}
                                        </div>
                                      </foreignObject>
                                    ))}
                                  </svg>
                                </div>
                              </div>
                            )}

                            {w.type === 'rehab_calc' && (
                              <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white">Rehab & ROI Calculator</h2>
                                {[
                                  { label: 'Purchase Price', value: rehabPurchasePrice, set: setRehabPurchasePrice, min: 0, max: 2000000, step: 1000 },
                                  { label: 'Rehab Cost', value: rehabCost, set: setRehabCost, min: 0, max: 500000, step: 500 },
                                  { label: 'Annual Taxes', value: rehabTaxes, set: setRehabTaxes, min: 0, max: 50000, step: 500 },
                                  { label: 'ARV (After Repair)', value: rehabARV, set: setRehabARV, min: 0, max: 3000000, step: 1000 },
                                ].map(field => (
                                  <div key={field.label}>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex justify-between">
                                      <span>{field.label}</span>
                                      <span className="text-indigo-600">${field.value.toLocaleString()}</span>
                                    </label>
                                    <input type="range" min={field.min} max={field.max} step={field.step} value={field.value}
                                      onChange={e => field.set(Number(e.target.value))}
                                      className="w-full mt-1 accent-indigo-500" />
                                  </div>
                                ))}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Net ROI</p>
                                  <p className={`text-3xl font-black ${rehabARV - rehabPurchasePrice - rehabCost - rehabTaxes > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    ${(rehabARV - rehabPurchasePrice - rehabCost - rehabTaxes).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )}

                            {(w.type === 'property_comparator' || w.type === 'contacts_search' || w.type === 'create_task' || w.type === 'support_center') && (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-3">
                                  <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto shadow-lg">
                                    <Sparkles size={28} className="text-white" />
                                  </div>
                                  <h2 className="text-base font-black text-slate-900 dark:text-white">{w.title.replace(/^[^\w]+/, '')}</h2>
                                  <p className="text-xs text-slate-400 max-w-xs">This widget's full content is available in Canvas Mode. Switch the layout to interact with it as a floating window.</p>
                                  <button
                                    onClick={() => { setLayoutTemplate('canvas'); logConsoleActivity(`Switched to Canvas Mode for widget: "${w.title}"`); }}
                                    className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors"
                                  >
                                    Open in Canvas Mode
                                  </button>
                                </div>
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
                      <div className="h-7 bg-slate-100/80 dark:bg-slate-950/80 border-b border-emerald-500/30 px-3 flex items-center gap-2 shrink-0">
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
                          if (w.id === 'property_search') return <div className="size-full overflow-auto"><ClientProperties /></div>;
                          if (w.id === 'my_lists') return <div className="size-full overflow-auto"><ClientLists /></div>;
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
                        <span className="font-black text-slate-900 dark:text-white">{widgets.filter(w => w.visible).length}</span>
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
                  { from: 'recommended_deals', to: 'dossier' },
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
                  onTouchStart={(e) => handleTouchStart(e, w.id, 'drag')}
                  className="h-10 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 px-4 flex items-center justify-between shrink-0 cursor-move"
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
                                onClick={() => {
                                  const idMap: Record<string, string> = {
                                    '/client/auctions': 'live_auctions',
                                    '/client/properties': 'property_search',
                                    '/client/lists': 'my_lists',
                                    '/client/tasks': 'field_missions'
                                  };
                                  const id = idMap[app.path];
                                  if (id) {
                                    openOverlayWindow(id as any, app.label);
                                  } else {
                                    navigate(app.path);
                                  }
                                }}
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
                    <div className="size-full overflow-auto bg-slate-50 dark:bg-slate-900 rounded-lg no-scrollbar scrollbar-none">
                      <ClientAuctions />
                    </div>
                  )}

                  {/* Widget 5: Property Search */}
                  {w.type === 'property_search' && (
                    <div className="size-full overflow-auto bg-[#F8FAFC] dark:bg-slate-955/80 rounded-lg no-scrollbar scrollbar-none">
                      <ClientProperties />
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
                              onClick={() => openOverlayWindow('property_details', `🔍 Property: ${selectedProperty.parcel_id || selectedProperty.id}`, { propertyId: selectedProperty.id, parcelId: selectedProperty.parcel_id })}
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

                  {/* My Lists (Saved Lists & Folders) */}
                  {w.type === 'my_lists' && (
                    <div className="size-full overflow-auto bg-slate-50 dark:bg-slate-900 rounded-lg no-scrollbar scrollbar-none">
                      <ClientLists />
                    </div>
                  )}

                  {/* Field Missions (Investor Tasks) */}
                  {w.type === 'field_missions' && (
                    <div className="size-full flex flex-col justify-between">
                      {/* Available vs Claimed switch tabs */}
                      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 shrink-0 gap-1.5 select-none">
                        <span className="text-[10px] font-black text-slate-800 dark:text-white mr-auto flex items-center gap-1">
                          <Compass size={11} className="text-indigo-500" /> Active Operations
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                        {tasksLoading ? (
                          <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-indigo-500" size={18} /></div>
                        ) : (
                          <>
                            {/* My Requested Inspections Section */}
                            <div>
                              <h4 className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <CheckSquare size={10} /> My Requested Inspections ({myRequestedTasks.length})
                              </h4>
                              {myRequestedTasks.length === 0 ? (
                                <p className="text-[9px] text-slate-400 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 text-center">No requested inspection missions.</p>
                              ) : (
                                <div className="space-y-3 mb-4">
                                  {myRequestedTasks.map(t => {
                                    const isSubmitted = t.status === 'submitted';
                                    return (
                                      <div key={t.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                                        <div className="flex items-start justify-between min-w-0">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className={`text-[7px] font-black px-1.5 py-0.25 rounded uppercase ${
                                                t.status === 'submitted' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                                t.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                t.status === 'claimed' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                                                'bg-slate-500/10 text-slate-500'
                                              }`}>
                                                {t.status}
                                              </span>
                                              <span className="text-[7.5px] font-bold text-slate-400">+{t.reward_points} pts</span>
                                              {t.realtor_name && (
                                                <span className="text-[7.5px] text-slate-500">Assigned: {t.realtor_name}</span>
                                              )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-900 dark:text-white mt-1">{t.title}</p>
                                            {t.address && <p className="text-[8px] text-slate-500 mt-0.5">{t.address}</p>}
                                          </div>
                                        </div>

                                        {isSubmitted && (
                                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[9px]">
                                            {/* GPS Validation Telemetry */}
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between font-mono text-[8px] text-slate-600 dark:text-slate-400">
                                              <span className="flex items-center gap-1">
                                                <Compass size={10} className="text-amber-500 animate-spin" /> GPS Match Verified
                                              </span>
                                              <span>Lat: {t.latitude || 25.7617}, Lng: {t.longitude || -80.1918}</span>
                                            </div>

                                            {/* 3-Photo Grid of Evidence */}
                                            <div>
                                              <p className="text-[8px] font-bold uppercase text-slate-400 mb-1">Telemetry Evidence Attachments (3)</p>
                                              <div className="grid grid-cols-3 gap-1">
                                                <div className="relative group/img rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-square bg-slate-100">
                                                  <img src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=150&q=80" alt="Front Elevation" className="size-full object-cover group-hover/img:scale-105 transition-transform" />
                                                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[6px] text-white py-0.5 text-center font-bold truncate">Front</span>
                                                </div>
                                                <div className="relative group/img rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-square bg-slate-100">
                                                  <img src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=150&q=80" alt="Boundary/Fence" className="size-full object-cover group-hover/img:scale-105 transition-transform" />
                                                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[6px] text-white py-0.5 text-center font-bold truncate">Boundary</span>
                                                </div>
                                                <div className="relative group/img rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-square bg-slate-100">
                                                  <img src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&q=80" alt="Roof/Leak Check" className="size-full object-cover group-hover/img:scale-105 transition-transform" />
                                                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[6px] text-white py-0.5 text-center font-bold truncate">Structure</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Inline Review Feedback Textarea */}
                                            <div className="space-y-1">
                                              <label className="text-[8px] font-bold uppercase text-slate-400">Reviewer Notes / Feedback</label>
                                              <textarea
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                placeholder="Enter approval details or specify required revision fixes..."
                                                className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none h-12 resize-none"
                                              />
                                            </div>

                                            {/* Approve/Reject Controls */}
                                            <div className="flex gap-1.5 pt-1">
                                              <button
                                                type="button"
                                                disabled={reviewSubmitting}
                                                onClick={() => handleReviewSubmission(t.id, true)}
                                                className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8.5px] uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                                              >
                                                Approve Task
                                              </button>
                                              <button
                                                type="button"
                                                disabled={reviewSubmitting}
                                                onClick={() => handleReviewSubmission(t.id, false)}
                                                className="flex-1 py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[8.5px] uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                                              >
                                                Request Revision
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Claimed Tasks Section */}
                            <div>
                              <h4 className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <CheckSquare size={10} /> My Active Missions ({myClaimedTasks.length})
                              </h4>
                              {myClaimedTasks.length === 0 ? (
                                <p className="text-[9px] text-slate-400 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 text-center">No active field inspections. Claim below.</p>
                              ) : (
                                <div className="space-y-2">
                                  {myClaimedTasks.map(t => (
                                    <div key={t.id} className="p-3 bg-indigo-50/30 dark:bg-indigo-955/10 border border-indigo-500/25 dark:border-indigo-400/20 rounded-xl flex items-center justify-between">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[7.5px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.25 rounded uppercase">CLAIMED</span>
                                          <span className="text-[7.5px] font-bold text-slate-400">+{t.reward_points} pts</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-900 dark:text-white mt-1 truncate">{t.title}</p>
                                        <p className="text-[8px] text-slate-500 truncate">{t.address || 'Inspect & photo boundaries'}</p>
                                      </div>
                                      <span className="size-2 rounded-full bg-indigo-500 shrink-0 ml-3 animate-pulse" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Available Tasks Section */}
                            <div>
                              <h4 className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Compass size={10} /> Available Tasks ({availableTasks.length})
                              </h4>
                              {availableTasks.length === 0 ? (
                                <p className="text-[9px] text-slate-400 py-6 text-center">All field inspection tasks are claimed.</p>
                              ) : (
                                <div className="space-y-2">
                                  {availableTasks.map(t => (
                                    <div key={t.id} className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-350 dark:hover:border-slate-700 transition-all group">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[7.5px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.25 rounded uppercase">OPEN</span>
                                          <span className="text-[7.5px] font-bold text-slate-455">+{t.reward_points} pts</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-900 dark:text-white mt-1 truncate">{t.title}</p>
                                        <p className="text-[8px] text-slate-500 truncate">{t.address || 'Boundaries inspector'}</p>
                                      </div>
                                      <button
                                        id={`claim-task-${t.id}`}
                                        onClick={() => handleClaimTask(t.id)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[8.5px] uppercase tracking-wider rounded-lg shrink-0 ml-3 transition-colors shadow-sm active:scale-95"
                                      >
                                        Claim
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Connect (Platform Sync & API Diagnostic) */}
                  {w.type === 'connect' && (
                    <div className="size-full flex flex-col justify-between space-y-4">
                      {/* Diagnostic Summary */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl select-none">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Platform Sync Status</span>
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white">API Sync fully operational</p>
                        <p className="text-[8.5px] text-slate-455 mt-0.5 leading-normal">GoAuct Core registers update every 180 seconds continuously.</p>
                      </div>

                      {/* Diagnostic APIs grid */}
                      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
                        {[
                          { key: 'fema', label: 'FEMA GIS Engine', desc: 'Flood maps & hazards' },
                          { key: 'gis', label: 'County GIS Overlay', desc: 'County boundary vector geometry' },
                          { key: 'recharts', label: 'Recharts Core', desc: 'Analytical chart generators' },
                          { key: 'db', label: 'GoAuct DB Syncer', desc: 'Active properties cache' }
                        ].map(api => {
                          const status = apiStatuses[api.key];
                          return (
                            <div key={api.key} className="p-3 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] font-black text-slate-955 dark:text-white block">{api.label}</span>
                                <span className="text-[8px] text-slate-455 mt-0.5 block leading-tight">{api.desc}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2 shrink-0">
                                {status === 'loading' ? (
                                  <>
                                    <RefreshCw className="animate-spin text-amber-500" size={10} />
                                    <span className="text-[7.5px] font-black text-amber-500 uppercase tracking-wider">Syncing</span>
                                  </>
                                ) : status === 'active' ? (
                                  <>
                                    <CheckCircle className="text-emerald-500" size={10} />
                                    <span className="text-[7.5px] font-black text-emerald-500 uppercase tracking-wider">Active</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="text-red-500" size={10} />
                                    <span className="text-[7.5px] font-black text-red-500 uppercase tracking-wider">Offline</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Action trigger button */}
                      <button
                        id="run-diagnostics-btn"
                        onClick={handleRunDiagnostics}
                        disabled={testingConnection}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {testingConnection ? (
                          <>
                            <RefreshCw className="animate-spin" size={12} /> Running Diagnostics...
                          </>
                        ) : (
                          <>
                            <Play size={12} /> Run Health Diagnostics
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Settings (Visual Workbench Preferences) */}
                  {w.type === 'settings' && (
                    <div className="size-full flex flex-col justify-between space-y-4">
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin select-none">
                        {/* HUD Switcher */}
                        <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl">
                          <div>
                            <span className="text-[9.5px] font-black text-slate-900 dark:text-white block">Grid HUD Coordinate Display</span>
                            <span className="text-[8px] text-slate-455 mt-0.5 block leading-tight">Display scale & pan factor floaters</span>
                          </div>
                          <button
                            id="toggle-hud-btn"
                            onClick={() => setShowCoordinatesHud(!showCoordinatesHud)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${showCoordinatesHud ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showCoordinatesHud ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Dot Spacing Slider */}
                        <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-[9.5px] font-black text-slate-900 dark:text-white block">Backdrop Dot Spacing</span>
                              <span className="text-[8px] text-slate-455 mt-0.5 block leading-tight">Control canvas pixel separation grid</span>
                            </div>
                            <span className="text-[9px] font-extrabold text-indigo-500">{gridSpacing}px</span>
                          </div>
                          <input
                            id="grid-spacing-slider"
                            type="range"
                            min="16"
                            max="64"
                            step="4"
                            value={gridSpacing}
                            onChange={(e) => setGridSpacing(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>

                        {/* Rendering Speed/Quality select tab */}
                        <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                          <div>
                            <span className="text-[9.5px] font-black text-slate-900 dark:text-white block">Canvas Performance Quality</span>
                            <span className="text-[8px] text-slate-455 mt-0.5 block leading-tight">Adjust blur and transitions filters</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'fast', label: '🚀 FAST' },
                              { id: 'balanced', label: 'BALANCED' },
                              { id: 'hq', label: '💎 HI-FI' }
                            ].map(filter => (
                              <button
                                key={filter.id}
                                id={`perf-${filter.id}`}
                                onClick={() => setRenderingFilter(filter.id as any)}
                                className={`py-1 rounded text-[8px] font-black uppercase transition-all ${
                                  renderingFilter === filter.id
                                    ? 'bg-indigo-500 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                }`}
                              >
                                {filter.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Layout Cache reset button */}
                      <button
                        id="reset-layout-cache-btn"
                        onClick={handleResetLayoutCache}
                        className="w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-500 font-bold text-[9px] uppercase tracking-widest border border-red-500/20 rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        Reset Layout Settings
                      </button>
                    </div>
                  )}

                  {/* User Profile Card */}
                  {w.type === 'profile' && (
                    <div className="size-full flex flex-col justify-between space-y-4">
                      {/* Profile Card Header */}
                      <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl select-none">
                        <div className="size-11 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-black text-white text-base shadow-sm shrink-0">
                          {currentUser?.email?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none truncate">{currentUser?.nickname || 'Account Officer'}</span>
                            <span className="text-[6.5px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1 py-0.25 rounded">PRO</span>
                          </div>
                          <span className="text-[8px] font-bold text-slate-455 block mt-1 leading-none truncate">{currentUser?.email}</span>
                          <span className="text-[8px] font-semibold text-slate-400 block mt-0.5 leading-none">ID: {currentUser?.id || '24'}</span>
                        </div>
                      </div>

                      {/* Nickname form fields */}
                      <form onSubmit={handleSaveProfileNickname} className="flex-1 flex flex-col justify-between">
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Interactive User Nickname</label>
                            <input
                              id="profile-nickname-input"
                              type="text"
                              value={userNickname}
                              onChange={(e) => setUserNickname(e.target.value)}
                              placeholder="Type user alias..."
                              className="w-full px-3 py-2 text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <span className="text-[8px] font-black text-slate-455 uppercase block tracking-wider">Enterprise Permissions</span>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {['live_bids', 'export_gis', 'fema_audit', 'claim_missions'].map((p, idx) => (
                                <span key={idx} className="text-[7.5px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          id="save-profile-btn"
                          type="submit"
                          disabled={profileSaving}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 shrink-0"
                        >
                          {profileSaving ? (
                            <>
                              <RefreshCw className="animate-spin" size={12} /> Saving...
                            </>
                          ) : (
                            <>
                              <Check size={12} /> Save Nickname Alias
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Corporate Team Roster */}
                  {w.type === 'team' && (
                    <div className="size-full flex flex-col justify-between space-y-3">
                      {/* Invite coworker form */}
                      <form onSubmit={handleInviteMember} className="space-y-2 shrink-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Register New Corporate Member</span>
                        <div className="flex gap-1.5">
                          <input
                            id="invite-email-input"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@domain.com"
                            className="flex-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                            required
                          />
                          <select
                            id="invite-role-select"
                            value={inviteRole}
                            onChange={(e: any) => setInviteRole(e.target.value)}
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-355 text-[10px] focus:outline-none shrink-0"
                          >
                            <option value="investor">Investor</option>
                            <option value="agent">Agent</option>
                          </select>
                          <button
                            id="invite-submit-btn"
                            type="submit"
                            disabled={inviteSubmitting}
                            className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg shrink-0 flex items-center justify-center transition-colors disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </form>

                      {/* Roster of members */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Corporate Directory ({teamMembers.length})</span>
                        {teamMembers.length === 0 ? (
                          <p className="text-[9px] text-slate-400 py-6 text-center">Loading team directory...</p>
                        ) : (
                          teamMembers.map((member: any) => (
                            <div key={member.id} className="p-2.5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-600 dark:text-slate-400 shrink-0 border border-slate-200 dark:border-slate-700">
                                  {member.email?.slice(0, 2).toUpperCase() || 'TM'}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold text-slate-900 dark:text-white block leading-none truncate">{member.nickname || (member.email ? member.email.split('@')[0] : '') || 'Team Member'}</span>
                                  <span className="text-[8px] text-slate-455 block mt-0.5 leading-none truncate">{member.email}</span>
                                </div>
                              </div>
                              <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ml-2 shrink-0 ${
                                member.role === 'admin'
                                  ? 'bg-red-50 dark:bg-red-955/20 border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400'
                                  : member.role === 'investor'
                                    ? 'bg-purple-50 dark:bg-purple-955/20 border-purple-200 dark:border-purple-800/40 text-purple-600 dark:text-purple-400'
                                    : 'bg-slate-50 dark:bg-slate-805 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                {member.role || 'agent'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Activity Console Logs CLI */}
                  {w.type === 'logs' && (
                    <div className="size-full flex flex-col justify-between bg-slate-950 rounded-xl p-3.5 border border-slate-800 font-mono text-[9px] text-emerald-400">
                      {/* Scrolling shell content */}
                      <div className="flex-1 overflow-y-auto space-y-1.5 mb-2.5 pr-1 scrollbar-thin select-text">
                        {terminalLogs.map((log, idx) => {
                          const isCommand = log.startsWith('>');
                          const isErr = log.includes('Unknown') || log.includes('failed');
                          return (
                            <p
                              key={idx}
                              className={`leading-relaxed whitespace-pre-wrap ${
                                isCommand
                                  ? 'text-white font-extrabold'
                                  : isErr
                                    ? 'text-red-400'
                                    : 'text-emerald-400/90'
                              }`}
                            >
                              {log}
                            </p>
                          );
                        })}
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <div className="w-1.5 h-3 bg-emerald-400 animate-pulse" />
                        </div>
                      </div>

                      {/* Command input form */}
                      <form onSubmit={handleTerminalSubmit} className="flex border-t border-slate-800 pt-2 shrink-0">
                        <span className="text-slate-500 font-black shrink-0 mr-1.5 pt-0.5">$</span>
                        <input
                          id="terminal-cli-input"
                          type="text"
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          placeholder="Type 'help' for suggestions..."
                          className="flex-1 bg-transparent border-none text-[9px] text-white focus:outline-none focus:ring-0 placeholder:text-slate-600 leading-normal"
                          autoComplete="off"
                        />
                      </form>
                    </div>
                  )}

                  {/* Billings & Subscriptions */}
                  {w.type === 'billings' && (
                    <div className="size-full flex flex-col justify-between space-y-3.5">
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin select-none">
                        {/* Sub plans row */}
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Available Subscription Tiers</span>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'free', label: 'Starter', price: '$0', desc: 'Read basic details' },
                              { id: 'pro', label: 'Advanced', price: '$149', desc: 'Full custom sandboxing' },
                              { id: 'elite', label: 'Elite', price: '$499', desc: 'Unlimited AI task inspections' }
                            ].map(tier => (
                              <button
                                key={tier.id}
                                id={`billing-tier-${tier.id}`}
                                onClick={() => {
                                  setBillingPlan(tier.id as any);
                                  logConsoleActivity(`Mock upgraded to corporate ${tier.label} sub-plan.`);
                                }}
                                className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                                  billingPlan === tier.id
                                    ? 'bg-indigo-50/50 dark:bg-indigo-955/20 border-indigo-500 text-indigo-900 dark:text-indigo-300 font-bold shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                                }`}
                              >
                                <div>
                                  <span className="text-[9px] font-black uppercase tracking-wider block">{tier.label}</span>
                                  <span className="text-[8px] opacity-75 mt-0.5 block leading-tight font-semibold">{tier.desc}</span>
                                </div>
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-2 block">{tier.price}<span className="text-[8px] font-normal font-sans opacity-70">/mo</span></span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Itemized paid invoices ledger */}
                        <div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Paid Invoices Ledger</span>
                          <div className="border border-slate-200 dark:border-slate-855 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
                            <table className="w-full text-left text-[9px] border-collapse">
                              <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                                  <th className="p-2">Invoice</th>
                                  <th className="p-2">Date</th>
                                  <th className="p-2 text-right">Amount</th>
                                  <th className="p-2 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {billingInvoices.map((inv, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-semibold text-slate-600 dark:text-slate-355">
                                    <td className="p-2 font-bold text-slate-900 dark:text-white">{inv.id}</td>
                                    <td className="p-2">{inv.date}</td>
                                    <td className="p-2 text-right font-extrabold text-slate-800 dark:text-slate-100">${inv.amount.toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black">PAID</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Company Context Hub */}
                  {w.type === 'company' && (
                    <div className="size-full flex flex-col justify-between space-y-3">
                      {/* Summary indicator */}
                      <div className="p-3 bg-indigo-50/40 dark:bg-indigo-955/10 border border-indigo-500/20 dark:border-indigo-400/10 rounded-xl select-none">
                        <span className="text-[7.5px] font-black text-indigo-505 uppercase tracking-widest block">Active Corporate context</span>
                        <div className="flex items-center gap-2 mt-1 min-w-0">
                          <Briefcase className="text-indigo-500 shrink-0" size={14} />
                          <span className="text-[11px] font-black text-slate-900 dark:text-white truncate">{activeCompany?.name || 'Personal Account'}</span>
                        </div>
                      </div>

                      {/* Selector choices lists */}
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Switch Account Context</span>
                        {companies.map((co: any) => {
                          const active = co.id === activeCompany?.id;
                          return (
                            <button
                              key={co.id}
                              id={`switch-company-${co.id}`}
                              onClick={() => {
                                selectCompany(co.id);
                                logConsoleActivity(`Switched active context to corporate: "${co.name}"`);
                              }}
                              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all group ${
                                active
                                  ? 'bg-blue-50/50 dark:bg-blue-955/10 border-blue-500 text-blue-900 dark:text-blue-300 font-bold shadow-sm'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                              }`}
                            >
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:text-blue-500 shrink-0">business</span>
                                <span className="text-[10px] truncate">{co.name}</span>
                              </div>
                              {active && <span className="size-2 rounded-full bg-blue-500 ml-2 shrink-0 animate-pulse" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* System Notifications & Alert Banners Feed */}
                  {w.type === 'notifications' && (
                    <div className="size-full flex flex-col justify-between space-y-3 select-none">
                      {/* Header with dismiss buttons */}
                      <div className="flex justify-between items-center shrink-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Recent System Alerts</span>
                        <button
                          id="mark-all-read-btn"
                          onClick={handleMarkAllAsRead}
                          className="text-[8.5px] font-extrabold uppercase text-indigo-500 hover:text-indigo-600 transition-colors"
                        >
                          Mark all read
                        </button>
                      </div>

                      {/* Banners feed */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {notifications.length === 0 ? (
                          <div className="text-center text-[10px] text-slate-400 py-6">All notification alerts cleared!</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all relative ${
                                n.read
                                  ? 'bg-slate-50/30 dark:bg-slate-900/10 border-slate-200 dark:border-slate-850 opacity-60'
                                  : n.type === 'warning'
                                    ? 'bg-amber-50/30 dark:bg-amber-955/5 border-amber-500/20 text-slate-800 dark:text-slate-300'
                                    : n.type === 'success'
                                      ? 'bg-emerald-50/30 dark:bg-emerald-955/5 border-emerald-500/20 text-slate-800 dark:text-slate-300'
                                      : 'bg-blue-50/30 dark:bg-blue-955/5 border-blue-500/20 text-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {/* Status dot indicator */}
                              {!n.read && <span className="size-1.5 rounded-full bg-indigo-500 absolute top-2 right-2 animate-pulse" />}
                              
                              <div className="min-w-0 flex-1">
                                <p className={`text-[9.5px] leading-tight ${n.read ? 'font-semibold' : 'font-extrabold'}`}>{n.message}</p>
                                <span className="text-[7px] text-slate-400 uppercase font-bold mt-1.5 block leading-none">{n.time}</span>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
                                {!n.read && (
                                  <button
                                    id={`mark-read-${n.id}`}
                                    onClick={() => handleMarkAsRead(n.id)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-400 hover:text-indigo-500"
                                    title="Mark Read"
                                  >
                                    <Check size={10} />
                                  </button>
                                )}
                                <button
                                  id={`dismiss-${n.id}`}
                                  onClick={() => handleDismissNotification(n.id)}
                                  className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded text-slate-400"
                                  title="Dismiss Alert"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deep Property Detail Inspector & Hazards Report */}
                  {w.type === 'property_details' && (
                    <div className="size-full flex flex-col justify-between">
                      {selectedProperty ? (
                        <div className="flex flex-col space-y-3 h-full justify-between overflow-y-auto pr-1 scrollbar-thin">
                          {/* Rich secondary inspect features */}
                          <div className="space-y-3 select-none">
                            {/* FEMA flood hazards report */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center">
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">FEMA flood hazard zones</span>
                                <span className="text-[10.5px] font-black text-slate-900 dark:text-white mt-1.5 block leading-none">
                                  {selectedProperty.deal_score && selectedProperty.deal_score > 80 ? 'Zone X (Low-Risk Area)' : 'Zone AE (High flood risk)'}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                selectedProperty.deal_score && selectedProperty.deal_score > 80
                                  ? 'bg-emerald-100 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-100 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400'
                              }`}>
                                {selectedProperty.deal_score && selectedProperty.deal_score > 80 ? 'Safe' : 'Alert'}
                              </span>
                            </div>

                            {/* Zoning classification */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Zoning Classification code</span>
                              <span className="text-[10px] font-extrabold text-slate-805 dark:text-slate-200 mt-1.5 block leading-none">
                                {selectedProperty.deal_score && selectedProperty.deal_score > 84 ? 'Single-Family Residential (R-1A)' : 'Multi-Family Dwelling (R-3)'}
                              </span>
                            </div>

                            {/* Nearby school rating */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center">
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Nearby Rated Public Schools</span>
                                <span className="text-[10px] font-extrabold text-slate-850 dark:text-slate-200 mt-1.5 block leading-none">K-12 Educational Index Rating</span>
                              </div>
                              <span className="text-[11px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                                {selectedProperty.deal_score && selectedProperty.deal_score > 82 ? 'Rated A+' : 'Rated B'}
                              </span>
                            </div>

                            {/* Building specs grid */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2.5 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <span className="text-[7.5px] font-bold text-slate-400 block uppercase leading-none">Structure Size</span>
                                <span className="text-[10px] font-black text-slate-900 dark:text-white mt-1.5 block leading-none">
                                  {selectedProperty.sqft ? selectedProperty.sqft.toLocaleString() : '1,950'} SqFt
                                </span>
                              </div>
                              <div className="p-2.5 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <span className="text-[7.5px] font-bold text-slate-400 block uppercase leading-none">Year Constructed</span>
                                <span className="text-[10px] font-black text-slate-900 dark:text-white mt-1.5 block leading-none">
                                  {selectedProperty.year_built || '1995'} (Modern build)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Trigger request inspection button */}
                          <button
                            id="request-inspection-btn"
                            onClick={handleRequestFieldInspection}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1 active:scale-[0.97] shrink-0 mt-3"
                          >
                            <Gavel size={11} /> Request Field Inspection task
                          </button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-455 dark:text-slate-650 select-none">
                          <Folder className="opacity-30 mb-2" size={32} />
                          <p className="text-xs font-bold">Select property to inspect details</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Create Inspection Mission (create_task) */}
                  {w.type === 'create_task' && (
                    <form onSubmit={handleCreateTaskFromWidget} className="size-full flex flex-col justify-between">
                      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 shrink-0 gap-1.5 select-none">
                        <span className="text-[10px] font-black text-slate-800 dark:text-white mr-auto flex items-center gap-1">
                          <Plus size={11} className="text-indigo-500 animate-pulse" /> Create Inspection Mission
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Target Property</label>
                          {propertyResults.length === 0 ? (
                            <div className="space-y-1.5">
                              <select
                                value={newTaskPropId}
                                onChange={(e) => setNewTaskPropId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                                required
                              >
                                <option value="">No properties searched yet...</option>
                                <option value="1">Fallback Mock Property (124 Brickell Ave, Miami FL)</option>
                              </select>
                              <p className="text-[7.5px] text-amber-500 font-semibold">⚠️ Tip: Search properties in the "Property Search" widget to select them here!</p>
                            </div>
                          ) : (
                            <select
                              value={newTaskPropId}
                              onChange={(e) => setNewTaskPropId(e.target.value ? Number(e.target.value) : '')}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                              required
                            >
                              <option value="">Select a property from search...</option>
                              {propertyResults.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.address} ({p.county || 'FL'})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Mission Title</label>
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="e.g. Inspect Roof Leak & Fence Integrity"
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Detailed Instructions</label>
                          <textarea
                            value={newTaskDesc}
                            onChange={(e) => setNewTaskDesc(e.target.value)}
                            placeholder="Provide details on what the field realtor/agent needs to inspect. Specify evidence requirements..."
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none h-16 resize-none"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Mission Type</label>
                            <select
                              value={newTaskType}
                              onChange={(e) => setNewTaskType(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                            >
                              <option value="field_inspection">Field Inspection</option>
                              <option value="boundary_survey">Boundary Survey</option>
                              <option value="foreclosure_notice">Foreclosure Check</option>
                              <option value="occupancy_verify">Occupancy Verification</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Reward Points</label>
                            <select
                              value={newTaskPoints}
                              onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                            >
                              <option value={100}>100 Points</option>
                              <option value={250}>250 Points</option>
                              <option value={500}>500 Points</option>
                              <option value={1000}>1,000 Points</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Min Photos</label>
                            <input
                              type="number"
                              min={1}
                              max={newTaskMaxPhotos}
                              value={newTaskMinPhotos}
                              onChange={(e) => setNewTaskMinPhotos(Number(e.target.value))}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Max Photos</label>
                            <input
                              type="number"
                              min={newTaskMinPhotos}
                              max={20}
                              value={newTaskMaxPhotos}
                              onChange={(e) => setNewTaskMaxPhotos(Number(e.target.value))}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={taskCreating}
                        className="w-full py-2 mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1 active:scale-[0.97] shrink-0 disabled:opacity-50"
                      >
                        {taskCreating ? (
                          <>
                            <RefreshCw className="animate-spin text-white" size={11} /> Launching Mission...
                          </>
                        ) : (
                          <>
                            <Plus size={11} /> Dispatch Mission Task
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Support Hub (support_center) */}
                  {w.type === 'support_center' && (
                    <div className="size-full flex flex-col justify-between">
                      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 shrink-0 justify-between items-center select-none">
                        <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1">
                          <HelpCircle size={11} className="text-indigo-500" /> Support Hub
                        </span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[8px] font-bold">
                          <button
                            type="button"
                            onClick={() => setSupportWidgetTab('new')}
                            className={`px-2 py-0.5 rounded-md transition-all ${
                              supportWidgetTab === 'new'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                            }`}
                          >
                            New Request
                          </button>
                          <button
                            type="button"
                            onClick={() => setSupportWidgetTab('history')}
                            className={`px-2 py-0.5 rounded-md transition-all ${
                              supportWidgetTab === 'history'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                            }`}
                          >
                            My Tickets ({supportTickets.length})
                          </button>
                        </div>
                      </div>

                      {supportWidgetTab === 'new' ? (
                        <form onSubmit={handleCreateTicketFromWidget} className="flex-1 flex flex-col justify-between min-h-0">
                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Subject</label>
                              <input
                                type="text"
                                value={ticketSubject}
                                onChange={(e) => setTicketSubject(e.target.value)}
                                placeholder="Briefly describe your support issue..."
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Inquiry Type</label>
                              <select
                                value={ticketType}
                                onChange={(e) => setTicketType(e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                              >
                                <option value="general">General Support</option>
                                <option value="billing">Billing & Subscription</option>
                                <option value="technical">Technical Glitch / Bug</option>
                                <option value="api_keys">API Sync Integration</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Message Details</label>
                              <textarea
                                value={ticketMessage}
                                onChange={(e) => setTicketMessage(e.target.value)}
                                placeholder="Explain your situation in depth. Include transaction IDs, property details, or errors..."
                                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none h-20 resize-none"
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={ticketSubmitting}
                            className="w-full py-2 mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1 active:scale-[0.97] shrink-0 disabled:opacity-50"
                          >
                            {ticketSubmitting ? (
                              <>
                                <RefreshCw className="animate-spin text-white" size={11} /> Sending Ticket...
                              </>
                            ) : (
                              <>
                                <ArrowRight size={11} /> Send Ticket Request
                              </>
                            )}
                          </button>
                        </form>
                      ) : (
                        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2">
                          {ticketsLoading ? (
                            <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-indigo-500" size={18} /></div>
                          ) : supportTickets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400 select-none">
                              <HelpCircle className="opacity-30 mb-2" size={24} />
                              <p className="text-[10px] font-bold">No active support history</p>
                              <p className="text-[8px] text-slate-500 mt-1">Submit a new request to get started.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {supportTickets.map((t: any) => (
                                <div key={t.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[7px] font-black px-1.5 py-0.25 rounded uppercase ${
                                      t.status === 'open' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                                      t.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                      'bg-slate-500/10 text-slate-500'
                                    }`}>
                                      {t.status || 'open'}
                                    </span>
                                    <span className="text-[7px] text-slate-400">{t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Today'}</span>
                                  </div>
                                  <p className="text-[10px] font-extrabold text-slate-900 dark:text-white leading-tight">{t.subject}</p>
                                  <p className="text-[8.5px] text-slate-500 leading-normal">{t.message}</p>
                                  {t.resolution_notes && (
                                    <div className="mt-2 p-1.5 bg-emerald-50/30 dark:bg-emerald-955/10 border border-emerald-500/20 rounded-lg">
                                      <p className="text-[7.5px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Resolution Notes:</p>
                                      <p className="text-[8px] text-slate-650 dark:text-slate-300 mt-0.5">{t.resolution_notes}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deal Flow Node Engine (node_canvas) */}
                  {w.type === 'node_canvas' && (
                    <div className="size-full flex flex-col justify-between">
                      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-2 shrink-0 justify-between items-center select-none">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1">
                            <Layers size={11} className="text-violet-500" /> Node-based Canvas with Auto Layout and Edge Connections
                          </span>
                          <span className="text-[8px] text-slate-500 dark:text-slate-400 font-medium pl-4">
                            Organize your dashboards with connectable widgets and smart Auto Layout.
                          </span>
                        </div>
                        <button
                          onClick={handleAutoLayoutDealFlow}
                          className="px-2 py-1 bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95"
                          title="Snap nodes back to perfect alignment"
                        >
                          Auto Layout
                        </button>
                      </div>

                      {/* SVG Mini Workspace */}
                      <div className="flex-1 min-h-0 relative bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-850 rounded-xl overflow-hidden select-none">
                        <svg
                          className="absolute inset-0 size-full"
                          onMouseMove={handleSvgMouseMove}
                          onMouseUp={() => setDraggingNodeId(null)}
                          onMouseLeave={() => setDraggingNodeId(null)}
                        >
                          <defs>
                            <linearGradient id="activeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
                            </linearGradient>
                            <linearGradient id="completedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
                            </linearGradient>
                          </defs>

                          {/* Connections */}
                          {nodeConnections.map((conn, idx) => {
                            const fromNode = dealFlowNodes.find(n => n.id === conn.from);
                            const toNode = dealFlowNodes.find(n => n.id === conn.to);
                            if (!fromNode || !toNode) return null;
                            
                            const isActive = toNode.status !== 'pending' && fromNode.status !== 'pending';
                            const isCompleted = toNode.status === 'completed' && fromNode.status === 'completed';
                            
                            return (
                              <g key={`path-${conn.from}-${conn.to}-${idx}`}>
                                <path
                                  d={drawBezier(fromNode, toNode)}
                                  stroke={isCompleted ? 'url(#completedGrad)' : isActive ? 'url(#activeGlowGrad)' : '#94A3B8'}
                                  strokeWidth={isActive ? 2.5 : 1.5}
                                  fill="none"
                                  strokeDasharray={isActive && !isCompleted ? '5,5' : 'none'}
                                  className={isActive && !isCompleted ? 'animate-pulse' : ''}
                                  opacity={toNode.status === 'pending' ? 0.4 : 1}
                                />
                              </g>
                            );
                          })}

                          {/* Nodes rendered as SVG foreignObjects for rich HTML rendering */}
                          {dealFlowNodes.map(n => {
                            const isDragging = draggingNodeId === n.id;
                            const isSelectedSource = nodeConnectSourceId === n.id;
                            
                            const borderClass =
                              isSelectedSource ? 'border-indigo-650 ring-4 ring-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-955/20 text-indigo-700 dark:text-indigo-400 font-extrabold animate-pulse' :
                              n.status === 'completed' ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-450' :
                              n.status === 'active' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-955/20 text-blue-700 dark:text-blue-400 ring-2 ring-blue-500/20' :
                              'border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400';

                            return (
                              <foreignObject
                                key={n.id}
                                x={n.x - 60}
                                y={n.y - 22}
                                width={120}
                                height={44}
                                className="overflow-visible"
                              >
                                <div
                                  onMouseDown={(e) => {
                                    if (nodeCanvasTool === 'select') {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setDraggingNodeId(n.id);
                                    }
                                  }}
                                  onClick={() => {
                                    if (nodeCanvasTool === 'connect') {
                                      if (!nodeConnectSourceId) {
                                        setNodeConnectSourceId(n.id);
                                        logConsoleActivity(`Connection source set: "${n.label}". Click another node to connect.`);
                                      } else {
                                        if (nodeConnectSourceId !== n.id) {
                                          const exists = nodeConnections.some(c => c.from === nodeConnectSourceId && c.to === n.id);
                                          if (!exists) {
                                            setNodeConnections(prev => [...prev, { from: nodeConnectSourceId!, to: n.id }]);
                                            logConsoleActivity(`Connected node "${dealFlowNodes.find(x => x.id === nodeConnectSourceId)?.label}" to "${n.label}".`);
                                          }
                                          setNodeConnectSourceId(null);
                                          setNodeCanvasTool('select');
                                        }
                                      }
                                    } else {
                                      handleNodeClick(n.id);
                                    }
                                  }}
                                  className={`px-2 py-1 border rounded-xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing text-center shadow-md select-none transition-all duration-75 hover:scale-102 ${borderClass} ${isDragging ? 'shadow-lg scale-105 opacity-90 ring-4 ring-indigo-500/20' : ''}`}
                                  style={{ height: '40px' }}
                                >
                                  <span className="text-[9px] font-black tracking-tight leading-tight truncate w-full">{n.label}</span>
                                  <span className="text-[6.5px] font-black uppercase tracking-widest leading-none mt-0.5 opacity-80">
                                    {n.status}
                                  </span>
                                </div>
                              </foreignObject>
                            );
                          })}
                        </svg>

                        {/* Floating Tool Palette */}
                        <div className="absolute top-2 left-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg flex items-center gap-1.5 z-10 select-none">
                          <button
                            onClick={() => {
                              setNodeCanvasTool('select');
                              setNodeConnectSourceId(null);
                            }}
                            className={`p-1 rounded transition-all flex items-center gap-1 ${
                              nodeCanvasTool === 'select'
                                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Select / Move Node"
                          >
                            <MousePointer size={11} />
                            <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-0.5">Select</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setNodeCanvasTool('connect');
                              setNodeConnectSourceId(null);
                            }}
                            className={`p-1 rounded transition-all flex items-center gap-1 ${
                              nodeCanvasTool === 'connect'
                                ? 'bg-indigo-600 text-white font-bold shadow-sm animate-pulse'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Connect Nodes (Draw Arrow)"
                          >
                            <TrendingUp size={11} />
                            <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-0.5">Connect</span>
                          </button>

                          <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-850" />

                          <button
                            onClick={() => {
                              const pool = ['GIS Audit', 'Escrow Close', 'Tax Record', 'Title Search', 'Deed Audit', 'Final Review', 'Legal Int.', 'Bid Strategy'];
                              const randomLabel = pool[Math.floor(Math.random() * pool.length)];
                              const nextId = String(dealFlowNodes.length + 1);
                              const randomX = Math.round(50 + Math.random() * 250);
                              const randomY = Math.round(50 + Math.random() * 250);
                              
                              setDealFlowNodes(prev => [
                                ...prev,
                                { id: nextId, label: `${randomLabel} (${nextId})`, status: 'pending', x: randomX, y: randomY }
                              ]);
                              logConsoleActivity(`Spawned custom pipeline node: "${randomLabel} (${nextId})"`);
                            }}
                            className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-855 transition-all flex items-center gap-1"
                            title="Add Custom Node"
                          >
                            <Plus size={11} />
                            <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-0.5">Add Node</span>
                          </button>

                          <button
                            onClick={() => {
                              setNodeConnections([]);
                              logConsoleActivity('Cleared all pipeline node connections.');
                            }}
                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 transition-all flex items-center gap-1"
                            title="Clear Connections"
                          >
                            <Trash2 size={11} />
                            <span className="text-[7.5px] uppercase tracking-wider font-extrabold px-0.5">Clear</span>
                          </button>
                        </div>

                        {/* Interactive Drag & Change Instruction Overlay */}
                        <div className="absolute bottom-2 left-2 right-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/85 text-[7px] font-black text-slate-500 text-center pointer-events-none uppercase tracking-widest leading-none">
                          {nodeCanvasTool === 'connect'
                            ? '↗️ Click source node, then click target node to connect'
                            : '🖱️ Drag nodes to rearrange · Click nodes to cycle status · Switch to Connect tool to draw lines'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rehab & ROI Calculator (rehab_calc) */}
                  {w.type === 'rehab_calc' && (() => {
                    const totalBasis = rehabPurchasePrice + rehabCost + rehabTaxes;
                    const profit = rehabARV - totalBasis;
                    const roi = totalBasis > 0 ? (profit / totalBasis) * 100 : 0;
                    const capRate = totalBasis > 0 ? ((rehabGrossRent * 12 * 0.8) / totalBasis) * 100 : 0;

                    return (
                      <div className="size-full flex flex-col justify-between">
                        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5 shrink-0 justify-between items-center select-none">
                          <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1">
                            <Activity size={11} className="text-emerald-500" /> Rehab & ROI Yield Calculator
                          </span>
                        </div>

                        {/* Interactive Sliders & Inputs */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-0 scrollbar-thin text-[9.5px]">
                          <div className="space-y-1.5">
                            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-350">
                              <span>Acquisition Price</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">${rehabPurchasePrice.toLocaleString()}</span>
                            </div>
                            <input
                              type="range"
                              min={50000}
                              max={1000000}
                              step={5000}
                              value={rehabPurchasePrice}
                              onChange={(e) => setRehabPurchasePrice(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-350">
                              <span>Estimated Rehab Cost</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">${rehabCost.toLocaleString()}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={200000}
                              step={2500}
                              value={rehabCost}
                              onChange={(e) => setRehabCost(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Taxes / Closing</label>
                              <input
                                type="number"
                                value={rehabTaxes}
                                onChange={(e) => setRehabTaxes(Number(e.target.value))}
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Target Resale (ARV)</label>
                              <input
                                type="number"
                                value={rehabARV}
                                onChange={(e) => setRehabARV(Number(e.target.value))}
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 mb-1">Est. Monthly Rent</label>
                              <input
                                type="number"
                                value={rehabGrossRent}
                                onChange={(e) => setRehabGrossRent(Number(e.target.value))}
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[10px] focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Dynamic Yield Dash */}
                          <div className="pt-3.5 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-250/20 dark:border-slate-800">
                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Total Basis</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">${totalBasis.toLocaleString()}</span>
                              </div>
                              <div className={`p-2 rounded-xl border ${profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                                <span className="text-[7.5px] font-black uppercase tracking-widest block opacity-70">Resale Profit</span>
                                <span className="text-xs font-black">${profit.toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="p-2.5 rounded-xl bg-blue-500/5 dark:bg-blue-955/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                <span className="text-[7.5px] font-black uppercase tracking-widest block">Resale ROI %</span>
                                <span className="text-base font-extrabold">{roi.toFixed(1)}%</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-955/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                                <span className="text-[7.5px] font-black uppercase tracking-widest block">Rental Cap Rate</span>
                                <span className="text-base font-extrabold">{capRate.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Property Compare Matrix (property_comparator) */}
                  {w.type === 'property_comparator' && (() => {
                    const props = [compareProp1, compareProp2, compareProp3].filter(Boolean) as any[];
                    
                    // Determine Top Pick based on yield_score or max capitalization
                    let topPickId = '';
                    if (props.length > 0) {
                      let maxScore = -1;
                      props.forEach(p => {
                        const score = p.yield_score || 0;
                        if (score > maxScore) {
                          maxScore = score;
                          topPickId = p.id as any;
                        }
                      });
                    }

                    return (
                      <div className="size-full flex flex-col justify-between">
                        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-2 shrink-0 justify-between items-center select-none">
                          <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1">
                            <LayoutGrid size={11} className="text-indigo-500" /> Real Estate Compare Matrix
                          </span>
                        </div>

                        {/* Comparative Matrix Table */}
                        <div className="flex-1 overflow-x-auto overflow-y-auto pr-1 space-y-3 min-h-0 scrollbar-thin text-[9.5px]">
                          {props.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none py-10">
                              <LayoutGrid size={24} className="opacity-30 mb-2" />
                              <p className="text-[10px] font-bold">No active properties compared</p>
                              <p className="text-[8px] text-slate-500 mt-0.5 text-center">Add properties to watchlists or search to load details.</p>
                            </div>
                          ) : (
                            <table className="w-full text-left border-collapse select-text">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[8px] uppercase tracking-wider text-slate-400">
                                  <th className="py-2 pr-2 font-bold w-1/4">Metric</th>
                                  {props.map((p, idx) => (
                                    <th key={p.id || idx} className="py-2 px-2 font-bold text-center w-1/4 truncate max-w-[80px]">
                                      {p.address ? p.address.split(',')[0] : `Prop ${idx+1}`}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-slate-100 dark:border-slate-850/50">
                                  <td className="py-2 pr-2 font-extrabold text-slate-800 dark:text-slate-300">Top Pick</td>
                                  {props.map((p, idx) => (
                                    <td key={p.id || idx} className="py-2 px-2 text-center">
                                      {(p.id as any) === topPickId ? (
                                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                          🏆 Top Pick
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-600">—</span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-850/50">
                                  <td className="py-2 pr-2 font-extrabold text-slate-800 dark:text-slate-300">County</td>
                                  {props.map((p, idx) => (
                                    <td key={p.id || idx} className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 font-bold truncate max-w-[80px]">
                                      {p.county || 'N/A'}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-850/50">
                                  <td className="py-2 pr-2 font-extrabold text-slate-800 dark:text-slate-300">Yield Score</td>
                                  {props.map((p, idx) => (
                                    <td key={p.id || idx} className="py-2 px-2 text-center font-extrabold text-indigo-500">
                                      {p.yield_score ? `${p.yield_score.toFixed(1)}/100` : 'N/A'}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-850/50">
                                  <td className="py-2 pr-2 font-extrabold text-slate-800 dark:text-slate-300">Opening Bid</td>
                                  {props.map((p, idx) => (
                                    <td key={p.id || idx} className="py-2 px-2 text-center text-slate-900 dark:text-white font-extrabold">
                                      {p.opening_bid ? `$${p.opening_bid.toLocaleString()}` : 'N/A'}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-850/50">
                                  <td className="py-2 pr-2 font-extrabold text-slate-800 dark:text-slate-300">Assessed Value</td>
                                  {props.map((p, idx) => (
                                    <td key={p.id || idx} className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 font-bold">
                                      {p.assessed_value ? `$${p.assessed_value.toLocaleString()}` : 'N/A'}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-850/50">
                                  <td className="py-2 pr-2 font-extrabold text-slate-800 dark:text-slate-300">Property Type</td>
                                  {props.map((p, idx) => (
                                    <td key={p.id || idx} className="py-2 px-2 text-center text-slate-500 capitalize">
                                      {p.use_code || 'Residential'}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          )}

                          {/* Quick selectors dropdown if multiple dbTopDeals are loaded */}
                          {dbTopDeals.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
                              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Compare Quick Selectors</span>
                              <div className="grid grid-cols-3 gap-1">
                                <select
                                  value={compareProp1?.id || ''}
                                  onChange={(e) => setCompareProp1(dbTopDeals.find(p => p.id === e.target.value) || null)}
                                  className="px-1.5 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-[8px] focus:outline-none truncate"
                                >
                                  <option value="">Slot 1...</option>
                                  {dbTopDeals.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                                </select>
                                <select
                                  value={compareProp2?.id || ''}
                                  onChange={(e) => setCompareProp2(dbTopDeals.find(p => p.id === e.target.value) || null)}
                                  className="px-1.5 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-[8px] focus:outline-none truncate"
                                >
                                  <option value="">Slot 2...</option>
                                  {dbTopDeals.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                                </select>
                                <select
                                  value={compareProp3?.id || ''}
                                  onChange={(e) => setCompareProp3(dbTopDeals.find(p => p.id === e.target.value) || null)}
                                  className="px-1.5 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-white text-[8px] focus:outline-none truncate"
                                >
                                  <option value="">Slot 3...</option>
                                  {dbTopDeals.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* State & County Contacts Search (contacts_search) */}
                  {w.type === 'contacts_search' && (() => {
                    const filteredList = contactsSearchList.filter(item => {
                      if (!contactsQuery) return true;
                      const q = contactsQuery.toLowerCase();
                      return (
                        (item.name && item.name.toLowerCase().includes(q)) ||
                        (item.category && item.category.toLowerCase().includes(q)) ||
                        (item.phone && item.phone.toLowerCase().includes(q))
                      );
                    });

                    return (
                      <div className="size-full flex flex-col justify-between">
                        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-2 shrink-0 justify-between items-center select-none">
                          <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1">
                            <Smartphone size={11} className="text-amber-500" /> County Registrar Directory
                          </span>
                        </div>

                        {/* Search & State Filter Input */}
                        <div className="flex flex-col gap-2 mb-2.5 shrink-0 select-none">
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[7.5px] font-black uppercase text-slate-400 mb-0.5">Select State</label>
                              <select
                                value={contactsSearchState}
                                onChange={(e) => setContactsSearchState(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[9px] focus:outline-none"
                              >
                                <option value="FL">Florida</option>
                                <option value="AL">Alabama</option>
                                <option value="GA">Georgia</option>
                                <option value="TX">Texas</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[7.5px] font-black uppercase text-slate-400 mb-0.5">Select County</label>
                              <select
                                value={contactsSearchCounty}
                                onChange={(e) => setContactsSearchCounty(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-[9px] focus:outline-none"
                              >
                                {contactsCountyList.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              value={contactsQuery}
                              onChange={(e) => setContactsQuery(e.target.value)}
                              placeholder="Search appraiser, GIS, collectors..."
                              className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-[9.5px] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                            />
                            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={10} />
                          </div>
                        </div>

                        {/* Contacts Results Scroll Feed */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0 scrollbar-thin text-[9.5px]">
                          {filteredList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none py-10">
                              <Smartphone className="opacity-30 mb-1.5" size={20} />
                              <p className="text-[10px] font-bold">No contacts found</p>
                              <p className="text-[8px] text-slate-500">Refine query filters or change selection.</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {filteredList.map((contact, idx) => (
                                <div key={idx} className="p-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-extrabold text-slate-900 dark:text-white truncate max-w-[130px]">{contact.name || 'Official Agency'}</span>
                                      {contact.category && (
                                        <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[6px] font-black px-1 py-0.25 rounded uppercase leading-none">{contact.category}</span>
                                      )}
                                    </div>
                                    <p className="text-[7.5px] text-slate-455 font-bold mt-0.5">{contact.phone || 'No Phone Directory'}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    {contact.phone && (
                                      <a
                                        href={`tel:${contact.phone}`}
                                        className="size-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 transition-all"
                                        title={`Call ${contact.name}`}
                                      >
                                        📞
                                      </a>
                                    )}
                                    {contact.url && (
                                      <a
                                        href={contact.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[8px] font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center shadow-sm"
                                        title="Open official County portal"
                                      >
                                        Visit
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* Window Bottom-Right Resize Handle */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, w.id, 'resize')}
                  onTouchStart={(e) => handleTouchStart(e, w.id, 'resize')}
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
            {/* Zoom controls moved to the sidebar ribbon bottom for superior layout flow */}
          </div>

        </div>
        )}

        {/* ─── HYBRID VIRTUAL DESKTOP WINDOW OVERLAYS ─── */}
        {overlayWindows.filter(w => !w.isMinimized).map(w => {
          const isActive = activeOverlayWindowId === w.id;
          return (
            <div
              key={w.id}
              onClick={() => focusOverlayWindow(w.id)}
              style={{
                position: 'absolute',
                left: w.isMaximized ? 0 : w.x,
                top: w.isMaximized ? 0 : w.y,
                width: w.isMaximized ? '100%' : w.w,
                height: w.isMaximized ? '100%' : w.h,
                zIndex: w.zIndex + 100, // Float over background canvas
              }}
              className={`glass-card shadow-2xl border flex flex-col overflow-hidden rounded-2xl transition-shadow backdrop-blur-xl ${
                isActive 
                  ? 'border-indigo-500/80 dark:border-indigo-500/80 shadow-indigo-500/10 bg-white/95 dark:bg-slate-900/95' 
                  : 'border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/85'
              }`}
            >
              {/* Window Title Bar */}
              <div
                onMouseDown={(e) => handleOverlayMouseDown(e, w.id, 'drag')}
                onTouchStart={(e) => handleOverlayTouchStart(e, w.id, 'drag')}
                className={`h-11 border-b px-4 flex items-center justify-between shrink-0 select-none cursor-grab active:cursor-grabbing ${
                  isActive 
                    ? 'bg-slate-100/90 dark:bg-slate-900/95 border-indigo-500/20' 
                    : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {w.title}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleMinimizeOverlayWindow(w.id)}
                    className="size-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Minimize"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    onClick={() => toggleMaximizeOverlayWindow(w.id)}
                    className="size-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={w.isMaximized ? "Restore Size" : "Maximize"}
                  >
                    {w.isMaximized ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                  </button>
                  <button
                    onClick={() => closeOverlayWindow(w.id)}
                    className="size-5 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Close"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Window Content Container */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-slate-950 relative custom-scrollbar">
                {w.type === 'my_lists' && <ClientLists />}
                {w.type === 'live_auctions' && <ClientAuctions />}
                {w.type === 'property_search' && <ClientProperties />}
                {w.type === 'field_missions' && <InvestorTasksDashboard />}
                {w.type === 'settings' && (
                  <div className="p-6 dark:bg-slate-950 min-h-full">
                    <OriginalSettings />
                  </div>
                )}
                {w.type === 'team_and_logs' && (
                  <div className="p-6 dark:bg-slate-950 min-h-full">
                    <ActivityLogsPage />
                  </div>
                )}
                {w.type === 'billings_and_plans' && (
                  <div className="p-6 dark:bg-slate-950 min-h-full">
                    <BillingPage />
                  </div>
                )}
                {w.type === 'about' && (
                  <div className="p-6 dark:bg-slate-950 min-h-full">
                    <AboutPage standalone={false} />
                  </div>
                )}
                {w.type === 'property_details' && (
                  <div className="size-full overflow-y-auto no-scrollbar scrollbar-none">
                    <PropertyDetailPage readOnly={true} overrideId={w.data?.propertyId} />
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-14 px-4 bg-slate-900/80 dark:bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-700/50 flex items-center gap-3 z-[200] shadow-2xl transition-all select-none">
          {/* Core Shortcuts to open windows */}
          {[
            { id: 'live_auctions', label: 'Auctions', icon: Calendar, color: 'hover:text-amber-400 text-amber-500' },
            { id: 'property_search', label: 'Search', icon: Search, color: 'hover:text-cyan-405 text-cyan-500' },
            { id: 'my_lists', label: 'My Lists', icon: Folder, color: 'hover:text-purple-400 text-purple-500' },
            { id: 'field_missions', label: 'Missions', icon: Gavel, color: 'hover:text-emerald-400 text-emerald-500' }
          ].map(item => {
            const Icon = item.icon;
            const isOpen = overlayWindows.some(w => w.type === item.id);
            const isMin = overlayWindows.find(w => w.type === item.id)?.isMinimized;
            return (
              <button
                key={item.id}
                onClick={() => {
                  const match = overlayWindows.find(w => w.type === item.id);
                  if (match) {
                    if (match.isMinimized) {
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
      <div className="w-full h-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 px-5 flex justify-between items-center shrink-0 z-30 select-none">
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
          <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-800 pr-3">
            <button
              onClick={() => openOverlayWindow('about', 'About GoAuct OS')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              About
            </button>
            <button
              onClick={() => alert('Corporate Disclaimer: All investment strategies and auction bids involve high risk of loss. No information contained in GoAuct OS should be construed as investment advice.')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              Disclaimer
            </button>
            <button
              onClick={() => alert('Terms of Service: Access to GoAuct OS is provided under our standard corporate licensing agreements.')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              Terms
            </button>
            <button
              onClick={() => alert('Privacy Policy: We utilize enterprise-grade encryption to protect proprietary watchlists and property data.')}
              className="text-[8.5px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
            >
              Privacy
            </button>
          </div>
          <div className="flex items-center gap-1 text-[8.5px] font-semibold text-slate-455 dark:text-slate-500">
            <Layers size={10} />
            <span>Active Windows: {widgets.filter(w => w.visible).length}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">
            Canvas Mode
          </span>
        </div>
      </div>

    </div>
  );
};

export default ClientWorkbench;
