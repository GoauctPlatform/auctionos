import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const AgentDashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    useEffect(() => {
        if (searchParams.get('welcome') === 'true') {
            setShowWelcomeModal(true);
        }
    }, [searchParams]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 relative">

            {/* Welcome Modal overlay */}
            {showWelcomeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl text-orange-600 dark:text-orange-400">directions_car</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to GoAuct!</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8">
                    Your Field Agent account is active. You can now view field tasks, capture property media, and earn payouts directly to your account.
                    </p>
                    <button 
                    onClick={() => {
                        setShowWelcomeModal(false);
                        setSearchParams({});
                    }} 
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98]"
                    >
                    Go to Dashboard
                    </button>
                </div>
                </div>
            )}

            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Dashboard</h1>
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase">Pending Tasks</h3>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">0</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase">Completed Tasks</h3>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">0</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase">Available Earnings</h3>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">$0.00</p>
                </div>
            </div>
        </div>
    );
};
export default AgentDashboard;
