import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStateStats, StateStat, getTopScoredProperties, TopScoredProperty } from '../../services/scores.service';
import { ClientDataService } from '../../services/property.service';
import { AuctionService } from '../../services/auction.service';
import { useCompany } from '../../context/CompanyContext';
import { MapDashboard } from '../../components/widgets/MapDashboard';
import { PropertyMetricsWidget } from '../../components/widgets/PropertyMetricsWidget';
import { useTour } from '../../context/TourContext';
import {
  Map, Activity, Settings, X, Minimize2, Move, Eye, EyeOff, Sparkles,
  RefreshCw, Info, Lock, Unlock, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';

interface Widget {
  id: string;
  type: 'map' | 'property_metrics';
  title: string;
  x: number; // left offset in pixels
  y: number; // top offset in pixels
  w: number; // width in pixels
  h: number; // height in pixels
  visible: boolean;
  zIndex: number;
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'map', type: 'map', title: 'US Heatmap & Activity', x: 20, y: 20, w: 1200, h: 650, visible: true, zIndex: 10 },
  { id: 'property_metrics', type: 'property_metrics', title: 'Property Metrics', x: 20, y: 690, w: 900, h: 260, visible: false, zIndex: 1 }
];

export const ClientWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { startTour } = useTour();
  const canvasRef = useRef<HTMLDivElement>(null);

  // States
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const saved = localStorage.getItem('goauct_workbench_widgets_v60');
      if (!saved) return DEFAULT_WIDGETS;

      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        return DEFAULT_WIDGETS;
      }

      // Self-healing: if ALL saved widgets are marked invisible, fallback to default layouts
      const hasVisible = parsed.some((w: any) => w.visible);
      if (!hasVisible) {
        return DEFAULT_WIDGETS;
      }

      const savedMap = new Map<string, any>();
      parsed.forEach((w: any) => {
        if (w && w.id) {
          savedMap.set(w.id, w);
        }
      });

      const restored: Widget[] = [];
      DEFAULT_WIDGETS.forEach(def => {
        const savedWidget = savedMap.get(def.id);
        if (savedWidget) {
          restored.push({
            ...def,
            ...savedWidget,
            x: typeof savedWidget.x === 'number' ? savedWidget.x : def.x,
            y: typeof savedWidget.y === 'number' ? savedWidget.y : def.y,
            w: typeof savedWidget.w === 'number' ? savedWidget.w : def.w,
            h: typeof savedWidget.h === 'number' ? savedWidget.h : def.h,
            visible: typeof savedWidget.visible === 'boolean' ? savedWidget.visible : def.visible,
            zIndex: typeof savedWidget.zIndex === 'number' ? savedWidget.zIndex : def.zIndex,
          });
        } else {
          restored.push(def);
        }
      });

      return restored;
    } catch (e) {
      console.error('Failed to parse goauct_workbench_widgets_v60 from localStorage, falling back to default:', e);
      return DEFAULT_WIDGETS;
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('goauct_workbench_sidebarOpen');
    return saved === null ? true : saved === 'true';
  });

  const [activePane, setActivePane] = useState<'explorer' | 'info'>(() => {
    return (localStorage.getItem('goauct_workbench_activePane') as any) || 'explorer';
  });

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

  const [highestZIndex, setHighestZIndex] = useState(20);

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

  // Load analytical top scored properties on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoadingStats(true);
      try {
        const [props, stats] = await Promise.all([
          getTopScoredProperties(100),
          getStateStats()
        ]);
        setTopProperties(props);
        setStateStats(stats);
      } catch (e) {
        console.error('Failed to load analytical properties for map:', e);
      }
      setLoadingStats(false);
    };
    loadAnalytics();
  }, []);

  const handleStateClick = (stateCode: string) => {
    if (selectedState === stateCode) {
      setSelectedState('');
    } else {
      setSelectedState(stateCode);
    }
    
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
    loadFavoriteStates();

    const handleSync = () => loadFavoriteStates();
    window.addEventListener('auction-favorites-updated', handleSync);
    window.addEventListener('map-preferences-updated', handleSync);
    
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
      const volumes = stateStats.map(s => s.volume || 0);
      const maxVolume = Math.max(...volumes, 1);

      stateStats.forEach(stat => {
        if (stat.state_code) {
          const code = stat.state_code.trim().toUpperCase();
          const vol = stat.volume || 0;
          const pct = vol / maxVolume;
          
          let fillColor = '#7c2d12'; 
          if (vol === 0) fillColor = '#1a353d'; 
          else if (pct >= 0.8) fillColor = '#fbbf24'; 
          else if (pct >= 0.4) fillColor = '#d97706'; 

          config[code] = { fill: fillColor };
        }
      });
    } else if (activeMode === 'scoring') {
      stateStats.forEach(stat => {
        if (stat.state_code) {
          const code = stat.state_code.trim().toUpperCase();
          const score = stat.average_score || 0;

          let fillColor = '#4c1d95'; 
          if (score === 0) fillColor = '#1a353d';
          else if (score >= 80) fillColor = '#c084fc'; 
          else if (score >= 50) fillColor = '#7c3aed'; 

          config[code] = { fill: fillColor };
        }
      });
    } else {
      Object.entries(myListStats).forEach(([stateCode, count]) => {
        const countyCount = count as number;
        let fillColor = '#0f766e'; 
        if (countyCount >= 5) fillColor = '#10b981'; 
        else if (countyCount >= 2) fillColor = '#14b8a6'; 

        config[stateCode] = { fill: fillColor };
      });
      
      favoriteStates.forEach(stateCode => {
        const cleanCode = stateCode.trim().toUpperCase();
        config[cleanCode] = {
          ...config[cleanCode],
          fill: '#00e5ff', 
        };
      });
    }

    if (selectedState) {
      config[selectedState.toUpperCase()] = {
        ...config[selectedState.toUpperCase()],
        fill: '#00ffcc', 
      };
    }

    return config;
  }, [activeMode, favoriteStates, selectedState, myListStats, stateStats]);

  const loadListsAndPreferences = useCallback(async () => {
    try {
      const lists = await ClientDataService.getLists(activeCompany?.id);
      const stats: Record<string, number> = {};
      
      try {
        const preferences = await ClientDataService.getPreferences(activeCompany?.id);
        if (preferences && Array.isArray(preferences.states)) {
          preferences.states.forEach((stateCode: string) => {
            const cleanCode = stateCode.trim().toUpperCase();
            if (cleanCode.length === 2) {
              stats[cleanCode] = 1; 
            }
          });
        }
      } catch (prefErr) {
        console.error('Failed to load list preferences for map:', prefErr);
      }

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
    window.addEventListener('goauct-lists-updated', loadListsAndPreferences);
    return () => {
      window.removeEventListener('goauct-lists-updated', loadListsAndPreferences);
    };
  }, [loadListsAndPreferences]);

  // Sync widgets state to local storage when modified
  useEffect(() => {
    localStorage.setItem('goauct_workbench_widgets_v60', JSON.stringify(widgets));
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

  const toggleVisibility = (id: string) => {
    setWidgets(prev =>
      prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    );
    focusWidget(id);
  };

  const handleResetLayoutCache = () => {
    if (confirm('Wipe layout cache and reset all widgets?')) {
      localStorage.removeItem('goauct_workbench_widgets_v60');
      setWidgets(DEFAULT_WIDGETS);
      setZoomScale(1.0);
      setPanX(0);
      setPanY(0);
    }
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

  return (
    <div className="w-full flex-1 flex flex-col h-full min-h-0 overflow-hidden select-none bg-slate-50 dark:bg-sol-base03 font-display">
      {/* ─── WORKBENCH SYSTEM TOP BAR (Mission Control Header) ─── */}
      <div className="w-full h-11 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex justify-between items-center shrink-0 z-[9999] select-none">
        <div id="tour-welcome-header" className="flex items-center gap-2.5">
          <img
            src="/goauct-logo.png"
            alt="GoAuct Logo"
            className="w-6 h-6 rounded-md object-cover shadow-sm border border-slate-200/20 dark:border-slate-800/20"
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-slate-800 dark:text-white uppercase leading-none">GoAuct OS</span>
            <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wider mt-0.5">Workbench Mission Control</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Canvas Lock Toggle */}
          <button
            onClick={() => setIsCanvasLocked(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
              isCanvasLocked
                ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                : 'bg-emerald-500/10 text-emerald-550 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
            title={isCanvasLocked ? 'Unlock canvas to move widgets' : 'Lock canvas positions'}
          >
            {isCanvasLocked ? <Lock size={12} /> : <Unlock size={12} />}
            <span>{isCanvasLocked ? 'Locked' : 'Unlocked'}</span>
          </button>

          {/* Reset Layout */}
          <button
            onClick={handleResetLayoutCache}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider transition-all"
            title="Reset layout cache"
          >
            <RefreshCw size={12} />
            <span>Reset Layout</span>
          </button>
        </div>
      </div>

      {/* Main body area: sidebar + canvas */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className="absolute left-2.5 top-2.5 z-[100] size-7 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-slate-600 dark:text-slate-350"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Collapsible Sidebar */}
        <div
          className={`flex absolute left-10 md:static z-50 h-[calc(100vh-120px)] md:h-auto bg-white/95 dark:bg-sol-base02/95 border-r border-slate-200/80 dark:border-sol-base01/20 flex-col transition-all duration-300 backdrop-blur-sm shrink-0 overflow-y-auto ${
            sidebarOpen
              ? 'w-60 opacity-100 shadow-2xl md:shadow-none'
              : 'w-0 opacity-0 pointer-events-none border-r-0'
          }`}
        >
          {sidebarOpen && (
            <div className="p-4 flex flex-col space-y-5 select-none w-60">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Workspace Explorer</h3>
                <p className="text-[8px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Toggle widgets on canvas</p>
                <p className="text-[8.5px] text-slate-500 dark:text-slate-400 mt-2 bg-blue-500/5 dark:bg-blue-955/10 border border-blue-500/10 p-2 rounded-lg font-bold leading-normal">
                  Toggle the visibility of your active workspace panels. Drag or resize them directly on the canvas!
                </p>
              </div>

              <div className="flex flex-col space-y-1.5">
                {widgets.map(w => (
                  <button
                    key={w.id}
                    onClick={() => toggleVisibility(w.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all border ${
                      w.visible
                        ? 'bg-blue-50/50 dark:bg-blue-955/10 border-blue-500/20 text-blue-700 dark:text-blue-400 font-bold'
                        : 'bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-455 dark:text-slate-600 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      {w.type === 'map' ? <Map size={13} /> : <Activity size={13} />}
                      <span className="truncate max-w-[130px]">{w.title}</span>
                    </div>
                    {w.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── INTERACTIVE WORKSPACE CANVAS (VIEWPORT) ─── */}
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
                className="glass-card flex flex-col overflow-hidden shadow-2xl border border-slate-200/60 dark:border-sol-base01/30 bg-white/75 dark:bg-sol-base02/80 backdrop-blur-md group/window rounded-xl"
              >
                {/* Window Title Bar (Drag Handle) */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, w.id, 'drag')}
                  onTouchStart={(e) => handleTouchStart(e, w.id, 'drag')}
                  className="h-10 border-b border-slate-200 dark:border-[var(--border)] bg-slate-50/70 dark:bg-sol-base03/85 px-4 flex items-center justify-between shrink-0 cursor-move"
                >
                  <div className="flex items-center gap-2 select-none">
                    {/* Mobile touch grab handle badge */}
                    <div
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        handleTouchStart(e, w.id, 'drag');
                      }}
                      className="flex items-center gap-1 bg-indigo-500/10 text-indigo-650 dark:bg-indigo-400/10 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-400/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider cursor-grab select-none active:cursor-grabbing shadow-sm"
                    >
                      <Move size={8} className="animate-pulse" />
                      <span>Grip</span>
                    </div>

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
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-850 dark:hover:text-white"
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
                <div className="flex-1 min-h-0 w-full overflow-auto p-4 select-text flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {w.type === 'map' && (
                    <div className="size-full min-h-[400px] relative flex items-center justify-center rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-800/10">
                      {loadingStats ? (
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

                  {w.type === 'property_metrics' && (
                    <PropertyMetricsWidget />
                  )}
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
        </div>
      </div>

      {/* ─── FOOTER (Status e Controles) ─── */}
      <div className="w-full h-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-250 dark:border-slate-850 px-5 flex justify-between items-center shrink-0 z-30 select-none">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            System Online · Sync Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[8.5px] font-semibold text-slate-450 dark:text-slate-500">
            <Layers size={10} />
            <span>Active Canvas Panels: {widgets.filter(w => w.visible).length}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            MDI Workbench V6.0 Mapped
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClientWorkbench;
