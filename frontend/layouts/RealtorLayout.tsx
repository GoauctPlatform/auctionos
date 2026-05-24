import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { Footer } from '../components/Footer';

const ConsultantLayout: React.FC = () => {
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
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 font-display flex flex-col">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
                <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-12">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-6">
                            {/* Brand */}
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/realtor')}>
                                <div className="size-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-white text-[18px]">handshake</span>
                                </div>
                                <div>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">GoAuct</span>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block leading-none">Realtor Portal</span>
                                </div>
                            </div>
                            {/* Nav */}
                            <nav className="hidden md:flex items-center gap-1">
                                {navItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/realtor'}
                                        className={({ isActive }) =>
                                            `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                isActive
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                                            }`
                                        }
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{displayName}</span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Realtor Partner</span>
                            </div>
                            <div className="size-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-sm">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors hidden md:block"
                                title="Sign Out"
                            >
                                <span className="material-symbols-outlined text-[22px]">logout</span>
                            </button>
                            <button
                                className="md:hidden p-2 text-slate-400 hover:text-slate-600"
                                onClick={() => setMobileOpen(!mobileOpen)}
                            >
                                <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
                            </button>
                        </div>
                    </div>
                </div>
                {mobileOpen && (
                    <div className="md:hidden border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-col gap-1">
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/realtor'}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                    }`
                                }
                                onClick={() => setMobileOpen(false)}
                            >
                                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                )}
            </header>

            <main className="flex-1 w-full flex flex-col">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
};

export default ConsultantLayout;
