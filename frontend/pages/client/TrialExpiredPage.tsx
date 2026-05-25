import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import { AuthService } from '../../services/auth.service';

export const TrialExpiredPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-200 dark:border-rose-800 relative">
                <Clock className="w-12 h-12 text-rose-500" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                7-Day Trial Expired
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mb-8 leading-relaxed">
                We hope you enjoyed exploring the platform! Your 7-day trial period has concluded. To continue using our real-time Live Auctions, Field Missions, and property data tools, please upgrade to a premium plan.
            </p>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl max-w-lg w-full flex flex-col gap-4">
                <button
                    onClick={() => {
                        window.location.href = '/#/client/billing';
                    }}
                    className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-lg"
                >
                    View Upgrade Plans
                </button>
                <button
                    onClick={() => {
                        AuthService.logout();
                    }}
                    className="w-full px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-600 transition-all text-lg"
                >
                    Log Out
                </button>
            </div>
        </div>
    );
};

export default TrialExpiredPage;
