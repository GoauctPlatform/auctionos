import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
import { PermissionGate } from '../../components/PermissionGate';

const AgentLayout: React.FC = () => {
    const navigate = useNavigate();
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

    const handleLogout = () => {
        AuthService.logout();
        navigate('/');
    };

    return (
        <PermissionGate allowedRoles={['agent_due_diligence']}>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex overflow-hidden">
                <aside className={`
                    fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-800
                    border-r border-slate-200 dark:border-slate-700 flex flex-col
                    transform transition-all duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
                    ${sidebarOpen ? 'lg:translate-x-0 lg:static lg:block lg:w-64' : 'lg:-translate-x-full lg:hidden lg:w-0 lg:p-0 lg:border-0 lg:opacity-0'}
                `}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">directions_car</span>
                            Field Agent
                        </h2>
                    </div>
                    <nav className="flex-1 px-4 space-y-2">
                        <NavLink to="/agent" end onClick={() => setMobileOpen(false)} className={({isActive}) => `block p-3 rounded-xl transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Dashboard</NavLink>
                        <NavLink to="/agent/tasks" onClick={() => setMobileOpen(false)} className={({isActive}) => `block p-3 rounded-xl transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Available Tasks</NavLink>
                        <NavLink to="/agent/withdraw" onClick={() => setMobileOpen(false)} className={({isActive}) => `block p-3 rounded-xl transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Earnings</NavLink>
                    </nav>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleLogout} className="w-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Logout
                        </button>
                    </div>
                </aside>

                {/* Mobile backdrop */}
                {mobileOpen && (
                    <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
                )}

                {/* Main content */}
                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                    {/* Universal Top Bar */}
                    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 z-20">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                                <span className="material-symbols-outlined">menu</span>
                            </button>
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}>
                                <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                            </button>
                            <div className="lg:hidden flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-500">directions_car</span>
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Field Agent</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center" title="Toggle Theme">
                                <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
                            </button>
                            <button onClick={handleLogout} className="hidden sm:flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Logout">
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                            </button>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8">
                        <Outlet />
                    </main>
                </div>
            </div>
        </PermissionGate>
    );
};
export default AgentLayout;
