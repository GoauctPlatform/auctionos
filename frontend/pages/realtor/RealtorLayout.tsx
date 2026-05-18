import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';

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
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Realtor';

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login?mode=realtor');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060c19] flex overflow-hidden">
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
          {NAV_ITEMS.map(item => (
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
  );
};

export default ConsultantLayout;
