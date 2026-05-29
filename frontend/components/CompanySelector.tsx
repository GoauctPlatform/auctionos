import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCompany } from '../context/CompanyContext';
import { Company } from '../services/company.service';
import { AuthService } from '../services/auth.service';

interface CompanySelectorProps {
    compact?: boolean;
}

const CompanyFormModal: React.FC<{
    initial?: Company;
    onClose: () => void;
    onSave: () => void;
}> = ({ initial, onClose, onSave }) => {
    const { createCompany, updateCompany } = useCompany();
    const [name, setName] = useState(initial?.name || '');
    const [address, setAddress] = useState(initial?.address || '');
    const [contact, setContact] = useState(initial?.contact || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        setError('');
        try {
            if (initial) {
                await updateCompany(initial.id, { name, address, contact });
            } else {
                await createCompany(name, address, contact);
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save company');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start pt-10 sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/20 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {initial ? 'Edit Company' : 'New Company'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {initial ? 'Update company information' : 'Create a new company profile'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Company Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            placeholder="e.g. Sunrise Investments LLC"
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="123 Main St, Tampa, FL 33601"
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contact (Email or Phone)</label>
                        <input
                            type="text"
                            value={contact}
                            onChange={e => setContact(e.target.value)}
                            placeholder="contact@company.com or +1 (555) 000-0000"
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    {error && (
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">{error}</p>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                        {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                        {initial ? 'Save Changes' : 'Create Company'}
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
};

export const CompanySelector: React.FC<CompanySelectorProps> = ({ compact = false }) => {
    const { companies, activeCompany, loading, selectCompany, deleteCompany } = useCompany();
    const [open, setOpen] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const currentUser = AuthService.getCurrentUser();
    const canManage = currentUser?.role === 'client' || currentUser?.role === 'admin' || currentUser?.role === 'superuser';

    // Only show skeleton on true first load with no cached data at all
    if (loading && companies.length === 0) {
        return (
            <div className="h-9 w-40 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        );
    }

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setOpen(!open)}
                    className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary/40 transition-colors text-sm font-semibold text-slate-700 dark:text-slate-200 ${compact ? 'text-xs' : ''}`}
                >
                    <div className="size-5 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                        {(activeCompany?.name || 'Personal').charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[120px] truncate">
                        {activeCompany?.name || 'Personal Account'}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
                </button>

                {open && (
                    <div className="absolute top-full mt-2 right-0 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-[99999] overflow-hidden flex flex-col max-h-96">
                        {/* Header */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Company</p>
                        </div>

                        {/* Company List */}
                        <div className="max-h-56 overflow-y-auto">
                            {companies.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    No companies yet. Create your first one below.
                                </div>
                            ) : (
                                companies.map(c => (
                                    <div
                                        key={c.id}
                                        className={`flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800/50 ${c.is_active ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex items-center gap-2.5" onClick={() => { selectCompany(c.id); setOpen(false); }}>
                                            <div className="size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-black shrink-0">
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white">{c.name}</p>
                                                {c.contact && <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{c.contact}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {c.is_active && (
                                                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Active" />
                                            )}
                                            {canManage && (
                                                <>
                                                    <button
                                                        title="Edit"
                                                        onClick={(e) => { e.stopPropagation(); setEditingCompany(c); setShowForm(true); setOpen(false); }}
                                                        className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                                    </button>
                                                    <button
                                                        title="Delete"
                                                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(c.id); }}
                                                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Create New */}
                        {canManage && (
                            <button
                                onClick={() => { setEditingCompany(undefined); setShowForm(true); setOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                Create New Company
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showForm && (
                <CompanyFormModal
                    initial={editingCompany}
                    onClose={() => { setShowForm(false); setEditingCompany(undefined); }}
                    onSave={() => {}}
                />
            )}

            {/* Delete Confirmation */}
            {confirmDelete !== null && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full text-center animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <span className="material-symbols-outlined text-red-500 text-4xl mb-3 block">warning</span>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Delete Company?</h3>
                        <p className="text-sm text-slate-500 mb-5">All lists linked to this company will be unlinked. This cannot be undone.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                            <button
                                onClick={async () => { await deleteCompany(confirmDelete); setConfirmDelete(null); }}
                                className="px-5 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default CompanySelector;
