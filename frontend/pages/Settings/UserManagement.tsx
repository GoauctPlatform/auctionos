import React, { useState, useEffect } from 'react';
import { UserService } from '../../services/user.service';
import { CompanyService, Company } from '../../services/company.service';
import { User, UserRole } from '../../types';

interface LinkedCompany { id: number; name: string; role: string; }

/* ─── Company Multi-Select Chip Picker ────────────────────────────────── */
const CompanyMultiPicker: React.FC<{
    allCompanies: Company[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}> = ({ allCompanies, selectedIds, onChange }) => {
    const toggle = (id: number) => {
        onChange(selectedIds.includes(id)
            ? selectedIds.filter(c => c !== id)
            : [...selectedIds, id]);
    };
    return (
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {allCompanies.length === 0 && (
                <span className="text-xs text-slate-400 italic">No companies found. Create one first.</span>
            )}
            {allCompanies.map(c => {
                const selected = selectedIds.includes(c.id);
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                            selected
                                ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                    >
                        {selected && <span className="mr-1">✓</span>}
                        {c.name}
                    </button>
                );
            })}
        </div>
    );
};

/* ─── Company Assignment Side Panel (edit existing user) ─────────────── */
const CompanyAssignPanel: React.FC<{
    user: User;
    allCompanies: Company[];
    currentLinks: LinkedCompany[];
    onSave: (ids: number[]) => Promise<void>;
    onClose: () => void;
}> = ({ user, allCompanies, currentLinks, onSave, onClose }) => {
    const [selectedIds, setSelectedIds] = useState<number[]>(currentLinks.map(c => c.id));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await onSave(selectedIds);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to save');
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
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-900 dark:to-blue-950/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500 text-[20px]">corporate_fare</span>
                                Assign Companies
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Select all companies this user should manage. The first selected will be set as the primary company.
                    </p>
                    <CompanyMultiPicker
                        allCompanies={allCompanies}
                        selectedIds={selectedIds}
                        onChange={setSelectedIds}
                    />
                    {selectedIds.length > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                            {selectedIds.length} {selectedIds.length === 1 ? 'company' : 'companies'} selected
                        </div>
                    )}
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
                        className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                        {saving && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
                        Save Assignments
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Component ──────────────────────────────────────────────────── */
export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [assigningUser, setAssigningUser] = useState<User | null>(null);
    const [assigningLinks, setAssigningLinks] = useState<LinkedCompany[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);

    // Create/Edit form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.AGENT);
    const [isActive, setIsActive] = useState(true);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, companiesData] = await Promise.all([
                UserService.list(),
                CompanyService.list(),
            ]);
            setUsers(usersData);
            setAllCompanies(companiesData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAssign = async (user: User) => {
        setAssigningUser(user);
        setLoadingLinks(true);
        try {
            const links = await UserService.getUserCompanies(user.id);
            setAssigningLinks(links);
        } catch { setAssigningLinks([]); }
        finally { setLoadingLinks(false); }
    };

    const handleSaveCompanies = async (ids: number[]) => {
        if (!assigningUser) return;
        await UserService.setUserCompanies(assigningUser.id, ids);
        fetchData();
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await UserService.update(editingUser.id, {
                    email, full_name: fullName, role, is_active: isActive,
                    ...(password ? { password } : {}),
                });
                if (selectedCompanyIds.length > 0) {
                    await UserService.setUserCompanies(editingUser.id, selectedCompanyIds);
                }
            } else {
                // Subscription Limits Check
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const isTrial = currentUser.subscription_tier === 'trial';
                
                if (isTrial) {
                    const existingManagers = users.filter(u => u.role === 'manager').length;
                    const existingAgents = users.filter(u => u.role === 'agent').length;
                    
                    if (role === 'manager' && existingManagers >= 1) {
                        alert("⚠️ Trial Limit Reached: You can only have 1 Manager in the Trial plan. Upgrade to Pro for more.");
                        return;
                    }
                    if (role === 'agent' && existingAgents >= 1) {
                        alert("⚠️ Trial Limit Reached: You can only have 1 Field Agent in the Trial plan. Upgrade to Pro for more.");
                        return;
                    }
                    if (selectedCompanyIds.length > 1) {
                        alert("⚠️ Trial Limit Reached: You can only assign 1 Company in the Trial plan. Upgrade to Pro for more.");
                        return;
                    }
                }
                
                await UserService.create({ email, password, role, full_name: fullName, company_ids: selectedCompanyIds });
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEditUser = async (user: User) => {
        setEditingUser(user);
        setEmail(user.email);
        setFullName(user.full_name || '');
        setPassword('');
        setRole(user.role);
        setIsActive(user.is_active);
        // Pre-load linked companies
        try {
            const links = await UserService.getUserCompanies(user.id);
            setSelectedCompanyIds(links.map(l => l.id));
        } catch { setSelectedCompanyIds([]); }
        setShowModal(true);
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await UserService.delete(id);
            fetchData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const resetForm = () => {
        setEditingUser(null);
        setEmail('');
        setPassword('');
        setFullName('');
        setRole(UserRole.AGENT);
        setIsActive(true);
        setSelectedCompanyIds([]);
    };

    if (loading) return (
        <div className="flex justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-blue-500 text-3xl">progress_activity</span>
        </div>
    );

    return (
        <div className="space-y-5">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Team Members</h3>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Add Member
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">User</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Role</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Status</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Companies</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {user.full_name || <span className="text-slate-400 italic text-xs">No name</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                        user.role === 'manager'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : user.role === 'agent'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`size-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <span className={`text-xs font-bold ${user.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleOpenAssign(user)}
                                        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-bold border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                                        {(user as any).linked_company_ids?.length
                                            ? `${(user as any).linked_company_ids.length} company(s)`
                                            : user.active_company_id ? '1 company' : 'None'}
                                        <span className="material-symbols-outlined text-[13px]">edit</span>
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex gap-1.5 justify-end">
                                        <button
                                            id={`btn-edit-user-${user.id}`}
                                            onClick={() => handleEditUser(user)}
                                            className="px-3 py-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors text-xs inline-flex items-center gap-1 font-bold"
                                        >
                                            <span className="material-symbols-outlined text-[15px]">edit</span>
                                            Edit
                                        </button>
                                        <button
                                            id={`btn-delete-user-${user.id}`}
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="px-3 py-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors text-xs inline-flex items-center gap-1 font-bold border border-red-200 dark:border-red-800"
                                        >
                                            <span className="material-symbols-outlined text-[15px]">delete</span>
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && (
                    <div className="py-16 text-center text-slate-400">
                        <span className="material-symbols-outlined text-3xl mb-2 block opacity-40">group</span>
                        No team members yet.
                    </div>
                )}
            </div>

            {/* Create/Edit User Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {editingUser ? 'Edit Team Member' : 'Add Team Member'}
                                </h3>
                                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                    {editingUser ? 'New Password (blank = keep current)' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[UserRole.AGENT, UserRole.MANAGER].map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setRole(r)}
                                            className={`py-2.5 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                                                role === r
                                                    ? 'border-blue-500 bg-blue-500/5 text-blue-600'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Multi-Company Picker */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                    Assign Companies
                                    <span className="ml-1.5 normal-case font-normal text-slate-400">(select one or more)</span>
                                </label>
                                <CompanyMultiPicker
                                    allCompanies={allCompanies}
                                    selectedIds={selectedCompanyIds}
                                    onChange={setSelectedCompanyIds}
                                />
                            </div>

                            {editingUser && (
                                <div className="flex items-center gap-2 py-1">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                        Account Active
                                    </label>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
                                >
                                    {editingUser ? 'Save Changes' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Company Assignment Panel */}
            {assigningUser && !loadingLinks && (
                <CompanyAssignPanel
                    user={assigningUser}
                    allCompanies={allCompanies}
                    currentLinks={assigningLinks}
                    onSave={handleSaveCompanies}
                    onClose={() => setAssigningUser(null)}
                />
            )}
        </div>
    );
};
