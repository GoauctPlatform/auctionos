import React, { useState, useRef } from 'react';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { UserManagement } from './Settings/UserManagement';
import { API_URL, getHeaders } from '../services/httpClient';
import { useLanguage, Language } from '../context/LanguageContext';

type Tab = 'profile' | 'general' | 'users' | 'companies';

export const Settings: React.FC = () => {
    const { user } = useAuth();
    const { language, setLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [theme, setTheme] = useState(() => localStorage.getItem('goauct_theme') || 'system');
    // displayName: prefer backend value, fallback to locally persisted value
    const [displayName, setDisplayName] = useState(
        user?.full_name || localStorage.getItem('goauct_display_name') || ''
    );
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [notifications, setNotifications] = useState(
        () => localStorage.getItem('goauct_notifications') !== 'false'
    );
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state when user context loads (fixes Admin render issue)
    React.useEffect(() => {
        if (user) {
            setDisplayName(user.full_name || localStorage.getItem('goauct_display_name') || '');
        }
    }, [user]);

    const handleThemeChange = (t: string) => {
        setTheme(t);
        localStorage.setItem('goauct_theme', t);
        
        document.documentElement.classList.remove('dark');
        
        if (t === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (t === 'light') {
            // kept clean
        } else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const res = await fetch(`${API_URL}/users/me`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ full_name: displayName })
            });
            if (res.ok) {
                // Persist locally so it survives logout/login before next JWT refresh
                localStorage.setItem('goauct_display_name', displayName);
                // Update the stored user object so the nav reflects the new name immediately
                const stored = localStorage.getItem('user');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        parsed.full_name = displayName;
                        localStorage.setItem('user', JSON.stringify(parsed));
                    } catch {}
                }
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 3000);
            }
        } catch { } finally { setSavingProfile(false); }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleLogout = () => {
        AuthService.logout();
    };

    const { companies, activeCompany, createCompany, selectCompany, deleteCompany } = useCompany();
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyAddress, setNewCompanyAddress] = useState('');
    const [newCompanyContact, setNewCompanyContact] = useState('');
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);


    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const result = await AdminService.importProperties(file);
            alert(`Import started! Job ID: ${result.job_id}`);
        } catch (e: any) {
            console.error(e);
            alert(`Import failed: ${e.message}`);
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset
            }
        }
    };

    const isAdmin = user?.role === 'admin' || user?.is_superuser;
    const isManagerOrAdmin = isAdmin || user?.role === 'manager';
    const roleLabel: Record<string, string> = {
        admin: 'Platform Admin', superuser: 'Superuser', manager: 'Manager', client: 'Investor', realtor: 'Realtor', agent: 'Field Agent', agent_due_diligence: 'Due Diligence Agent'
    };
    const userRoleLabel = roleLabel[user?.role || ''] || user?.role || 'User';

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                >
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'general'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                >
                    General
                </button>
                {isManagerOrAdmin && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                    >
                        Users
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('companies')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'companies'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                >
                    Companies
                </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">My Profile</h3>

                        {/* Avatar */}
                        <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="size-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {(displayName || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-900 dark:text-white">{displayName || user?.email}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {userRoleLabel}
                                    {activeCompany ? <> · <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activeCompany.name}</span></> : ' · No active company'}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                                {user?.subscription_tier && (
                                    <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                        {user.subscription_tier}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Display Name */}
                        <div className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="How you want to appear in the platform"
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                />
                            </div>

                            {/* Theme Visual Selector */}
                            <div className="space-y-3 pt-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Appearance</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        {
                                            key: 'light',
                                            label: 'Corporate Clean (Light)',
                                            icon: 'light_mode',
                                            desc: 'Bright, high-contrast crisp light corporate aesthetic.',
                                            previewClass: 'bg-white border border-slate-200',
                                            previewAccent: 'bg-[#00b8d9]',
                                            previewText: 'text-slate-800'
                                        },
                                        {
                                            key: 'dark',
                                            label: 'VS Dark (Dark)',
                                            icon: 'dark_mode',
                                            desc: 'Visual Studio Code inspired dark mode. Charcoal background with soft green and classic blue highlights.',
                                            previewClass: 'bg-[#1E1E1E] border border-[#3E3E42]',
                                            previewAccent: 'bg-[#007ACC]',
                                            previewText: 'text-[#D4D4D4]'
                                        }
                                    ].map((t) => {
                                        const isSelected = theme === t.key;
                                        return (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => handleThemeChange(t.key)}
                                                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 relative group overflow-hidden ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
                                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-800/10 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
                                                )}
                                                
                                                {/* Mini Mock Dashboard UI Preview inside Card */}
                                                <div className={`w-full h-14 rounded-lg ${t.previewClass} mb-3 p-1.5 flex flex-col justify-between overflow-hidden relative shadow-inner select-none pointer-events-none`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex gap-0.5 items-center">
                                                            <div className={`w-1 h-1 rounded-full ${t.previewAccent}`} />
                                                            <div className="w-4 h-1 rounded bg-slate-200 dark:bg-slate-700/80" />
                                                        </div>
                                                        <div className={`w-2 h-1 rounded-full ${t.previewAccent} opacity-80`} />
                                                    </div>
                                                    <div className="flex gap-1 items-end">
                                                        <div className="flex-1 space-y-0.5">
                                                            <div className="w-8 h-1 rounded bg-slate-300 dark:bg-slate-700" />
                                                            <div className="w-6 h-1 rounded bg-slate-200 dark:bg-slate-800" />
                                                        </div>
                                                        <div className="flex gap-0.5 items-end h-6">
                                                            <div className={`w-0.5 h-2 rounded-full ${t.previewAccent} opacity-60`} />
                                                            <div className={`w-0.5 h-4 rounded-full ${t.previewAccent}`} />
                                                            <div className={`w-0.5 h-3 rounded-full ${t.previewAccent} opacity-80`} />
                                                        </div>
                                                    </div>
                                                </div>
 
                                                <div className="flex items-center gap-1.5 mb-1 w-full">
                                                    <span className={`material-symbols-outlined text-[16px] ${
                                                        isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                                    }`}>
                                                        {t.icon}
                                                    </span>
                                                    <span className={`text-xs font-bold transition-colors ${
                                                        isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {t.label}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="ml-auto material-symbols-outlined text-blue-500 dark:text-blue-400 text-sm font-bold">
                                                            check_circle
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal font-normal">
                                                    {t.desc}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {savingProfile
                                        ? <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Saving...</>
                                        : <><span className="material-symbols-outlined text-[16px]">save</span> Save Profile</>
                                    }
                                </button>
                                {profileSaved && <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> Saved!</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Preferences Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Preferences</h3>

                        {/* Appearance Premium Selector */}
                        <div className="pb-6 border-b border-slate-200 dark:border-slate-700 space-y-4">
                            <div>
                                <h4 className="text-md font-semibold text-slate-900 dark:text-white">Appearance</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize the workspace design and interface themes.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    {
                                        key: 'light',
                                        label: 'Corporate Clean (Light)',
                                        icon: 'light_mode',
                                        desc: 'Bright, high-contrast crisp light corporate aesthetic.',
                                        previewClass: 'bg-white border border-slate-200',
                                        previewAccent: 'bg-[#00b8d9]'
                                    },
                                    {
                                        key: 'dark',
                                        label: 'VS Dark (Dark)',
                                        icon: 'dark_mode',
                                        desc: 'Visual Studio Code inspired dark mode. Charcoal background with soft green and classic blue highlights.',
                                        previewClass: 'bg-[#1E1E1E] border border-[#3E3E42]',
                                        previewAccent: 'bg-[#007ACC]'
                                    }
                                ].map((t) => {
                                    const isSelected = theme === t.key;
                                    return (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => handleThemeChange(t.key)}
                                            className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 relative group overflow-hidden ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
                                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-800/10 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
                                            )}
                                            
                                            {/* Mini Mock Dashboard UI Preview inside Card */}
                                            <div className={`w-full h-14 rounded-lg ${t.previewClass} mb-3 p-1.5 flex flex-col justify-between overflow-hidden relative shadow-inner select-none pointer-events-none`}>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex gap-0.5 items-center">
                                                        <div className={`w-1 h-1 rounded-full ${t.previewAccent}`} />
                                                        <div className="w-4 h-1 rounded bg-slate-200 dark:bg-slate-700/80" />
                                                    </div>
                                                    <div className={`w-2 h-1 rounded-full ${t.previewAccent} opacity-80`} />
                                                </div>
                                                <div className="flex gap-1 items-end">
                                                    <div className="flex-1 space-y-0.5">
                                                        <div className="w-8 h-1 rounded bg-slate-300 dark:bg-slate-700" />
                                                        <div className="w-6 h-1 rounded bg-slate-200 dark:bg-slate-800" />
                                                    </div>
                                                    <div className="flex gap-0.5 items-end h-6">
                                                        <div className={`w-0.5 h-2 rounded-full ${t.previewAccent} opacity-60`} />
                                                        <div className={`w-0.5 h-4 rounded-full ${t.previewAccent}`} />
                                                        <div className={`w-0.5 h-3 rounded-full ${t.previewAccent} opacity-80`} />
                                                    </div>
                                                </div>
                                            </div>
 
                                            <div className="flex items-center gap-1.5 mb-1 w-full">
                                                <span className={`material-symbols-outlined text-[16px] ${
                                                    isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                                }`}>
                                                    {t.icon}
                                                </span>
                                                <span className={`text-xs font-bold transition-colors ${
                                                    isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {t.label}
                                                </span>
                                                {isSelected && (
                                                    <span className="ml-auto material-symbols-outlined text-blue-500 dark:text-blue-400 text-sm font-bold">
                                                        check_circle
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal font-normal">
                                                {t.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Language Selector */}
                        <div className="pb-6 border-b border-slate-200 dark:border-slate-700 space-y-4">
                            <div>
                                <h4 className="text-md font-semibold text-slate-900 dark:text-white">Language / Idioma / Idioma</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose the display language for the entire platform. This setting is saved and persists across sessions.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {([
                                    { code: 'en' as Language, label: 'English', flag: '🇺🇸', desc: 'American English — Default platform language.' },
                                    { code: 'es' as Language, label: 'Español', flag: '🇲🇽', desc: 'Español — Idioma para mercados hispanohablantes.' },
                                    { code: 'pt' as Language, label: 'Português', flag: '🇧🇷', desc: 'Português — Idioma para o mercado brasileiro.' },
                                ]).map((lang) => {
                                    const isSelected = language === lang.code;
                                    return (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => setLanguage(lang.code)}
                                            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20'
                                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-800/10 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                                            )}
                                            <div className="flex items-center justify-between w-full mb-2">
                                                <span className="text-2xl">{lang.flag}</span>
                                                {isSelected && (
                                                    <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-[18px]">check_circle</span>
                                                )}
                                            </div>
                                            <span className={`text-sm font-bold ${
                                                isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                            }`}>{lang.label}</span>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">{lang.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h3>
                                    <p className="text-sm text-slate-500">Receive email updates about new auctions.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const next = !notifications;
                                        setNotifications(next);
                                        localStorage.setItem('goauct_notifications', String(next));
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50">
                            <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium text-sm">
                                Log out of all devices
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && isManagerOrAdmin && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <UserManagement />
                </div>
            )}

            {activeTab === 'companies' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        {/* New Company Section (Moved to Top for Visibility) */}
                        <div className="mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Add New Company</h3>
                            <p className="text-sm text-slate-500 mb-6">Register a new business entity to manage separate portfolios and teams.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mb-4">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Company Legal Name *</label>
                                    <input 
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" 
                                        value={newCompanyName}
                                        onChange={e => setNewCompanyName(e.target.value)}
                                        placeholder="e.g. Summit Holdings LLC"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Official Address</label>
                                    <input 
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" 
                                        value={newCompanyAddress}
                                        onChange={e => setNewCompanyAddress(e.target.value)}
                                        placeholder="123 Main St, Tampa, FL"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Primary Contact</label>
                                    <input 
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" 
                                        value={newCompanyContact}
                                        onChange={e => setNewCompanyContact(e.target.value)}
                                        placeholder="Email or Phone Number"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={!newCompanyName.trim() || isCreatingCompany}
                                onClick={async () => {
                                    setIsCreatingCompany(true);
                                    try {
                                        await createCompany(newCompanyName, newCompanyAddress, newCompanyContact);
                                        setNewCompanyName('');
                                        setNewCompanyAddress('');
                                        setNewCompanyContact('');
                                    } catch (err: any) {
                                        alert(`Failed to create company: ${err.message}`);
                                    } finally {
                                        setIsCreatingCompany(false);
                                    }
                                }}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                            >
                                {isCreatingCompany ? (
                                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">add_business</span>
                                )}
                                {isCreatingCompany ? 'Registering...' : 'Register Company'}
                            </button>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Existing Connected Companies</h3>
                        </div>

                        <div className="space-y-4">
                            {companies.map(company => (
                                <div key={company.id} className={`p-4 rounded-xl border flex items-center justify-between ${company.is_active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${company.is_active ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                            <span className="material-symbols-outlined">{company.is_active ? 'domain_verification' : 'domain'}</span>
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-bold ${company.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{company.name}</h4>
                                            <p className="text-xs text-slate-500">ID: {company.id} {company.is_active && '• Active Context'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!company.is_active && (
                                            <button 
                                                onClick={() => selectCompany(company.id)}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                            >
                                                Switch Context
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                if (window.confirm(`Delete company ${company.name}? This will unlink lists associated with it.`)) {
                                                    deleteCompany(company.id);
                                                }
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {companies.length === 0 && (
                                <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    You haven't created any companies yet. Actions will default to your personal profile.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
