import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../services/httpClient';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
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
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(data.message);
            } else {
                setError(data.detail || 'Failed to send reset link.');
            }
        } catch (err: any) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070d1a] font-display relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-30 bg-blue-100 dark:bg-blue-900/20`} />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-slate-200 dark:bg-slate-800/30 blur-3xl opacity-40" />
            </div>

            <div className="w-full max-w-[480px] relative z-10">
                <div className="mb-6">
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back to Login
                    </Link>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 overflow-hidden">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="size-14 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined text-[32px]">lock_reset</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Forgot Password?</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Enter your email to receive a password reset link.</p>
                    </div>

                    {message ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                            <span className="material-symbols-outlined text-emerald-500 text-[40px] mb-3">mark_email_read</span>
                            <p className="text-emerald-800 dark:text-emerald-300 font-medium">{message}</p>
                            <Link to="/login" className="inline-block mt-6 text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                                Return to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="text-red-600 dark:text-red-400 text-xs text-center bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-3 rounded-xl">
                                    {error}
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold ml-1">Email Address</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">mail</span>
                                    </span>
                                    <input 
                                        className="w-full rounded-2xl pl-12 h-13 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
                                        type="email" 
                                        placeholder="name@company.com" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-13 bg-primary hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                                        Sending Link...
                                    </>
                                ) : (
                                    <>
                                        Send Reset Link
                                        <span className="material-symbols-outlined text-[20px]">send</span>
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