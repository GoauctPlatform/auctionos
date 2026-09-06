import React from 'react';
import { API_BASE_URL } from '../../services/httpClient';
import api from '../../services/api';
import { useLanguage } from "../../context/LanguageContext";

const PlaceholderPage: React.FC<{
  icon: string;
  title: string;
  description: string;
  badge?: string;
}> = ({ icon, title, description, badge }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
      <span className="material-symbols-outlined text-primary text-[36px]">{icon}</span>
    </div>
    {badge && (
      <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-widest mb-3">
        {badge}
      </span>
    )}
    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{title}</h1>
    <p className="text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">{description}</p>
  </div>
);

const VIDEOS = [
  { title: "Introduction to GoAuct", length: "05:30", id: "intro_sys", desc: "Welcome to the central intelligence platform." },
  { title: "Live Auction & Properties", length: "14:20", id: "live_auction", desc: "How to consult an auction and its properties in real time." },
  { title: "Property Search & Details", length: "10:15", id: "prop_search", desc: "How to search precisely and access full property documents/comps." },
  { title: "My Lists & Organization", length: "08:45", id: "my_lists", desc: "How to access, create, organize, and preview your pipelines." },
  { title: "Due Diligence Consulting", length: "18:00", id: "dd_consulting", desc: "How our partners assist you in closing the deal safely." },
  { title: "Meet the Team", length: "04:10", id: "meet_team", desc: "Behind the scenes at GoAuct." }
];

export const TrainingPage: React.FC = () => {
    const { t } = useLanguage();
    const [view, setView] = React.useState<'folders' | 'tax' | 'system'>('folders');
    const [activeVideo, setActiveVideo] = React.useState(VIDEOS[0]);
    const [showConstructionModal, setShowConstructionModal] = React.useState(false);

    if (view === 'folders') {
        return (
            <div className="max-w-5xl mx-auto py-12 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">{t('EcosystemPages.trainingCenter')}</h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">{t('EcosystemPages.selectALearningPathT')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Tax Systems Folder */}
                    <div 
                        onClick={() => setView('tax')}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/50 transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">{t('EcosystemPages.menubook')}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('EcosystemPages.taxSystemsMastery')}</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('EcosystemPages.everythingYouNeedToK')}</p>
                    </div>

                    {/* System Training Folder */}
                    <div 
                        onClick={() => setShowConstructionModal(true)}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber-500/50 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] animate-spin-slow">{t('EcosystemPages.construction')}</span> {t('EcosystemPages.underConstruction')}</div>
                        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400">{t('EcosystemPages.construction')}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('EcosystemPages.platformTutorials')}</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {t('EcosystemPages.stepByStepVideoGuide')}</p>
                    </div>
                </div>

                <div className="mt-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="material-symbols-outlined text-slate-400 mb-2">{t('EcosystemPages.supportagent')}</span>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">{t('EcosystemPages.needHelpEmailUs')}</h3>
                    <p className="text-sm text-slate-500 mb-4">{t('EcosystemPages.anyQuestionsAboutAcc')}</p>
                    <a href="mailto:support@goauct.com" className="inline-block px-6 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90">{t('EcosystemPages.contactSupport')}</a>
                </div>

                {showConstructionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                            {/* Design accents */}
                            <div className="absolute -top-12 -left-12 size-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute -bottom-12 -right-12 size-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="flex flex-col items-center text-center">
                                <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-4xl text-amber-500 animate-bounce">{t('EcosystemPages.construction')}</span>
                                </div>
                                
                                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-extrabold uppercase tracking-widest mb-3 border border-amber-500/20">
                                    {t('EcosystemPages.underConstruction')}</span>

                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                                    {t('EcosystemPages.platformTutorials')}</h3>
                                
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                                    {t('EcosystemPages.ourMediaAndEngineeri')}<br/><br/>
                                    {t('EcosystemPages.theseModulesWillCove')}</p>

                                <button 
                                    onClick={() => setShowConstructionModal(false)}
                                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                                >
                                    {t('EcosystemPages.backToResources')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'tax') {
        return (
            <div className="relative w-full h-[calc(100vh-120px)] overflow-y-auto">
                <button onClick={() => setView('folders')} className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[18px]">{t('EcosystemPages.arrowback')}</span>
                    {t('EcosystemPages.backToFolders')}</button>
                <div className="pt-20">
                    <TaxSystemsView />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-120px)] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center">
                <button onClick={() => setView('folders')} className="flex items-center gap-2 font-bold text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{t('EcosystemPages.arrowback')}</span> {t('EcosystemPages.backToFolders')}</button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
                {/* Main Video Area */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <div className="w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden relative shadow-md border border-slate-700/50 group">
                        <video 
                            key={activeVideo.id}
                            src={`${API_BASE_URL}/static/videos/${activeVideo.id}.mp4`}
                            controls
                            className="w-full h-full object-cover"
                            poster="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200"
                        />
                        <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur text-[10px] text-slate-300 font-mono px-3 py-1 rounded-full border border-white/10 pointer-events-none">
                            {t('EcosystemPages.localPathBackendData')}{activeVideo.id}{t('EcosystemPages.Mp4')}</div>
                    </div>
                    <div className="mt-6 px-2">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{activeVideo.title}</h2>
                        <p className="text-slate-600 dark:text-slate-400">{activeVideo.desc}</p>
                    </div>
                </div>

                {/* Video List */}
                <div className="w-full md:w-80 flex flex-col gap-3 font-sans overflow-y-auto pr-2 pb-12">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 pl-2">{t('EcosystemPages.platformTutorials')}</h3>
                    {VIDEOS.map((v, i) => (
                        <button
                            key={v.id}
                            onClick={() => setActiveVideo(v)}
                            className={`flex gap-4 p-4 rounded-xl items-start transition-all text-left ${activeVideo.id === v.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'}`}
                        >
                            <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activeVideo.id === v.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                <span className="material-symbols-outlined text-[16px]">{activeVideo.id === v.id ? 'play_arrow' : 'lock_open'}</span>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{i+1}. {v.title}</div>
                                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">{v.length}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// -- TAX SYSTEMS CONNECT (EMBEDDED VIEWER) --

const TAX_CHAPTERS = [
  {
    title: "1. The Property Tax Engine",
    content: "Property taxes are decentralized and set at city/county level, financing vital public services like schools, infrastructure, and safety. The annual tax is calculated by multiplying the Assessed Value by the local Mill Rate (ex: exceeding 2% in NJ vs minimal rates in Alabama or Nevada). Non-payment triggers municipal debt that county authorities must recover rapidly through tax lien certificates, redeemable deeds, or direct tax deed sales. GoAuct assists you in filtering this property universe using FEMA flood zone reports, inventory logs, and GIS mapping."
  },
  {
    title: "2. Mortgage Foreclosure vs Tax Sales",
    content: "A Mortgage Foreclosure is initiated by private financial institutions (banks) when loans default, and bank liens are subordinate to local government tax claims. A Tax Sale is initiated by the government county to recover public delinquent property tax. Because the government holds supreme lien precedence, a tax foreclosure sale typically wipes out existing mortgage balances and junior private liens."
  },
  {
    title: "3. Tax Lien Certificates (Passive Yields)",
    content: "In Tax Lien states (e.g., Alabama, Arizona, Colorado, Iowa, Kentucky, Mississippi, Missouri, Montana, Nebraska, New Jersey, Vermont, Wyoming), the county does not sell the property directly. Instead, they sell a Tax Lien Certificate. The investor pays off the tax debt and earns a guaranteed interest return (ranging from 12% in AL, 16% in AZ, up to 24% in IA or 36% depending on county laws). During the redemption period (typically 1 to 3 years), the owner can repay the debt + interest. If they fail to do so, the investor can foreclose to assume full property ownership. To mitigate risk, 'Deep Pocket' investors acquire small liens in bulk."
  },
  {
    title: "4. Tax Deed Sales (Direct Acquisition)",
    content: "In Tax Deed states (e.g., Alaska, Arkansas, California, Idaho, Kansas, Maine, Michigan, Nevada, New Mexico, North Carolina, North Dakota, Oklahoma, Oregon, Utah, Virginia, Washington, Wisconsin), the county seizes the delinquent property and auctions the deed directly at a fraction of market value. The winning bidder gets immediate ownership but inherits the property entirely 'as-is, where-is'. Title searches are critical since environmental hazards, utility code violations, or federal IRS liens might survive. Wholesaling (selling the contract to developers) or neighbors marketing are highly profitable exits."
  },
  {
    title: "5. Hybrid Systems & Redeemable Deeds",
    content: "Hybrid states (e.g., Texas, Georgia, Florida, Connecticut, Delaware, Hawaii, Illinois, Indiana, Louisiana, New York, Ohio, Pennsylvania, Rhode Island, South Dakota, Tennessee, West Virginia) sell the deed at auction, but the original owner retains a right of redemption for a short period (6 months to 2 years). If the owner redeems the property, they must pay the investor the winning bid plus a fixed penalty flat return (e.g., a massive 25% fixed return in Texas from day one). If the redemption period expires, the investor's deed ownership becomes absolute."
  },
  {
    title: "6. Federal & Commercial Property APIs",
    content: "Integrating auction data is a massive technical advantage. For federal properties, the GSA Auctions API provides public JSON/XML feeds, supported by Realestatesales.gov and the Federal Real Property Public Data Set. For commercial, pre-foreclosure, and local county tax sales, industry-grade APIs like BatchData (24-48h Notice of Trustee Sale updates), TitleFlex (lien data), or Apify scrapers offer direct registry updates. GoAuct leverages these robust data streams to provide a definitive technical moat."
  },
  {
    title: "7. Title Cleansing (Quiet Title vs Quit Claim)",
    content: "Because tax deeds do not come with title insurance guarantees ('warranty deeds'), the title is considered 'clouded'. Investors must file a Quiet Title Action in court to clear claims, which takes months. A faster, highly strategic shortcut is using a Quit Claim Deed: locate the previous owners or heirs and offer a small fee ($500-$1000) for them to sign a document renouncing all property rights, clearing title clouds instantly."
  },
  {
    title: "8. Marketing & Direct Sourcing Matrix",
    content: "To acquire properties pre-auction, professional investors utilize a triple marketing approach: 1. Hand-written 'Yellow Letters' sent via Direct Mail to owners in pre-foreclosure, showing empathy. 2. Skip Tracing software to retrieve phone contacts of vacant home heirs. 3. In-person 'Door Knocking' visits to offer immediate cash exits before auction foreclosure occurs."
  },
  {
    title: "9. LLC Structuring & Contract Defensibility",
    content: "Inspired by defensive corporate plays (such as 'The Founder' movie), investors must isolate liabilities. We focus on acquiring real estate inside specialized LLCs, which can have multiple members and an Administrator. By drafting strict contract clauses, partnership liabilities are locked exclusively to the single acquired property, ensuring that partnership disputes or lawsuits never expose the global personal assets of either side of the deal."
  }
];

export const TaxSystemsView: React.FC = () => {
    const { t } = useLanguage();
    const [openChapter, setOpenChapter] = React.useState<number | null>(0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-10 max-w-4xl mx-auto mb-16">
            <div className="mb-10 text-center">
               <span className="material-symbols-outlined text-4xl text-blue-500 mb-3 block">{t('EcosystemPages.menubook')}</span>
               <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t('EcosystemPages.uSTaxSaleSystemsMatr')}</h1>
               <p className="text-slate-500 max-w-xl mx-auto">{t('EcosystemPages.compiledInsightsFrom')}</p>
            </div>
            
            <div className="space-y-4">
                {TAX_CHAPTERS.map((chap, i) => {
                    const isOpen = openChapter === i;
                    return (
                        <div key={i} className={`border rounded-2xl overflow-hidden transition-colors ${isOpen ? 'border-primary dark:border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                            <button
                                onClick={() => setOpenChapter(isOpen ? null : i)}
                                className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isOpen ? 'bg-primary/5 dark:bg-blue-900/20' : 'bg-transparent'}`}
                            >
                                <span className="font-bold text-slate-800 dark:text-slate-100">{chap.title}</span>
                                <span className={`material-symbols-outlined text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`}>{t('EcosystemPages.expandmore')}</span>
                            </button>
                            {isOpen && (
                                <div className="p-5 pt-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30">
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{chap.content}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const TaxSystemsPage: React.FC = () => {
    return (
        <div className="w-full h-full overflow-y-auto pt-8">
            <TaxSystemsView />
        </div>
    );
};

export const CommunityPage: React.FC = () => {
    const { t } = useLanguage();
    const [newsUpdates, setNewsUpdates] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        const fetchCommunityUpdates = async () => {
            try {
                const res = await api.get('/community/');
                setNewsUpdates(res.data);
            } catch (err: any) {
                console.error("Failed to load community updates", err);
                setError("Failed to retrieve community updates. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchCommunityUpdates();
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-120px)] overflow-y-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">{t('EcosystemPages.forum')}</span>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('EcosystemPages.communityUpdates')}</h1>
                    <p className="text-sm text-slate-500 font-medium">{t('EcosystemPages.realEstateNewsSystem')}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{t('EcosystemPages.loadingCommunityUpda')}</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center text-red-650 dark:text-red-400 font-semibold mb-6">
                    <span className="material-symbols-outlined text-4xl mb-2 block">{t('EcosystemPages.warning')}</span>
                    {error}
                </div>
            ) : newsUpdates.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
                    <span className="material-symbols-outlined text-5xl mb-4 text-slate-350 dark:text-slate-650">{t('EcosystemPages.campaign')}</span>
                    <p className="text-lg font-bold mb-2">{t('EcosystemPages.noCommunityPostsYet')}</p>
                    <p className="text-sm">{t('EcosystemPages.checkBackLaterForNew')}</p>
                </div>
            ) : (
                <div className="space-y-6 pb-12">
                    {newsUpdates.map(news => (
                        <div key={news.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${
                                    news.tag === 'Market Update' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                    news.tag === 'System Note' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                    news.tag === 'Strategy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                }`}>{news.tag}</span>
                                <span className="text-sm text-slate-400 font-medium">{news.date}</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{news.title}</h2>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 whitespace-pre-line">
                                {news.content}
                            </p>
                            <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                                <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[14px]">{t('EcosystemPages.adminpanelsettings')}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{news.author}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const GROUPS_TESTIMONIALS = [
    {
        name: "Marcus T.",
        role: "Institutional Fund Manager",
        social: "@marcus_invests",
        content: "GoAuct completely changed our scaling model. We were manually tracking 12 counties in Florida and taking 3 days to calculate yields. Now we track 80 counties instantly."
    },
    {
        name: "Sarah K.",
        role: "Independent Investor",
        social: "@sarah.deeds",
        content: "The ability to have the comps engine right next to the parcel map is insane. I picked up 3 tax deeds in Indiana last month using just the 'Top Deals' dashboard filter."
    },
    {
        name: "David R.",
        role: "Title Researcher",
        social: "@david_title",
        content: "As someone who does due diligence for a living, the integration with probate and obituary signals saves me easily 15 hours a week."
    }
];

export const GroupsPage: React.FC = () => (
    <div className="max-w-5xl mx-auto py-8 px-4 h-[calc(100vh-120px)] overflow-y-auto">
        {/* Header section with Social Links */}
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between mb-12 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white shadow-lg">
            <div>
                <h1 className="text-3xl sm:text-4xl font-black mb-3 text-white tracking-tight">{t('EcosystemPages.joinTheInnerCircle')}</h1>
                <p className="text-blue-200 max-w-lg mb-6 leading-relaxed">
                    {t('EcosystemPages.connectWithOver2500A')}</p>
                <div className="flex gap-4">
                    <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm border border-white/10">
                        <span className="material-symbols-outlined text-lg">{t('EcosystemPages.public')}</span> {t('EcosystemPages.facebookGroup')}</a>
                    <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-sm border border-white/10">
                        <span className="material-symbols-outlined text-lg">{t('EcosystemPages.chat')}</span> {t('EcosystemPages.discordMatrix')}</a>
                </div>
            </div>
            {/* Visual Decorative */}
            <div className="hidden md:flex gap-4 opacity-50 pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center -rotate-6">
                    <span className="material-symbols-outlined text-3xl font-bold">{t('EcosystemPages.trendingup')}</span>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center rotate-12 mt-8">
                    <span className="material-symbols-outlined text-3xl font-bold">{t('EcosystemPages.handshake')}</span>
                </div>
            </div>
        </div>

        {/* Member Approved Section */}
        <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-emerald-500">{t('EcosystemPages.verified')}</span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('EcosystemPages.investorApproved')}</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
                {GROUPS_TESTIMONIALS.map((t, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-slate-600 dark:text-slate-300 italic mb-6 leading-relaxed text-sm">
                            "{t.content}"
                        </p>
                        <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                                {t.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</div>
                                <div className="text-xs text-slate-500">{t.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Pro Mastermind Teaser */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-2xl mx-auto">
            <span className="material-symbols-outlined text-4xl text-amber-500 mb-3 block">{t('EcosystemPages.workspacepremium')}</span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('EcosystemPages.goAuctPlatinumMaster')}</h3>
            <p className="text-slate-500 text-sm mb-6">{t('EcosystemPages.applicationsForOurQ4')}</p>
            <button disabled className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">
                {t('EcosystemPages.applicationsClosed')}</button>
        </div>
    </div>
);
