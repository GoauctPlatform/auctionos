import React, { useState, useEffect } from 'react';
import { API_URL, getHeaders } from '../../services/httpClient';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'update';
  is_active: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  info:    { label: 'Info',    color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',   icon: 'info' },
  warning: { label: 'Warning', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800', icon: 'warning' },
  success: { label: 'Success', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', icon: 'check_circle' },
  update:  { label: 'Update',  color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800', icon: 'new_releases' },
};

const EMPTY_FORM = { title: '', message: '', type: 'info' as const };

const AdminBroadcasts: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/announcements/all`, { headers: getHeaders() });
      if (res.ok) setAnnouncements(await res.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
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
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await fetch(`${API_URL}/admin/announcements/${id}/toggle`, { method: 'PATCH', headers: getHeaders() });
      if (res.ok) await load();
    } catch { } finally { setTogglingId(null); }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete announcement "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await fetch(`${API_URL}/admin/announcements/${id}`, { method: 'DELETE', headers: getHeaders() });
      await load();
    } catch { } finally { setDeletingId(null); }
  };

  const activeCount = announcements.filter(a => a.is_active).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">System Broadcasts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Create and manage announcements shown on the Client Portal dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full">
          <span className="material-symbols-outlined text-emerald-500 text-[16px]">campaign</span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{activeCount} Active</span>
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-500 text-[20px]">add_circle</span>
          New Announcement
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Platform Maintenance on May 20th"
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
            <textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              rows={3}
              placeholder="Describe the announcement in detail. This is what clients will see on their dashboard..."
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>{error}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {saving
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Publishing...</>
                : <><span className="material-symbols-outlined text-[18px]">send</span> Publish Announcement</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* Announcements List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">All Announcements</h2>
          <span className="text-xs text-slate-400 font-medium">{announcements.length} total</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-slate-400 text-[32px]">progress_activity</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">campaign</span>
            <p className="font-medium">No announcements yet.</p>
            <p className="text-sm mt-1">Create one above to start communicating with your users.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {announcements.map(ann => {
              const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
              return (
                <div key={ann.id} className="p-5 flex items-start gap-4">
                  {/* Type Badge */}
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${cfg.bg}`}>
                    <span className={`material-symbols-outlined text-[18px] ${cfg.color}`}>{cfg.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{ann.title}</p>
                      <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{ann.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">{new Date(ann.created_at).toLocaleString()}</p>
                  </div>

                  {/* Controls */}
                  <div className="shrink-0 flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggle(ann.id)}
                      disabled={togglingId === ann.id}
                      title={ann.is_active ? 'Click to deactivate' : 'Click to activate'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        ann.is_active
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600'
                      } disabled:opacity-50`}
                    >
                      {togglingId === ann.id
                        ? <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                        : <span className="material-symbols-outlined text-[14px]">{ann.is_active ? 'toggle_on' : 'toggle_off'}</span>
                      }
                      {ann.is_active ? 'Active' : 'Inactive'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(ann.id, ann.title)}
                      disabled={deletingId === ann.id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === ann.id
                        ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        : <span className="material-symbols-outlined text-[18px]">delete</span>
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBroadcasts;
