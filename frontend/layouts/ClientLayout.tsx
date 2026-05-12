import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { AuthService } from '../services/auth.service';
import { ClientDataService } from '../services/property.service';
import { CompanySelector } from '../components/CompanySelector';
import { Dialog, Typography, TextField, Button } from '@mui/material';

const ClientLayout: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [upcomingAuctions, setUpcomingAuctions] = useState<number>(0);
  



  React.useEffect(() => {
    // Basic ping to count if any user list has upcoming auctions
    ClientDataService.getLists().then(lists => {
       const hasUpcoming = lists.filter((l: any) => l.has_upcoming_auction).reduce((acc: number, curr: any) => acc + (curr.upcoming_auctions_count || 0), 0);
       setUpcomingAuctions(hasUpcoming);
    }).catch(() => {});
  }, []);

  const user = AuthService.getCurrentUser();
  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Client';
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) return alert("Passwords do not match");
    setChangingPassword(true);
    try {
        await AuthService.changePassword(passwordForm.current, passwordForm.new);
        setChangePasswordOpen(false);
        setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (e) {
        alert("Failed to update password");
    } finally {
        setChangingPassword(false);
    }
  };

  type DropdownItem = { label: string; path: string };
  type NavItem = {
    icon: string;
    label: string;
    path?: string;
    end?: boolean;
    dropdown?: DropdownItem[];
    cta?: boolean;
  };

  const role = user?.role || 'client';

  let navItems: NavItem[] = [
    { icon: 'home', label: 'Home', path: '/client', end: true },
    { icon: 'campaign', label: 'Live Auctions', path: '/client/auctions' },
    { icon: 'location_on', label: 'Property Search', path: '/client/properties' },
    { icon: 'list_alt', label: 'My Lists', path: '/client/lists' },
  ];

  if (role === 'manager' || role === 'client') {
    navItems.push(
      {
        icon: 'hub',
        label: 'Connect',
        dropdown: [
          { label: 'Training', path: '/client/training' },
          { label: 'Community', path: '/client/community' },
          { label: 'Groups', path: '/client/groups' },
        ],
      }
    );
  }

  let accountDropdown: DropdownItem[] = [
    { label: 'Settings & Profile', path: '/client/settings' },
    { label: 'Security & Password', path: '/client/change-password' },
    { label: 'About GoAuct', path: '/client/about' },
  ];

  if (role === 'manager' || role === 'client') {
    accountDropdown.splice(1, 0, { label: 'Team & Logs', path: '/client/team' });
  }

  if (role === 'client') {
    accountDropdown.splice(2, 0, { label: 'Billing & Plans', path: '/client/billing' });
  }

  navItems.push({
    icon: 'manage_accounts',
    label: 'Account Support',
    dropdown: accountDropdown,
  });

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 font-display flex flex-col">
      {/* Header Navigation */}
      <header className="bg-white dark:bg-[#1a2634] border-b border-[#e7ecf3] dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Brand */}
              <div
                className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/client')}
              >
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                </div>
                <span className="text-[#0d131b] dark:text-white text-lg font-bold hidden md:block">
                  GoAuct
                </span>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:ml-6 md:flex md:items-center md:gap-0.5">
                {navItems.map((item) => (
                  <div key={item.label} className="relative group">
                    {item.dropdown ? (
                      <>
                        <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="material-symbols-outlined text-[16px]">expand_more</span>
                        </div>
                        {/* Dropdown */}
                        <div className="absolute left-0 top-full w-52 rounded-xl shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1">
                          {item.dropdown.map((dropItem) => (
                            <NavLink
                              key={dropItem.path}
                              to={dropItem.path}
                              className={({ isActive }) =>
                                `block px-4 py-2 text-sm transition-colors ${isActive
                                  ? 'bg-blue-50 text-primary dark:bg-slate-700 dark:text-blue-400 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`
                              }
                            >
                              {dropItem.label}
                            </NavLink>
                          ))}
                        </div>
                      </>
                    ) : (
                      <NavLink
                        to={item.path!}
                        end={item.end}
                        className={({ isActive }) =>
                          `inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                            ? 'bg-blue-50 text-primary dark:bg-blue-900/40 dark:text-blue-300'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                          }`
                        }
                      >
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-1.5 mt-0.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                  <span className={`w-2 h-2 rounded-full ${user?.subscription_tier === 'enterprise' ? 'bg-purple-500' : user?.subscription_tier === 'pro' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white capitalize">{user?.subscription_tier || 'Trial'}</span>
                  {user?.subscription_tier === 'trial' && (
                    <Link
                      to="/signup"
                      className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-primary text-primary text-sm font-bold hover:bg-primary hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                      Upgrade Trial
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Company Selector */}
              <div className="hidden md:block">
                <CompanySelector compact />
              </div>

              {/* User Info */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{userDisplayName}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{role}</span>
              </div>
              <div className="size-9 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-primary dark:text-blue-300 font-bold cursor-pointer text-sm">
                {userInitial}
              </div>
              {/* Notification Bell */}
              <div 
                  className="relative cursor-pointer mr-2 flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" 
                  title="Notifications" 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <span className="material-symbols-outlined text-[24px]">notifications</span>
                {upcomingAuctions > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-red-500 border-2 border-white dark:border-[#1a2634]"></span>
                  </span>
                )}

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                    <div className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">Alerts</span>
                            {upcomingAuctions > 0 && (
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">{upcomingAuctions} New</span>
                            )}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {upcomingAuctions > 0 ? (
                                <div 
                                    className="p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex gap-3"
                                    onClick={() => { setNotificationsOpen(false); navigate('/client/lists'); }}
                                >
                                    <div className="mt-0.5 size-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 leading-tight">Upcoming Auctions Detected</p>
                                        <p className="text-[10px] text-slate-500">You have {upcomingAuctions} properties in your My List that are going to auction within the next 7 days.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400">
                                    <span className="material-symbols-outlined text-3xl mb-2 opacity-50">notifications_paused</span>
                                    <p className="text-xs">You're all caught up!</p>
                                </div>
                            )}
                        </div>
                        <div 
                            className="bg-slate-50 dark:bg-slate-900/30 p-2 text-center text-[10px] font-bold text-blue-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                            onClick={() => { setNotificationsOpen(false); navigate('/client/lists'); }}
                        >
                            Manage Watchlists
                        </div>
                    </div>
                )}
              </div>

              <div className="flex items-center gap-1 hidden md:flex">
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Sign Out"
                  >
                    <span className="material-symbols-outlined text-[22px]">logout</span>
                  </button>
              </div>

              {/* Mobile toggle */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700">
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
                                  ? 'bg-blue-50 text-primary dark:bg-blue-900/40 dark:text-blue-300'
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
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors ${isActive
                          ? 'bg-blue-50 text-primary dark:bg-blue-900/40 dark:text-blue-300'
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
              {/* Upgrade CTA mobile */}
              {user?.subscription_tier === 'trial' && (
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-base font-bold"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  Upgrade Trial Account
                </Link>
              )}
              
              <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 flex flex-col">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ClientLayout;
