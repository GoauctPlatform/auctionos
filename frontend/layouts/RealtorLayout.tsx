import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { Footer } from '../components/Footer';
import { useLanguage } from "../context/LanguageContext";

const ConsultantLayout: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const user = AuthService.getCurrentUser();
    const displayName = user?.full_name || user?.email?.split('@')[0] || 'Realtor';

    const handleLogout = () => {
        AuthService.logout();
        navigate('/login');
    };

    const navItems = [
        { icon: 'dashboard', label: 'Dashboard', path: '/realtor' },
        { icon: 'home_work', label: 'Property Listings', path: '/realtor/listings' },
        { icon: 'task_alt', label: 'Available Tasks', path: '/realtor/tasks' },
        { icon: 'payments', label: 'Commissions', path: '/realtor/commissions' },
        { icon: 'person', label: 'My Profile', path: '/realtor/profile' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#0B1120] font-sans overflow-hidden">
            {/* Workbench Sidebar */}
            <aside className="w-16 md:w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 z-50">
                <div className="flex flex-col">
                    <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-200 dark:border-slate-800 cursor-pointer" onClick={() => navigate('/realtor')}>
                        <div className="size-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">handshake</span>
                        </div>
                        <span className="hidden md:block ml-3 text-slate-900 dark:text-white font-bold text-lg">GoAuct Realtor</span>
                    </div>

                    <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto mt-4">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/realtor'}
                                className={({ isActive }) =>
                                    `flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 rounded-lg transition-colors group relative ${
                                        isActive
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                                    }`
                                }
                                title={item.label}
                            >
                                <span className={`material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform`}>{item.icon}</span>
                                <span className="hidden md:block font-semibold text-sm">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="hidden md:flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 mb-3 border border-slate-200 dark:border-slate-700">
                        <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">Realtor Partner</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors group"
                        title="Sign Out"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">logout</span>
                        <span className="hidden md:block font-semibold text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-slate-50/50 dark:bg-transparent">
                <div className="flex-1 w-full p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default ConsultantLayout;
