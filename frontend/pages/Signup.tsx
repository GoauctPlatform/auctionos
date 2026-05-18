import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { API_URL } from '../services/httpClient';
import { useAuth } from '../context/AuthContext';

export const Signup: React.FC = () => {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();
    const [searchParams] = useSearchParams();
    const defaultRole = (searchParams.get('role') === 'realtor' ? 'realtor' : searchParams.get('role') === 'agent' ? 'agent_due_diligence' : 'client');

    const [selectedRole, setSelectedRole] = useState(defaultRole);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Registration failed');
            }

            // Auto-login after registration
            const { access_token } = await AuthService.login(formData.email, formData.password);
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
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">

                    {/* Header Gradient */}
                    <div className={`px-8 pt-8 pb-5 bg-gradient-to-br ${gradientClass} text-center cursor-pointer`} onClick={() => navigate('/')}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-white text-[28px]">
                                person_add
                            </span>
                            <span className="text-white font-extrabold text-xl">GoAuct</span>
                        </div>
                        <h1 className="text-white font-bold text-lg">
                            Create Your Account
                        </h1>
                        <p className="text-white/70 text-xs mt-1">
                            Join the GoAuct ecosystem as an investor or realtor
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
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">I want to join as a:</span>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="role" 
                                            value="client" 
                                            checked={selectedRole === 'client'} 
                                            onChange={() => setSelectedRole('client')}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Investor</span>
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
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Realtor Partner</span>
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
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Due Diligence Agent</span>
                                    </label>
                                </div>
                            </div>

                            {/* Full Name */}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Full Name</span>
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
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Email Address</span>
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
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Password</span>
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
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Confirm Password</span>
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

                            {/* Realtor Info Banner */}
                            {isRealtor && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex gap-2">
                                    <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5 shrink-0">info</span>
                                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                                        Your account will be created with <strong>Realtor role</strong>. After registration, your profile will be reviewed and you'll be verified as a GoAuct Partner.
                                    </p>
                                </div>
                            )}
                            
                            {isAgent && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex gap-2">
                                    <span className="material-symbols-outlined text-orange-600 text-[18px] mt-0.5 shrink-0">info</span>
                                    <p className="text-xs text-orange-800 dark:text-orange-300">
                                        Your account will be created with <strong>Due Diligence Agent role</strong>. You will be able to claim field tasks after completing your profile verification.
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full h-11 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-70 ${btnClass}`}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                        Creating account…
                                    </>
                                ) : (
                                    <>
                                        {isRealtor ? 'Register as Realtor' : isAgent ? 'Register as Due Diligence Agent' : 'Create Investor Account'}
                                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                                    </>
                                )}
                            </button>

                            <div className="text-center mt-1">
                                <span className="text-slate-500 dark:text-slate-400 text-sm">Already have an account? </span>
                                <Link
                                    to="/login"
                                    className={`text-sm font-bold hover:underline ${isRealtor ? 'text-emerald-600 dark:text-emerald-400' : isAgent ? 'text-orange-600 dark:text-orange-400' : 'text-primary'}`}
                                >
                                    Sign in
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
