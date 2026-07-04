import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface AboutPageProps {
  standalone?: boolean;
}

// ─── Shared Stats Widget ──────────────────────────────────────────────────────
const StatsGrid: React.FC = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { value: "50", label: "States Covered" },
            { value: "3,100+", label: "Counties Mapped" },
            { value: "600k+", label: "Active Distressed Parcels" },
            { value: "$4B+", label: "Asset Value Monitored" }
        ].map(stat => (
            <div key={stat.label} className="p-5 bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-sm backdrop-blur-md text-center hover:-translate-y-1 transition-transform">
                <h4 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-white dark:to-slate-300">{stat.value}</h4>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mt-1">{stat.label}</p>
            </div>
        ))}
    </div>
);

// ─── Team Leadership Grid ─────────────────────────────────────────────────────
const TeamGrid: React.FC = () => (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {[
            { name: "Gustavo Gomes", role: "Co-Founder & Developer", desc: "Distressed-asset investment authority with 15+ years managing nationwide institutional property portfolios. Leads technical direction and execution.", icon: "terminal" },
            { name: "Ricardo Cabral", role: "Co-Founder & Investor", desc: "Strategic operations and investment specialist. Leads institutional relations, deal flow acquisition, and macro-level asset scaling strategies.", icon: "leaderboard" }
        ].map(member => (
            <div key={member.name} className="p-6 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">{member.icon}</span>
                    </div>
                    <h4 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{member.name}</h4>
                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest block mt-0.5 mb-3">{member.role}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{member.desc}</p>
                </div>
            </div>
        ))}
    </div>
);

// ─── Platform Defensibility / Architecture Blueprint ──────────────────────────
const TechnicalBlueprint: React.FC = () => (
    <div className="grid md:grid-cols-2 gap-8 items-stretch">
        <div className="p-8 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">settings_suggest</span>
                Technical Defensibility
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                GoAuct is built to resolve data friction and information asymmetry. By normalising thousands of disparate county data formats into a unified operational command center, the platform ensures transactional clarity at scale.
            </p>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400 list-none pl-0">
                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-blue-500 text-xs mt-0.5">verified</span> <strong>Multi-Tenant Silos:</strong> Strict PostgreSQL tenant isolation guarantees company-level asset protection.</li>
                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-blue-500 text-xs mt-0.5">verified</span> <strong>Asynchronous Pipelines:</strong> Redis and Celery process long-running structural enrichment tasks without UI thread blocking.</li>
                <li className="flex items-start gap-2"><span className="material-symbols-outlined text-blue-500 text-xs mt-0.5">verified</span> <strong>GPS Geo-Validation:</strong> Field agent submissions require a verified 50-meter GPS radius check to guarantee data truth.</li>
            </ul>
        </div>
        <div className="p-8 bg-gradient-to-br from-indigo-900/90 to-blue-900 text-white rounded-3xl space-y-4 flex flex-col justify-between relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />
            <div className="space-y-3 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Strategic Product Vision</span>
                <h3 className="text-xl sm:text-2xl font-black leading-tight">AI & Automation Inception</h3>
                <p className="text-xs text-blue-100 leading-relaxed font-medium">
                    Our platform is built ready for machine learning layers. The normalized data enables future predictive modeling for winning auction bids, Computer Vision analysis for structural roof damage detection, and smart hazard indicators.
                </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                <span className="bg-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Winning Bid Prediction</span>
                <span className="bg-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Computer Vision BPO</span>
            </div>
        </div>
    </div>
);

// ─── Embedded Client View (Logged In inside Dashboard) ───────────────────────
const ClientAboutView: React.FC = () => {
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
            {/* Main Title Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img src="/goauct-logo.png" alt="GoAuct Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">GoAuct Intelligence OS</h1>
                            <p className="text-xs text-blue-400 uppercase tracking-widest font-black">Distressed Property Operating System</p>
                        </div>
                    </div>

                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-medium">
                        A high-performance PropTech platform built to empower investors, realtors, and field agents with clean data pipelines, GPS-radius task mediation, and nationwide auction synchronization.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <StatsGrid />

            {/* Corporate Leadership Team */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Executive Leadership</h3>
                <TeamGrid />
            </div>

            {/* Architecture Details */}
            <TechnicalBlueprint />
        </div>
    );
};

// ─── Standalone Public View (Logged Out) ──────────────────────────────────────
const PublicAboutView: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-50 overflow-hidden pt-24 pb-12">
            
            <main className="flex-1 space-y-24">
                {/* Hero */}
                <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Our Corporate Mission
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-6">
                        Bridging Data with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Real-World Execution</span>
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed">
                        GoAuct is a vertical PropTech ecosystem designed to solve the critical gap between fragmented public auction records and actionable real-world investments.
                    </p>
                </section>

                {/* The Numbers */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6">
                    <StatsGrid />
                </section>

                {/* Corporate Team */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
                    <div className="text-center">
                        <span className="text-xs font-black uppercase text-indigo-500 tracking-widest block mb-2">Qualified Leadership</span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">The GoAuct Executive Team</h2>
                    </div>
                    <TeamGrid />
                </section>

                {/* Technical Architecture */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6">
                    <TechnicalBlueprint />
                </section>

                {/* The Problem / Solution Pattern */}
                <section className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-8 rounded-3xl space-y-3">
                            <span className="material-symbols-outlined text-rose-500 text-4xl">cancel</span>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">The Fragmented Past</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Investors spent hundreds of hours scrubbing county portals, cross-referencing outdated PDFs, and driving miles for basic property updates with zero verified data safety.
                            </p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-8 rounded-3xl space-y-3">
                            <span className="material-symbols-outlined text-emerald-500 text-4xl">check_circle</span>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">The GoAuct Command</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Real-time nationwide synchronization, data-driven deal scoring, unified watchlists, and an on-demand GPS geo-validated field marketplace to verify Structure health from your desk.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="text-center px-4 max-w-3xl mx-auto space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">Secure your strategic platform advantage.</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">Join GoAuct today and Master distressed asset operations with premium data precision.</p>
                    <button 
                        onClick={() => navigate('/signup')}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all"
                    >
                        Start Your Free Trial
                    </button>
                </section>
            </main>
        </div>
    );
};

// ─── Main Switch ──────────────────────────────────────────────────────────────
const AboutPage: React.FC<AboutPageProps> = ({ standalone = true }) => {
  if (!standalone) {
    return <ClientAboutView />;
  }

  return <PublicAboutView />;
};

export default AboutPage;
