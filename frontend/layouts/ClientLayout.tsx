import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { AuthService } from '../services/auth.service';
import { ClientDataService } from '../services/property.service';
import { CompanySelector } from '../components/CompanySelector';
import { Dialog, Typography, TextField, Button, Box } from '@mui/material';
import { Mail, ShieldAlert, Loader2, RefreshCw, Calendar, Search, Folder, Gavel, LayoutGrid } from 'lucide-react';
import api from '../services/api';
import { useTour } from '../context/TourContext';
import { TourOverlay } from '../components/TourOverlay';

const ClientLayout: React.FC = () => {
  const { user, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { startTour, tourActive } = useTour();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [upcomingAuctions, setUpcomingAuctions] = useState<number>(0);
  const [envelopeClicks, setEnvelopeClicks] = useState(0);

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasDebugParam = new URLSearchParams(window.location.search).get('debug') === 'true' || 
                        new URLSearchParams(window.location.search).get('dev') === 'true';
  const showDevBypass = isLocal || hasDebugParam || envelopeClicks >= 5;

  // CRITICAL: Check trial expiration status immediately on mount
  // This ensures trial_expired flag is set before rendering the workbench
  React.useEffect(() => {
    const checkTrialExpiration = async () => {
      if (location.pathname.includes('/client/billing') || location.pathname.includes('/client/expired')) {
        return;
      }
      try {
        // Make a safe API call to check subscription status
        // This will trigger HTTP 402 if trial has expired
        const response = await api.get('/billing/usage');
        
        // If subscription status is expired, set the flag
        if (response.data?.status === 'expired') {
          localStorage.setItem('trial_expired', 'true');
          navigate('/client/expired', { replace: true });
        }
      } catch (error: any) {
        // HTTP 402 errors are handled by the API interceptor
        // But we also check explicitly in case it wasn't caught
        if (error.response?.status === 402) {
          localStorage.setItem('trial_expired', 'true');
          navigate('/client/expired', { replace: true });
        }
      }
    };

    // Only check if user is loaded and is a client
    if (user && user.role === 'client') {
      checkTrialExpiration();
    }
  }, [user, navigate, location.pathname]);

  React.useEffect(() => {
    // If verified user hasn't completed onboarding tour, start the interactive tour!
    if (user && user.is_verified) {
      const isCompleted = localStorage.getItem(`goauct_onboarding_completed_${user.id}`) === 'true';
      if (!isCompleted && !tourActive) {
        startTour('investor');
      }

      // If upgraded to paid and hasn't done live auctions calendar tour yet
      if (user.subscription_tier !== 'trial') {
        const liveTourCompleted = localStorage.getItem(`goauct_live_auctions_tour_completed_${user.id}`) === 'true';
        if (!liveTourCompleted && !tourActive && window.location.hash.includes('/client/auctions')) {
          startTour('live_auctions');
        }
      }
    }

    // Basic ping to count if any user list has upcoming auctions
    ClientDataService.getLists().then(lists => {
       const hasUpcoming = lists.filter((l: any) => l.has_upcoming_auction).reduce((acc: number, curr: any) => acc + (curr.upcoming_auctions_count || 0), 0);
       setUpcomingAuctions(hasUpcoming);
    }).catch(() => {});

    // REFRESH VERIFICATION STATUS: 
    // If the local user object says unverified, check the backend one last time.
    if (user && !user.is_verified) {
      AuthService.getMe().then(updatedUser => {
        if (updatedUser.is_verified) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
          // Small delay then reload to clear the verification overlay
          setTimeout(() => window.location.reload(), 500);
        }
      }).catch(() => {});
    }
  }, [user, navigate, tourActive, startTour]);

  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Client';
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

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

  const [resending, setResending] = useState(false);
  const handleResendVerification = async () => {
    setResending(true);
    try {
        await api.post('/auth/resend-verification');
        alert("Verification email sent! Please check your inbox.");
    } catch (e) {
        alert("Failed to resend verification email.");
    } finally {
        setResending(false);
    }
  };

  const [devVerifying, setDevVerifying] = useState(false);
  const handleDevVerify = async () => {
    setDevVerifying(true);
    try {
        await api.post('/auth/dev-auto-verify');
        if (user) {
            const updated = { ...user, is_verified: true };
            localStorage.setItem('user', JSON.stringify(updated));
        }
        alert("🎉 Dev Mode: Account verified instantly!");
        window.location.reload();
    } catch (e) {
        alert("Failed to auto-verify account.");
    } finally {
        setDevVerifying(false);
    }
  };

  const VerificationBlock = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-900/60 overflow-hidden">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-white/20 p-8 text-center animate-in fade-in zoom-in duration-300">
            <div 
                onClick={() => setEnvelopeClicks(prev => prev + 1)}
                className="size-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner cursor-pointer select-none active:scale-95 transition-transform"
                title="Click 5 times for developer bypass"
            >
                <Mail size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Check Your Inbox</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                To keep your account secure, we need to verify your email address. 
                Please click the link we sent to <span className="font-bold text-slate-700 dark:text-slate-200">{user?.email}</span>.
            </p>

            <div className="flex flex-col gap-3">
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-primary hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <RefreshCw size={18} />
                    I've Verified My Email
                </button>
                
                <button 
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {resending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    Resend Email
                </button>

                {showDevBypass && (
                    <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button 
                            onClick={handleDevVerify}
                            disabled={devVerifying}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {devVerifying ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                            Bypass Verification (Dev Mode)
                        </button>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                            Only enabled if ALLOW_DEV_AUTO_VERIFY=True is active on the server.
                        </p>
                    </div>
                )}
            </div>

            <button 
                onClick={handleLogout}
                className="mt-8 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"
            >
                Use a different account
            </button>
        </div>
    </div>
  );


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
    { icon: 'biotech', label: 'IDE Workbench', path: '/client/workbench' },
    { icon: 'campaign', label: 'Live Auctions', path: '/client/auctions' },
    { icon: 'location_on', label: 'Property Search', path: '/client/properties' },
    { icon: 'list_alt', label: 'My Lists', path: '/client/lists' },
    { icon: 'real_estate_agent', label: 'Field Missions', path: '/client/tasks' },
  ];

  if ((role === 'manager' || role === 'client') && user?.subscription_tier !== 'trial') {
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
    label: 'Account Settings',
    dropdown: accountDropdown,
  });

  const isMainDashboard = false;
  const isWorkbench = location.pathname.startsWith('/client/workbench');
  const isWorkbenchWorkspace = location.pathname.startsWith('/client/workbench') || 
                               location.pathname === '/client' || 
                               location.pathname === '/client/';
  const hideHeader = true; // Globally hide the outdated classic header and footer

  return (
    <div className={`w-full bg-slate-50 dark:bg-slate-900 font-display flex flex-col relative ${isWorkbenchWorkspace ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Dynamic Background Layer */}

      {/* Header Navigation */}
      {!hideHeader && (
        <header className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-all select-none">
          <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-12">
            <div className="flex justify-between h-16">
              <div className="flex">
                {/* Brand Logo */}
                <div
                  className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer"
                  onClick={() => navigate('/client')}
                >
                  <img 
                    src="/goauct-logo.png" 
                    alt="GoAuct Logo" 
                    className="w-6 h-6 rounded-md object-cover shadow-sm border border-slate-200/20"
                  />
                  <span className="text-slate-900 dark:text-white text-base font-black uppercase tracking-wider hidden md:block">
                    GoAuct
                  </span>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:ml-8 md:flex md:items-center md:gap-1">
                  {navItems.map((item) => (
                    <div key={item.label} className="relative group" id={`tour-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.dropdown ? (
                        <>
                          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-all">
                            <span>{item.label}</span>
                            <span className="material-symbols-outlined text-[15px] opacity-70">expand_more</span>
                          </div>
                          {/* Dropdown */}
                          <div className="absolute left-0 top-full w-52 rounded-xl shadow-xl bg-white dark:bg-slate-850 ring-1 ring-black/5 dark:ring-slate-700/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1.5 border border-slate-100 dark:border-slate-800">
                            {item.dropdown.map((dropItem) => (
                              <NavLink
                                key={dropItem.path}
                                to={dropItem.path}
                                className={({ isActive }) =>
                                  `block px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
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
                            `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isActive
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-250 dark:hover:bg-slate-800'
                            }`
                          }
                        >
                          <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                          <span>{item.label}</span>
                        </NavLink>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
                    <span className={`w-2 h-2 rounded-full ${user?.subscription_tier === 'enterprise' ? 'bg-purple-500' : user?.subscription_tier === 'pro' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-350">{user?.subscription_tier || 'Trial'}</span>
                    {user?.subscription_tier === 'trial' && (
                      <Link
                        to="/client/billing"
                        id="tour-upgrade-button"
                        className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-600 hover:bg-blue-600 hover:text-white text-blue-600 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                        Upgrade
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Company Switcher inside the Header */}
                <CompanySelector compact />

                {/* User Info Popover on Hover */}
                <div className="relative group flex items-center cursor-pointer shrink-0">
                  <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/20 flex items-center justify-center text-white font-black text-xs shadow-sm">
                    {userInitial}
                  </div>
                  
                  {/* Popover on Hover */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] flex flex-col pointer-events-none">
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{userDisplayName}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 capitalize">{role}</span>
                  </div>
                </div>

                {/* Notification Bell */}
                <div 
                    className="relative cursor-pointer flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 transition-colors shrink-0" 
                    title="Notifications" 
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <span className="material-symbols-outlined text-[22px]">notifications</span>
                  {upcomingAuctions > 0 && (
                    <span className="absolute top-1 right-1 flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-red-500"></span>
                    </span>
                  )}

                  {/* Notifications Dropdown */}
                  {notificationsOpen && (
                      <div className="absolute top-full right-0 mt-3 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
                          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                              <span className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Alerts</span>
                              {upcomingAuctions > 0 && (
                                  <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[9px] font-black px-2 py-0.5 rounded-full">{upcomingAuctions} New</span>
                              )}
                          </div>
                          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                              {upcomingAuctions > 0 && (
                                  <div 
                                      className="p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex gap-3"
                                      onClick={() => { setNotificationsOpen(false); navigate('/client/lists'); }}
                                  >
                                      <div className="mt-0.5 size-7 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                                          <span className="material-symbols-outlined text-[14px]">gavel</span>
                                      </div>
                                      <div>
                                          <p className="text-xs font-bold text-slate-800 dark:text-slate-250 mb-0.5 leading-tight">Upcoming Auctions</p>
                                          <p className="text-[9px] text-slate-500">You have {upcomingAuctions} properties in your My List that are going to auction within the next 7 days.</p>
                                      </div>
                                  </div>
                              )}
                              
                              {/* Static mocked notifications */}
                              <div className="p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex gap-3">
                                  <div className="mt-0.5 size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                                      <span className="material-symbols-outlined text-[14px]">task_alt</span>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-250 mb-0.5 leading-tight">BPO Mission Completed</p>
                                      <p className="text-[9px] text-slate-500">The field agent has submitted the report for 123 Main St. Review pending.</p>
                                  </div>
                              </div>
                              
                              <div className="p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer flex gap-3">
                                  <div className="mt-0.5 size-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                                      <span className="material-symbols-outlined text-[14px]">info</span>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-250 mb-0.5 leading-tight">Platform Update</p>
                                      <p className="text-[9px] text-slate-500">New analytics dashboard is now live.</p>
                                  </div>
                              </div>

                              {upcomingAuctions === 0 && (
                                  <div className="p-6 text-center text-slate-400">
                                      <span className="material-symbols-outlined text-2xl mb-1.5 opacity-50 block">notifications_paused</span>
                                      <p className="text-xs">No other notifications</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
                </div>

                {/* Mobile Menu Hamburger button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {mobileMenuOpen ? 'close' : 'menu'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1 animate-in slide-in-from-top duration-200">
              {navItems.map((item) => (
                <div key={item.label} className="py-1">
                  {item.dropdown ? (
                    <>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                        className="w-full flex items-center justify-between py-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        <span className="material-symbols-outlined text-[16px]">
                          {openDropdown === item.label ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      {openDropdown === item.label && (
                        <div className="pl-8 py-1 space-y-1">
                          {item.dropdown.map((dropItem) => (
                            <NavLink
                              key={dropItem.path}
                              to={dropItem.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={({ isActive }) =>
                                `block py-2 text-xs font-bold uppercase tracking-wider ${isActive
                                  ? 'text-blue-600 dark:text-blue-400 font-black'
                                  : 'text-slate-500 dark:text-slate-400'
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
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${isActive
                          ? 'text-blue-655 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400'
                        }`
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  )}
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-colors text-xs uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col min-w-0 overflow-hidden">
        <div className={`flex-1 bg-slate-50 dark:bg-slate-900 flex flex-col ${isWorkbenchWorkspace ? 'overflow-hidden' : 'overflow-auto'}`}>
          {isMainDashboard && (
            <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-12 mt-6 w-full shrink-0">
              <div className="glass-card p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-blue-500/25 bg-blue-50/50 dark:bg-blue-955/10 text-slate-800 dark:text-slate-100">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <span className="material-symbols-outlined text-[22px] animate-pulse">biotech</span>
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">Try our experimental core layouts</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Explore modern, high-performance dashboards with absolute visual control over maps, trends, and dossier widgets.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                  <Link
                    to="/client/workbench"
                    className="flex-1 md:flex-none text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9.5px] uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    V3 IDE Workbench
                  </Link>
                </div>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Verification Overlay */}
      {user && !user.is_verified && <VerificationBlock />}

      {/* Tour Guide Overlay */}
      <TourOverlay />

      {!hideHeader && <Footer />}
    </div>
  );
};

export default ClientLayout;
