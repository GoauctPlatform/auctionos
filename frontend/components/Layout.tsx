import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navItems = [
    { icon: 'home', label: 'Home', path: '/dashboard' },
    {
      icon: 'gavel',
      label: 'Auctions',
      dropdown: [
        { label: 'Auctions Dashboard', path: '/admin/auctions' },
        { label: 'Property Manager', path: '/admin/properties' },
        { label: 'Import Properties (CSV)', path: '/admin/import/properties' },
        { label: 'Import Auctions (CSV)', path: '/admin/import/auctions' },
        { label: 'System Broadcasts', path: '/admin/broadcasts' },
      ],
    },
    { icon: 'list_alt', label: 'My Lists', path: '/admin/lists' },
    { icon: 'map', label: 'Research', path: '/admin/research' },
    {
      icon: 'admin_panel_settings',
      label: 'Admin & CRM',
      dropdown: [
        { label: 'User Management', path: '/admin/users' },
        { label: 'Realtor Withdrawals', path: '/admin/withdrawals' },
      ],
    },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen w-full bg-background-light dark:bg-background-dark font-display flex flex-col">
      {/* Header Navigation */}
      <header className="bg-white dark:bg-[#1a2634] border-b border-[#e7ecf3] dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">A</div>
                <span className="text-[#0d131b] dark:text-white text-lg font-bold hidden md:block">GoAuct</span>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:ml-8 md:flex md:space-x-4 items-center">
                {navItems.map((item) => (
                  <div key={item.label} className="relative group">
                    {item.dropdown ? (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                        <span>{item.label}</span>
                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                      </div>
                    ) : (
                      <NavLink
                        to={item.path!}
                        className={({ isActive }) =>
                          `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                          }`
                        }
                      >
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    )}

                    {/* Dropdown Menu */}
                    {item.dropdown && (
                      <div className="absolute left-0 mt-0 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-1">
                          {item.dropdown.map((dropItem) => (
                            <NavLink
                              key={dropItem.path}
                              to={dropItem.path}
                              className={({ isActive }) => 
                                `block px-4 py-2 text-sm ${isActive 
                                  ? 'bg-slate-100 text-primary dark:bg-slate-700 dark:text-blue-400 font-bold' 
                                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`
                              }
                            >
                              {dropItem.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* User Menu */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex flex-col items-end mr-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{user?.email || 'User'}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'Agent'}</span>
                </div>
                <div
                  className="size-9 rounded-full bg-cover bg-center border border-slate-200 cursor-pointer"
                  style={{ backgroundImage: `url('${user?.avatar || '/placeholder.png'}')` }}
                ></div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <div className="flex item-center md:hidden">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <span className="sr-only">Open main menu</span>
                  <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 absolute w-full z-50">
            <div className="pt-2 pb-3 px-4 flex flex-col gap-1">
              {navItems.map((item) => (
                <div key={item.label}>
                  {item.dropdown ? (
                    <>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined">{item.icon}</span>
                          {item.label}
                        </div>
                        <span className="material-symbols-outlined">
                          {openDropdown === item.label ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      {openDropdown === item.label && (
                        <div className="pl-10 pr-3 py-2 space-y-1">
                          {item.dropdown.map((dropItem) => (
                            <NavLink
                              key={dropItem.path}
                              to={dropItem.path}
                              className={({ isActive }) =>
                                `block px-3 py-2 rounded-md text-sm font-medium ${isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                                }`
                              }
                              onClick={() => setMobileMenuOpen(false)}
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
                        `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors ${isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="material-symbols-outlined">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile User Menu */}
            <div className="mt-4 pt-4 pb-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center px-4">
                <div
                  className="size-10 rounded-full bg-cover bg-center border border-slate-200"
                  style={{ backgroundImage: `url('${user?.avatar || '/placeholder.png'}')` }}
                ></div>
                <div className="ml-3">
                  <div className="text-base font-medium text-slate-800 dark:text-white">{user?.email || 'User'}</div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'Agent'}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined">logout</span>
                  Sign Out
                </button>
              </div>
            </div>

          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};