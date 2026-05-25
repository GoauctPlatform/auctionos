import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navItems = [
    { icon: 'dashboard', label: 'Overview', path: '/dashboard' },
    { icon: 'group', label: 'Users & Roles', path: '/users' },
    {
      icon: 'build',
      label: 'Tools',
      dropdown: [
        { label: 'Auctions Dashboard', path: '/admin/auctions' },
        { label: 'Property Manager', path: '/admin/properties' },
        { label: 'News & Announcements', path: '/admin/broadcasts' },
      ],
    },
    {
      icon: 'admin_panel_settings',
      label: 'Admin & CRM',
      dropdown: [
        { label: 'User Management', path: '/admin/users' },
        { label: 'Realtor Withdrawals', path: '/admin/withdrawals' },
        { label: 'Conflict Mediation', path: '/admin/mediation' },
      ],
    },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B1120] font-sans overflow-hidden">
      {/* Workbench Sidebar */}
      <aside className="w-16 md:w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 z-50">
        <div className="flex flex-col">
          <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-200 dark:border-slate-800 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">A</div>
            <span className="hidden md:block ml-3 text-slate-900 dark:text-white font-bold text-lg">GoAuct Admin</span>
          </div>

          <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto mt-4">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.dropdown ? (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                      className="w-full flex items-center justify-center md:justify-between px-0 md:px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors group relative"
                      title={item.label}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">{item.icon}</span>
                        <span className="hidden md:block font-semibold text-sm">{item.label}</span>
                      </div>
                      <span className="hidden md:block material-symbols-outlined text-[16px] opacity-50">
                        {openDropdown === item.label ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="hidden md:block pl-10 pr-3 py-1 space-y-1">
                        {item.dropdown.map((dropItem) => (
                          <NavLink
                            key={dropItem.path}
                            to={dropItem.path}
                            className={({ isActive }) =>
                              `block px-3 py-2 rounded-md text-sm font-medium ${isActive
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                              }`
                            }
                          >
                            {dropItem.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path!}
                    className={({ isActive }) =>
                      `flex items-center justify-center md:justify-start gap-3 px-0 md:px-3 py-2.5 rounded-lg transition-colors group relative ${isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`
                    }
                    title={item.label}
                  >
                    <span className={`material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform`}>{item.icon}</span>
                    <span className="hidden md:block font-semibold text-sm">{item.label}</span>
                  </NavLink>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="hidden md:flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 mb-3 border border-slate-200 dark:border-slate-700">
            <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
              {(user?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.full_name || user?.email?.split('@')[0] || 'Admin'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{user?.role || 'Administrator'}</p>
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