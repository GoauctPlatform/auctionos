import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
import { RealtorService } from '../../services/company.service';
import { RealtorTaskService } from '../../services/realtor_task.service';
import { CircularProgress } from '@mui/material';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/realtor', icon: 'dashboard', exact: true },
  { label: 'Property Listings', path: '/realtor/listings', icon: 'home_work' },
  { label: 'Available Tasks', path: '/realtor/tasks', icon: 'task_alt' },
  { label: 'Commissions', path: '/realtor/commissions', icon: 'payments' },
  { label: 'My Profile', path: '/realtor/profile', icon: 'manage_accounts' },
];

const ConsultantLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Theme state
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  
  // Profile & Verification states
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTasksCount, setActiveTasksCount] = useState(0);
  const [balance, setBalance] = useState(0);

  const checkStatus = async () => {
    try {
      setProfileLoading(true);
      const prof = await RealtorService.getMe();
      setProfile(prof);

      if (prof.verification_status === 'rejected') {
        // Fetch current tasks
        const tasks = await RealtorTaskService.getMyTasks();
        const activeTasks = tasks.filter(t => t.status === 'claimed' || t.status === 'submitted');
        setActiveTasksCount(activeTasks.length);

        // Fetch balance
        const comms = await RealtorTaskService.getCommissions();
        setBalance(comms.available_usd || 0);
      }
    } catch (e) {
      console.error("Failed to load realtor layout check details:", e);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const user = AuthService.getCurrentUser();
  const displayName = profile?.name || user?.full_name || user?.email?.split('@')[0] || 'Realtor';

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login?mode=realtor');
  };

  // Loading Screen
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#060c19] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-xl">
          <CircularProgress size={40} className="text-emerald-500" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  // Pending Screen
  if (profile?.verification_status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#060c19] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="size-20 rounded-full bg-amber-50 dark:bg-amber-950/20 border-2 border-dashed border-amber-500 flex items-center justify-center animate-spin-slow">
            <span className="material-symbols-outlined text-amber-500 text-[40px]">pending_actions</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Verification Pending</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">Compliance Review In Progress</p>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Thank you for joining GoAuct! Compliance is currently reviewing your registration form (SSN, Professional License, and MLS details).
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            This compliance check is required before you can access listings, claim tasks, and execute missions. You will receive an email as soon as your account is verified!
          </p>

          <button
            onClick={handleLogout}
            className="w-full py-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Grace Period / Access Lock logic
  const isRejectedGrace = profile?.verification_status === 'rejected' && (activeTasksCount > 0 || balance > 0);

  if (profile?.verification_status === 'rejected' && !isRejectedGrace) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#060c19] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="size-20 rounded-full bg-red-50 dark:bg-red-950/20 border-2 border-red-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-[40px]">gavel</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-black text-red-600 dark:text-red-400">Access Revoked</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">compliance suspension</p>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We regret to inform you that your partner application has been rejected by compliance.
          </p>

          <div className="w-full bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl text-left">
            <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-widest block mb-1">Reason for Rejection:</span>
            <p className="text-xs text-red-600 dark:text-red-300 font-medium leading-relaxed">
              {profile.rejection_reason || "SSN or License credentials mismatch."}
            </p>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            If you believe this is a mistake, please contact our compliance and support team. Access to partner portal tools is suspended.
          </p>

          <button
            onClick={handleLogout}
            className="w-full py-3 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Intercept available tasks endpoint during grace period deactivation
  if (isRejectedGrace && location.pathname.startsWith('/realtor/tasks')) {
    return <Navigate to="/realtor" replace />;
  }

  const navItems = NAV_ITEMS.filter(item => {
    if (isRejectedGrace && item.path === '/realtor/tasks') {
      return false; // Hide Available Tasks during suspended grace period
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060c19] flex flex-col overflow-hidden">
      {/* Suspended Grace Period Banner */}
      {isRejectedGrace && (
        <div className="bg-gradient-to-r from-red-650 to-amber-650 bg-red-600 text-white px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2 shrink-0 z-50">
          <span className="material-symbols-outlined text-[16px] animate-pulse">warning</span>
          <span>
            Compliance Suspended: Your application was rejected due to: <strong>{profile.rejection_reason || "SSN or License mismatch"}</strong>. You have a temporary grace period to complete current tasks and request final withdrawals.
          </span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          transform transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          ${sidebarOpen ? 'lg:translate-x-0 lg:static lg:block lg:w-64' : 'lg:-translate-x-full lg:hidden lg:w-0 lg:p-0 lg:border-0 lg:opacity-0'}
          flex flex-col
        `}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100 dark:border-slate-800">
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">handshake</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">GoAuct</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Partner Portal</p>
            </div>
          </div>

          {/* Profile mini */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-black shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive(item.path, item.exact)
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive(item.path, item.exact) ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Universal Top Bar */}
          <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-20">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              {/* Desktop toggle button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              >
                <span className="material-symbols-outlined">
                  {sidebarOpen ? 'menu_open' : 'menu'}
                </span>
              </button>

              <div className="lg:hidden flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">handshake</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Partner Portal</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                title="Toggle Theme"
              >
                <span className="material-symbols-outlined">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
              
              {/* Desktop Quick Logout */}
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Logout"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default ConsultantLayout;
