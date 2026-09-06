import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import { useLanguage } from "../../context/LanguageContext";

export const TrialExpiredPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Prevent browser back button from accessing workbench
    useEffect(() => {
        // Push a new history entry to prevent back navigation
        window.history.pushState(null, '', window.location.href);
        
        const handlePopState = (event: PopStateEvent) => {
            // If user tries to go back, stay on expired page
            window.history.pushState(null, '', window.location.href);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleUpgrade = () => {
        navigate('/client/billing');
    };

    const handleLogout = () => {
        AuthService.logout();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-lg">
                {/* Icon Container */}
                <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center shadow-lg border border-rose-200 dark:border-rose-800 relative">
                        <Clock className="w-12 h-12 text-rose-500" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border border-rose-200 dark:border-rose-800">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                </div>
                
                {/* Heading */}
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                    {t('TrialExpiredPage.trialExpired')}</h1>
                
                {/* Message */}
                <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-lg mb-2 leading-relaxed">
                    {t('TrialExpiredPage.your7DayTrialPeriodH')}</p>
                
                <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
                    {t('TrialExpiredPage.youLlMaintainAccessT')}</p>

                {/* CTA Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl mb-6">
                    <button
                        onClick={handleUpgrade}
                        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 text-lg flex items-center justify-center gap-2 group"
                    >
                        {t('TrialExpiredPage.viewUpgradePlans')}<ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition-all text-base"
                >
                    {t('TrialExpiredPage.logOut')}</button>

                {/* Info Footer */}
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-8">
                    {t('TrialExpiredPage.questionsContactOur')}<a href="/#/support" className="text-blue-600 dark:text-blue-400 hover:underline">{t('TrialExpiredPage.supportTeam')}</a>.
                </p>
            </div>
        </div>
    );
};

export default TrialExpiredPage;
