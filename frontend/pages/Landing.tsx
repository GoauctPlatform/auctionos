import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
    badge?: string;
}> = ({ title, description, icon, color, badge }) => (
    <div className="p-8 rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full relative overflow-hidden backdrop-blur-md">
        {badge && (
            <div className="absolute -top-1 -right-8 transform rotate-45 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[8px] font-black py-1 px-8 text-center shadow-sm uppercase tracking-widest">
                {badge}
            </div>
        )}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-md ${color}`}>
            <span className="material-symbols-outlined text-white text-[28px]">{icon}</span>
        </div>
        <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm flex-grow font-medium">{description}</p>
    </div>
);

// ─── Scroll-Linked Hero Video ────────────────────────────────────────────────
const ScrollHeroVideo: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [progress, setProgress] = React.useState(0);
    const [videoSrc, setVideoSrc] = React.useState<string | null>(null);
    const [videoLoaded, setVideoLoaded] = React.useState(false);

    const handleScroll = React.useCallback(() => {
        if (!containerRef.current || !videoRef.current) return;
        const { top, height } = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        // The container is 300vh. Scroll progress starts when top <= 0, and ends when top <= -(height - viewportHeight).
        const maxScroll = height - viewportHeight;
        let currentScroll = -top;
        if (currentScroll < 0) currentScroll = 0;
        if (currentScroll > maxScroll) currentScroll = maxScroll;
        const scrollProgress = currentScroll / maxScroll;
        setProgress(scrollProgress);
        
        // Map scrollProgress (0 to 1) to video currentTime (0 to duration)
        const duration = videoRef.current.duration;
        if (duration && isFinite(duration)) {
            const targetTime = scrollProgress * duration;
            if (isFinite(targetTime)) {
                videoRef.current.currentTime = targetTime;
            }
        } else {
            // fallback if duration not available yet
            const targetTime = scrollProgress * 18;
            if (isFinite(targetTime)) {
                videoRef.current.currentTime = targetTime;
            }
        }
    }, []);

    // Lazy load the video in the background after initial paint is complete
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setVideoSrc("/hero-video.mp4");
        }, 600); // 600ms gives plenty of time for HTML/JS/CSS/Fonts to render first
        return () => clearTimeout(timer);
    }, []);

    React.useEffect(() => {
        if (!videoSrc) return;

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Trigger once on mount

        const video = videoRef.current;
        if (video) {
            const initVideo = () => {
                // Play and immediately pause to force decode the first frame
                video.play()
                    .then(() => {
                        video.pause();
                        video.currentTime = 0.001;
                        setVideoLoaded(true); // Fade out poster, fade in video
                        handleScroll();
                    })
                    .catch((err) => {
                        console.log("Video preload auto-play prevented:", err);
                        video.currentTime = 0.001;
                        setVideoLoaded(true); // Safe fallback fade-in
                        handleScroll();
                    });
            };

            if (video.readyState >= 2) {
                initVideo();
            } else {
                video.addEventListener('canplay', initVideo);
            }

            return () => {
                window.removeEventListener('scroll', handleScroll);
                video.removeEventListener('canplay', initVideo);
            };
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, [videoSrc, handleScroll]);

    // Narrative mapping based on video progress
    let step = 0;
    if (progress > 0.777) {
        step = 2; // 14-18s
    } else if (progress > 0.5) {
        step = 1; // 9-14s
    }

    return (
        <div ref={containerRef} className="relative w-full z-10" style={{ height: '300vh' }}>
            <div className="sticky top-0 w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
                
                {/* Immediate Poster Placeholder Image (Preloaded & Ultra lightweight 218KB) */}
                <img 
                    src="/hero-poster.jpg"
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 z-0 ${
                        videoLoaded ? 'opacity-0 pointer-events-none' : 'opacity-90'
                    }`}
                />

                {/* Background Video (Injected after 600ms, then plays/pauses to cache frames, then elegant fade-in) */}
                {videoSrc && (
                    <video 
                        ref={videoRef}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 z-10 ${
                            videoLoaded ? 'opacity-90' : 'opacity-0'
                        }`}
                        src={videoSrc}
                        preload="auto"
                        muted
                        playsInline
                        controls={false}
                    />
                )}
                
                {/* Gradient Overlays for cinematic depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />

                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
                
                {/* Fixed Header Layer */}
                <div className="absolute top-32 left-0 right-0 z-20 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md mb-4 shadow-2xl">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase">GoAuct Platform V2</span>
                    </div>
                </div>

                {/* Narrative Text Container */}
                <div className="relative z-20 flex flex-col items-center justify-center h-full max-w-5xl px-4 text-center">
                    
                    {/* Step 0 */}
                    <div className={`absolute transition-all duration-700 transform ${step === 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'}`}>
                        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 drop-shadow-2xl">
                            The Spreadsheet &amp; File Chaos
                        </h1>
                        <p className="text-xl md:text-3xl font-medium text-slate-300">
                            The Old Way
                        </p>
                    </div>

                    {/* Step 1 */}
                    <div className={`absolute transition-all duration-700 transform ${step === 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
                        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-6 drop-shadow-2xl">
                            GPS BPO Field Marketplace
                        </h1>
                        <p className="text-xl md:text-3xl font-medium text-slate-300">
                            Deploy verified runners instantly.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className={`absolute transition-all duration-700 transform ${step === 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
                        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 mb-6 drop-shadow-2xl">
                            Centralized Cure &amp; AI Scoring
                        </h1>
                        <p className="text-xl md:text-3xl font-medium text-slate-300">
                            Precision due diligence, on-demand.
                        </p>
                    </div>
                </div>

                {/* Call to action appears at the very end */}
                <div className={`absolute bottom-20 left-0 right-0 z-30 flex justify-center transition-all duration-1000 ${progress > 0.9 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <button onClick={() => navigate('/signup')} className="px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                        Enter Ecosystem
                    </button>
                </div>
                
                {/* Scroll Indicator */}
                <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500 ${progress > 0.9 ? 'opacity-0' : 'opacity-50'}`}>
                    <span className="text-white text-[10px] uppercase tracking-[0.3em] font-bold">Scroll</span>
                    <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
                </div>
            </div>
        </div>
    );
};


// ─── Main Landing Page ────────────────────────────────────────────────────────
export const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [activeHeroTab, setActiveHeroTab] = useState(0);
    const [activeStoryStep, setActiveStoryStep] = useState(0);

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
        { icon: 'query_stats', title: 'Property Intelligence', description: 'Every property is instantly evaluated with our proprietary scoring engine, flagging risks and estimating yields.', color: 'bg-gradient-to-br from-indigo-500 to-indigo-600' },
        { icon: 'notifications_active', title: 'Smart Watchlists', description: 'Personalized My Lists with auction proximity alerts. Get notified when a saved property is days away from auction.', color: 'bg-gradient-to-br from-violet-500 to-violet-600' },
        { icon: 'task_alt', title: 'Task Marketplace', description: 'Hire verified Agent Due Diligence users for field research, photos, and verification directly through the platform.', color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
        { icon: 'school', title: 'Training Academy', description: 'Structured video modules, playbooks, and certification paths to master tax deed investing from beginner to expert.', color: 'bg-gradient-to-br from-amber-500 to-orange-500' },
        { icon: 'groups', title: 'Investor Community', description: 'Join mastermind groups and collaborate with like-minded investors sharing strategies, county insights, and deal flow.', color: 'bg-gradient-to-br from-pink-500 to-rose-500' },
    ];

    const storySteps = [
        {
            title: "1. The Spreadsheet & File Chaos",
            short: "The Old Way",
            desc: "Before GoAuct, your day was a mess of browser tabs, dusty county PDFs, and legacy spreadsheets. You spend days mining data manually, losing time—and time is money.",
            icon: "tab",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-500 to-transparent animate-pulse" />
                    <div className="space-y-3 w-full max-w-sm relative z-10">
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm flex items-center justify-between transform -rotate-2 scale-95 opacity-80">
                            <span className="text-xs font-mono font-bold text-red-600 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">warning</span> county_sales_june.pdf</span>
                            <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-full">STALE DATA</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm flex items-center justify-between transform rotate-1 scale-100">
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">table_chart</span> foreclosure_leads.csv</span>
                            <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold px-2 py-0.5 rounded-full">MANUAL SEARCH</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm flex items-center justify-between transform -rotate-1 scale-95 opacity-90">
                            <span className="text-xs font-mono font-bold text-red-600 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">error</span> auction_links_v4_draft.xlsx</span>
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">EXPIRED LINK</span>
                        </div>
                    </div>
                    <div className="mt-6 text-center text-xs font-bold text-red-500 uppercase tracking-widest animate-pulse flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">schedule</span> 15+ Hours Wasted Weekly</div>
                </div>
            )
        },
        {
            title: "2. GoAuct Centralized Cure",
            short: "Nationwide Access",
            desc: "Say goodbye to fragmentation. We centralize the entire U.S. property auction ecosystem in one platform, giving you a clean, unified command center to filter real-time foreclosure and tax sales.",
            icon: "map",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 to-transparent" />
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
                            <span className="font-extrabold text-sm text-slate-800 dark:text-white">Active Nationwide Parcels</span>
                            <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">51,146 Synced</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {['FL', 'TX', 'NY', 'CA', 'GA', 'OH'].map(state => (
                                <div key={state} className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group">
                                    <div className="text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors">{state}</div>
                                    <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">Active</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "3. AI-Driven Scoring Insights",
            short: "Smart Deal Evaluation",
            desc: "Every property is automatically evaluated. Our proprietary scoring engine analyzes county data, historical values, and metrics to calculate a precise Deal Score from 1 to 100 for time-sensitive investors.",
            icon: "query_stats",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Proprietary Deal Score</span>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full uppercase tracking-widest">Buy Rating</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-2xl">
                                92
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Strong Buy Option</h4>
                                <p className="text-xs text-slate-500">Exceptional historical margins</p>
                            </div>
                        </div>
                        <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-700 pt-3">
                            <div className="flex justify-between"><span className="text-slate-400">Equity Margin:</span> <span className="font-bold text-slate-700 dark:text-slate-300">68%</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Opening Bid Multiplier:</span> <span className="font-bold text-emerald-500">0.24x Market</span></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "4. Unified Event Calendar",
            short: "National Schedule",
            desc: "Never miss an auction date. GoAuct centralizes upcoming foreclosures, tax deeds, and liens events nationwide in an integrated, beautiful calendar complete with countdown timers.",
            icon: "calendar_month",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                            <span className="font-extrabold text-sm text-slate-800 dark:text-white">Upcoming Events</span>
                            <span className="text-xs text-indigo-500 font-bold">May 2026</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex flex-col items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                        <span>20</span><span>May</span>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">Tax Deed Auction</div>
                                        <div className="text-[10px] text-slate-400">Miami-Dade County</div>
                                    </div>
                                </div>
                                <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">In 1 Day</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "5. High-Fidelity Property Details",
            short: "360-Degree Data",
            desc: "Access comprehensive data points on every single parcel: assessed value, tax amounts, valuation estimates, structural details (beds, baths, year built), zoning types, and maps.",
            icon: "database",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined">domain</span>
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">1044 Ocean Parkway</h4>
                                <p className="text-[10px] text-slate-400">Single Family • Built 2004</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg"><span className="text-slate-400 block uppercase font-bold text-[8px]">Value Estimate</span> <span className="font-extrabold text-slate-800 dark:text-slate-200">$485,000</span></div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg"><span className="text-slate-400 block uppercase font-bold text-[8px]">Opening Bid</span> <span className="font-extrabold text-blue-600">$98,000</span></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "6. Custom Views & Note Persistence",
            short: "Exclusive Team Workspace",
            desc: "If any property details are missing or need updating, you can customize the view instantly. Override features or record private analytical notes that remain isolated and exclusive to your company team.",
            icon: "edit_note",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">lock</span> Custom Team View</span>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-300 font-bold">Saved</span>
                        </div>
                        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/50 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                            <strong>Team Note:</strong> "Roof has minor shingle damage. Bidding strategy capped at $120k maximum."
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "7. Collaborative Ingestion",
            short: "Auto-Enriched Data",
            desc: "Can't find a property? Add it manually, and our system automatically enriches it with public registry and GIS links. Or publish it with a Global ID to collaborate with the broader platform community.",
            icon: "cloud_upload",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <div className="text-xs font-bold text-slate-800 dark:text-white">Add New Manual Property</div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-[10px] space-y-2">
                            <div><span className="text-slate-400 block font-bold">Parcel Address:</span> <span className="text-slate-700 dark:text-slate-300 font-semibold">1208 Pine Crest Way</span></div>
                            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center text-emerald-500 font-bold animate-pulse">
                                <span>Enriching coordinates & links...</span>
                                <span className="material-symbols-outlined text-[14px]">sync</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "8. Proximity Watchlists",
            short: "Smart Folders",
            desc: "Organize target acquisitions in custom folders. GoAuct monitors auction dates and gives you real-time proximity alerts so you are prepared to bid.",
            icon: "folder_open",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <div className="text-xs font-bold text-slate-800 dark:text-white">My Watchlists</div>
                        <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
                                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><span className="material-symbols-outlined text-blue-500 text-[16px]">folder</span> Florida High Yield</span>
                                <span className="font-mono text-blue-600 font-bold bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full text-[9px]">12 Saved</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 animate-pulse">
                                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><span className="material-symbols-outlined text-rose-500 text-[16px]">folder</span> Houston Tax Deeds</span>
                                <span className="font-mono text-rose-600 font-bold bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full text-[9px]">Auction Soon!</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "9. GPS BPO Field Marketplace",
            short: "Boots on the Ground",
            desc: "No need to travel! Deploy verified local agents (field runners) to perform structural checks and take on-site photos, fully validated within a 50-meter GPS radius.",
            icon: "real_estate_agent",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">Active Field Mission</span>
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> GPS Validated</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-[10px] space-y-1.5">
                            <div><span className="text-slate-400 font-bold uppercase text-[8px]">Runner:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">Austin K. (Austin, TX)</span></div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden"><div className="w-[85%] bg-emerald-500 h-full rounded-full animate-pulse" /></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "10. Escrow Dual-Approval",
            short: "Mediated Guarantee",
            desc: "You retain full control over quality. Review the runner's submitted condition checklist and property photos, and approve the release of funds or request platform mediation.",
            icon: "fact_check",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-xs bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-white block mb-1">Verify Evidence Submission</span>
                        <div className="space-y-1 text-[10px] text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5 text-emerald-500 font-semibold"><span className="material-symbols-outlined text-[14px]">check_circle</span> 4x Property Exterior Photos</div>
                            <div className="flex items-center gap-1.5 text-emerald-500 font-semibold"><span className="material-symbols-outlined text-[14px]">check_circle</span> Occupancy Report Completed</div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-sm">Approve Release</button>
                            <button className="flex-1 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-bold">Mediate</button>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "11. Exit & Broker Pipeline",
            short: "Convert to Cash",
            desc: "Once you win and acquire an asset, export it seamlessly from your watchlist to certified, verified local brokers on the platform to list and sell it for you.",
            icon: "sell",
            renderVisual: () => (
                <div className="relative w-full min-h-[300px] flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md space-y-3">
                        <div className="text-xs font-bold text-slate-800 dark:text-white">Export to Realtor Network</div>
                        <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between text-[11px]">
                            <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 block">Verified Broker Match</span>
                                <span className="text-[10px] text-slate-400">12 Active Listings in Miami-Dade</span>
                            </div>
                            <button className="px-3 py-1 bg-indigo-600 text-white font-bold rounded-lg text-[10px] shadow-sm">Match & Export</button>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#070d1a] font-sans text-slate-900 dark:text-slate-50 selection:bg-emerald-500 selection:text-white">

            {/* BG Ambience */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[40%] rounded-full bg-blue-500/15 dark:bg-blue-600/10 blur-[130px]" />
                <div className="absolute top-[30%] right-[-5%] w-[35%] h-[35%] rounded-full bg-emerald-500/15 dark:bg-emerald-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[25%] w-[40%] h-[30%] rounded-full bg-violet-500/10 dark:bg-violet-600/8 blur-[140px]" />
            </div>

            {/* Navbar */}
            <nav className="fixed w-full z-50 top-0 bg-white/75 dark:bg-[#070d1a]/75 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3 cursor-pointer animate-in fade-in duration-500" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="material-symbols-outlined text-white text-2xl">gavel</span>
                            </div>
                            <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">GoAuct</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8 font-semibold">
                            <button onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Journey</button>
                            <button onClick={() => document.getElementById('personas')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Ecosystem</button>
                            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Features</button>
                            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">Pricing</button>
                            <Link to="/about" className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">About Us</Link>
                            <Link to="/login" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/signup')} className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                Get Started Free
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Section 1: Hero (Scroll Video) ────────────────────────────────────────── */}
            <ScrollHeroVideo navigate={navigate} />

            {/* ── Section 2: Social Proof Bar ───────────────────────────────────────────── */}
            <div className="relative z-10 border-y border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex flex-wrap items-center justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all font-bold text-xs md:text-sm">
                            <div className="flex items-center gap-1.5"><span className="material-symbols-outlined">security</span> DATA SECURE</div>
                            <div className="flex items-center gap-1.5"><span className="material-symbols-outlined">verified</span> INSTITUTIONAL GRADE</div>
                            <div className="flex items-center gap-1.5"><span className="material-symbols-outlined">map</span> GIS INTEGRATED</div>
                        </div>
                        <div className="flex gap-8 justify-center w-full md:w-auto">
                            <div className="text-center">
                                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">120k+</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Properties</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">50</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">States</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">$4B+</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asset Value</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section 3: Interactive Storytelling Timeline ───────────────────────────── */}
            <section id="story" className="relative z-10 py-24 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold tracking-widest text-sm uppercase block mb-3">The Deal Discovery Journey</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">From Fragmented Chaos to Closed Deal</h2>
                        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">Explore the step-by-step walkthrough of how GoAuct organizes, enriches, and simplifies real estate acquisitions.</p>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 items-start">
                        {/* Steps Navigation (Left) */}
                        <div className="lg:col-span-5 space-y-2.5 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                            {storySteps.map((step, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveStoryStep(idx)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 backdrop-blur-sm ${
                                        activeStoryStep === idx
                                            ? 'bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-blue-500/50 dark:border-blue-400/50 shadow-md transform translate-x-1.5'
                                            : 'bg-white/40 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-700/50 hover:bg-white/60 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        activeStoryStep === idx
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                        <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold transition-colors ${
                                            activeStoryStep === idx ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                                        }`}>{step.title}</h4>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">{step.short}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Story Content & High-Fidelity Visualization Screen (Right) */}
                        <div className="lg:col-span-7 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col justify-between min-h-[500px]">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <span className="material-symbols-outlined text-[24px]">{storySteps[activeStoryStep].icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{storySteps[activeStoryStep].title}</h3>
                                        <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider">{storySteps[activeStoryStep].short}</span>
                                    </div>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-medium">
                                    {storySteps[activeStoryStep].desc}
                                </p>
                            </div>

                            <div className="mt-8 border-t border-slate-200/50 dark:border-slate-700/50 pt-8 w-full flex justify-center">
                                {storySteps[activeStoryStep].renderVisual()}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 4: Personas (Ecosystem Matrix) ─────────────────────────────────── */}
            <section id="personas" className="relative z-10 py-24 bg-slate-50 dark:bg-[#070d1a] border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold tracking-widest text-sm uppercase block mb-3">Built for Your Role</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">Our Integrated Ecosystem</h2>
                        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">Connecting institutional players, local realtors, and boots-on-the-ground agents under one unified system.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <PersonaCard
                            title="Investors"
                            description="Access high-fidelity distressed property intelligence, integrated yield estimates, and full watchlists. Secure your analytical edge and bid with total confidence."
                            icon="trending_up"
                            color="bg-blue-600"
                        />
                        <PersonaCard
                            title="Verified Realtors & Brokers"
                            description="Unlock a dedicated workspace to view directly listed properties by owners, participate in county due diligence tasks, and expand your listings pipeline."
                            icon="real_estate_agent"
                            color="bg-indigo-600"
                            badge="Certified Partner"
                        />
                        <PersonaCard
                            title="Field Runners"
                            description="Join as a field agent to complete physical condition checks, take on-site photos, and earn reward points on a flexible schedule managed by GPS radius tracking."
                            icon="drive_eta"
                            color="bg-emerald-600"
                            badge="Earn Rewards"
                        />
                    </div>
                </div>
            </section>

            {/* ── Section 5: Feature Grid ─────────────────────────────────────────── */}
            <section id="features" className="relative z-10 py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold tracking-widest text-sm uppercase block mb-3">Platform Capabilities</span>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">Everything You Need to Win</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map(f => <FeatureCard key={f.title} {...f} />)}
                    </div>
                </div>
            </section>

            {/* ── Section 6: Pricing Teaser ───────────────────────────────────────────── */}
            <section id="pricing" className="relative z-10 py-24 bg-slate-50 dark:bg-[#070d1a] border-t border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white">Simple, Transparent Pricing</h2>
                        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">Start free. Upgrade when you're ready to scale your operations.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                        {/* Trial */}
                        <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Trial</h3>
                                <div className="text-3xl font-black text-slate-900 dark:text-white mb-6">$0</div>
                                <ul className="space-y-4 mb-8 text-slate-600 dark:text-slate-400 text-sm">
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> 7-Day Free Access</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-rose-500 text-sm">cancel</span> No Live Auctions</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-rose-500 text-sm">cancel</span> No Custom Properties</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-rose-500 text-sm">cancel</span> Individual only (No Teams)</li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm mt-auto">Start Free</button>
                        </div>

                        {/* Advanced */}
                        <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                            <div className="absolute -top-1 -right-8 transform rotate-45 bg-amber-500 text-white text-[8px] font-black py-1 px-8 text-center shadow-sm uppercase tracking-widest">
                                PROMO
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Advanced</h3>
                                <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                                    <span className="text-sm line-through text-slate-400 mr-2 font-normal">$90</span>$60<span className="text-sm font-medium opacity-80">/mo</span>
                                </div>
                                <p className="text-slate-500 text-xs mb-6">Individual Power Plan</p>
                                <ul className="space-y-4 mb-8 text-slate-600 dark:text-slate-400 text-sm">
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> 1,000 Property Views</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Unlimited Customizations</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Live Auctions & Calendar</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Tasks & Data Exports</li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm mt-auto">Get Advanced</button>
                        </div>

                        {/* Pro */}
                        <div className="p-8 rounded-3xl bg-blue-600 text-white shadow-xl transform lg:-translate-y-4 relative flex flex-col justify-between min-h-[480px]">
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">Most Popular</div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Pro</h3>
                                <div className="text-3xl font-black mb-1">$130<span className="text-sm font-medium opacity-80">/mo</span></div>
                                <p className="text-blue-200 text-xs mb-6">For growing teams</p>
                                <ul className="space-y-4 mb-8 text-sm">
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> 2,000 Property Views</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> 2 Companies • 1 Mgr • 1 Agent</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> Unlimited Customizations</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-300 text-sm">check_circle</span> Community, Tasks & Exports</li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-all shadow-md text-sm mt-auto">Get Pro</button>
                        </div>

                        {/* Enterprise */}
                        <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between min-h-[460px]">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enterprise</h3>
                                <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">$350<span className="text-sm font-medium text-slate-500">/mo</span></div>
                                <p className="text-slate-500 text-xs mb-6">For high-volume teams</p>
                                <ul className="space-y-4 mb-8 text-slate-600 dark:text-slate-400 text-sm">
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> 10,000 Property Views</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> 4 Companies • 2 Mgrs • 3 Agents</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Unlimited Customizations</li>
                                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span> Priority 24/7 Support</li>
                                </ul>
                            </div>
                            <button onClick={() => navigate('/signup')} className="w-full py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm mt-auto">Contact Sales</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 7: Trust & Security ─────────────────────────────────────────── */}
            <section className="relative z-10 py-16 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Enterprise-Grade Security & Performance Defensibility</h3>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-slate-400">lock</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">Auth0 Powered Identity</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-slate-400">database</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">PostgreSQL Isolated Silos</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-slate-400">cached</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">Redis Background Workers</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 8: CTA Footer ───────────────────────────────────────────────── */}
            <section className="relative z-10 py-24 bg-gradient-to-br from-blue-600 to-indigo-700 border-t border-blue-500">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <span className="material-symbols-outlined text-6xl text-white mb-6 opacity-80 block animate-bounce">rocket_launch</span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                        Join thousands of professionals already using GoAuct.
                    </h2>
                    <p className="text-lg md:text-xl text-blue-100 font-medium mb-10 max-w-2xl mx-auto">
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
