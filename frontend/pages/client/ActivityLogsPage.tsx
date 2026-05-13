import React, { useEffect, useState } from 'react';
import { CircularProgress, Button, Dialog, TextField, Select, MenuItem, Typography } from '@mui/material';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { API_URL, getHeaders } from '../../services/httpClient';
import { useCompany } from '../../context/CompanyContext';

const ActivityLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'logs' | 'team'>('team');

    const { activeCompany, companies } = useCompany();

    // Create User Form
    const [openCreate, setOpenCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'agent', contact_phone: '', company_id: '' });
    const [createCompanyIds, setCreateCompanyIds] = useState<number[]>([]);
    const [creating, setCreating] = useState(false);

    // Edit User Form
    const [openEdit, setOpenEdit] = useState(false);
    const [editForm, setEditForm] = useState({ id: '', email: '', password: '', full_name: '', contact_phone: '' });
    const [editCompanyIds, setEditCompanyIds] = useState<number[]>([]);
    const [updating, setUpdating] = useState(false);

    // Delete
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const currentUser = AuthService.getCurrentUser();
    const isClient = currentUser?.role === 'client';
    const isAgent = currentUser?.role === 'agent';

    const loadData = async () => {
        setLoading(true);
        try {
            const [logsRes, teamRes] = await Promise.all([
                fetch(`${API_URL}/users/team/logs`, { headers: getHeaders() }),
                fetch(`${API_URL}/users/team`, { headers: getHeaders() })
            ]);
            if (logsRes.ok) setLogs(await logsRes.json());
            if (teamRes.ok) setTeam(await teamRes.json());
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateUser = async () => {
        setCreating(true);
        try {
            // Use multi-selected companies; fallback to activeCompany
            const allIds = createCompanyIds.length > 0
                ? createCompanyIds
                : activeCompany?.id ? [activeCompany.id] : [];

            const payload = {
                ...createForm,
                company_id: allIds[0] || undefined,
                company_ids: allIds,
            };
            const res = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to create user');
            }
            alert('User created successfully!');
            setOpenCreate(false);
            setCreateForm({ email: '', password: '', full_name: '', role: 'agent', contact_phone: '', company_id: '' });
            setCreateCompanyIds([]);
            await loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateUser = async () => {
        setUpdating(true);
        try {
            const body = {
                full_name: editForm.full_name,
                contact_phone: editForm.contact_phone,
                ...(editForm.password ? { password: editForm.password } : {})
            };
            const res = await fetch(`${API_URL}/users/${editForm.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to update user');
            }
            // Save company assignments if any selected
            if (editCompanyIds.length > 0) {
                await fetch(`${API_URL}/users/${editForm.id}/companies`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ company_ids: editCompanyIds })
                });
            }
            alert('User updated successfully!');
            setOpenEdit(false);
            await loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = async (id: number, name: string) => {
        if (!window.confirm(`Remove "${name}" from your team? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to delete user');
            }
            await loadData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleOpenEdit = async (member: any) => {
        setEditForm({ id: member.id, email: member.email, full_name: member.full_name || '', contact_phone: member.contact_phone || '', password: '' });
        setEditCompanyIds([]);
        // Pre-load linked companies
        try {
            const res = await fetch(`${API_URL}/users/${member.id}/companies`, { headers: getHeaders() });
            if (res.ok) {
                const links = await res.json();
                setEditCompanyIds(links.map((l: any) => l.id));
            }
        } catch { }
        setOpenEdit(true);
    };

    if (isAgent) {
        return (
            <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">block</span>
                <Typography variant="h6">Access Denied</Typography>
                <p>You do not have permission to view team logs.</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 w-full">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Team Management & Logs</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your agents, managers, and monitor their actions.</p>
                </div>
                {tab === 'team' && (
                    <Button
                        variant="contained"
                        color="primary"
                        className="bg-blue-600 rounded-xl shadow-none font-bold"
                        onClick={() => setOpenCreate(true)}
                        startIcon={<span className="material-symbols-outlined text-[18px]">person_add</span>}
                    >
                        Add Member
                    </Button>
                )}
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1">
                <button onClick={() => setTab('team')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === 'team' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px]">group</span> Team Members
                </button>
                <button onClick={() => setTab('logs')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === 'logs' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <span className="material-symbols-outlined text-[18px]">history</span> Activity Logs
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex justify-center py-20"><CircularProgress /></div>
                ) : tab === 'team' ? (
                    team.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 font-medium">No team members found. Add an agent or manager to get started.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {team.map(member => (
                                <div key={member.id} className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                            {member.full_name ? member.full_name.charAt(0) : member.email.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{member.full_name || 'No Name'}</p>
                                            <p className="text-xs text-slate-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${member.role === 'client' ? 'bg-purple-100 text-purple-700' :
                                            member.role === 'manager' ? 'bg-amber-100 text-amber-700' :
                                                'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {member.role}
                                        </span>
                                        {member.role !== 'client' && (
                                            <>
                                                <button
                                                    id={`btn-edit-member-${member.id}`}
                                                    onClick={() => handleOpenEdit(member)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">edit</span>
                                                    Edit
                                                </button>
                                                <button
                                                    id={`btn-delete-member-${member.id}`}
                                                    onClick={() => handleDeleteUser(member.id, member.full_name || member.email)}
                                                    disabled={deletingId === member.id}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {deletingId === member.id
                                                        ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                                                        : <span className="material-symbols-outlined text-[15px]">delete</span>
                                                    }
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    logs.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No activity recorded yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {logs.map(log => (
                                <div key={log.id} className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex gap-3">
                                        <div className="mt-1">
                                            <span className="material-symbols-outlined text-slate-400 text-[20px]">
                                                {log.action.includes('create') ? 'add_circle' : log.action.includes('delete') ? 'delete' : 'edit'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white capitalize">{log.action.replace(/_/g, ' ')} {log.resource}</p>
                                            <p className="text-xs text-slate-500 truncate max-w-md">{log.details}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.user?.full_name || log.user?.email}</p>
                                        <p className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Create User Dialog */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold text-slate-800 dark:text-white mb-4">Add Team Member</Typography>
                <div className="space-y-4">
                    <TextField label="Full Name" fullWidth value={createForm.full_name} onChange={e => setCreateForm(p => ({ ...p, full_name: e.target.value }))} />
                    <TextField label="Email Address" type="email" fullWidth value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} />
                    <TextField label="Temporary Password" type="password" fullWidth value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} />
                    <TextField label="Contact Phone" fullWidth value={createForm.contact_phone} onChange={e => setCreateForm(p => ({ ...p, contact_phone: e.target.value }))} />

                    <div>
                        <Typography variant="caption" className="font-bold text-slate-500 mb-1 block">Role</Typography>
                        <Select
                            fullWidth
                            value={createForm.role}
                            onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                        >
                            {isClient && <MenuItem value="manager">Manager</MenuItem>}
                            <MenuItem value="agent">Agent</MenuItem>
                        </Select>
                    </div>

                    {/* Multi-Company Picker */}
                    <div>
                        <Typography variant="caption" className="font-bold text-slate-500 mb-2 block">
                            Assign to Companies <span style={{ fontWeight: 400, textTransform: 'none' }}>(select one or more)</span>
                        </Typography>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                            {companies.length === 0 && (
                                <span className="text-xs text-slate-400 italic">No companies yet. Create one first.</span>
                            )}
                            {companies.map(c => {
                                const sel = createCompanyIds.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setCreateCompanyIds(prev =>
                                            sel ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                        )}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${sel
                                            ? 'border-blue-500 bg-blue-500 text-white'
                                            : 'border-slate-200 text-slate-600 hover:border-blue-300'
                                            }`}
                                    >
                                        {sel && '✓ '}{c.name}
                                    </button>
                                );
                            })}
                        </div>
                        {createCompanyIds.length > 0 && (
                            <p className="text-xs text-blue-600 font-bold mt-1">{createCompanyIds.length} company(s) selected</p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={() => setOpenCreate(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleCreateUser} variant="contained" color="primary" disabled={creating || !createForm.email || !createForm.password} className="bg-blue-600 rounded-lg shadow-none">
                        {creating ? 'Creating...' : 'Create User'}
                    </Button>
                </div>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold text-slate-800 dark:text-white mb-4">Edit Team Member</Typography>
                <div className="space-y-4">
                    <TextField label="Email Address" disabled fullWidth value={editForm.email} />
                    <TextField label="Full Name" fullWidth value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
                    <TextField label="New Password (leave blank to keep current)" type="password" fullWidth value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} />
                    <TextField label="Contact Phone" fullWidth value={editForm.contact_phone} onChange={e => setEditForm(p => ({ ...p, contact_phone: e.target.value }))} />

                    {/* Multi-Company Picker */}
                    <div>
                        <Typography variant="caption" className="font-bold text-slate-500 mb-2 block">
                            Companies <span style={{ fontWeight: 400, textTransform: 'none' }}>(select one or more)</span>
                        </Typography>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                            {companies.length === 0 && (
                                <span className="text-xs text-slate-400 italic">No companies yet.</span>
                            )}
                            {companies.map(c => {
                                const sel = editCompanyIds.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setEditCompanyIds(prev =>
                                            sel ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                        )}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${sel
                                            ? 'border-blue-500 bg-blue-500 text-white'
                                            : 'border-slate-200 text-slate-600 hover:border-blue-300'
                                            }`}
                                    >
                                        {sel && '✓ '}{c.name}
                                    </button>
                                );
                            })}
                        </div>
                        {editCompanyIds.length > 0 && (
                            <p className="text-xs text-blue-600 font-bold mt-1">{editCompanyIds.length} company(s) selected</p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={() => setOpenEdit(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleUpdateUser} variant="contained" color="primary" disabled={updating} className="bg-blue-600 rounded-lg shadow-none">
                        {updating ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </Dialog>
        </div>
    );
};

export default ActivityLogsPage;
