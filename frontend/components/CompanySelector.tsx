import React, { useState, useRef, useEffect } from 'react';
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
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-start pt-10 sm:items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200" onClick={onClose}>
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header with gradient accent */}
                <div className="relative px-6 py-5 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                {initial ? 'Edit Company' : 'New Company'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {initial ? 'Update company information' : 'Create a new company profile'}
                            </p>
                        </div>
                        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {[
                        { label: 'Company Name', value: name, setter: setName, placeholder: 'e.g. Sunrise Investments LLC', required: true },
                        { label: 'Address', value: address, setter: setAddress, placeholder: '123 Main St, Tampa, FL 33601', required: false },
                        { label: 'Contact (Email or Phone)', value: contact, setter: setContact, placeholder: 'contact@company.com', required: false },
                    ].map(field => (
                        <div key={field.label}>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                                {field.label}{field.required && ' *'}
                            </label>
                            <input
                                type="text"
                                value={field.value}
                                onChange={e => field.setter(e.target.value)}
                                required={field.required}
                                placeholder={field.placeholder}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                            />
                        </div>
                    ))}
                    {error && (
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2">{error}</p>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end bg-slate-50/50 dark:bg-slate-900/30">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-60 flex items-center gap-1.5"
                    >
                        {saving && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
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
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentUser = AuthService.getCurrentUser();
    const canManage = currentUser?.role === 'client' || currentUser?.role === 'admin' || currentUser?.role === 'superuser';

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (loading && companies.length === 0) {
        return <div className="h-8 w-36 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />;
    }

    const initial = (activeCompany?.name || 'P').charAt(0).toUpperCase();
    const companyName = activeCompany?.name || 'Personal Account';

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                {/* Premium trigger button */}
                <button
                    onClick={() => setOpen(!open)}
                    className={`
                        group flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-200
                        bg-slate-50 dark:bg-slate-800/60 
                        border-slate-200/80 dark:border-slate-700/60
                        hover:bg-white dark:hover:bg-slate-800 
                        hover:border-blue-300 dark:hover:border-blue-700/60
                        hover:shadow-sm
                        ${open ? 'bg-white dark:bg-slate-800 border-blue-400/60 dark:border-blue-600/60 shadow-sm' : ''}
                    `}
                >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="size-5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-black shadow-sm shadow-blue-500/30">
                            {initial}
                        </div>
                        {/* Online dot */}
                        <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 border border-white dark:border-slate-800" />
                    </div>

                    {/* Name */}
                    <span className={`font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[100px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors ${compact ? 'text-xs' : 'text-xs'}`}>
                        {companyName}
                    </span>

                    {/* Chevron */}
                    <span className={`material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </button>

                {/* Premium dropdown */}
                {open && (
                    <div className="absolute top-full mt-2 right-0 w-72 z-[99999] animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/30 overflow-hidden flex flex-col">
                            
                            {/* Dropdown header */}
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/80">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Switch Company</p>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{companyName}</p>
                            </div>

                            {/* Company List */}
                            <div className="max-h-56 overflow-y-auto">
                                {companies.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <span className="material-symbols-outlined text-2xl text-slate-300 dark:text-slate-600 mb-1 block">business</span>
                                        <p className="text-xs text-slate-400">No companies yet.</p>
                                        <p className="text-[10px] text-slate-400">Create your first one below.</p>
                                    </div>
                                ) : (
                                    companies.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => { selectCompany(c.id); setOpen(false); }}
                                            className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-800/60 transition-colors
                                                ${c.is_active
                                                    ? 'bg-blue-50/60 dark:bg-blue-900/10'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`size-7 rounded-lg flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm
                                                    ${c.is_active 
                                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25'
                                                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                                    }`
                                                }>
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${c.is_active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-white'}`}>{c.name}</p>
                                                    {c.contact && <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{c.contact}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                {c.is_active && (
                                                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1" title="Active" />
                                                )}
                                                {canManage && (
                                                    <>
                                                        <button
                                                            title="Edit"
                                                            onClick={(e) => { e.stopPropagation(); setEditingCompany(c); setShowForm(true); setOpen(false); }}
                                                            className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                                        </button>
                                                        <button
                                                            title="Delete"
                                                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(c.id); }}
                                                            className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
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

                            {/* Create New footer */}
                            {canManage && (
                                <button
                                    onClick={() => { setEditingCompany(undefined); setShowForm(true); setOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-t border-slate-100 dark:border-slate-800"
                                >
                                    <span className="size-5 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <span className="material-symbols-outlined text-[14px]">add</span>
                                    </span>
                                    Create New Company
                                </button>
                            )}
                        </div>
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
                <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="size-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1 tracking-tight">Delete Company?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">All lists linked to this company will be unlinked. This cannot be undone.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                            <button
                                onClick={async () => { await deleteCompany(confirmDelete); setConfirmDelete(null); }}
                                className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm shadow-red-500/20"
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
