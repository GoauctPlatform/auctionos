import React, { useEffect, useState, useMemo } from 'react';
import { getTopScoredProperties, TopScoredProperty, submitScore } from '../../services/scores.service';
import { StatesService, StateContact } from '../../services/states.service';
import { countyService } from '../../services/county.service';
import { PropertyService } from '../../services/property.service';
import { calculateDealScore } from '../../intelligence/scoringEngine';
import { getStreetViewUrl } from '../../utils/maps';
import { Brain, Filter, Sparkles, MapPin, ArrowRight, Coins, RefreshCw, Eye, Image } from 'lucide-react';
import { useLanguage } from "../../context/LanguageContext";

interface SmartAIDealFinderProps {
    onOpenPropertyDetails: (propertyId: string | number, parcelId: string) => void;
    onPreviewProperty: (propertyId: string | number) => void;
}

const STATE_CODE_MAP: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'washington dc': 'DC', 'puerto rico': 'PR'
};

function resolveStateCode(stateRaw: string): string {
  if (!stateRaw) return '';
  const trimmed = stateRaw.trim().toLowerCase();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_CODE_MAP[trimmed] || trimmed.toUpperCase().slice(0, 2);
}

interface AIDealCardProps {
    prop: TopScoredProperty;
    onPreviewProperty: (propertyId: string | number) => void;
    onOpenPropertyDetails: (propertyId: string | number, parcelId: string) => void;
    getRatingStyle: (rating: string) => string;
    renderAuctionTypeBadge: (type: string | null) => React.ReactNode;
}

const AIDealCard: React.FC<AIDealCardProps> = ({
    prop,
    onPreviewProperty,
    onOpenPropertyDetails,
    getRatingStyle,
    renderAuctionTypeBadge,
}) => {
    const { t } = useLanguage();
    const [streetViewError, setStreetViewError] = useState(false);
    const streetViewUrl = getStreetViewUrl(prop, undefined, undefined, undefined, '240x180');
    
    // Financial logic (same as PropertyPreviewDrawer)
    const price = prop.amount_due || 0;
    const assessedVal = prop.assessed_value ? Number(prop.assessed_value) : 0;
    const arv = prop.estimated_value || (assessedVal ? assessedVal * 1.0 : 0);
    const maxBid = prop.max_bid || (arv * 0.7);

    const isTaxLien = (prop.property_category || prop.purchase_option_type || prop.property_type || '').toLowerCase().includes('lien');

    return (
        <div
            onClick={() => onPreviewProperty(prop.parcel_id)}
            className="group relative border rounded-xl p-3 sm:p-4 shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-3 sm:gap-4 bg-[#073642]/10 hover:bg-[#073642]/30 border-[#1a4554]/40 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
        >
            {/* Thumbnail */}
            <div className="relative shrink-0 z-10 transition-all duration-300 group-hover:scale-[1.1] rounded-lg w-32 h-24 sm:w-40 sm:h-28 overflow-hidden bg-[#072b35] flex items-center justify-center shadow-md border border-[#1a4554]/50">
                {streetViewUrl && !streetViewError ? (
                    <img 
                        src={streetViewUrl} 
                        alt={prop.address || ''}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => setStreetViewError(true)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-[#586e75]">
                        <Image size={20} className="opacity-40" />
                        <span className="text-[7px] uppercase tracking-wider font-black opacity-60">No Street View</span>
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#070d1a]/80 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating deal score inside thumb */}
                <div className={`absolute top-1.5 right-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded shadow text-[8px] font-black ${getRatingStyle(prop.rating || 'B')}`}>
                    <span>{prop.rating || 'B'}</span>
                    <span className="text-[6px] opacity-80">({prop.deal_score || 70})</span>
                </div>
                
                <div className="absolute bottom-1.5 left-1.5 z-10">
                    <span className="font-mono text-[7px] font-bold text-slate-200 tracking-wider bg-black/50 px-1 rounded backdrop-blur-sm">
                        #{prop.parcel_id}
                    </span>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-bold text-white truncate text-sm">
                            {prop.owner_address ? prop.owner_address.split('\n')[0] : (prop.address || `Parcel ${prop.parcel_id}`)}
                        </h4>
                        {renderAuctionTypeBadge(prop.property_category || prop.purchase_option_type || prop.property_type)}
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenPropertyDetails(prop.parcel_id, prop.parcel_id);
                        }}
                        className="shrink-0 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-500 hover:text-[#070d1a] border border-cyan-500/30 font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded transition-all shadow-sm flex items-center gap-1"
                    >
                        <span>Dossier</span>
                        <ArrowRight size={10} />
                    </button>
                </div>
                
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="font-mono font-bold text-cyan-500">{prop.parcel_id}</span>
                    <span className="opacity-30">|</span>
                    <div className="flex items-center gap-1 min-w-0">
                        <MapPin size={10} className="text-red-400 shrink-0" />
                        <span className="truncate">{prop.address || 'No Address Listed'}</span>
                    </div>
                    <span className="opacity-30">|</span>
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="text-emerald-400 font-bold uppercase">{prop.county || 'Unknown'} COUNTY, {prop.state}</span>
                    </div>
                </div>

                {prop.description && (
                    <p className="mt-1.5 text-[10px] text-[#93a1a1] line-clamp-1 italic leading-relaxed">
                        {prop.description}
                    </p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-3 sm:gap-5 border-t border-[#1a4554]/30 pt-2.5">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-[#586e75] uppercase font-black tracking-widest">Opening Bid</span>
                        <span className="text-[11px] font-black text-emerald-400">${price.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    </div>
                    
                    {isTaxLien ? (
                        <>
                            <div className="flex flex-col bg-[#002b36]/40 px-2 py-0.5 rounded border border-amber-500/20">
                                <span className="text-[8px] text-amber-500/80 uppercase font-black tracking-widest">Target Interest Rate</span>
                                <span className="text-[11px] font-black text-amber-400">&gt; 16%</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-[#586e75] uppercase font-black tracking-widest">Est. Debt Value</span>
                                <span className="text-[11px] font-black text-indigo-300">${Math.round(price).toLocaleString()}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-[#586e75] uppercase font-black tracking-widest">Est. ARV</span>
                                <span className="text-[11px] font-black text-indigo-300">${Math.round(arv).toLocaleString()}</span>
                            </div>

                            <div className="flex flex-col bg-[#002b36]/40 px-2 py-0.5 rounded border border-amber-500/20">
                                <span className="text-[8px] text-amber-500/80 uppercase font-black tracking-widest">Recommended Max Bid</span>
                                <span className="text-[11px] font-black text-amber-400">${Math.round(maxBid).toLocaleString()}</span>
                            </div>
                        </>
                    )}

                    {prop.legal_description && (
                        <div className="relative group/legal flex flex-col cursor-default">
                            <span className="text-[8px] text-[#586e75] uppercase font-black tracking-widest">Legal Desc.</span>
                            <span className="text-[10px] font-black text-cyan-500 underline decoration-dotted">View ℹ</span>
                            <div className="absolute bottom-full left-0 mb-2 z-50 w-80 invisible opacity-0 group-hover/legal:visible group-hover/legal:opacity-100 transition-all duration-200 pointer-events-none">
                                <div className="bg-[#002b36] text-[#93a1a1] text-[10px] leading-relaxed rounded-xl shadow-2xl p-3 border border-[#1a4554] shadow-[0_10px_30px_rgba(34,211,238,0.15)]">
                                    <p className="font-black uppercase tracking-wider text-cyan-500 text-[8px] mb-1">Legal Description</p>
                                    <p className="font-mono break-words">{prop.legal_description}</p>
                                </div>
                                <div className="w-3 h-3 bg-[#002b36] rotate-45 ml-4 -mt-1.5 border-r border-b border-[#1a4554]" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const SmartAIDealFinder: React.FC<SmartAIDealFinderProps> = ({ 
    onOpenPropertyDetails,
    onPreviewProperty
}) => {
    const [deals, setDeals] = useState<TopScoredProperty[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    
    // States and Counties complete loader
    const [stateContacts, setStateContacts] = useState<StateContact[]>([]);
    const [availableCounties, setAvailableCounties] = useState<string[]>([]);
    
    const [selectedState, setSelectedState] = useState<string>('ALL');
    const [selectedCounty, setSelectedCounty] = useState<string>('ALL');
    const [selectedAuctionType, setSelectedAuctionType] = useState<string>('ALL');

    // 1. Initial hydration and fetch available states list
    useEffect(() => {
        // Load available states from backend database service
        StatesService.getContacts()
            .then(setStateContacts)
            .catch(err => console.error('Error loading states:', err));

        // First try to load from LocalStorage cache
        try {
            const cached = localStorage.getItem('goauct_ai_premium_deals');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setDeals(parsed);
                    setLoading(false);
                }
            }
        } catch (e) {
            console.error('Failed to load cached AI deals:', e);
        }

        // Fetch initial deals
        fetchFreshDeals('ALL');
    }, []);

    // 2. Load counties dynamically when state changes
    useEffect(() => {
        if (selectedState && selectedState !== 'ALL') {
            countyService.getCounties(selectedState)
                .then(setAvailableCounties)
                .catch(() => setAvailableCounties([]));
        } else {
            setAvailableCounties([]);
        }
        setSelectedCounty('ALL');
        
        // Refetch whenever state changes to query backend/Redis live for that state
        fetchFreshDeals(selectedState);
    }, [selectedState]);

    const fetchFreshDeals = async (stateFilter: string) => {
        setLoading(true);
        try {
            // Resolve to 2-letter abbreviation for accurate DB/Redis filtering matches
            const stateCode = stateFilter !== 'ALL' ? resolveStateCode(stateFilter) : undefined;
            
            // A. Tenta carregar do backend os scores já consolidados na tabela de scores
            let fetched = await getTopScoredProperties(100, { 
                state: stateCode,
                minScore: 70 
            });
            
            let premiumDeals = fetched.filter(p => {
                const score = p.deal_score || 0;
                const rating = (p.rating || '').toUpperCase();
                return score >= 70 && ['A+', 'A', 'B'].includes(rating);
            });

            // B. MECANISMO DE FALLBACK (Auto-Hidratação): Se retornar vazio, calcula os scores do zero
            if (premiumDeals.length === 0) {
                console.log(`SmartAIDealFinder: DB scores empty for state: ${stateFilter} (code: ${stateCode}). Computing scores on-the-fly from properties list...`);
                
                // Strictly target ONLY 'available' active properties to avoid expired properties and save resources
                const rawFilters: any = { limit: 100, availability: 'available' };
                if (stateCode) {
                    rawFilters.state = stateCode;
                }
                
                // Busca as propriedades gerais do banco de dados (que não exigem score pré-calculado no DB)
                const rawProps = await PropertyService.getProperties(rawFilters);
                const propsList = Array.isArray(rawProps) ? rawProps : (rawProps?.items || []);
                const scoredProps: TopScoredProperty[] = [];
                
                for (const prop of propsList) {
                    if (!prop.parcel_id) continue;
                    
                    // Calcula o score e a nota usando o motor oficial do sistema
                    const scoreResult = calculateDealScore(prop);
                    const score = scoreResult.score;
                    const rating = scoreResult.rating;
                    
                    // Filtra apenas opções premium (Nota B ou superior e score >= 70)
                    if (score >= 70 && ['A+', 'A', 'B'].includes(rating)) {
                        const topProp: TopScoredProperty = {
                            parcel_id: prop.parcel_id,
                            deal_score: score,
                            rating: rating,
                            score_factors: scoreResult.factors,
                            model_version: 'rule-based-v1',
                            computed_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            address: prop.address || null,
                            county: prop.county || null,
                            state: prop.state || null,
                            amount_due: prop.amount_due ?? null,
                            assessed_value: prop.assessed_value ?? null,
                            availability_status: prop.availability_status || null,
                            property_type: prop.property_type || null,
                            lot_acres: prop.lot_acres ?? null,
                            improvement_value: prop.improvement_value ?? null,
                            owner_address: prop.owner_address || null,
                            purchase_option_type: prop.purchase_option_type || null,
                            property_category: prop.property_category || null
                        };
                        scoredProps.push(topProp);
                        
                        // Auto-Hidratação em background: Envia silenciosamente o score calculado para o banco/Redis
                        submitScore(prop.parcel_id, scoreResult, {
                            status: prop.availability_status,
                            state: prop.state,
                            county: prop.county
                        });
                    }
                }
                
                // Ordena por pontuação decrescente
                scoredProps.sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0));
                premiumDeals = scoredProps;
            }

            setDeals(premiumDeals);
            
            // Grava em cache local para hidratação imediata no próximo carregamento
            if (stateFilter === 'ALL') {
                localStorage.setItem('goauct_ai_premium_deals', JSON.stringify(premiumDeals));
            }
        } catch (err) {
            console.error('Error loading AI premium deals:', err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Filtered deals to display locally by county and auction type (state is filtered on database level for top performance)
    const filteredDeals = useMemo(() => {
        return deals.filter(d => {
            const matchesCounty = selectedCounty === 'ALL' || (d.county && d.county.trim().toUpperCase() === selectedCounty.toUpperCase());
            
            const cleanType = (d.property_category || d.purchase_option_type || d.property_type || '').toLowerCase();
            let matchesType = true;
            if (selectedAuctionType !== 'ALL') {
                if (selectedAuctionType === 'DEED') {
                    matchesType = cleanType.includes('deed');
                } else if (selectedAuctionType === 'LIEN') {
                    matchesType = cleanType.includes('lien');
                } else if (selectedAuctionType === 'FORECLOSURE') {
                    matchesType = cleanType.includes('foreclosure') || (!cleanType.includes('deed') && !cleanType.includes('lien'));
                }
            }
            
            return matchesCounty && matchesType;
        });
    }, [deals, selectedCounty, selectedAuctionType]);

    // Helper to get Rating shield color and style
    const getRatingStyle = (rating: string) => {
        const cleanRating = (rating || '').toUpperCase();
        if (cleanRating === 'A+') return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20';
        if (cleanRating === 'A') return 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-cyan-500/20';
        return 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-indigo-500/20';
    };

    // Helper to render type badge
    const renderAuctionTypeBadge = (type: string | null) => {
        const cleanType = (type || '').toLowerCase();
        if (cleanType.includes('deed')) {
            return (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#8B5CF6]/20 text-[#c084fc] border border-[#8B5CF6]/30">
                    Tax Deed
                </span>
            );
        } else if (cleanType.includes('lien')) {
            return (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#F59E0B]/20 text-[#fbbf24] border border-[#F59E0B]/30">
                    Tax Lien
                </span>
            );
        } else {
            return (
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[#EF4444]/20 text-[#f87171] border border-[#EF4444]/30">
                    Foreclosure
                </span>
            );
        }
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 bg-[#070d1a] text-white p-4 md:p-6 rounded-3xl border border-[#1a4554]/20 shadow-2xl relative overflow-hidden select-none">
            {/* Background Radial Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full blur-3xl bg-indigo-900/30" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl bg-cyan-900/30" />
            </div>

            {/* Header row */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1a4554]/20 pb-4">
                <div>
                    <h2 className="text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-400 flex items-center gap-2">
                        <Brain size={20} className="text-indigo-400 animate-pulse" />
                        Smart AI Deal Finder
                    </h2>
                    <p className="text-[10px] md:text-xs text-[#93a1a1]/80 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={11} className="text-cyan-400" />
                        Real-time Premium Investment Grade B+ Recommendations
                    </p>
                </div>

                {/* Filters and Controls */}
                <div className="flex items-center gap-3 max-w-full overflow-x-auto no-scrollbar pb-1 shrink-0">
                    {/* State Selector */}
                    <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1 shrink-0">
                        <Filter size={11} className="text-[#93a1a1]" />
                        <span className="text-[9px] font-black uppercase text-[#93a1a1]/60 tracking-wider mr-1">State:</span>
                        <select
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-cyan-400 focus:outline-none border-none cursor-pointer [&>option]:bg-[#070d1a] [&>option]:text-white"
                        >
                            <option value="ALL">ALL STATES</option>
                            {stateContacts.map(sc => (
                                <option key={sc.state} value={sc.state}>{sc.state.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* County Selector */}
                    {selectedState !== 'ALL' && availableCounties.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1 shrink-0">
                            <Filter size={11} className="text-[#93a1a1]" />
                            <span className="text-[9px] font-black uppercase text-[#93a1a1]/60 tracking-wider mr-1">County:</span>
                            <select
                                value={selectedCounty}
                                onChange={(e) => setSelectedCounty(e.target.value)}
                                className="bg-transparent text-[10px] font-black uppercase tracking-wider text-teal-400 focus:outline-none border-none cursor-pointer [&>option]:bg-[#070d1a] [&>option]:text-white"
                            >
                                <option value="ALL">ALL COUNTIES</option>
                                {availableCounties.map(co => (
                                    <option key={co} value={co}>{co.toUpperCase()} COUNTY</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Auction Type Selector */}
                    <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1 shrink-0">
                        <Filter size={11} className="text-[#93a1a1]" />
                        <span className="text-[9px] font-black uppercase text-[#93a1a1]/60 tracking-wider mr-1">Type:</span>
                        <select
                            value={selectedAuctionType}
                            onChange={(e) => setSelectedAuctionType(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-indigo-400 focus:outline-none border-none cursor-pointer [&>option]:bg-[#070d1a] [&>option]:text-white"
                        >
                            <option value="ALL">ALL TYPES</option>
                            <option value="DEED">TAX DEED</option>
                            <option value="LIEN">TAX LIEN</option>
                            <option value="FORECLOSURE">FORECLOSURE</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchFreshDeals(selectedState)}
                        disabled={loading}
                        className="p-2 hover:bg-[#073642]/50 border border-[#1a4554]/20 hover:border-cyan-500/35 rounded-xl transition-all text-slate-400 hover:text-white shrink-0"
                        title="Refresh deals"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Carousel Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
                {loading && deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <RefreshCw className="animate-spin text-cyan-400" size={24} />
                        <span className="text-[10px] font-black tracking-widest text-[#586e75] uppercase">Engaging AI recommendations engine...</span>
                    </div>
                ) : filteredDeals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Brain className="text-slate-600 opacity-20 mb-2" size={36} />
                        <p className="text-xs font-bold text-slate-500">No premium options matching location filters.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Try changing location or refreshing the index.</p>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col overflow-y-auto gap-3 py-3 px-3 scroll-smooth select-text no-scrollbar scrollbar-none">
                        {filteredDeals.map((prop) => (
                            <AIDealCard
                                key={prop.parcel_id}
                                prop={prop}
                                onPreviewProperty={onPreviewProperty}
                                onOpenPropertyDetails={onOpenPropertyDetails}
                                getRatingStyle={getRatingStyle}
                                renderAuctionTypeBadge={renderAuctionTypeBadge}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Status Row */}
            <div className="relative z-10 flex items-center justify-between border-t border-[#1a4554]/15 pt-3 text-[9px] font-bold text-[#586e75] uppercase tracking-widest">
                <span>AI MATCH RATE: 100% SECURE</span>
                <span className="flex items-center gap-1 text-cyan-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Premium Opportunities Found: {filteredDeals.length}
                </span>
            </div>
        </div>
    );
};
