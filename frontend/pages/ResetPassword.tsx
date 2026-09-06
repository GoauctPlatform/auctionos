import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../services/httpClient';
import { useLanguage } from "../context/LanguageContext";

export const ResetPassword: React.FC = () => {
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    React.useEffect(() => {
        // Clear any stale auth data to prevent redirect loops
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage('Password reset successfully!');
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.detail || 'Failed to reset password. The link may have expired.');
            }
        } catch (err: any) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070d1a]">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100 dark:border-slate-700">
                    <span className="material-symbols-outlined text-red-500 text-[48px] mb-4">{t('ResetPassword.erroroutline')}</span>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('ResetPassword.invalidRequest')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">{t('ResetPassword.noResetTokenWasProvi')}</p>
                    <Link to="/forgot-password" title="Go to Forgot Password" className="text-primary font-bold hover:underline">{t('ResetPassword.requestNewLink')}</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070d1a] font-display relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-30 bg-blue-100 dark:bg-blue-900/20`} />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-slate-200 dark:bg-slate-800/30 blur-3xl opacity-40" />
            </div>

            <div className="w-full max-w-[480px] relative z-10">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 overflow-hidden">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="size-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                            <span className="material-symbols-outlined text-[32px]">{t('ResetPassword.password')}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('ResetPassword.resetPassword')}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{t('ResetPassword.pleaseEnterYourNewPa')}</p>
                    </div>

                    {message ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                            <span className="material-symbols-outlined text-emerald-500 text-[40px] mb-3">{t('ResetPassword.checkcircle')}</span>
                            <p className="text-emerald-800 dark:text-emerald-300 font-medium">{message}</p>
                            <p className="text-slate-400 text-xs mt-2">{t('ResetPassword.redirectingToLogin')}</p>
                        </div>
                    ) : (
                        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                            {error && (
                                <div className="text-red-600 dark:text-red-400 text-xs text-center bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-3 rounded-xl">
                                    {error}
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold ml-1">{t('ResetPassword.newPassword')}</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">{t('ResetPassword.lock')}</span>
                                    </span>
                                    <input 
                                        className="w-full rounded-2xl pl-12 h-13 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                                        type="password" 
                                        placeholder="••••••••" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required 
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold ml-1">{t('ResetPassword.confirmNewPassword')}</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">{t('ResetPassword.lockclock')}</span>
                                    </span>
                                    <input 
                                        className="w-full rounded-2xl pl-12 h-13 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                                        type="password" 
                                        placeholder="••••••••" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required 
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-13 bg-primary hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="material-symbols-outlined text-[20px] animate-spin">{t('ResetPassword.progressactivity')}</span>
                                        {t('ResetPassword.updatingPassword')}</>
                                ) : (
                                    <>
                                        {t('ResetPassword.resetPassword')}<span className="material-symbols-outlined text-[20px]">{t('ResetPassword.publishedwithchanges')}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
