import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { CircularProgress } from '@mui/material';

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

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcomeModal, setShowWelcomeModal] = useState(searchParams.get('welcome') === 'true');
  const [profile, setProfile] = useState<any>(null);
  
  // Data loading states
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [earnings, setEarnings] = useState<any>({
    commissions: [],
    total_earned_points: 0,
    total_earned_usd: 0,
    withdrawn_points: 0,
    available_points: 0,
    available_usd: 0
  });

  const [loading, setLoading] = useState(true);
  const user = AuthService.getCurrentUser();
  const displayName = profile?.full_name || user?.full_name || 'Field Agent';

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch profile details
      const profileData = await AuthService.getMe().catch(() => null);
      if (profileData) setProfile(profileData);

      // Parallel data fetching for premium responsiveness
      const [tasksRes, availRes, earningsRes] = await Promise.all([
        api.get('/realtor-tasks/my').catch(() => ({ data: [] })),
        api.get('/realtor-tasks/available?limit=5').catch(() => ({ data: [] })),
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
      setAvailableTasks(availRes.data || []);
      setEarnings(earningsRes.data || {
        commissions: [],
        total_earned_points: 0,
        total_earned_usd: 0,
        withdrawn_points: 0,
        available_points: 0,
        available_usd: 0
      });
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute metric counts
  const activeMissionsCount = myTasks.filter(t => t.status === 'claimed').length;
  const pendingReviewCount = myTasks.filter(t => t.status === 'submitted').length;
  const completedMissionsCount = myTasks.filter(t => t.status === 'approved').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Welcome Modal overlay */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-orange-600 dark:text-orange-400">directions_car</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome, Partner!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your certified Field Agent account is fully active. Start browsing available properties, claim missions, capture verified media, and withdraw your payouts!
            </p>
            <button 
              onClick={() => {
                setShowWelcomeModal(false);
                setSearchParams({});
              }} 
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
            >
              Access Command Center
            </button>
          </div>
        </div>
      )}

      {/* Modern High-End Welcome Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-orange-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_45%)]"></div>
        <div className="relative z-10 flex items-center gap-4 sm:gap-6">
          <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg shadow-orange-500/10 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{displayName}</h1>
              <span className="px-2.5 py-0.5 text-[9px] font-black tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">verified</span> Verified Field Agent
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Welcome to the Command Center. Manage your active claims, view local valuation and photos assignments, and track your pending and paid commissions in real-time.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex gap-3 shrink-0">
          <button
            onClick={() => navigate('/agent/tasks')}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">explore</span>
            Find Local Missions
          </button>
        </div>
      </div>

      {/* Grid of Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Claims */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-orange-500/40 transition-all cursor-pointer" onClick={() => navigate('/agent/tasks?tab=mine')}>
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Progress</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white group-hover:text-orange-500 transition-colors">
              {loading ? <CircularProgress size={20} /> : activeMissionsCount}
            </div>
            <div className="text-[9px] font-semibold text-slate-400">Claimed & working</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500">
            <span className="material-symbols-outlined text-2xl">schedule</span>
          </div>
        </div>

        {/* KPI 2: Pending Review */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-purple-500/40 transition-all cursor-pointer" onClick={() => navigate('/agent/tasks?tab=mine')}>
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white group-hover:text-purple-500 transition-colors">
              {loading ? <CircularProgress size={20} /> : pendingReviewCount}
            </div>
            <div className="text-[9px] font-semibold text-slate-400">Awaiting approval</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center text-purple-500">
            <span className="material-symbols-outlined text-2xl">publish</span>
          </div>
        </div>

        {/* KPI 3: Total Completed */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-emerald-500/40 transition-all cursor-pointer" onClick={() => navigate('/agent/tasks?tab=mine')}>
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

        {/* KPI 4: Available Wallet Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between group hover:border-amber-500/40 transition-all cursor-pointer" onClick={() => navigate('/agent/withdraw')}>
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">Wallet Balance</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {loading ? <CircularProgress size={20} className="text-emerald-400" /> : `$${earnings.available_usd.toFixed(2)}`}
            </div>
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{earnings.available_points} Pts</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Workspace layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active claims and available tasks column (Left/Center - 2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Missions (Claims in Progress) */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500">directions_car</span>
                  Your Active Claims
                </h2>
                <p className="text-xs text-slate-400 mt-1">Assignments you are currently committed to finish</p>
              </div>
              {myTasks.filter(t => t.status === 'claimed' || t.status === 'submitted').length > 0 && (
                <button
                  onClick={() => navigate('/agent/tasks?tab=mine')}
                  className="text-[10px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  Manage All <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><CircularProgress size={30} className="text-orange-500" /></div>
            ) : myTasks.filter(t => t.status === 'claimed' || t.status === 'submitted').length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">assignment_late</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Active Missions</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  You are not currently working on any property tasks. Find open tasks nearby to claim and start earning!
                </p>
                <button
                  onClick={() => navigate('/agent/tasks')}
                  className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/10 transition-colors"
                >
                  Browse Available Tasks
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
                      className="group relative overflow-hidden bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 hover:border-orange-500/30 transition-all duration-300"
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
                              onClick={() => navigate(`/agent/tasks?tab=mine`)}
                              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/10 transition-colors"
                            >
                              Execute Mission
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

          {/* Premium Opportunities Section */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500">trending_up</span>
                  High-Value Open Opportunities
                </h2>
                <p className="text-xs text-slate-400 mt-1">Claim high payout missions available in your region</p>
              </div>
              <button
                onClick={() => navigate('/agent/tasks')}
                className="text-[10px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                View All Missions <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><CircularProgress size={30} className="text-orange-500" /></div>
            ) : availableTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">info</span>
                <p className="text-xs font-bold text-slate-400">No open assignments</p>
                <p className="text-[10px] text-slate-400 mt-1">Check back later for new local research options.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {availableTasks.slice(0, 4).map((task) => (
                  <div 
                    key={task.id} 
                    className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between hover:border-orange-500/20 hover:shadow-md transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md">
                          Task #{task.id}
                        </span>
                        <span className="text-[11px] font-black text-emerald-500">${(task.reward_points / 100).toFixed(2)}</span>
                      </div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white mt-2 group-hover:text-orange-500 transition-colors line-clamp-1">{task.title}</h3>
                      <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                        {task.address || `${task.county}, ${task.state}`}
                      </p>
                    </div>
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{task.task_type}</span>
                      <button
                        onClick={() => navigate('/agent/tasks')}
                        className="text-[9px] font-black text-orange-500 group-hover:underline uppercase tracking-wider flex items-center gap-0.5"
                      >
                        Claim <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Dynamic Activity/Commissions History and Agent Info column (Right - 1/3 width) */}
        <div className="space-y-8">
          
          {/* Withdrawal & Points Wallet card */}
          <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.15),transparent_40%)]"></div>
            
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 relative z-10">
              <span className="material-symbols-outlined text-orange-500 text-lg">account_balance_wallet</span>
              Earnings command
            </h3>
            
            <div className="mt-6 relative z-10">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Balance</div>
              <div className="text-4xl font-black text-emerald-400 mt-1">${earnings.available_usd.toFixed(2)}</div>
              <p className="text-[10px] text-slate-400 mt-1 tracking-wider uppercase font-bold">{earnings.available_points} Points ready for payout</p>
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
              onClick={() => navigate('/agent/withdraw')}
              className="mt-6 w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] relative z-10"
            >
              Request Withdrawal
            </button>
          </section>

          {/* Dynamic Commissions Activity Log */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500 text-[18px]">receipt_long</span>
              Earnings History
            </h2>

            {loading ? (
              <div className="flex justify-center py-6"><CircularProgress size={20} className="text-orange-500" /></div>
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
      </div>
    </div>
  );
};

export default AgentDashboard;
