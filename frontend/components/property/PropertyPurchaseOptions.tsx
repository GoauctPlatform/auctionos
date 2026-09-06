import React, { useState } from 'react';
import { Property } from '../../types';
import { Modal } from '../Modal';
import { PropertyService } from '../../services/property.service';
import { useLanguage } from "../../context/LanguageContext";

interface Props {
    property: Property;
    readOnly?: boolean;
    actionLoading?: boolean;
    onSimulatePurchase?: () => void;
}

export const PropertyPurchaseOptions: React.FC<Props> = ({ 
    property, 
    readOnly, 
    actionLoading, 
    onSimulatePurchase 
}) => {
    const { t } = useLanguage();
    const [isApplyOpen, setIsApplyOpen] = useState(false);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const isAvailable = property.availability_status === 'available' || property.details?.availability_status === 'available';
    const isPurchased = property.availability_status === 'purchased' || property.details?.availability_status === 'purchased' || property.availability_status === 'sold';
    
    // Check if there is an active/linked auction
    const pAny = property as any;
    const hasActiveAuction = !!(pAny.current_auction_name || (property.auction_history && property.auction_history.length > 0));

    // Link Priority: auction_list_link -> auction_info_link -> fallback search
    const details: any = property.details || {};
    const auctionInfoLink = property.auction_info_link || details.auction_info_link;
    const auctionListLink = property.auction_list_link || details.auction_list_link;
    
    const primaryLink = auctionListLink || auctionInfoLink || `https://www.google.com/search?q=${encodeURIComponent(`${property.county || details.county} County ${property.state || details.state} tax sale portal`)}`;

    const handleAuctionRedirect = async () => {
        try {
            const { url } = await PropertyService.getAuctionRedirect(property.parcel_id!);
            if (url) {
                window.open(url, '_blank');
            } else {
                window.open(primaryLink, '_blank');
            }
        } catch (e) {
            window.open(primaryLink, '_blank');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col h-full overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-emerald-500 text-lg">shopping_bag</span>
                Purchase Ecosystem
            </h3>

            {/* Structured Auction Data */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex-1">
                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Status</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isAvailable ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                            {property.availability_status || 'Market Active'}
                        </span>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Opening Bid</p>
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                            {property.amount_due ? `$${property.amount_due.toLocaleString()}` : 'Contact Authority'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Last Update</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {formatDate(property.updated_at)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Parcel Ref</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                            {property.parcel_id}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                {isAvailable ? (
                    hasActiveAuction ? (
                        <>
                            <button 
                                onClick={() => auctionInfoLink ? window.open(auctionInfoLink, '_blank') : setIsApplyOpen(true)}
                                className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-700 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                                Online Instructions
                            </button>
                            
                            {readOnly ? (
                                <div
                                    onClick={() => auctionListLink ? window.open(auctionListLink, '_blank') : handleAuctionRedirect()}
                                    className="group relative overflow-hidden bg-orange-600 dark:bg-orange-500 text-white rounded-xl p-5 text-center shadow-lg transition-all duration-300 hover:bg-orange-700 dark:hover:bg-orange-400 cursor-pointer hover:shadow-orange-500/20 active:scale-[0.98]"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                                    <h3 className="font-black text-lg uppercase tracking-tight mb-1">
                                        Go to Live Auction
                                    </h3>
                                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                                        {(property as any).current_auction_name || 'Auction Entry Detected'}
                                    </p>
                                    <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-black bg-white/10 py-1 px-3 rounded-full group-hover:bg-white/20 transition-colors text-white">
                                        <span className="material-symbols-outlined text-[14px]">gavel</span>
                                        BID ON EXTERNAL PORTAL
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={actionLoading ? undefined : onSimulatePurchase}
                                    className={`group relative overflow-hidden bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl p-5 text-center shadow-lg transition-all duration-300 ${
                                        actionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700 dark:hover:bg-emerald-400 cursor-pointer hover:shadow-emerald-500/20 active:scale-[0.98]'
                                    }`}
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                                    <h3 className="font-black text-lg uppercase tracking-tight mb-1">
                                        {actionLoading ? 'Verifying...' : 'Purchase Online'}
                                    </h3>
                                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                                        {property.county} County Direct
                                    </p>
                                    <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-black bg-white/10 py-1 px-3 rounded-full group-hover:bg-white/20 transition-colors">
                                        <span className="material-symbols-outlined text-[14px]">bolt</span>
                                        SIMULATE TRANSACTION
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 rounded-xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-800">
                            <span className="material-symbols-outlined text-3xl mb-2 text-amber-500 dark:text-amber-400">gavel</span>
                            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-700 dark:text-slate-300">Purchase Unavailable</h3>
                            <p className="text-[10px] mt-1 italic text-slate-500 dark:text-slate-400">No active auction linked to this property.</p>
                        </div>
                    )
                ) : (
                    <div className="bg-slate-100 dark:bg-slate-900/50 text-slate-400 rounded-xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-800">
                        <span className="material-symbols-outlined text-3xl mb-2">lock_clock</span>
                        <h3 className="font-bold text-sm uppercase tracking-widest">Not Available</h3>
                        <p className="text-[10px] mt-1 italic">This property has been moved to archival status.</p>
                    </div>
                )}
            </div>

            {/* Apply Online Modal */}
            <Modal isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} title="External Portal Access" size="xl">
                <div className="space-y-6 py-2">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-4">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">gavel</span>
                        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                            <strong className="block mb-1">Official Disclaimer</strong>
                            You are about to access the state/county authority portal. GoAuct provides data intelligence but does not process payments or legal documents for the direct purchase of tax certificates.
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-3">Required Credentials</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Subject Parcel ID:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    {property.parcel_id}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">CS / Certificate No:</span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    {property.cs_number || 'CONTACT OFFICE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <a 
                            href={auctionInfoLink || primaryLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full py-4 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                        >
                            Open State Portal Link <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                        <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed px-8">
                            Ensure you have your banking information and personal identification ready before continuing to the state website.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
