import React from 'react';

const AgentDashboard: React.FC = () => {
    return (
        <div>
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
