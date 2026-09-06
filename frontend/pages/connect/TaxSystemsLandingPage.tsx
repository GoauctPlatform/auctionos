import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from "../../context/LanguageContext";

export const TaxSystemsLandingPage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [totalTracked, setTotalTracked] = useState<number | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/scores/stats/state`);
                if (res.ok) {
                    const data = await res.json();
                    const sum = data.reduce((acc: number, curr: any) => acc + curr.volume, 0);
                    setTotalTracked(sum);
                }
            } catch (e) {
                console.error("Failed to fetch state stats", e);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] font-sans text-slate-900 dark:text-slate-50">
            {/* Simple Navbar */}
            <nav className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    <button onClick={() => navigate('/')} className="font-bold flex items-center gap-2 hover:text-blue-500 transition-colors">
                        <span className="material-symbols-outlined">{t('TaxSystemsLandingPage.arrowback')}</span>
                        {t('TaxSystemsLandingPage.backToGoAuct')}</button>
                    <button onClick={() => navigate('/signup')} className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        {t('TaxSystemsLandingPage.createAccount')}</button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <span className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-2 block">{t('TaxSystemsLandingPage.knowledgeBase')}</span>
                    <h1 className="text-4xl md:text-6xl font-black mb-6">{t('TaxSystemsLandingPage.uSTaxSaleSystems')}</h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 font-medium">
                        {t('TaxSystemsLandingPage.understandTheLegalSt')}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 shadow-sm">
                    <h2 className="text-2xl font-bold mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">{t('TaxSystemsLandingPage.theComplexityOfState')}</h2>
                    <p className="mb-6 leading-relaxed text-slate-700 dark:text-slate-300">
                        {t('TaxSystemsLandingPage.unlikeTraditionalRea')}</p>
                    
                    <div className="grid md:grid-cols-3 gap-8 my-10">
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                            <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-2 text-lg">{t('TaxSystemsLandingPage.1TaxLiens')}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{t('TaxSystemsLandingPage.investorsPurchaseThe')}</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-800/30">
                            <h3 className="font-bold text-purple-800 dark:text-purple-400 mb-2 text-lg">{t('TaxSystemsLandingPage.2TaxDeeds')}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{t('TaxSystemsLandingPage.theCountyDirectlyFor')}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                            <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2 text-lg">{t('TaxSystemsLandingPage.3RedeemableDeeds')}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{t('TaxSystemsLandingPage.aHybridModelEGTexasG')}</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-4 mt-8">{t('TaxSystemsLandingPage.trainingModulesOverv')}</h2>
                    <div className="space-y-4 mb-10">
                        {[
                            { title: "Module 1: The Sovereign Right to Tax", desc: "Understanding the priority of tax liens over mortgages.", time: "15 min read" },
                            { title: "Module 2: State-by-State Structuring", desc: "Navigating the 50-state matrix and identifying high-yield vs high-acquisition models.", time: "25 min read" },
                            { title: "Module 3: Overages & Surplus Funds", desc: "How excess bids are handled and strategies for surplus recovery.", time: "20 min read" },
                            { title: "Module 4: Risk Mitigation & Quiet Title", desc: "The legal process to secure insurable title post-tax sale.", time: "30 min read" },
                        ].map((mod, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition bg-white dark:bg-slate-800">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{mod.title}</h4>
                                    <p className="text-sm text-slate-500">{mod.desc}</p>
                                </div>
                                <div className="mt-2 sm:mt-0 flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{mod.time}</span>
                                    <button onClick={() => navigate('/signup')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">{t('TaxSystemsLandingPage.startRarr')}</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2 className="text-2xl font-bold mb-4">{t('TaxSystemsLandingPage.goAuctIntegration')}</h2>
                    <p className="mb-6 leading-relaxed text-slate-700 dark:text-slate-300">
                        {t('TaxSystemsLandingPage.insteadOfManuallyTra')}{totalTracked !== null && totalTracked > 0 && (
                            <span className="block mt-4 font-bold text-emerald-600 dark:text-emerald-400">
                                {t('TaxSystemsLandingPage.over')}{totalTracked.toLocaleString()} {t('TaxSystemsLandingPage.assetsCurrentlyTrack')}</span>
                        )}
                    </p>

                    <div className="mt-12 text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-4xl text-emerald-500 mb-4">{t('TaxSystemsLandingPage.dataset')}</span>
                        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{t('TaxSystemsLandingPage.wantTheFullStateBySt')}</h3>
                        <p className="text-slate-500 mb-6">{t('TaxSystemsLandingPage.ourInvestorsGetAcces')}</p>
                        <button onClick={() => navigate('/signup')} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">
                            {t('TaxSystemsLandingPage.joinGoAuctHub')}</button>
                    </div>
                </div>
            </main>
        </div>
    );
};
