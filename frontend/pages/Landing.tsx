import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RealtorService } from '../services/company.service';

// ─── Feature Card ─────────────────────────────────────────────────────────────

const FeatureCard: React.FC<{ icon: string; title: string; description: string; color: string }> = ({ icon, title, description, color }) => (
    <div className="group relative p-8 rounded-3xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 relative z-10 ${color}`}>
            <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
        </div>
        <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white relative z-10">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm relative z-10">{description}</p>
    </div>
);

// ─── Persona Card ─────────────────────────────────────────────────────────────

const PersonaCard: React.FC<{
    title: string;
    description: string;
    icon: string;
    color: string;
}> = ({ title, description, icon, color }) => (
    <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 ${color}`}>
            <span className="material-symbols-outlined text-white text-[28px]">{icon}</span>
        </div>
        <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium flex-grow">{description}</p>
    </div>
);

// ─── Main Landing Page ────────────────────────────────────────────────────────

export const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [activeHeroTab, setActiveHeroTab] = useState(0);

    const heroLines = [
        "Find the deal before anyone else.",
        "Close faster. Win more listings.",
        "Deliver precise due diligence, on-demand."
    ];

    React.useEffect(() => {
        document.title = 'GoAuct | Real Estate Intelligence Platform';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', 'GoAuct is the premier intelligence platform for real estate investors, realtors, and field agents. Discover tax deeds, liens, foreclosures and build profitable partnerships.');
        }

        const interval = setInterval(() => {
            setActiveHeroTab((prev) => (prev + 1) % heroLines.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const features = [
        { icon: 'gavel', title: 'Live Auctions', description: 'Real-time tracking of tax deeds, liens, and foreclosures with advanced filtering by type and state.', color: 'bg-gradient-to-br from-blue-500 to-blue-600' },
        { icon: 'query_stats', title: 'Property Intelligence', description: 'Every property is instantly evaluated with our proprietary scoring engine, flagging risks and estimating ARV.', color: 'bg-gradient-to-br from-indigo-500 to-indigo-600' },
        { icon: 'notifications_active', title: 'Smart Watchlists', description: 'Personalized My Lists with auction proximity alerts. Get notified when a saved property is days away from auction.', color: 'bg-gradient-to-br from-violet-500 to-violet-600' },
        { icon: 'task_alt', title: 'Task Marketplace', description: 'Hire verified Agent Due Diligence users for field research, photos, and verification directly through the platform.', color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
        { icon: 'school', title: 'Training Academy', description: 'Structured video modules, playbooks, and certification paths to master tax deed investing from beginner to expert.', color: 'bg-gradient-to-br from-amber-500 to-orange-500' },
        { icon: 'groups', title: 'Investor Community', description: 'Join mastermind groups and collaborate with like-minded investors sharing strategies, county insights, and deal flow.', color: 'bg-gradient-to-br from-pink-500 to-rose-500' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#070d1a] font-sans text-slate-900 dark:text-slate-50 overflow-hidden selection:bg-emerald-500 selection:text-white">

            {/* BG Ambience */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[40%] rounded-full bg-blue-500/15 dark:bg-blue-600/10 blur-[130px]" />
                <div className="absolute top-[30%] right-[-5%] w-[35%] h-[35%] rounded-full bg-emerald-500/15 dark:bg-emerald-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[25%] w-[40%] h-[30%] rounded-full bg-violet-500/10 dark:bg-violet-600/8 blur-[140px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed w-full z-50 top-0 bg-white/70 dark:bg-[#070d1a]/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="material-symbols-outlined text-white text-2xl">gavel</span>
                            </div>
                            <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">GoAuct</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <button onClick={() => document.getElementById('personas')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Solutions</button>
                            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Features</button>
                            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Pricing</button>
                            <Link to="/login" className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/signup')} className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                Get Started Free
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Section 1: Hero ───────────────────────────────────────────────────────── */}
            <main className="relative z-10 pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 mb-8">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <span className="text-[11px] font-bold tracking-widest text-blue-700 dark:text-blue-300 uppercase">GoAuct Platform V2</span>
                </div>

                <div className="h-20 sm:h-24 md:h-28 mb-4 flex items-center justify-center">
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 leading-tight">
                        {heroLines[activeHeroTab]}
                    </h1>
                </div>

                <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
                    The intelligence ecosystem for <span className="text-slate-900 dark:text-white font-bold">investors</span>, <span className="text-slate-900 dark:text-white font-bold">realtors</span>, and <span className="text-slate-900 dark:text-white font-bold">field agents</span> to dominate the distressed property market.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button onClick={() => navigate('/signup')} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1">
                        Start for Free
                    </button>
                    <button onClick={() => alert('Demo video placeholder')} className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">play_circle</span>
                        Watch 90s Demo
                    </button>
                </div>
            </main>

            {/* ── Section 2: Social Proof Bar ───────────────────────────────────────────── */}
            <div className="relative z-10 border-y border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all">
                            {/* Placeholder Logos for Trust */}
                            <div className="text-xl font-black tracking-tighter flex items-center gap-1"><span className="material-symbols-outlined">security</span> DATA SECURE</div>
                            <div className="text-xl font-black tracking-tighter flex items-center gap-1"><span className="material-symbols-outlined">domain</span> ATTOM PARTNER</div>
                            <div className="text-xl font-black tracking-tighter flex items-center gap-1"><span className="material-symbols-outlined">map</span> GIS INTEGRATED</div>
                        </div>
                        <div className="flex gap-8">
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-900 dark:text-white">120k+</div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Properties</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-900 dark:text-white">50</div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">States</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-900 dark:text-white">$4B+</div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Asset Value</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section 3: Personas (Pain + Relief) ─────────────────────────────────── */}
            <section id="personas" className="relative z-10 py-24 bg-slate-50 dark:bg-[#070d1a]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold tracking-widest text-sm uppercase block mb-3">Built for Your Workflow</span>
                        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">The GoAuct Ecosystem</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">Whether you're acquiring assets, representing clients, or working the field, we've solved your biggest bottlenecks.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <PersonaCard
                            title="Investors"
                            description="Stop losing deals to information gaps. GoAuct gives you distressed property intelligence, yield estimates, and due diligence resources before the auction gavel drops."
                            icon="trending_up"
                            color="bg-blue-600"
                        />
                        <PersonaCard
                            title="Realtors & Brokers"
                            description="Your clients deserve a competitive edge. Integrate live auction data, MLS verification, and deal scoring into your workflow to close more off-market deals."
                            icon="real_estate_agent"
                            color="bg-indigo-600"
                        />
                        <PersonaCard
                            title="Agent Due Diligence"
                            description="Earn money completing field tasks on your schedule. Investors need local eyes for property photos, condition reports, and verification drives. You deliver the intel."
                            icon="drive_eta"
                            color="bg-emerald-600"
                        />
                    </div>
                </div>
            </section>

            {/* ── Section 4: Feature Showcase ─────────────────────────────────────────── */}
            <section id="features" className="relative z-10 py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold tracking-widest text-sm uppercase block mb-3">Platform Capabilities</span>
                        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">Everything You Need to Win</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map(f => <FeatureCard key={f.title} {...f} />)}
                    </div>
                </div>
            </section>

            {/* ── Section 5: Pricing Teaser ───────────────────────────────────────────── */}
            <section id="pricing" className="relative z-10 py-24 bg-slate-50 dark:bg-[#070d1a] border-t border-slate-100 dark:border-slate-800">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">Simple, Transparent Pricing</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">Start free. Upgrade when you're ready to scale your operations.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                        {/* Trial */}
                        <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Trial</h3>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-6">$0</div>
                            <ul className="space-y-4 mb-8 text-slate-600 dark:text-slate-400 text-sm">
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> 7 Days Access</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-rose-500 text-sm">cancel</span> No Live Auctions</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> 1 Custom Property</li>
                            </ul>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Start Free</button>
                        </div>

                        {/* Advanced */}
                        <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Advanced</h3>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">$60<span className="text-sm font-medium opacity-80">/mo</span></div>
                            <p className="text-slate-500 text-xs mb-6">Individual investors</p>
                            <ul className="space-y-4 mb-8 text-slate-600 dark:text-slate-400 text-sm">
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> 2,000 Property Searches</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Live Auctions Access</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Search Automation</li>
                            </ul>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">Get Advanced</button>
                        </div>

                        {/* Pro */}
                        <div className="p-8 rounded-3xl bg-blue-600 text-white shadow-xl transform lg:-translate-y-4 relative">
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">Most Popular</div>
                            <h3 className="text-xl font-bold mb-2">Pro Investor</h3>
                            <div className="text-3xl font-black mb-1">$130<span className="text-sm font-medium opacity-80">/mo</span></div>
                            <p className="text-blue-200 text-xs mb-6">Small teams & agents</p>
                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> 5,000 Property Searches</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> 100 Custom Properties</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> Add up to 3 Users</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> Tasks & Exports</li>
                            </ul>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-all shadow-md">Get Pro</button>
                        </div>

                        {/* Enterprise */}
                        <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enterprise</h3>
                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">$350<span className="text-sm font-medium text-slate-500">/mo</span></div>
                            <p className="text-slate-500 text-xs mb-6">For high-volume teams</p>
                            <ul className="space-y-4 mb-8 text-slate-600 dark:text-slate-400 text-sm">
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Unlimited Searches</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Unlimited Properties</li>
                                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Unlimited Users</li>
                            </ul>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Contact Sales</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 6: Trust & Security ─────────────────────────────────────────── */}
            <section className="relative z-10 py-16 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Enterprise-Grade Security & Reliability</h3>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-slate-400">lock</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">256-bit Encryption</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-slate-400">verified_user</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">Auth0 Powered</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-slate-400">backup</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">Daily Automated Backups</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 7: CTA Footer ───────────────────────────────────────────────── */}
            <section className="relative z-10 py-24 bg-gradient-to-br from-blue-600 to-indigo-700 border-t border-blue-500">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <span className="material-symbols-outlined text-6xl text-white mb-6 opacity-80 block">rocket_launch</span>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                        Join thousands of professionals already using GoAuct.
                    </h2>
                    <p className="text-xl text-blue-100 font-medium mb-10 max-w-2xl mx-auto">
                        Stop guessing. Start investing with precision. Create your free account today and experience the difference.
                    </p>
                    <button onClick={() => navigate('/signup')} className="px-10 py-5 bg-white text-blue-700 rounded-2xl font-black text-xl hover:bg-blue-50 transition-all shadow-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:-translate-y-1">
                        Create Free Account
                    </button>
                    <p className="text-blue-200 text-sm mt-6 font-medium">No credit card required for the 7-day trial.</p>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="relative z-10 bg-slate-900 dark:bg-[#04080f] pt-20 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-blue-500 text-3xl">gavel</span>
                                <span className="font-extrabold text-white text-2xl">GoAuct</span>
                            </div>
                            <p className="text-slate-400 font-medium max-w-sm leading-relaxed text-sm">
                                The premier intelligence platform connecting real estate investors, realtors, and field agents — all within one powerful ecosystem.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-wide text-sm uppercase">Platform</h4>
                            <ul className="space-y-3 text-slate-400 text-sm">
                                <li><Link to="/signup" className="hover:text-blue-400 transition-colors">Sign Up</Link></li>
                                <li><Link to="/login" className="hover:text-blue-400 transition-colors">Sign In</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-wide text-sm uppercase">Ecosystem</h4>
                            <ul className="space-y-3 text-slate-400 text-sm">
                                <li><Link to="/connect/tax-systems" className="hover:text-blue-400 transition-colors">Tax Systems</Link></li>
                                <li><Link to="/connect/training" className="hover:text-blue-400 transition-colors">Training</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-wide text-sm uppercase">Legal</h4>
                            <ul className="space-y-3 text-slate-400 text-sm">
                                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                                <li><Link to="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-slate-500 text-sm">© {new Date().getFullYear()} GoAuct Intelligence OS. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
