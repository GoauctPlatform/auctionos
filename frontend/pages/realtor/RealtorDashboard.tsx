import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RealtorService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';
import api from '../../services/api';
import { API_URL, getHeaders } from '../../services/httpClient';
import { CircularProgress } from '@mui/material';
import { ExecuteTaskMission } from '../../components/property/ExecuteTaskMission';

interface ExportedProperty {
  export_id: number;
  property_id: number;
  address?: string;
  parcel_id?: string;
  county?: string;
  state?: string;
  assessed_value?: number;
  amount_due?: number;
  contact_name?: string;
  contact_phone?: string;
  exported_at?: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  task_type: string;
  status: string;
  address: string;
  reward_points: number;
  deadline?: string;
  claimed_at?: string;
  submitted_at?: string;
  approved_at?: string;
  parcel_id?: string;
  state?: string;
  county?: string;
  investor_name?: string;
}

interface Commission {
  id: number;
  points: number;
  usd_value?: number;
  type: string;
  status: string;
  description: string;
  created_at: string;
  task_title?: string;
}

const ConsultantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcomeModal, setShowWelcomeModal] = useState(searchParams.get('welcome') === 'true');
  const [profile, setProfile] = useState<any>(null);
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  
  // Data loading states
  const [recentExports, setRecentExports] = useState<ExportedProperty[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [earnings, setEarnings] = useState<any>({
    commissions: [],
    total_earned_points: 0,
    total_earned_usd: 0,
    withdrawn_points: 0,
    available_points: 0,
    available_usd: 0
  });

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const user = AuthService.getCurrentUser();
  const displayName = profile?.name || user?.full_name || user?.email?.split('@')[0] || 'Realtor';

  const loadDashboardData = async () => {
    try {
      setProfileLoading(true);
      // Load profile info
      const profileData = await RealtorService.getMe().catch(() => null);
      if (profileData) setProfile(profileData);
      setProfileLoading(false);

      setLoading(true);
      // Load recent exported properties
      const exportsRes = await fetch(`${API_URL}/realtor-tasks/exports?limit=6`, { headers: getHeaders() })
        .then(r => r.ok ? r.json() : { items: [] })
        .catch(() => ({ items: [] }));
      setRecentExports(exportsRes.items || []);

      // Parallel data fetching for premium responsiveness
      const [tasksRes, availRes, earningsRes] = await Promise.all([
        api.get('/realtor-tasks/my').catch(() => ({ data: [] })),
        api.get('/realtor-tasks/available?limit=1').catch(() => ({ data: [] })),
        api.get('/realtor-tasks/commissions').catch(() => ({
          data: {
            commissions: [],
            total_earned_points: 0,
            total_earned_usd: 0,
            withdrawn_points: 0,
            available_points: 0,
            available_usd: 0
          }
        }))
      ]);

      setMyTasks(tasksRes.data || []);
      setOpenTasksCount(Array.isArray(availRes.data) ? availRes.data.length : 0);
      setEarnings(earningsRes.data || {
        commissions: [],
        total_earned_points: 0,
        total_earned_usd: 0,
        withdrawn_points: 0,
        available_points: 0,
        available_usd: 0
      });
    } catch (err) {
      console.error("Failed to load realtor dashboard data:", err);
    } finally {
      setLoading(false);
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute tasks in progress
  const activeMissionsCount = myTasks.filter(t => t.status === 'claimed').length;
  const pendingReviewCount = myTasks.filter(t => t.status === 'submitted').length;
  const completedMissionsCount = myTasks.filter(t => t.status === 'approved').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Welcome Modal overlay */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-emerald-600 dark:text-emerald-400">handshake</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to GoAuct!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your Realtor Partner account is active. You can now claim due diligence tasks from investors, manage your portfolio, and track your commissions!
            </p>
            <button 
              onClick={() => {
                setShowWelcomeModal(false);
                setSearchParams({});
              }} 
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              Access Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Modern High-End Welcome Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_45%)]"></div>
        <div className="relative z-10 flex items-center gap-4 sm:gap-6">
          <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg shadow-emerald-500/10 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{displayName}</h1>
              {profile?.verification_status === 'verified' ? (
                <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">verified</span> Verified Partner
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">pending</span> Verification Pending
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Welcome back to your partner terminal. Coordinate investor outreach, research probate/tax listings, and monitor your commission flow instantly.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex gap-3 shrink-0">
          <button
            onClick={() => navigate('/realtor/profile')}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">manage_accounts</span>
            Edit Profile
          </button>
        </div>
      </div>

      {/* Grid of Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Exported Properties */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-emerald-500/40 transition-all cursor-pointer" onClick={() => navigate('/realtor/listings')}>
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exported Listings</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors">
              {loading ? <CircularProgress size={20} /> : recentExports.length}
            </div>
            <div className="text-[9px] font-semibold text-slate-400">Shared by investors</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined text-2xl">home_work</span>
          </div>
        </div>

        {/* KPI 2: Open Tasks */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-blue-500/40 transition-all cursor-pointer" onClick={() => navigate('/realtor/tasks')}>
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tasks In Progress</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">
              {loading ? <CircularProgress size={20} /> : (activeMissionsCount + pendingReviewCount)}
            </div>
            <div className="text-[9px] font-semibold text-slate-400">Active assignments</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500">
            <span className="material-symbols-outlined text-2xl">assignment</span>
          </div>
        </div>

        {/* KPI 3: Total Completed */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-emerald-500/40 transition-all cursor-pointer" onClick={() => navigate('/realtor/tasks?tab=mine')}>
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Approved</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors">
              {loading ? <CircularProgress size={20} /> : completedMissionsCount}
            </div>
            <div className="text-[9px] font-semibold text-slate-400">Payouts completed</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
        </div>

        {/* KPI 4: Commissions Wallet Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between group hover:border-emerald-500/40 transition-all cursor-pointer" onClick={() => navigate('/realtor/commissions')}>
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Earned Balance</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {loading ? <CircularProgress size={20} className="text-emerald-400" /> : `$${earnings.available_usd.toFixed(2)}`}
            </div>
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{earnings.available_points} Pts</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Workspace layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Exported Listings & active claims column (Left/Center - 2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recently Exported Properties */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">upload</span>
                  Recently Exported Listings
                </h2>
                <p className="text-xs text-slate-400 mt-1">Properties shared with you by investors for seller outreach and representation</p>
              </div>
              {recentExports.length > 0 && (
                <button
                  onClick={() => navigate('/realtor/listings')}
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  View All Listings <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recentExports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">home_work</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Shared Listings</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  Investors have not shared any properties with you yet. Once they add items to your outreach folder, they will populate here.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {recentExports.slice(0, 4).map((p) => (
                  <div
                    key={p.export_id}
                    onClick={() => navigate('/realtor/listings')}
                    className="group bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 hover:border-emerald-500/30 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                          Export #{p.export_id}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white mt-2 group-hover:text-emerald-500 transition-colors truncate">{p.address || p.parcel_id}</h3>
                      <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {p.county}, {p.state}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 flex items-center justify-between">
                      <div className="flex gap-2">
                        {p.assessed_value && (
                          <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/10 px-2 py-0.5 rounded-lg uppercase">
                            ARV: ${(p.assessed_value / 1000).toFixed(0)}k
                          </span>
                        )}
                        {p.amount_due && (
                          <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/10 px-2 py-0.5 rounded-lg uppercase">
                            Due: ${(p.amount_due / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-black text-emerald-500 group-hover:underline uppercase tracking-wider flex items-center gap-0.5">
                        Details <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Missions (Claims in Progress) */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">task_alt</span>
                  Active Due Diligence Claims
                </h2>
                <p className="text-xs text-slate-400 mt-1">Paid field research tasks you have claimed and committed to finish</p>
              </div>
              {(activeMissionsCount + pendingReviewCount) > 0 && (
                <button
                  onClick={() => navigate('/realtor/tasks?tab=mine')}
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  Manage Claims <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><CircularProgress size={30} className="text-emerald-500" /></div>
            ) : myTasks.filter(t => t.status === 'claimed' || t.status === 'submitted').length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">assignment_late</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Active Tasks</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  You are not currently executing any investor-assigned verification tasks. Check available local options to earn points!
                </p>
                <button
                  onClick={() => navigate('/realtor/tasks')}
                  className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 transition-colors"
                >
                  Browse Tasks
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myTasks.filter(t => t.status === 'claimed' || t.status === 'submitted').slice(0, 3).map((task) => {
                  const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                  const isSubmitted = task.status === 'submitted';

                  return (
                    <div 
                      key={task.id} 
                      className="group relative overflow-hidden bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 hover:border-emerald-500/30 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                              Task #{task.id}
                            </span>
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md ${
                              isSubmitted ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-slate-800 dark:text-white truncate max-w-sm sm:max-w-md">{task.title}</h3>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            {task.address}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payout</div>
                            <div className="text-base font-black text-emerald-500">${(task.reward_points / 100).toFixed(2)}</div>
                          </div>
                          
                          {isSubmitted ? (
                            <span className="px-3.5 py-2 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-bold text-[10px] uppercase rounded-xl">
                              Awaiting Review
                            </span>
                          ) : (
                            <button
                              onClick={() => setSubmitTask(task)}
                              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/10 transition-colors"
                            >
                              Submit Task
                            </button>
                          )}
                        </div>
                      </div>

                      {!isSubmitted && task.deadline && (
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span className="flex items-center gap-1 text-amber-500">
                            <span className="material-symbols-outlined text-[14px]">timer</span>
                            Expires: {deadlineStr}
                          </span>
                          <span className="italic">Claimed: {task.claimed_at ? new Date(task.claimed_at).toLocaleDateString() : ''}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Dynamic Activity/Commissions History and Payout info column (Right - 1/3 width) */}
        <div className="space-y-8">
          
          {/* Wallet Balance Card */}
          <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.15),transparent_40%)]"></div>
            
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 relative z-10">
              <span className="material-symbols-outlined text-emerald-500 text-lg">account_balance_wallet</span>
              Realtor Commission Wallet
            </h3>
            
            <div className="mt-6 relative z-10">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Balance</div>
              <div className="text-4xl font-black text-emerald-400 mt-1">${earnings.available_usd.toFixed(2)}</div>
              <p className="text-[10px] text-slate-400 mt-1 tracking-wider uppercase font-bold">{earnings.available_points} Points ready for withdrawal</p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-800 pt-5 relative z-10">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Total Payouts</span>
                <span className="text-sm font-black text-white">${earnings.total_earned_usd.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Withdrawn</span>
                <span className="text-sm font-black text-slate-300">${(earnings.withdrawn_points / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/realtor/commissions')}
              className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] relative z-10"
            >
              Request Withdrawal
            </button>
          </section>

          {/* Dynamic Commissions Activity Log */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-[18px]">receipt_long</span>
              Commission History
            </h2>

            {loading ? (
              <div className="flex justify-center py-6"><CircularProgress size={20} className="text-emerald-500" /></div>
            ) : !earnings.commissions || earnings.commissions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-[11px] italic">
                No financial history available yet.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {earnings.commissions.slice(0, 5).map((comm: Commission) => {
                  const dateStr = new Date(comm.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const isEarned = comm.type === 'earned';
                  const amount = (comm.points / 100).toFixed(2);

                  return (
                    <div 
                      key={comm.id} 
                      className="flex items-start justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl"
                    >
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-black text-slate-800 dark:text-white truncate max-w-[150px]">
                          {comm.task_title || comm.description}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          {dateStr} • <span className="uppercase font-bold">{comm.type}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-black shrink-0 ${isEarned ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isEarned ? `+$${amount}` : `-$${amount}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
        {/* Submit Task Modal */}
        {submitTask && (
          <ExecuteTaskMission 
            task={submitTask}
            onClose={() => setSubmitTask(null)}
            onSuccess={() => {
              setSubmitTask(null);
              loadDashboardData();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ConsultantDashboard;
