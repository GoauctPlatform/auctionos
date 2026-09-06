import React, { useEffect, useState, useMemo } from 'react';
import { UserService } from '../../services/user.service';
import { CircularProgress } from '@mui/material';
import { API_URL, getHeaders } from '../../services/httpClient';
import { useLanguage } from "../../context/LanguageContext";

type UserRole = 'client' | 'admin' | 'superuser' | 'agent' | 'realtor';

interface AdminUser {
    id: number;
    email: string;
    full_name?: string;
    role: UserRole;
    is_active: boolean;
    created_at?: string;
    terms_accepted?: boolean;
    newsletter_opt_in?: boolean;
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
    const { t } = useLanguage();
    const [role, setRole] = useState<UserRole>(user.role);
    const [isActive, setIsActive] = useState(user.is_active);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await UserService.update(user.id, { role: role as any, is_active: isActive });
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
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('AdminUsers.editUserAccess')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">{t('AdminUsers.close')}</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Role */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            {t('AdminUsers.rolePermissionLevel')}</label>
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
                            {t('AdminUsers.accountStatus')}</label>
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
                        {t('AdminUsers.cancel')}</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                        {saving && <span className="material-symbols-outlined text-[16px] animate-spin">{t('AdminUsers.progressactivity')}</span>}
                        {t('AdminUsers.saveChanges')}</button>
                </div>
            </div>
        </div>
    );
};

const AdminUsers: React.FC = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [realtors, setConsultants] = useState<ConsultantApplication[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'users' | 'logs' | 'realtors' | 'agents' | 'contractors'>('users');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [logSearch, setLogSearch] = useState('');
    const [consultantFilter, setConsultantFilter] = useState<string>('pending');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Expandable credentials view state
    const [expandedAppId, setExpandedAppId] = useState<number | null>(null);

    // Rejection reason prompt state
    const [rejectingApplication, setRejectingApplication] = useState<{ id: number; role: 'realtor' | 'agent' } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedPresetReason, setSelectedPresetReason] = useState('');
    const [rejectError, setRejectError] = useState('');
    const [rejectSaving, setRejectSaving] = useState(false);

    // Dynamic pending badges state
    const [pendingRealtorsCount, setPendingRealtorsCount] = useState(0);
    const [pendingAgentsCount, setPendingAgentsCount] = useState(0);
    const [contractors, setContractors] = useState<any[]>([]);
    const [pendingContractorsCount, setPendingContractorsCount] = useState(0);

    const loadPendingCounts = async () => {
        try {
            const [rRes, aRes, cRes] = await Promise.all([
                fetch(`${API_URL}/admin/realtors?status=pending&limit=1`, { headers: getHeaders() }),
                fetch(`${API_URL}/admin/agents?status=pending&limit=1`, { headers: getHeaders() }),
                fetch(`${API_URL}/admin/verifications/pending`, { headers: getHeaders() })
            ]);
            if (rRes.ok) {
                const rData = await rRes.json();
                setPendingRealtorsCount(rData.total || 0);
            }
            if (aRes.ok) {
                const aData = await aRes.json();
                setPendingAgentsCount(aData.total || 0);
            }
            if (cRes.ok) {
                const cData = await cRes.json();
                setPendingContractorsCount(cData.contractors?.length || 0);
            }
        } catch (e) {
            console.error("Failed to load pending counts:", e);
        }
    };

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
} else if (tab === 'agents') {
                const res = await fetch(`${API_URL}/admin/agents?status=${consultantFilter}&limit=100`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setAgents(data.items || []);
                }
            } else if (tab === 'contractors') {
                const res = await fetch(`${API_URL}/admin/verifications/pending`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setContractors(data.contractors || []);
                }
            }
            await loadPendingCounts();
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (id: number, role: 'realtor' | 'agent' | 'contractor', status: 'verified' | 'rejected', reason?: string) => {
        setActionLoading(id);
        try {
            let url = '';
            let method = 'PUT';
            if (role === 'contractor') {
                url = `${API_URL}/admin/verifications/contractor/${id}/${status === 'verified' ? 'approve' : 'reject'}`;
                method = 'POST';
            } else {
                url = role === 'realtor' 
                    ? `${API_URL}/admin/realtors/${id}/verify` 
                    : `${API_URL}/admin/agents/${id}/verify`;
            }
                
            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify({ status, reason }),
            });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || `Failed to verify ${role}`);
            } else {
                loadData();
            }
        } catch (e: any) {
            alert(e.message || "An unexpected error occurred");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteConsultant = async (id: number, role: 'realtor' | 'agent' | 'contractor') => {
        if (!window.confirm(`Delete this ${role} application?`)) return;
        setActionLoading(id);
        try {
            const url = role === 'realtor' 
                ? `${API_URL}/admin/realtors/${id}` 
                : `${API_URL}/admin/agents/${id}`;
            await fetch(url, { method: 'DELETE', headers: getHeaders() });
            loadData();
        } catch {}
        finally { setActionLoading(null); }
    };

    const handleBulkDeleteInactiveTrials = async () => {
        if (!window.confirm('Are you sure you want to delete ALL inactive users on the trial plan? This action cannot be undone.')) return;
        setLoading(true);
        try {
            const res = await UserService.deleteInactiveTrials();
            alert(`Successfully deleted ${res.deleted_count} inactive trial users.`);
            loadData();
        } catch (e: any) {
            alert(e.message || 'Failed to delete users');
            setLoading(false);
        }
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
                        <span className="material-symbols-outlined text-primary text-[28px]">{t('AdminUsers.adminpanelsettings')}</span>
                        {t('AdminUsers.accessControlCenter')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('AdminUsers.manageUserRolesPermi')}</p>
                </div>
                {tab === 'users' && (
                    <button
                        onClick={handleBulkDeleteInactiveTrials}
                        className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 border border-red-200 dark:border-red-800"
                    >
                        <span className="material-symbols-outlined text-[18px]">{t('AdminUsers.personremove')}</span>
                        {t('AdminUsers.cleanupInactiveTrial')}</button>
                )}
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
                    { key: 'realtors', icon: 'handshake', label: 'Realtor Apps', badge: pendingRealtorsCount },
                    { key: 'agents', icon: 'directions_car', label: 'Agent Apps', badge: pendingAgentsCount },
                    { key: 'contractors', icon: 'construction', label: 'Contractors', badge: pendingContractorsCount },
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
            ) : (tab === 'realtors' || tab === 'agents' || tab === 'contractors') ? (
                <>
                    {/* Filters */}
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
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.namePartner')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.email')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.phone')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.status')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.applied')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {(tab === 'realtors' ? realtors : tab === 'contractors' ? contractors : agents).map(c => {
                                        const isExpanded = expandedAppId === c.id;
                                        return (
                                            <React.Fragment key={c.id}>
                                                <tr 
                                                    onClick={() => setExpandedAppId(isExpanded ? null : c.id)}
                                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                                >
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[18px] text-slate-400">
                                                                {isExpanded ? 'expand_less' : 'expand_more'}
                                                            </span>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                                    {c.name || 'Anonymous Partner'}
                                                                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">
                                                                        {tab === 'realtors' ? 'Realtor' : tab === 'contractors' ? 'Contractor' : 'Due Diligence'}
                                                                    </span>
                                                                </div>
                                                                {c.user_email && <div className="text-[10px] text-slate-400">{t('AdminUsers.account')}{c.user_email}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{c.email || c.user_email || '—'}</td>
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
                                                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex gap-1.5">
                                                            {c.verification_status !== 'verified' && (
                                                                <button
                                                                    onClick={() => handleVerify(c.id, tab === 'realtors' ? 'realtor' : 'agent', 'verified')}
                                                                    disabled={actionLoading === c.id}
                                                                    className="px-3 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors disabled:opacity-60"
                                                                >
                                                                    {t('AdminUsers.Approve')}</button>
                                                            )}
                                                            {c.verification_status !== 'rejected' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedPresetReason('');
                                                                        setRejectReason('');
                                                                        setRejectError('');
                                                                        setRejectingApplication({ id: c.id, role: tab === 'realtors' ? 'realtor' : 'agent' });
                                                                    }}
                                                                    disabled={actionLoading === c.id}
                                                                    className="px-3 py-1 text-[10px] font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors disabled:opacity-60"
                                                                >
                                                                    {t('AdminUsers.Reject')}</button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteConsultant(c.id, tab === 'realtors' ? 'realtor' : 'agent')}
                                                                disabled={actionLoading === c.id}
                                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-60"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">{t('AdminUsers.delete')}</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                                                        <td colSpan={6} className="px-8 py-4 border-t border-slate-100 dark:border-slate-800">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                                <div>
                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.socialSecurityNumber')}</div>
                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.social_security || '—'}</div>
                                                                </div>
                                                                {tab === 'realtors' ? (
                                                                    <>
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.cRECIStateLicenseNum')}</div>
                                                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.license_number || '—'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.mLSID')}</div>
                                                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.mls_id || '—'}</div>
                                                                        </div>
                                                                    </>
                                                                ) : tab === 'contractors' ? (
                                                                    <>
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.profession')}</div>
                                                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.profession || '—'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.licenseDocument')}</div>
                                                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                                                {c.license_number ? <a href={c.license_number} target="_blank" rel="noreferrer" className="text-primary underline">{t('AdminUsers.viewDocument')}</a> : '—'}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.coverageAreaZIPs')}</div>
                                                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.coverage_area || '—'}</div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.workPermit')}</div>
                                                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                                                {c.vehicle_type ? <a href={c.vehicle_type} target="_blank" rel="noreferrer" className="text-primary underline">{t('AdminUsers.viewDocument')}</a> : '—'}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                <div>
                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('AdminUsers.paymentMethodAccount')}</div>
                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.payment_account || '—'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {(tab === 'realtors' ? realtors : tab === 'contractors' ? contractors : agents).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-16 text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">
                                                    {tab === 'realtors' ? 'handshake' : tab === 'contractors' ? 'construction' : 'directions_car'}
                                                </span>
                                                No {tab === 'realtors' ? 'realtor' : tab === 'contractors' ? 'contractor' : 'field agent'} {t('AdminUsers.applicationsFound')}</td>
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
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">{t('AdminUsers.search')}</span>
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
                            <option value="">{t('AdminUsers.allRoles')}</option>
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary min-w-[130px]"
                        >
                            <option value="">{t('AdminUsers.allStatus')}</option>
                            <option value="active">{t('AdminUsers.active')}</option>
                            <option value="inactive">{t('AdminUsers.inactive')}</option>
                        </select>
                        <div className="text-xs font-bold text-slate-400 self-center">
                            {filteredUsers.length} of {users.length} {t('AdminUsers.users')}</div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.user')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.role')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.status')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.terms')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.newsletter')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.joined')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.actions')}</th>
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
                                                            {u.full_name || <span className="text-slate-400 italic">{t('AdminUsers.noName')}</span>}
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
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.terms_accepted ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-955/10 dark:text-rose-400'}`}>
                                                    {u.terms_accepted ? 'Accepted' : 'No'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.newsletter_opt_in ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {u.newsletter_opt_in ? 'Subscribed' : 'No'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingUser(u)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100 animate-in fade-in duration-200"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">{t('AdminUsers.edit')}</span>
                                                        {t('AdminUsers.edit')}</button>
                                                    {u.role !== 'superuser' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to delete ${u.email}?`)) {
                                                                    try {
                                                                        const res = await fetch(`${API_URL}/users/${u.id}`, {
                                                                            method: 'DELETE',
                                                                            headers: getHeaders()
                                                                        });
                                                                        if (res.ok) {
                                                                            alert('User deleted successfully.');
                                                                            loadData();
                                                                        } else {
                                                                            const err = await res.json().catch(() => ({}));
                                                                            alert(err.detail || 'Failed to delete user.');
                                                                        }
                                                                    } catch (e: any) {
                                                                        alert(e.message || 'Error occurred.');
                                                                    }
                                                                }
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-955/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 animate-in fade-in duration-200"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">{t('AdminUsers.delete')}</span>
                                                            {t('AdminUsers.delete')}</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-16 text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">{t('AdminUsers.managesearch')}</span>
                                                {t('AdminUsers.noUsersMatchYourFilt')}</td>
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
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">{t('AdminUsers.search')}</span>
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
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.timestamp')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.user')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.action')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.resource')}</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{t('AdminUsers.iPAddr')}</th>
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
                                                    {log.user?.full_name || log.user?.email || <span className="text-slate-400 italic">{t('AdminUsers.system')}</span>}
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
                                                <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">{t('AdminUsers.historytoggleoff')}</span>
                                                {t('AdminUsers.noActivityLogsFound')}</td>
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

            {/* Custom Rejection Reason Modal */}
            {rejectingApplication && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">{t('AdminUsers.warning')}</span>
                                {t('AdminUsers.rejectPartnerApplica')}</h3>
                            <button 
                                onClick={() => setRejectingApplication(null)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">{t('AdminUsers.close')}</span>
                            </button>
                        </div>
                        
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('AdminUsers.pleaseSelectOrWriteA')}</p>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('AdminUsers.presetReasons')}</label>
                            <div className="flex flex-col gap-1.5">
                                {(rejectingApplication.role === 'realtor' 
                                    ? [
                                        "No valid active state real estate license found.",
                                        "Social Security Number (SSN) verification mismatch.",
                                        "Invalid/unsupported payment account details."
                                      ]
                                    : [
                                        "Missing or invalid Work Permit authorization.",
                                        "Social Security Number (SSN) verification mismatch.",
                                        "Invalid/unsupported payment account details."
                                      ]
                                ).map((reasonOption) => (
                                    <button
                                        key={reasonOption}
                                        type="button"
                                        onClick={() => {
                                            setSelectedPresetReason(reasonOption);
                                            setRejectReason(reasonOption);
                                        }}
                                        className={`text-left text-xs p-2.5 rounded-lg border font-medium transition-all ${
                                            selectedPresetReason === reasonOption
                                                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
                                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                        }`}
                                    >
                                        {reasonOption}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedPresetReason('custom');
                                        setRejectReason('');
                                    }}
                                    className={`text-left text-xs p-2.5 rounded-lg border font-medium transition-all ${
                                        selectedPresetReason === 'custom'
                                            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    {t('AdminUsers.customReason')}</button>
                            </div>
                        </div>

                        {selectedPresetReason === 'custom' && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('AdminUsers.customFeedback')}</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Type specific details explaining the rejection reason..."
                                    rows={3}
                                    className="w-full text-xs p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-slate-400"
                                />
                            </div>
                        )}

                        {rejectError && (
                            <div className="text-[11px] text-red-500 font-bold bg-red-50 dark:bg-red-950/10 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                {rejectError}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setRejectingApplication(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                            >
                                {t('AdminUsers.cancel')}</button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!rejectReason.trim()) {
                                        setRejectError("Please select or write a reason first.");
                                        return;
                                    }
                                    setRejectSaving(true);
                                    try {
                                        await handleVerify(rejectingApplication.id, rejectingApplication.role, 'rejected', rejectReason);
                                        setRejectingApplication(null);
                                    } catch (e: any) {
                                        setRejectError(e.message || "Failed to process rejection.");
                                    } finally {
                                        setRejectSaving(false);
                                    }
                                }}
                                disabled={rejectSaving}
                                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-1.5 min-w-[120px]"
                            >
                                {rejectSaving ? 'Sending...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
