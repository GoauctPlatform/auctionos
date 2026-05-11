import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// ─── Reusable Components ──────────────────────────────────────────────────

const TrustCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="p-8 rounded-2xl bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 group">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors">{icon}</span>
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">{description}</p>
    </div>
);

// ─── Main Landing Page ────────────────────────────────────────────────────

export const Landing: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'GoAuct | The OS for Distressed Property Investment';
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050B14] font-sans text-slate-900 dark:text-slate-50 overflow-hidden selection:bg-blue-500 selection:text-white">

            {/* Navbar */}
            <nav className="fixed w-full z-50 top-0 bg-white/80 dark:bg-[#050B14]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="material-symbols-outlined text-white text-2xl">gavel</span>
                            </div>
                            <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">GoAuct</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <button onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Platform</button>
                            <button onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Workflow</button>
                            <button onClick={() => document.getElementById('field-agents')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Field Operations</button>
                            <button onClick={() => document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Security</button>
                            <Link to="/login" className="text-sm font-bold text-slate-900 dark:text-white hover:opacity-70 transition-opacity">Sign In</Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/signup')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm transition-all hover:bg-blue-700 shadow-md">
                                Start Trial
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Section 1: Hero ───────────────────────────────────────────────────────── */}
            <main className="relative z-10 pt-40 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-8">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    <span className="text-[11px] font-bold tracking-widest text-blue-700 dark:text-blue-400 uppercase">Enterprise Grade Intelligence</span>
                </div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-8 max-w-5xl mx-auto">
                    The Operating System for Distressed Property Investment
                </h1>

                <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
                    Research, organize, manage and scale tax deed and foreclosure operations across the United States.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button onClick={() => navigate('/signup')} className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/20">
                        Start Trial
                    </button>
                    <button onClick={() => alert('Demo Request Form will open here')} className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        Book a Demo
                    </button>
                </div>
            </main>

            {/* ── Section 3: Dashboard Showcase (Video Placeholder) ────────────────── */}
            <section id="platform" className="relative z-10 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="w-full aspect-video bg-[#0b1120] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative group cursor-pointer flex items-center justify-center">
                    {/* Placeholder for commercial video */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-slate-900/50" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
                    
                    <div className="z-10 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-blue-600/90 backdrop-blur rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                            <span className="material-symbols-outlined text-white text-4xl ml-2">play_arrow</span>
                        </div>
                        <p className="text-white/70 font-bold uppercase tracking-widest text-sm">Watch Platform Overview</p>
                    </div>

                    {/* Faux UI Header for styling */}
                    <div className="absolute top-0 left-0 w-full h-12 border-b border-slate-800/50 bg-[#050B14]/80 backdrop-blur flex items-center px-6 gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-700" />
                        <div className="w-3 h-3 rounded-full bg-slate-700" />
                        <div className="w-3 h-3 rounded-full bg-slate-700" />
                    </div>
                </div>
            </section>

            {/* ── Section 2: Trust & Capabilities ─────────────────────────────────────── */}
            <section className="relative z-10 py-24 bg-white dark:bg-[#0b1120] border-y border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900 dark:text-white">Enterprise Capabilities</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">Built to handle complex operations seamlessly.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <TrustCard icon="map" title="Multi-County Intelligence" description="Consolidate tax deeds, liens, and foreclosures from hundreds of counties into a single, unified data model." />
                        <TrustCard icon="folder_special" title="Portfolio Management" description="Organize assets in smart folders, track due diligence progress, and manage acquisition pipelines efficiently." />
                        <TrustCard icon="engineering" title="Field Operations" description="Deploy verified field agents to properties for condition reports, photos, and live occupancy verification." />
                        <TrustCard icon="real_estate_agent" title="Realtor Collaboration" description="Bridge the gap between investors and local market experts for accurate valuations and exit strategies." />
                        <TrustCard icon="policy" title="Audit & Compliance" description="Maintain immutable activity logs for every team member action, ensuring institutional-grade compliance." />
                        <TrustCard icon="api" title="Seamless Integrations" description="Future-proof architecture designed to integrate with external GIS, CRM, and financial management tools." />
                    </div>
                </div>
            </section>

            {/* ── Section 4: Workflow Stepper ─────────────────────────────────────────── */}
            <section id="workflow" className="relative z-10 py-32 bg-slate-50 dark:bg-[#050B14]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">The GoAuct Workflow</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">From raw data to profitable acquisition in 5 steps.</p>
                    </div>

                    <div className="flex flex-col lg:flex-row justify-between items-start gap-8 relative">
                        {/* Connecting Line */}
                        <div className="hidden lg:block absolute top-[40px] left-[5%] right-[5%] h-[2px] bg-slate-200 dark:bg-slate-800 z-0" />
                        
                        {[
                            { step: '01', title: 'County Data', icon: 'database' },
                            { step: '02', title: 'Property Intelligence', icon: 'analytics' },
                            { step: '03', title: 'Field Verification', icon: 'location_on' },
                            { step: '04', title: 'Acquisition Workflow', icon: 'gavel' },
                            { step: '05', title: 'Portfolio Management', icon: 'account_balance' }
                        ].map((item, index) => (
                            <div key={item.step} className="flex flex-row lg:flex-col items-center gap-6 lg:gap-4 w-full lg:w-1/5 relative z-10 group">
                                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#0b1120] border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm group-hover:border-blue-600 transition-colors flex-shrink-0">
                                    <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-blue-600 transition-colors">{item.icon}</span>
                                </div>
                                <div className="text-left lg:text-center">
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-500 mb-1">STEP {item.step}</div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Section 5: Mobile Field Agents ─────────────────────────────────────── */}
            <section id="field-agents" className="relative z-10 py-32 bg-white dark:bg-[#0b1120] border-t border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="text-blue-600 dark:text-blue-500 font-bold tracking-widest text-sm uppercase block mb-4">The Gig Economy for Real Estate</span>
                            <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white leading-tight">Command your field operations from anywhere.</h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                                Real estate is physical. Our platform bridges the digital-to-physical gap by allowing you to hire verified local agents. Request exterior photos, occupancy checks, and condition reports directly from your dashboard.
                            </p>
                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold"><span className="material-symbols-outlined text-blue-600">check_circle</span> Real-time geolocation tracking</li>
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold"><span className="material-symbols-outlined text-blue-600">check_circle</span> Instant photo & report uploads</li>
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold"><span className="material-symbols-outlined text-blue-600">check_circle</span> Structured task completion</li>
                                <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold"><span className="material-symbols-outlined text-blue-600">check_circle</span> Integrated payouts and escrow</li>
                            </ul>
                            <button onClick={() => navigate('/signup')} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                                Explore Field Operations
                            </button>
                        </div>
                        {/* Video Placeholder for Mobile App Demo */}
                        <div className="relative w-full aspect-[4/5] md:aspect-square bg-slate-100 dark:bg-[#050B14] rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer group hover:border-blue-500 transition-colors">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
                            <div className="text-center z-10 px-6">
                                <div className="w-16 h-16 bg-blue-600/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto mb-4">
                                    <span className="material-symbols-outlined text-white text-3xl ml-1">play_arrow</span>
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest">Mobile App Showcase</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-600 mt-2 font-medium">Watch the workflow in action</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 6: Security ─────────────────────────────────────────────────── */}
            <section id="security" className="relative z-10 py-32 bg-slate-900 dark:bg-[#050B14] border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <span className="material-symbols-outlined text-5xl text-blue-500 mb-6 block">shield_lock</span>
                    <h2 className="text-3xl md:text-5xl font-black mb-16 text-white">Institutional-Grade Security</h2>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                        <div className="p-6 rounded-2xl bg-[#0b1120] border border-slate-800 hover:border-blue-500/50 transition-colors">
                            <h4 className="text-white font-bold text-lg mb-2">Role-Based Access (RBAC)</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">Granular permissions for Clients, Managers, and Agents. Control exactly who sees what data.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-[#0b1120] border border-slate-800 hover:border-blue-500/50 transition-colors">
                            <h4 className="text-white font-bold text-lg mb-2">Immutable Audit Logs</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">Every action, view, and modification is logged and time-stamped for ultimate compliance tracking.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-[#0b1120] border border-slate-800 hover:border-blue-500/50 transition-colors">
                            <h4 className="text-white font-bold text-lg mb-2">Cloud Infrastructure</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">Built on isolated, scalable, and fully redundant cloud environments guaranteeing 99.9% uptime.</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-[#0b1120] border border-slate-800 hover:border-blue-500/50 transition-colors">
                            <h4 className="text-white font-bold text-lg mb-2">Secure Storage</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">Private documents, deeds, and field reports are encrypted at rest and strictly isolated per tenant.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 7: Final CTA ────────────────────────────────────────────────── */}
            <section className="relative z-10 py-32 bg-blue-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight">
                        Scale your distressed property operations.
                    </h2>
                    <p className="text-xl text-blue-100 font-medium mb-12 max-w-2xl mx-auto">
                        Join the elite investors and institutions standardizing their acquisitions with GoAuct.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button onClick={() => navigate('/signup')} className="px-10 py-5 bg-white text-blue-700 rounded-xl font-black text-lg hover:bg-slate-50 transition-all shadow-xl">
                            Start Your Free Trial
                        </button>
                        <button onClick={() => alert('Demo Request Form')} className="px-10 py-5 bg-transparent border-2 border-blue-400 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all">
                            Talk to Sales
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer className="relative z-10 bg-[#02050A] pt-20 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-5">
                                <span className="material-symbols-outlined text-blue-500 text-3xl">gavel</span>
                                <span className="font-extrabold text-white text-2xl tracking-tight">GoAuct</span>
                            </div>
                            <p className="text-slate-400 font-medium max-w-xs leading-relaxed text-sm">
                                The Operating System for Distressed Property Investment.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-wider text-xs uppercase">Platform</h4>
                            <ul className="space-y-3 text-slate-400 text-sm font-medium">
                                <li><a href="#workflow" className="hover:text-blue-400 transition-colors">Workflow</a></li>
                                <li><a href="#field-agents" className="hover:text-blue-400 transition-colors">Field Agents</a></li>
                                <li><a href="#security" className="hover:text-blue-400 transition-colors">Security</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-wider text-xs uppercase">Company</h4>
                            <ul className="space-y-3 text-slate-400 text-sm font-medium">
                                <li><Link to="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
                                <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact Sales</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-4 tracking-wider text-xs uppercase">Legal</h4>
                            <ul className="space-y-3 text-slate-400 text-sm font-medium">
                                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800/50 pt-8 flex items-center justify-between">
                        <p className="text-slate-500 text-xs font-medium">© {new Date().getFullYear()} GoAuct Inc. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
