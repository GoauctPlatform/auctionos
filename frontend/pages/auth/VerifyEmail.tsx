import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { CheckCircle, AlertTriangle, Mail, ArrowRight, Loader2 } from 'lucide-react';

const VerifyEmail: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link. Please request a new one.');
            return;
        }

        const verify = async () => {
            try {
                const res = await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage(res.data.message);
                
                // Optional: Update local user state if logged in
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.is_verified = true;
                    localStorage.setItem('user', JSON.stringify(user));
                }

                // Redirect after 3 seconds
                setTimeout(() => navigate('/client'), 3000);
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.detail || 'Verification failed. The link might be expired.');
            }
        };

        verify();
    }, [location, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                
                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Verifying Account...</h1>
                        <p className="text-slate-500">Please wait while we confirm your email address.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Email Verified!</h1>
                        <p className="text-slate-500">{message}</p>
                        <p className="text-xs text-slate-400 mt-2">Redirecting you to the dashboard...</p>
                        <Link 
                            to="/client"
                            className="mt-6 inline-flex items-center gap-2 text-blue-500 font-bold hover:gap-3 transition-all"
                        >
                            Go to Dashboard <ArrowRight size={18} />
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-2">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Verification Failed</h1>
                        <p className="text-slate-500">{message}</p>
                        
                        <div className="flex flex-col gap-3 w-full mt-6">
                            <Link 
                                to="/login"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                            >
                                Back to Login
                            </Link>
                            <p className="text-xs text-slate-400">
                                Need help? Contact <a href="mailto:support@goauct.com" className="text-blue-500">support@goauct.com</a>
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default VerifyEmail;
