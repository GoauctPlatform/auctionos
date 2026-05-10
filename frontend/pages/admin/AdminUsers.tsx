import React, { useEffect, useState, useMemo } from 'react';
import { UserService } from '../../services/user.service';
import { CircularProgress } from '@mui/material';
import { API_URL, getHeaders } from '../../services/httpClient';

type UserRole = 'client' | 'admin' | 'superuser' | 'agent' | 'realtor';

interface AdminUser {
    id: number;
    email: string;
    full_name?: string;
    role: UserRole;
    is_active: boolean;
    created_at?: string;
}

interface ActivityLog {
    id: number;
    created_at: string;
    action: string;
    resource?: string;
    ip_address?: string;
    user?: { email: string; full_name?: string };
}

interface ConsultantApplication {
    id: number;
    name: string;
    email: string;
    phone?: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    commission_model?: string;
    created_at?: string;
    user_email?: string;
}

const ROLE_OPTIONS: UserRole[] = ['client', 'realtor', 'agent', 'admin', 'superuser'];

const roleBadge = (role: string) => {
    const map: Record<string, string> = {
        superuser: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        agent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        client: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
    };
    return map[role] || map.client;
};

const UserEditModal: React.FC<{
    user: AdminUser;
    onClose: () => void;
    onSave: () => void;
}> = ({ user, onClose, onSave }) => {
    const [role, setRole] = useState<UserRole>(user.role);
    const [isActive, setIsActive] = useState(user.is_active);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await UserService.update(user.id, { role, is_active: isActive });
            onSave();
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-blue-950/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit User Access</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Role */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Role / Permission Level
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {ROLE_OPTIONS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                                        role === r
                                            ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Account Status
                        </label>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                isActive
                                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                                    : 'border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`size-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                <span className={`font-bold text-sm ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                                    {isActive ? 'Active' : 'Inactive / Suspended'}
                                </span>
                            </div>
                            <span className="material-symbols-outlined text-[18px] text-slate-400">
                                {isActive ? 'toggle_on' : 'toggle_off'}
                            </span>
                        </button>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                        {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [realtors, setConsultants] = useState<ConsultantApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'users' | 'logs' | 'realtors'>('users');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [logSearch, setLogSearch] = useState('');
    const [consultantFilter, setConsultantFilter] = useState<string>('pending');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'users') {
                const data = await UserService.getUsers();
                setUsers(data as AdminUser[]);
            } else if (tab === 'logs') {
                const data = await UserService.getAllLogs();
                setLogs(data);
            } else if (tab === 'realtors') {
                const res = await fetch(`${API_URL}/admin/realtors?status=${consultantFilter}&limit=100`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setConsultants(data.items || []);
                }
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (id: number, status: 'verified' | 'rejected') => {
        setActionLoading(id);
        try {
            await fetch(`${API_URL}/admin/realtors/${id}/verify`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status }),
            });
            loadData();
        } catch {}
        finally { setActionLoading(null); }
    };

    const handleDeleteConsultant = async (id: number) => {
        if (!window.confirm('Delete this application?')) return;
        setActionLoading(id);
        try {
            await fetch(`${API_URL}/admin/realtors/${id}`, { method: 'DELETE', headers: getHeaders() });
            loadData();
        } catch {}
        finally { setActionLoading(null); }
    };

    useEffect(() => { loadData(); }, [tab, consultantFilter]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const q = search.toLowerCase();
            const matchSearch = !q || u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
            const matchRole = !roleFilter || u.role === roleFilter;
            const matchStatus = !statusFilter
                || (statusFilter === 'active' && u.is_active)
                || (statusFilter === 'inactive' && !u.is_active);
            return matchSearch && matchRole && matchStatus;
        });
    }, [users, search, roleFilter, statusFilter]);

    const filteredLogs = useMemo(() => {
        const q = logSearch.toLowerCase();
        return logs.filter(l =>
            !q
            || (l.user?.email || '').toLowerCase().includes(q)
            || (l.action || '').toLowerCase().includes(q)
            || (l.resource || '').toLowerCase().includes(q)
        );
    }, [logs, logSearch]);

    const stats = useMemo(() => ({
        total: users.length,
        active: users.filter(u => u.is_active).length,
        admins: users.filter(u => u.role === 'admin' || u.role === 'superuser').length,
        clients: users.filter(u => u.role === 'client').length,
    }), [users]);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col gap-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[28px]">admin_panel_settings</span>
                        Access Control Center
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage user roles, permissions, and activity across the platform.</p>
                </div>
            </div>

            {/* Stats Cards */}
            {tab === 'users' && !loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Users', value: stats.total, icon: 'group', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Active', value: stats.active, icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'Admins', value: stats.admins, icon: 'shield', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                        { label: 'Clients', value: stats.clients, icon: 'person', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/50' },
                    ].map(s => (
                        <div key={s.label} className={`flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 ${s.bg}`}>
                            <span className={`material-symbols-outlined text-[24px] ${s.color}`}>{s.icon}</span>
                            <div>
                                <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
                {[
                    { key: 'users', icon: 'manage_accounts', label: 'Users & Roles' },
                    { key: 'realtors', icon: 'handshake', label: 'Realtor Apps', badge: realtors.filter(c => c.verification_status === 'pending').length },
                    { key: 'logs', icon: 'history', label: 'Activity Logs' },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            tab === t.key
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                        {t.label}
                        {t.badge ? (
                            <span className="ml-1 size-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">{t.badge}</span>
                        ) : null}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <CircularProgress size={32} />
                </div>
            ) : tab === 'realtors' ? (
                <>
                    {/* Realtor Filter */}
                    <div className="flex gap-2 flex-wrap">
                        {['pending', 'verified', 'rejected', ''].map(s => (
                            <button
                                key={s || 'all'}
                                onClick={() => setConsultantFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                                    consultantFilter === s
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Email</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Applied</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {realtors.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">{c.name}</div>
                                                {c.user_email && <div className="text-[10px] text-slate-400">Account: {c.user_email}</div>}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{c.email}</td>
                                            <td className="px-5 py-3 text-sm text-slate-500">{c.phone || '—'}</td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                                    c.verification_status === 'verified'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : c.verification_status === 'rejected'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>{c.verification_status}</span>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-slate-400">
                                                {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex gap-1.5">
                                                    {c.verification_status !== 'verified' && (
                                                        <button
                                                            onClick={() => handleVerify(c.id, 'verified')}
                                                            disabled={actionLoading === c.id}
                                                            className="px-3 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors disabled:opacity-60"
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                    )}
                                                    {c.verification_status !== 'rejected' && (
                                                        <button
                                                            onClick={() => handleVerify(c.id, 'rejected')}
                                                            disabled={actionLoading === c.id}
                                                            className="px-3 py-1 text-[10px] font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors disabled:opacity-60"
                                                        >
                                                            ✗ Reject
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteConsultant(c.id)}
                                                        disabled={actionLoading === c.id}
                                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-60"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {realtors.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-16 text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">handshake</span>
                                                No realtor applications found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : tab === 'users' ? (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or email…"
                                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary min-w-[130px]"
                        >
                            <option value="">All Roles</option>
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary min-w-[130px]"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <div className="text-xs font-bold text-slate-400 self-center">
                            {filteredUsers.length} of {users.length} users
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                                                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                            {u.full_name || <span className="text-slate-400 italic">No name</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${roleBadge(u.role)}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`size-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                    <span className={`text-xs font-bold ${u.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                        {u.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <button
                                                    onClick={() => setEditingUser(u)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                                    Edit Access
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">manage_search</span>
                                                No users match your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Log Search */}
                    <div className="relative max-w-sm">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                        <input
                            type="text"
                            value={logSearch}
                            onChange={e => setLogSearch(e.target.value)}
                            placeholder="Filter logs by user, action…"
                            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Logs Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Resource</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">IP Addr</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    {log.user?.full_name || log.user?.email || <span className="text-slate-400 italic">System</span>}
                                                </div>
                                                {log.user?.full_name && (
                                                    <div className="text-[10px] text-slate-400">{log.user.email}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                                                {log.resource || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                                                {log.ip_address || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">history_toggle_off</span>
                                                No activity logs found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={loadData}
                />
            )}
        </div>
    );
};

export default AdminUsers;
