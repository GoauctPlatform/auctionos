import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from "../../context/LanguageContext";

export const TrainingLandingPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/leads/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'training-preregistration' })
            });

            if (res.ok) {
                setSubmitted(true);
                setEmail('');
            }
        } catch (error) {
            console.error("Failed to submit lead", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] font-sans text-slate-900 dark:text-slate-50">
            {/* Simple Navbar */}
            <nav className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    <button onClick={() => navigate('/')} className="font-bold flex items-center gap-2 hover:text-emerald-500 transition-colors">
                        <span className="material-symbols-outlined">{t('TrainingLandingPage.arrowback')}</span>
                        {t('TrainingLandingPage.backToGoAuct')}</button>
                    <button onClick={() => navigate('/signup')} className="text-sm font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                        {t('TrainingLandingPage.createAccount')}</button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <span className="text-emerald-500 font-bold uppercase tracking-widest text-sm mb-2 block">{t('TrainingLandingPage.premiumEducation')}</span>
                    <h1 className="text-4xl md:text-6xl font-black mb-6">{t('TrainingLandingPage.investorTrainingCore')}</h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
                        {t('TrainingLandingPage.masterTheTacticalExe')}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 shadow-sm">
                    
                    <div className="mb-12 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-4">{t('TrainingLandingPage.beyondTheData')}</h2>
                            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                                {t('TrainingLandingPage.havingTheBestAlgorit')}</p>
                        </div>
                        <div className="w-full md:w-64 h-48 bg-slate-200 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                            <div className="absolute inset-0 bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors z-0"></div>
                            <span className="material-symbols-outlined text-6xl text-white relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform">{t('TrainingLandingPage.playcircle')}</span>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mb-6">{t('TrainingLandingPage.curriculumHighlights')}</h3>
                    <div className="space-y-4 mb-12">
                        {[
                            { title: 'Module 1: The Due Diligence Matrix', desc: 'Understanding title logic, super-liens, and structural risks the machine flags.' },
                            { title: 'Module 2: Remote Bidding Infrastructure', desc: 'Setting up proxy networks and capital deployment rails.' },
                            { title: 'Module 3: Portfolio Lifecycle', desc: 'What happens after you win. Post-auction quiet title and liquidation workflows.' }
                        ].map((m, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                <div className="mt-1 font-black text-emerald-500">0{i+1}</div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{m.title}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{m.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center p-8 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                        <span className="material-symbols-outlined text-4xl text-emerald-600 dark:text-emerald-400 mb-4">{t('TrainingLandingPage.diamond')}</span>
                        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{t('TrainingLandingPage.includedWithClientAc')}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">{t('TrainingLandingPage.theFullInvestorCurri')}</p>
                        
                        <div className="flex flex-col md:flex-row justify-center items-center gap-6">
                            <button onClick={() => navigate('/signup')} className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transform whitespace-nowrap">
                                {t('TrainingLandingPage.unlockPlatformTraini')}</button>
                            
                            <span className="text-slate-400 font-bold text-sm">OR</span>
                            
                            <form className="flex w-full md:w-auto" onSubmit={handleFormSubmit}>
                                {submitted ? (
                                    <div className="bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center w-full">
                                        <span className="material-symbols-outlined mr-2">{t('TrainingLandingPage.checkcircle')}</span>
                                        {t('TrainingLandingPage.youReOnTheList')}</div>
                                ) : (
                                    <div className="flex w-full">
                                        <input 
                                            type="email" 
                                            placeholder="Get notified of next cohort..." 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="px-4 py-3 rounded-l-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white font-medium min-w-[250px]"
                                        />
                                        <button 
                                            disabled={submitting} 
                                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-6 py-3 rounded-r-xl hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {submitting ? '...' : 'Notify Me'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
