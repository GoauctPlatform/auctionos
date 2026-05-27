import React, { useState } from 'react';
import { Property } from '../../types';
import { calculateDealScore, DealScoreResult } from '../../intelligence/scoringEngine';
import { PropertyScoreModal } from './PropertyScoreModal';
import { CircleHelp as HelpCircle, Plus, Minus } from 'lucide-react';
import { API_BASE_URL } from '../../services/httpClient';

interface Props {
    property: Property;
    onOpenFinancials: () => void;
    onOpenMetadata: () => void;
    dealScore?: DealScoreResult | null;
}

export const PropertyBasicInfo: React.FC<Props> = ({ property, onOpenFinancials, onOpenMetadata, dealScore: passedScore }) => {
    const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
    const expandedKey = `expanded_info_${property.property_id}`;
    const isUnlocked = !!(property.is_processed || sessionStorage.getItem(expandedKey) === 'true');
    
    const [isExpanded, setIsExpanded] = useState<boolean>(() => {
        const stored = sessionStorage.getItem(expandedKey);
        if (stored === 'false') return false;
        return isUnlocked;
    });
    const [syncing, setSyncing] = useState(false);
    
    // Fallback to local calculation if no score passed or persisted yet
    const displayScore = passedScore || calculateDealScore(property);

    const handleUnlockAndSync = async () => {
        if (!property.property_id) return;
        setSyncing(true);
        sessionStorage.setItem(expandedKey, 'true');
        // Trigger registry sync & data enrichment under the hood
        sessionStorage.setItem(`ext_triggered_${property.property_id}`, 'true');
        try {
            await fetch(`${API_BASE_URL}/api/v1/properties/${property.property_id}/enrich-extended`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            // Automatically reload the page to cleanly render the newly acquired county records
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } catch (e) {
            console.error('Manual registry sync failed:', e);
            alert('Failed to sync property registry records.');
            setSyncing(false);
        }
    };

    const handleToggleExpand = () => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);
        sessionStorage.setItem(expandedKey, String(nextState));
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-all duration-300">
            {/* Top Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                            {property.smart_tag || 'GoAuctperty'}
                        </span>
                        {property.availability_status && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                                property.availability_status === 'available' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                                {property.availability_status}
                            </span>
                        )}
                        {(property.purchase_option_type || property.auction_type) && (
                            <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                                {property.purchase_option_type || property.auction_type}
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight flex items-center gap-2">
                        {property.address || property.parcel_id || 'Unknown Property'}
                    </h2>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
                        {[property.city, property.state, property.zip_code].filter(Boolean).join(', ')}
                    </p>
                </div>

                {/* Score Indicator */}
                <div className="flex bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 min-w-[140px] items-center gap-3">
                    <div 
                        className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 font-black text-lg ${
                            displayScore.rating.startsWith('A') ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' :
                            displayScore.rating.startsWith('B') ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' :
                            displayScore.rating.startsWith('C') ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400' :
                            'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400'
                        }`}
                        title={displayScore.factors.join('\n')}
                    >
                        {displayScore.rating}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Deal Score</span>
                            <button 
                                onClick={() => setIsScoreModalOpen(true)}
                                className="text-slate-300 hover:text-blue-500 transition-colors"
                                title="How we score"
                            >
                                <HelpCircle size={10} />
                            </button>
                        </div>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 leading-none">
                            {displayScore.score}/100
                        </span>
                    </div>
                </div>
            </div>

            <PropertyScoreModal 
                isOpen={isScoreModalOpen}
                onClose={() => setIsScoreModalOpen(false)}
            />

            {/* Conditional Details Accordion */}
            {isUnlocked ? (
                isExpanded && (
                    <>
                        {/* Critical Attributes Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6 gap-x-4 mb-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">County / State</label>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {property.county || property.details?.county || '-'} / {property.state || property.details?.state || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Auction Type</label>
                                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                    {property.purchase_option_type || property.auction_type || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Parcel ID</label>
                                <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 truncate">
                                    {property.parcel_id || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">C/S Number</label>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {property.cs_number || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Acreage</label>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {property.details?.lot_acres || property.lot_sqft ? (property.lot_sqft! / 43560).toFixed(2) : '-'} ac
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Occupancy</label>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {property.occupancy || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Structure</label>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={property.property_type || property.details?.property_type || 'Unknown'}>
                                    {property.property_type || property.details?.property_type || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Building SqFt</label>
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {property.details?.building_area_sqft || property.details?.sqft || property.building_area_sqft || property.sqft ? `${(property.details?.building_area_sqft || property.details?.sqft || property.building_area_sqft || property.sqft).toLocaleString()} sqft` : '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Stories / Units</label>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {property.details?.num_stories || property.stories || '-'} / {property.details?.num_units || property.num_units || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Subdivision</label>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={property.details?.subdivision || '-'}>
                                    {property.details?.subdivision || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Last Sale</label>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {property.last_sale_price ? `$${property.last_sale_price.toLocaleString()}` : '-'} 
                                    {property.last_sale_date ? <span className="text-[10px] text-slate-400 ml-1">({new Date(property.last_sale_date).getFullYear()})</span> : ''}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Annual Tax</label>
                                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                    {property.tax_amount ? `$${property.tax_amount.toLocaleString()}` : '-'} 
                                    {property.tax_year ? <span className="text-[10px] text-slate-400 ml-1">({property.tax_year})</span> : ''}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Opening Bid</label>
                                <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                                    {property.amount_due ? `$${property.amount_due.toLocaleString()}` : '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Recommended Max Bid</label>
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {(() => {
                                        const d = property.details || (property as any);
                                        const assessedVal = property.assessed_value || d.assessed_value ? Number(property.assessed_value || d.assessed_value) : 0;
                                        const arv = d.estimated_value || property.estimated_value || (assessedVal ? assessedVal * 1.5 : 0);
                                        const maxBid = d.max_bid || property.max_bid || (arv * 0.7);
                                        return maxBid ? `$${Math.round(maxBid).toLocaleString()}` : 'N/A';
                                    })()}
                                </p>
                            </div>
                        </div>

                        {/* Legal Description (Full Width) */}
                        <div className="mb-8 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Legal Description</label>
                            <p className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                                {property.details?.legal_description || property.legal_description || 'No legal description available.'}
                            </p>
                        </div>

                        {/* Metadata Footer Action */}
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex gap-2">
                                <button 
                                    onClick={onOpenFinancials}
                                    className="px-4 py-2 text-xs font-black bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 dark:shadow-none cursor-pointer"
                                >
                                    Property Financials
                                </button>
                                <button 
                                    onClick={onOpenMetadata}
                                    className="px-4 py-2 text-xs font-black bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">equalizer</span>
                                    Extended Metrics
                                </button>
                            </div>
                        </div>
                    </>
                )
            ) : null}

            {/* Expand / Collapse Button in Bottom Right */}
            <button 
                onClick={isUnlocked ? handleToggleExpand : handleUnlockAndSync}
                disabled={syncing}
                className={`absolute bottom-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-indigo-500 transition-all cursor-pointer shadow-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 z-10 ${syncing ? 'animate-spin text-indigo-500' : ''}`}
                title={syncing ? "Syncing..." : isUnlocked ? (isExpanded ? "Collapse Details" : "Expand Details") : "Expand Details"}
            >
                {syncing ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="animate-spin" aria-hidden="true">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 16h5v5" />
                    </svg>
                ) : (
                    (isUnlocked && isExpanded) ? <Minus size={18} /> : <Plus size={18} />
                )}
            </button>
        </div>
    );
};
