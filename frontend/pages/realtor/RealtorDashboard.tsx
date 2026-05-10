import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RealtorService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';
import { API_URL, getHeaders } from '../../services/httpClient';

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

const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string; bg: string }> = ({ icon, label, value, color, bg }) => (
  <div className={`flex items-center gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 ${bg}`}>
    <span className={`material-symbols-outlined text-[28px] ${color}`}>{icon}</span>
    <div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  </div>
);

const ConsultantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcomeModal, setShowWelcomeModal] = useState(searchParams.get('welcome') === 'true');
  const [profile, setProfile] = useState<any>(null);
  const [recentExports, setRecentExports] = useState<ExportedProperty[]>([]);
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const user = AuthService.getCurrentUser();
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Realtor';

  useEffect(() => {
    RealtorService.getMe()
      .then(data => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));

    // Load recent exported properties (visible to realtor)
    fetch(`${API_URL}/realtor-tasks/exports?limit=6`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setRecentExports(data.items || []))
      .catch(() => setRecentExports([]))
      .finally(() => setLoading(false));

    // Load open tasks count
    fetch(`${API_URL}/realtor-tasks/available?limit=1`, { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setOpenTasksCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setOpenTasksCount(0));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 relative">

      {/* Welcome Modal overlay */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome, <span className="text-emerald-600">{displayName}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your realtor partner dashboard.
            {profile && profile.verification_status === 'pending' && (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase">
                Verification Pending
              </span>
            )}
            {profile && profile.verification_status === 'verified' && (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">
                ✓ Verified Partner
              </span>
            )}
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="home_work" label="Exported Properties" value={recentExports.length} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard icon="task_alt" label="Open Tasks" value={openTasksCount} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard icon="payments" label="Commission Model" value={profile?.commission_model || '—'} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
        <StatCard icon="verified" label="Status" value={profile?.verification_status || 'Pending'} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      {/* Profile Card */}
      {!profileLoading && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-2xl shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{profile?.name || displayName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.email || user?.email}</p>
            {profile?.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{profile.phone}</p>}
          </div>
          <button
            onClick={() => navigate('/realtor/profile')}
            className="px-4 py-2 text-sm font-bold border border-emerald-400 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* Recent Exported Properties */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">upload</span>
              Recently Exported Properties
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Properties investors have shared with you for outreach and partnership</p>
          </div>
          <button
            onClick={() => navigate('/realtor/listings')}
            className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentExports.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 text-sm gap-1">
            <span className="material-symbols-outlined text-[32px] opacity-50">home_search</span>
            No properties exported yet. Investors will share properties here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentExports.map(p => (
              <div
                key={p.export_id}
                onClick={() => navigate('/realtor/listings')}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:border-emerald-400/50 hover:shadow-md transition-all cursor-pointer"
              >
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{p.address || p.parcel_id}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase font-bold tracking-widest">{p.county}, {p.state}</p>

                <div className="mt-3 flex gap-2 flex-wrap">
                  {p.assessed_value && (
                    <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
                      ARV: ${Number(p.assessed_value).toLocaleString()}
                    </span>
                  )}
                  {p.amount_due && (
                    <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg">
                      Due: ${Number(p.amount_due).toLocaleString()}
                    </span>
                  )}
                </div>

                {p.contact_name && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    <span className="truncate">{p.contact_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tasks Placeholder */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-blue-500">task_alt</span>
          Paid Tasks (Due Diligence & Field Research)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Complete field tasks assigned by investors and earn compensation. Tasks include property visits, photo verification, and due diligence reports.
        </p>
        <button
          onClick={() => navigate('/realtor/tasks')}
          className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          View Available Tasks →
        </button>
      </section>
    </div>
  );
};

export default ConsultantDashboard;
