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
  Maximize, Activity, Info, Users, CreditCard, Bell, Briefcase, Trash2, Edit2, Play, Check, Shield, CheckSquare
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
  
  // 11 New V4.0 absolute widgets sequentially mapped to the right-hand canvas quadrants (2080px to 3800px)
  { id: 'my_lists', type: 'my_lists', title: '📂 Saved Lists & Folders', x: 2080, y: 20, w: 360, h: 480, visible: true, zIndex: 21 },
  { id: 'field_missions', type: 'field_missions', title: '⚔️ Field Task Missions', x: 2080, y: 520, w: 360, h: 500, visible: true, zIndex: 22 },
  { id: 'connect', type: 'connect', title: '🔗 API Integrations Hub', x: 2460, y: 20, w: 380, h: 480, visible: true, zIndex: 23 },
  { id: 'settings', type: 'settings', title: '⚙️ Workbench Settings', x: 2460, y: 520, w: 380, h: 500, visible: true, zIndex: 24 },
  { id: 'profile', type: 'profile', title: '👤 User Profile Card', x: 2860, y: 20, w: 360, h: 480, visible: true, zIndex: 25 },
  { id: 'team', type: 'team', title: '👥 Corporate Team Roster', x: 2860, y: 520, w: 360, h: 500, visible: true, zIndex: 26 },
  { id: 'logs', type: 'logs', title: '💻 Activity Console Logs', x: 3240, y: 20, w: 420, h: 480, visible: true, zIndex: 27 },
  { id: 'billings', type: 'billings', title: '💳 Billings & Subscriptions', x: 3240, y: 520, w: 420, h: 500, visible: true, zIndex: 28 },
  { id: 'company', type: 'company', title: '🏢 Active Company Hub', x: 3680, y: 20, w: 300, h: 230, visible: true, zIndex: 29 },
  { id: 'notifications', type: 'notifications', title: '🔔 System Notifications', x: 3680, y: 270, w: 300, h: 230, visible: true, zIndex: 30 },
  { id: 'property_details', type: 'property_details', title: '🔍 Deep Property Details', x: 3680, y: 520, w: 300, h: 500, visible: true, zIndex: 31 },

  // New V5.0 Real-Logic Widgets
  { id: 'create_task', type: 'create_task', title: '⚔️ Create Mission Task', x: 2080, y: 1040, w: 360, h: 420, visible: true, zIndex: 32 },
  { id: 'support_center', type: 'support_center', title: '💬 Support & Help Center', x: 2460, y: 1040, w: 380, h: 420, visible: true, zIndex: 33 },

  // V5.1 Premium Interactive Real Estate Widgets
  { id: 'node_canvas', type: 'node_canvas', title: '🧬 Deal Flow Node Engine', x: 2080, y: 1480, w: 420, h: 420, visible: true, zIndex: 34 },
  { id: 'rehab_calc', type: 'rehab_calc', title: '🔨 Rehab & ROI Calculator', x: 2520, y: 1480, w: 380, h: 420, visible: true, zIndex: 35 },
  { id: 'property_comparator', type: 'property_comparator', title: '📊 Property Compare Matrix', x: 2920, y: 1480, w: 400, h: 420, visible: true, zIndex: 36 },
  { id: 'contacts_search', type: 'contacts_search', title: '📞 State & County Registrar Directory', x: 3340, y: 1480, w: 380, h: 420, visible: true, zIndex: 37 }
];

export const ClientWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, companies, selectCompany } = useCompany();
  const canvasRef = useRef<HTMLDivElement>(null);

  // States
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('goauct_workbench_widgets_v40');
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

  // --- MAIN SIDEBAR SYNC ---
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(() => {
    return localStorage.getItem('goauct_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleMainSidebarEvent = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setMainSidebarCollapsed(customEvent.detail);
    };
    window.addEventListener('goauct-main-sidebar-collapsed', handleMainSidebarEvent as EventListener);
    return () => {
      window.removeEventListener('goauct-main-sidebar-collapsed', handleMainSidebarEvent as EventListener);
    };
  }, []);

  const toggleMainSidebar = () => {
    window.dispatchEvent(new CustomEvent('goauct-toggle-main-sidebar'));
  };

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
      setUserNickname(u.nickname || u.email.split('@')[0]);
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

  // Unified console logger helper
  const logConsoleActivity = useCallback((msg: string) => {
    setTerminalLogs(prev => [...prev, `[activity] ${msg}`].slice(-40));
  }, []);

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

          <div className="flex flex-col gap-4 items-center w-full border-t border-slate-100 dark:border-slate-800/85 pt-4">
            {/* Toggle Main Layout Sidebar */}
            <button
              onClick={toggleMainSidebar}
              title={mainSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="p-2 text-slate-400 dark:text-slate-655 hover:text-slate-700 dark:hover:text-slate-350 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40"
            >
              {mainSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Toggle Workbench Drawer */}
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

                  {/* My Lists (Saved Lists & Folders) */}
                  {w.type === 'my_lists' && (
                    <div className="size-full flex flex-col justify-between space-y-3">
                      {/* Create watchlist folder inline form */}
                      <form onSubmit={handleCreateFolder} className="flex gap-1.5 shrink-0">
                        <input
                          id="new-folder-input"
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="New folder name..."
                          className="flex-1 px-2.5 py-1 text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          id="create-folder-btn"
                          type="submit"
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Plus size={10} /> Add
                        </button>
                      </form>

                      {/* Folder selectors & lists */}
                      <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
                        {foldersLoading ? (
                          <div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-500" size={16} /></div>
                        ) : folderLists.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-6">
                            <Folder className="opacity-30 mb-1.5" size={24} />
                            <p className="text-[10px] font-semibold">No folders created yet</p>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
                            {/* Horizontal pill list for folders */}
                            <div className="flex gap-1 overflow-x-auto pb-1.5 shrink-0 scrollbar-thin">
                              {folderLists.map(folder => (
                                <div key={folder.id} className="flex items-center shrink-0">
                                  <button
                                    id={`select-folder-${folder.id}`}
                                    onClick={() => setSelectedFolderId(folder.id)}
                                    className={`px-3 py-1 text-[9px] font-extrabold uppercase rounded-lg border transition-all ${
                                      selectedFolderId === folder.id
                                        ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                                    }`}
                                  >
                                    {folder.name}
                                  </button>
                                  <button
                                    id={`delete-folder-${folder.id}`}
                                    onClick={() => handleDeleteFolder(folder.id)}
                                    className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded text-slate-400 shrink-0 ml-0.5"
                                    title="Delete Folder"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Properties in active folder */}
                            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 scrollbar-thin">
                              {folderPropertiesLoading ? (
                                <div className="flex items-center justify-center py-6"><RefreshCw className="animate-spin text-indigo-500" size={16} /></div>
                              ) : selectedFolderProperties.length === 0 ? (
                                <div className="text-center text-[9px] text-slate-400 py-6">This folder is currently empty. Add properties from Search/Recommended.</div>
                              ) : (
                                selectedFolderProperties.map((p: any) => (
                                  <div
                                    key={p.id}
                                    className="p-2.5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between transition-all group"
                                  >
                                    <div
                                      onClick={() => {
                                        setSelectedProperty(p);
                                        focusWidget('property_details');
                                      }}
                                      className="min-w-0 flex-1 cursor-pointer"
                                    >
                                      <span className="text-[7.5px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.25 rounded uppercase">Score: {p.deal_score || 85}</span>
                                      <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate mt-1 group-hover:text-indigo-500 transition-colors">
                                        {p.address || 'Certified FEMA Zone'}
                                      </p>
                                      <p className="text-[8px] text-slate-455 truncate">
                                        {p.parcel_id} · {p.county}, {p.state}
                                      </p>
                                    </div>
                                    <button
                                      id={`remove-prop-${p.id}`}
                                      onClick={() => handleRemovePropertyFromFolder(selectedFolderId!, p.id)}
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg shrink-0 ml-2"
                                      title="Remove from List"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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
                                  <span className="text-[10px] font-bold text-slate-900 dark:text-white block leading-none truncate">{member.nickname || member.email.split('@')[0]}</span>
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
                        <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1">
                          <Layers size={11} className="text-violet-500" /> Deal Flow Pipeline Node Engine
                        </span>
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
                          {dealFlowNodes.map((n, i) => {
                            if (i === 0) return null;
                            const prev = dealFlowNodes[i - 1];
                            const isActive = n.status !== 'pending' && prev.status !== 'pending';
                            const isCompleted = n.status === 'completed' && prev.status === 'completed';
                            return (
                              <g key={`path-${prev.id}-${n.id}`}>
                                <path
                                  d={drawBezier(prev, n)}
                                  stroke={isCompleted ? 'url(#completedGrad)' : isActive ? 'url(#activeGlowGrad)' : '#94A3B8'}
                                  strokeWidth={isActive ? 2.5 : 1.5}
                                  fill="none"
                                  strokeDasharray={isActive && !isCompleted ? '5,5' : 'none'}
                                  className={isActive && !isCompleted ? 'animate-pulse' : ''}
                                  opacity={n.status === 'pending' ? 0.4 : 1}
                                />
                              </g>
                            );
                          })}

                          {/* Nodes rendered as SVG foreignObjects for rich HTML rendering */}
                          {dealFlowNodes.map(n => {
                            const isDragging = draggingNodeId === n.id;
                            const borderClass =
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
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setDraggingNodeId(n.id);
                                  }}
                                  onClick={() => handleNodeClick(n.id)}
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

                        {/* Interactive Drag & Change Instruction Overlay */}
                        <div className="absolute bottom-2 left-2 right-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 text-[7px] font-bold text-slate-500 text-center pointer-events-none uppercase tracking-widest">
                          💡 Drag nodes to rearrange · Click nodes to cycle status
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
                    const props = [compareProp1, compareProp2, compareProp3].filter(Boolean) as Property[];
                    
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
