import React, { useState, useEffect } from 'react';
import { API_URL, getHeaders } from '../../services/httpClient';
import { useLanguage } from "../../context/LanguageContext";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'update';
  is_active: boolean;
  created_at: string;
}

interface CommunityUpdate {
  id: number;
  date: string;
  tag: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  info:    { label: 'Info',    color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',   icon: 'info' },
  warning: { label: 'Warning', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800', icon: 'warning' },
  success: { label: 'Success', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', icon: 'check_circle' },
  update:  { label: 'Update',  color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800', icon: 'new_releases' },
};

const TAG_COLORS: Record<string, string> = {
  'Market Update': 'bg-blue-100 text-blue-850 dark:bg-blue-900/30 dark:text-blue-300',
  'System Note': 'bg-purple-100 text-purple-850 dark:bg-purple-900/30 dark:text-purple-300',
  'Strategy': 'bg-emerald-100 text-emerald-850 dark:bg-emerald-900/30 dark:text-emerald-300',
  'General': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const EMPTY_FORM = { title: '', message: '', type: 'info' as const };
const EMPTY_COMM_FORM = { date: '', tag: 'Market Update', title: '', content: '', author: '' };

const AdminBroadcasts: React.FC = () => {
    const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'announcements' | 'community'>('announcements');

  // Announcements States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  // Community updates States
  const [communityUpdates, setCommunityUpdates] = useState<CommunityUpdate[]>([]);
  const [commLoading, setCommLoading] = useState(false);
  const [commSaving, setCommSaving] = useState(false);
  const [commDeletingId, setCommDeletingId] = useState<number | null>(null);
  const [commForm, setCommForm] = useState(EMPTY_COMM_FORM);
  const [commError, setCommError] = useState('');

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/announcements/all`, { headers: getHeaders() });
      if (res.ok) setAnnouncements(await res.json());
    } catch { } finally { setLoading(false); }
  };

  const loadCommunity = async () => {
    setCommLoading(true);
    try {
      const res = await fetch(`${API_URL}/community/`, { headers: getHeaders() });
      if (res.ok) setCommunityUpdates(await res.json());
    } catch { } finally { setCommLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'announcements') {
      loadAnnouncements();
    } else {
      loadCommunity();
    }
  }, [activeTab]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) { setError('Title and message are required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/admin/announcements/`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
      setForm(EMPTY_FORM);
      await loadAnnouncements();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleCreateCommunityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commForm.title.trim() || !commForm.content.trim()) { setCommError('Title and content are required.'); return; }
    setCommSaving(true); setCommError('');
    try {
      const res = await fetch(`${API_URL}/community/`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify(commForm)
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
      setCommForm(EMPTY_COMM_FORM);
      await loadCommunity();
    } catch (err: any) { setCommError(err.message); }
    finally { setCommSaving(false); }
  };

  const handleToggleAnnouncement = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await fetch(`${API_URL}/admin/announcements/${id}/toggle`, { method: 'PATCH', headers: getHeaders() });
      if (res.ok) await loadAnnouncements();
    } catch { } finally { setTogglingId(null); }
  };

  const handleDeleteAnnouncement = async (id: number, title: string) => {
    if (!window.confirm(`Delete announcement "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await fetch(`${API_URL}/admin/announcements/${id}`, { method: 'DELETE', headers: getHeaders() });
      await loadAnnouncements();
    } catch { } finally { setDeletingId(null); }
  };

  const handleDeleteCommunityUpdate = async (id: number, title: string) => {
    if (!window.confirm(`Delete news post "${title}"? This cannot be undone.`)) return;
    setCommDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/community/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) await loadCommunity();
    } catch { } finally { setCommDeletingId(null); }
  };

  const activeCount = announcements.filter(a => a.is_active).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">{t('AdminBroadcasts.campaign')}</span>
            {t('AdminBroadcasts.communicationCenter')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {t('AdminBroadcasts.publishAnnouncements')}</p>
        </div>
        {activeTab === 'announcements' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full w-fit">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">{t('AdminBroadcasts.campaign')}</span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{activeCount} {t('AdminBroadcasts.active')}</span>
          </div>
        )}
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'announcements'
              ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-750'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{t('AdminBroadcasts.notifications')}</span>
          {t('AdminBroadcasts.systemAnnouncements')}</button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'community'
              ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-750'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{t('AdminBroadcasts.forum')}</span>
          {t('AdminBroadcasts.communityStrategyUpd')}</button>
      </div>

      {activeTab === 'announcements' ? (
        <>
          {/* Create Announcement Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500 text-[20px]">{t('AdminBroadcasts.addcircle')}</span>
              {t('AdminBroadcasts.newAnnouncement')}</h2>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.title')}</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Platform Maintenance on May 20th"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.type')}</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.message')}</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  placeholder="Describe the announcement in detail. This is what clients will see on their dashboard..."
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm">
                  <span className="material-symbols-outlined text-[18px]">{t('AdminBroadcasts.error')}</span>{error}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving
                    ? <><span className="material-symbols-outlined animate-spin text-[18px]">{t('AdminBroadcasts.progressactivity')}</span> {t('AdminBroadcasts.publishing')}</>
                    : <><span className="material-symbols-outlined text-[18px]">{t('AdminBroadcasts.send')}</span> {t('AdminBroadcasts.publishAnnouncement')}</>
                  }
                </button>
              </div>
            </form>
          </div>

          {/* Announcements List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('AdminBroadcasts.allAnnouncements')}</h2>
              <span className="text-xs text-slate-400 font-medium">{announcements.length} {t('AdminBroadcasts.total')}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-slate-400 text-[32px]">{t('AdminBroadcasts.progressactivity')}</span>
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">{t('AdminBroadcasts.campaign')}</span>
                <p className="font-medium">{t('AdminBroadcasts.noAnnouncementsYet')}</p>
                <p className="text-sm mt-1">{t('AdminBroadcasts.createOneAboveToStar')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {announcements.map(ann => {
                  const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
                  return (
                    <div key={ann.id} className="p-5 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${cfg.bg}`}>
                        <span className={`material-symbols-outlined text-[18px] ${cfg.color}`}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{ann.title}</p>
                          <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm text-slate-505 dark:text-slate-400 line-clamp-2 leading-relaxed">{ann.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">{new Date(ann.created_at).toLocaleString()}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAnnouncement(ann.id)}
                          disabled={togglingId === ann.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            ann.is_active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700'
                          } disabled:opacity-50`}
                        >
                          {togglingId === ann.id
                            ? <span className="material-symbols-outlined animate-spin text-[14px]">{t('AdminBroadcasts.progressactivity')}</span>
                            : <span className="material-symbols-outlined text-[14px]">{ann.is_active ? 'toggle_on' : 'toggle_off'}</span>
                          }
                          {ann.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                          disabled={deletingId === ann.id}
                          className="p-1.5 text-red-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === ann.id
                            ? <span className="material-symbols-outlined animate-spin text-[18px]">{t('AdminBroadcasts.progressactivity')}</span>
                            : <span className="material-symbols-outlined text-[18px]">{t('AdminBroadcasts.delete')}</span>
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Create Community Update Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500 text-[20px]">{t('AdminBroadcasts.postadd')}</span>
              {t('AdminBroadcasts.publishStrategyUpdat')}</h2>
            <form onSubmit={handleCreateCommunityUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.articleTitle')}</label>
                  <input
                    type="text"
                    value={commForm.title}
                    onChange={e => setCommForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Navigating Marion County Commissioner Sales"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.categoryTag')}</label>
                  <select
                    value={commForm.tag}
                    onChange={e => setCommForm(p => ({ ...p, tag: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Market Update">{t('AdminBroadcasts.marketUpdate')}</option>
                    <option value="System Note">{t('AdminBroadcasts.systemNote')}</option>
                    <option value="Strategy">{t('AdminBroadcasts.strategy')}</option>
                    <option value="General">{t('AdminBroadcasts.general')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.customDateOptional')}</label>
                  <input
                    type="text"
                    value={commForm.date}
                    onChange={e => setCommForm(p => ({ ...p, date: e.target.value }))}
                    placeholder="e.g. May 25, 2026 (Leave blank for today)"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.authorOptional')}</label>
                  <input
                    type="text"
                    value={commForm.author}
                    onChange={e => setCommForm(p => ({ ...p, author: e.target.value }))}
                    placeholder="e.g. GoAuct Investment Team"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('AdminBroadcasts.contentBody')}</label>
                <textarea
                  value={commForm.content}
                  onChange={e => setCommForm(p => ({ ...p, content: e.target.value }))}
                  rows={4}
                  placeholder="Draft your strategy article, market study, or county alert details here..."
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                />
              </div>
              {commError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm">
                  <span className="material-symbols-outlined text-[18px]">{t('AdminBroadcasts.error')}</span>{commError}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={commSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
                >
                  {commSaving
                    ? <><span className="material-symbols-outlined animate-spin text-[18px]">{t('AdminBroadcasts.progressactivity')}</span> {t('AdminBroadcasts.publishing')}</>
                    : <><span className="material-symbols-outlined text-[18px]">{t('AdminBroadcasts.campaign')}</span> {t('AdminBroadcasts.postArticle')}</>
                  }
                </button>
              </div>
            </form>
          </div>

          {/* Community Updates Feed List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('AdminBroadcasts.strategyFeedArticles')}</h2>
              <span className="text-xs text-slate-400 font-medium">{communityUpdates.length} {t('AdminBroadcasts.articles')}</span>
            </div>

            {commLoading ? (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-slate-400 text-[32px]">{t('AdminBroadcasts.progressactivity')}</span>
              </div>
            ) : communityUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">{t('AdminBroadcasts.forum')}</span>
                <p className="font-medium">{t('AdminBroadcasts.noCommunityArticlesP')}</p>
                <p className="text-sm mt-1">{t('AdminBroadcasts.submitYourFirstAnaly')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {communityUpdates.map(comm => {
                  const tagColor = TAG_COLORS[comm.tag] || TAG_COLORS.General;
                  return (
                    <div key={comm.id} className="p-6 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tagColor}`}>{comm.tag}</span>
                          <span className="text-xs text-slate-400 font-semibold">{comm.date}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-1.5">{comm.title}</h3>
                        <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed line-clamp-3">{comm.content}</p>
                        <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          <span className="material-symbols-outlined text-[12px]">{t('AdminBroadcasts.person')}</span>
                          {comm.author}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCommunityUpdate(comm.id, comm.title)}
                        disabled={commDeletingId === comm.id}
                        className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 shrink-0 self-center"
                      >
                        {commDeletingId === comm.id
                          ? <span className="material-symbols-outlined animate-spin text-[18px]">{t('AdminBroadcasts.progressactivity')}</span>
                          : <span className="material-symbols-outlined text-[18px]">{t('AdminBroadcasts.delete')}</span>
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminBroadcasts;
