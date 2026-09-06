import React from 'react';
import { useLanguage } from "../../context/LanguageContext";

const AgentWithdraw: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">{t('AgentWithdraw.earningsWithdrawals')}</h1>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-4 text-slate-300 dark:text-slate-600">{t('AgentWithdraw.accountbalancewallet')}</span>
                <p>{t('AgentWithdraw.youHaveNotEarnedAnyC')}</p>
            </div>
        </div>
    );
};
export default AgentWithdraw;
