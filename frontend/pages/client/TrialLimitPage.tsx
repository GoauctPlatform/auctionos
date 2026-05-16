import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const TrialLimitPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-200 dark:border-rose-800">
                <Lock className="w-10 h-10 text-rose-500" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                Live Auctions Locked
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mb-8 leading-relaxed">
                Your 7-day Trial plan does not include access to real-time Live Auctions. 
                Please upgrade your account to a premium tier to unlock this feature and scale your real estate business.
            </p>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl max-w-2xl w-full text-left">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Star className="text-amber-500" /> Unlock Premium Features
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {[
                        'Real-time Live Auctions Access',
                        'Up to 2,000+ Property Views',
                        'Advanced Due Diligence Tasks',
                        'Priority Customer Support',
                        'Add Team Managers & Agents',
                        'Global Search & Attom Integrations'
                    ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{feature}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6 border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => navigate('/billing')}
                        className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                    >
                        View Upgrade Plans
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full sm:w-auto px-8 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-600 transition-all"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrialLimitPage;
