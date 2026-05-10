import React from 'react';

const AgentTasks: React.FC = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Available Tasks</h1>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-4 text-slate-300 dark:text-slate-600">location_off</span>
                <p>No geo-tasks available in your coverage area right now.</p>
            </div>
        </div>
    );
};
export default AgentTasks;
