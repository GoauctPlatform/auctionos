import React, { useEffect, useState, useMemo } from 'react';
import { getTopScoredProperties, TopScoredProperty, submitScore } from '../../services/scores.service';
import { StatesService, StateContact } from '../../services/states.service';
import { countyService } from '../../services/county.service';
import { PropertyService } from '../../services/property.service';
import { calculateDealScore } from '../../intelligence/scoringEngine';
import { getStreetViewUrl } from '../../utils/maps';
import { Brain, Filter, Sparkles, MapPin, ArrowRight, Coins, RefreshCw, Eye, Image } from 'lucide-react';

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
    const [streetViewError, setStreetViewError] = useState(false);
    const streetViewUrl = getStreetViewUrl(prop);

    return (
        <div
            onClick={() => onPreviewProperty(prop.parcel_id)}
            className="w-[300px] shrink-0 h-[92%] max-h-[380px] self-center flex flex-col justify-between bg-[#073642]/10 hover:bg-[#073642]/20 backdrop-blur-md border border-[#1a4554]/25 hover:border-cyan-500/35 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-cyan-500/5 cursor-pointer group"
            title="Click to show Quick View"
        >
            {/* Image / Cover Container */}
            <div className="relative h-[120px] min-h-[120px] flex-1 max-h-[180px] w-full rounded-xl overflow-hidden mb-3 bg-[#072b35] flex items-center justify-center">
                {streetViewUrl && !streetViewError ? (
                    <img 
                        src={streetViewUrl} 
                        alt={prop.address || ''}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setStreetViewError(true)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-[#586e75]">
                        <Image size={24} className="opacity-40" />
                        <span className="text-[7.5px] uppercase tracking-wider font-black opacity-60">No Street View</span>
                    </div>
                )}
                
                {/* Floating overlay gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />
                
                {/* Float Badges inside Image Container */}
                <div className="absolute top-2 left-2 z-10">
                    {renderAuctionTypeBadge(prop.property_category || prop.purchase_option_type || prop.property_type)}
                </div>
                
                <div className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-lg shadow-lg text-[9px] font-black ${getRatingStyle(prop.rating || 'B')}`}>
                    <span>🏆</span>
                    <span>{prop.rating || 'B'}</span>
                    <span className="text-[7px] opacity-75">({prop.deal_score || 70}%)</span>
                </div>

                <div className="absolute bottom-2 left-2 z-10">
                    <span className="font-mono text-[8px] font-bold text-slate-200 tracking-wider bg-black/45 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        #{prop.parcel_id}
                    </span>
                </div>
            </div>

            {/* Address Details */}
            <div className="mb-2.5 flex-1 min-h-0 flex flex-col justify-center">
                <h4 className="text-[11px] font-bold text-white truncate group-hover:text-cyan-400 transition-colors flex items-start gap-1">
                    <MapPin size={11} className="text-cyan-400 shrink-0 mt-0.5" />
                    {prop.address || 'Address Restricted'}
                </h4>
                <p className="text-[8.5px] text-[#93a1a1] uppercase font-bold tracking-wider mt-1 ml-4 truncate flex items-center gap-1">
                    <span>{prop.county || 'UNKNOWN'} COUNTY, {prop.state}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-cyan-400 flex items-center gap-0.5 font-black text-[7px] uppercase tracking-widest">
                        <Eye size={9} />
                        Preview
                    </span>
                </p>
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-2 gap-3 border-t border-b border-[#1a4554]/15 py-2.5 mb-2.5">
                <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Opening Bid</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Coins size={11} className="text-emerald-400" />
                        ${(prop.amount_due ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                </div>
                <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Assessed Value</span>
                    <span className="text-xs font-black text-indigo-300 block mt-0.5">
                        ${(prop.assessed_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* Quick Details Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Avoid triggering card-level preview
                    onOpenPropertyDetails(prop.parcel_id, prop.parcel_id);
                }}
                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
                <span>Dossier details</span>
                <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
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
                const scoredProps: TopScoredProperty[] = [];
                
                for (const prop of rawProps) {
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
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* State Selector */}
                    <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1">
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
                        <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1">
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
                    <div className="flex items-center gap-1.5 bg-[#002b36]/60 border border-[#1a4554]/30 rounded-xl px-2.5 py-1">
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
                        className="p-2 hover:bg-[#073642]/50 border border-[#1a4554]/20 hover:border-cyan-500/35 rounded-xl transition-all text-slate-400 hover:text-white"
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
                    <div className="w-full h-full flex items-center overflow-x-auto gap-4 py-2 px-1 scroll-smooth select-text no-scrollbar scrollbar-none">
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
