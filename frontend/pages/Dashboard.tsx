import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, getHeaders } from '../services/httpClient';
import { AuthService } from '../services/auth.service';
import { useLanguage } from "../context/LanguageContext";

interface AdminStats {
  total_properties: number;
  available_properties: number;
  total_auctions: number;
  active_auctions: number;
  deed_count: number;
  foreclosure_count: number;
  lien_count: number;
  trial_users: number;
  advanced_users: number;
  pro_users: number;
  enterprise_users: number;
  total_active_users: number;
}

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bg: string;
  sub?: string;
}> = ({ label, value, icon, color, bg, sub }) => (
  <div className={`relative overflow-hidden rounded-2xl glass-card p-6 shadow-sm flex flex-col gap-2 group hover:shadow-lg transition-all hover:-translate-y-1 duration-300`}>
    <div className={`absolute -right-4 -top-4 size-20 rounded-full opacity-20 group-hover:opacity-30 transition-opacity ${bg}`} />
    <div className={`flex items-center gap-2 ${color}`}>
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const QuickAction: React.FC<{ icon: string; label: string; desc: string; path: string; color: string }> = ({ icon, label, desc, path, color }) => {
    const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="flex items-center gap-4 p-4 rounded-xl glass-card hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all text-left group w-full hover:-translate-y-1 duration-300"
    >
      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-400 truncate">{desc}</p>
      </div>
      <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500 transition-colors">{t('Dashboard.chevronright')}</span>
    </button>
  );
};

export const Dashboard: React.FC = () => {
    const { t } = useLanguage();
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/stats`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setStats(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const firstName = (() => {
    // @ts-ignore
    const name = user?.full_name?.trim().split(' ')[0] || user?.email?.split('@')[0] || 'Admin';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  })();

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 py-8 px-4 sm:px-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t('Dashboard.welcome')}<span className="text-blue-600">{firstName}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {t('Dashboard.platformOverviewLive')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="material-symbols-outlined text-[16px]">{t('Dashboard.schedule')}</span>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <span className="material-symbols-outlined text-[20px]">{t('Dashboard.error')}</span>
          {error}
        </div>
      ) : stats && (
        <>
          {/* Properties Section */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-blue-500">{t('Dashboard.homework')}</span>
              {t('Dashboard.properties')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Properties" value={stats.total_properties} icon="real_estate_agent" color="text-blue-600 dark:text-blue-400" bg="bg-blue-500"
                sub="All properties in database" />
              <StatCard label="Available" value={stats.available_properties} icon="check_circle" color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500"
                sub="Active listings" />
              <StatCard
                label="Unavailable"
                value={stats.total_properties - stats.available_properties}
                icon="lock" color="text-slate-500 dark:text-slate-400" bg="bg-slate-400"
                sub="Past auction / inactive"
              />
              <StatCard
                label="Availability Rate"
                value={stats.total_properties > 0 ? `${Math.round((stats.available_properties / stats.total_properties) * 100)}%` : '—'}
                icon="analytics" color="text-purple-600 dark:text-purple-400" bg="bg-purple-500"
                sub="Available vs total"
              />
            </div>
          </div>

          {/* Auctions Section */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-500">{t('Dashboard.gavel')}</span>
              {t('Dashboard.auctions')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Total Auctions" value={stats.total_auctions} icon="gavel" color="text-amber-600 dark:text-amber-400" bg="bg-amber-500"
                sub="All-time in system" />
              <StatCard label="Active Now" value={stats.active_auctions} icon="bolt" color="text-orange-600 dark:text-orange-400" bg="bg-orange-500"
                sub="Currently live" />
              <StatCard label="Tax Deed" value={stats.deed_count} icon="description" color="text-blue-600 dark:text-blue-400" bg="bg-blue-500"
                sub="Deed auction events" />
              <StatCard label="Foreclosure" value={stats.foreclosure_count} icon="home" color="text-red-600 dark:text-red-400" bg="bg-red-500"
                sub="Foreclosure events" />
              <StatCard label="Tax Lien" value={stats.lien_count} icon="receipt_long" color="text-purple-600 dark:text-purple-400" bg="bg-purple-500"
                sub="Lien auction events" />
            </div>
          </div>

          {/* Users Section */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-500">{t('Dashboard.group')}</span>
              {t('Dashboard.activeUsersPaying')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Total Active" value={stats.total_active_users} icon="people" color="text-slate-600 dark:text-slate-300" bg="bg-slate-400"
                sub="All roles, active accounts" />
              <StatCard label="Trial" value={stats.trial_users} icon="hourglass_top" color="text-amber-600 dark:text-amber-400" bg="bg-amber-500"
                sub="Free trial accounts" />
              <StatCard label="Advanced" value={stats.advanced_users} icon="verified" color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500"
                sub="Advanced tier subscribers" />
              <StatCard label="Pro" value={stats.pro_users} icon="workspace_premium" color="text-blue-600 dark:text-blue-400" bg="bg-blue-500"
                sub="$130/mo subscribers" />
              <StatCard label="Enterprise" value={stats.enterprise_users} icon="diamond" color="text-purple-600 dark:text-purple-400" bg="bg-purple-500"
                sub="$350/mo subscribers" />
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400">{t('Dashboard.bolt')}</span>
              {t('Dashboard.quickActions')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickAction icon="gavel" label="Auctions Dashboard" desc="Monitor live auction events" path="/admin/auctions" color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" />
              <QuickAction icon="real_estate_agent" label="Property Manager" desc="Browse and manage properties" path="/admin/properties" color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
              <QuickAction icon="group" label="User Management" desc="Manage platform accounts" path="/admin/users" color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" />
              <QuickAction icon="campaign" label="System Broadcasts" desc="Send announcements to clients" path="/admin/broadcasts" color="bg-purple-100 dark:bg-purple-900/30 text-purple-600" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};