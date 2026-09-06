import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { API_URL } from '../services/httpClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const defaultRole = (searchParams.get('role') === 'realtor' ? 'realtor' : searchParams.get('role') === 'agent' ? 'agent_due_diligence' : 'client');

    const [selectedRole, setSelectedRole] = useState(defaultRole);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        referralCode: searchParams.get('ref') || '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [newsletter, setNewsletter] = useState(true);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!acceptedTerms) {
            setError('You must accept the Terms of Use to register.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.fullName,
                    role: selectedRole,
                    newsletter: newsletter,
                    referral_code: formData.referralCode || undefined,
                    affiliate_code: localStorage.getItem('goauct_affiliate_code') || undefined,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Registration failed');
            }

            // Auto-login after registration
            const { access_token } = await AuthService.login(formData.email, formData.password);
            localStorage.setItem('token', access_token);
            const user = await AuthService.getMe();
            authLogin(access_token, user);

            // Redirect all new users to the onboarding flow
            navigate('/onboarding');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isRealtor = selectedRole === 'realtor';
    const isAgent = selectedRole === 'agent_due_diligence';
    const isPartner = isRealtor || isAgent;
    
    const gradientClass = isRealtor
        ? 'from-emerald-500 to-teal-600'
        : isAgent 
        ? 'from-orange-500 to-red-600'
        : 'from-blue-600 to-indigo-600';
        
    const btnClass = isRealtor
        ? 'bg-emerald-600 hover:bg-emerald-700'
        : isAgent
        ? 'bg-orange-600 hover:bg-orange-700'
        : 'bg-primary hover:bg-blue-700';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070d1a] relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className={`absolute top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-25 ${isRealtor ? 'bg-emerald-200 dark:bg-emerald-900' : isAgent ? 'bg-orange-200 dark:bg-orange-900' : 'bg-blue-100 dark:bg-blue-900/20'}`} />
                <div className="absolute bottom-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-slate-200 dark:bg-slate-800/30 blur-3xl opacity-40" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="absolute top-0 right-0 -mt-12">
                    <LanguageSwitcher />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">

                    {/* Header Gradient */}
                    <div className={`px-8 pt-8 pb-5 bg-gradient-to-br ${gradientClass} text-center cursor-pointer`} onClick={() => navigate('/')}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-md p-1">
                                <img src="/goauct-logo.png" alt="GoAuct Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-white font-extrabold text-xl">{t('Signup.goAuct')}</span>
                        </div>
                        <h1 className="text-white font-bold text-lg">
                            {t('auth.signup')}
                        </h1>
                        <p className="text-white/70 text-xs mt-1">
                            {t('auth.signupSubtitle')}
                        </p>
                    </div>

                    <div className="px-8 py-7">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {error && (
                                <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-3 rounded-xl">
                                    {error}
                                </div>
                            )}

                            {/* Role Selection */}
                            <div className="flex flex-col gap-1.5 mb-2">
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">{t('Signup.iWantToJoinAsA')}</span>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="role" 
                                            value="client" 
                                            checked={selectedRole === 'client'} 
                                            onChange={() => setSelectedRole('client')}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{t('Signup.investor')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="role" 
                                            value="realtor" 
                                            checked={selectedRole === 'realtor'} 
                                            onChange={() => setSelectedRole('realtor')}
                                            className="text-emerald-600 focus:ring-emerald-600"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{t('Signup.realtor')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="role" 
                                            value="agent_due_diligence" 
                                            checked={selectedRole === 'agent_due_diligence'} 
                                            onChange={() => setSelectedRole('agent_due_diligence')}
                                            className="text-orange-600 focus:ring-orange-600"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{t('Signup.fieldAgent')}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="role" 
                                            value="contractor" 
                                            checked={selectedRole === 'contractor'} 
                                            onChange={() => setSelectedRole('contractor')}
                                            className="text-indigo-600 focus:ring-indigo-600"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{t('Signup.contractor')}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Full Name */}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">{t('auth.fullName')}</span>
                                <input
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white h-11 px-4 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder={isPartner ? 'Your full name' : 'John Doe'}
                                    required
                                />
                            </label>

                            {/* Email */}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">{t('auth.email')}</span>
                                <input
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white h-11 px-4 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder={isPartner ? 'partner@email.com' : 'john@example.com'}
                                    required
                                />
                            </label>

                            {/* Password */}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">{t('auth.password')}</span>
                                <input
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white h-11 px-4 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                            </label>

                            {/* Confirm Password */}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">{t('auth.confirmPassword')}</span>
                                <input
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white h-11 px-4 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                            </label>

                            {/* Referral Code */}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">{t('auth.referralCode')}</span>
                                <input
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white h-11 px-4 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow uppercase"
                                    type="text"
                                    name="referralCode"
                                    value={formData.referralCode}
                                    onChange={handleChange}
                                    placeholder="e.g. GUS-1A2B"
                                />
                            </label>

                            {/* Realtor Info Banner */}
                            {isRealtor && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex gap-2">
                                    <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5 shrink-0">{t('Signup.info')}</span>
                                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                        {t('Signup.yourAccountWillBeCre')}<strong>{t('Signup.realtorPartner')}</strong>{t('Signup.YouMustPossessAValid')}</p>
                                </div>
                            )}
                            
                            {isAgent && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex gap-2">
                                    <span className="material-symbols-outlined text-orange-600 text-[18px] mt-0.5 shrink-0">{t('Signup.info')}</span>
                                    <p className="text-xs text-orange-800 dark:text-orange-300">
                                        {t('Signup.yourAccountWillBeCre')}<strong>{t('Signup.fieldAgent')}</strong>{t('Signup.YouMustHaveAValidUSW')}</p>
                                </div>
                            )}

                            {selectedRole === 'contractor' && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex gap-2">
                                    <span className="material-symbols-outlined text-indigo-600 text-[18px] mt-0.5 shrink-0">{t('Signup.info')}</span>
                                    <p className="text-xs text-indigo-800 dark:text-indigo-300">
                                        {t('Signup.yourAccountWillBeCre')}<strong>{t('Signup.maintenancePartner')}</strong>{t('Signup.YouWillBeAbleToOffer')}</p>
                                </div>
                            )}

                            {/* Terms and Newsletter */}
                            <div className="flex flex-col gap-3 mt-2">
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        className="mt-0.5 text-primary focus:ring-primary rounded border-slate-300"
                                    />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">
                                        {t('Signup.iAcceptThe')}<a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{t('Signup.termsOfUse')}</a> {t('Signup.and')}<a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{t('Signup.privacyPolicy')}</a>{t('Signup.text176')}</span>
                                </label>
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={newsletter}
                                        onChange={(e) => setNewsletter(e.target.checked)}
                                        className="mt-0.5 text-primary focus:ring-primary rounded border-slate-300"
                                    />
                                    <span className="text-xs text-slate-600 dark:text-slate-400">
                                        {t('Signup.sendMeUpdatesTipsAnd')}</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full h-11 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-70 ${btnClass}`}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="material-symbols-outlined text-[18px] animate-spin">{t('Signup.progressactivity')}</span>
                                        {t('Signup.creatingAccount')}</>
                                ) : (
                                    <>
                                        {isRealtor ? 'Register as Realtor' : isAgent ? 'Register as Due Diligence Agent' : 'Create Investor Account'}
                                        <span className="material-symbols-outlined text-[18px]">{t('Signup.personadd')}</span>
                                    </>
                                )}
                            </button>

                            <div className="text-center mt-1">
                                <span className="text-slate-500 dark:text-slate-400 text-sm">{t('Signup.alreadyHaveAnAccount')}</span>
                                <Link
                                    to="/login"
                                    className={`text-sm font-bold hover:underline ${isRealtor ? 'text-emerald-600 dark:text-emerald-400' : isAgent ? 'text-orange-600 dark:text-orange-400' : 'text-primary'}`}
                                >
                                    {t('Signup.signIn')}</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
