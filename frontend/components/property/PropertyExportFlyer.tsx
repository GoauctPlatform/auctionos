import React from 'react';
import { Property } from '../../types';
import { calculateDealScore } from '../../intelligence/scoringEngine';
import { getStreetViewUrl } from '../../utils/maps';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
    property: Property;
}

export const PropertyExportFlyer: React.FC<Props> = ({ property }) => {
    const displayScore = calculateDealScore(property);
    const svUrl = getStreetViewUrl(property, undefined, undefined, undefined, '800x450');

    // Financial Metrics Calculation matching system logic
    const price = property.amount_due || property.details?.amount_due || property.price || property.opening_bid || 0;
    const assessedVal = property.assessed_value ? Number(property.assessed_value) : 0;
    const details = property.details;
    
    const arv = details?.estimated_value || property.estimated_value || (assessedVal ? assessedVal * 1.5 : 0);
    const maxBid = details?.max_bid || (arv * 0.7);
    const equity = arv - maxBid;
    const rent = details?.rental_value || arv * 0.008;

    const isTaxLien = (property.property_category || property.purchase_option_type || property.property_type || property.auction_type || '').toLowerCase().includes('lien');

    return (
        <div 
            id="property-sales-flyer"
            className="w-[800px] bg-slate-50 text-slate-800 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col font-sans relative"
        >
            {/* Header / Branding */}
            <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                    <img 
                        src="/goauct-logo.png" 
                        alt="GoAuct Logo" 
                        className="w-9 h-9 rounded-lg object-cover shadow-md border border-slate-200"
                        crossOrigin="anonymous"
                    />
                    <div>
                        <h2 className="text-lg font-black tracking-tight uppercase leading-none text-slate-900">
                            GoAuct <span className="text-indigo-600 font-extrabold">Intelligence</span>
                        </h2>
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Premium Property Brokerage Portfolio</span>
                    </div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                    Investment Analysis Packet
                </div>
            </div>

            {/* Hero Image Section */}
            <div className="relative w-full h-[320px] bg-slate-100 overflow-hidden">
                {svUrl || property.imageUrl ? (
                    <img 
                        src={svUrl || property.imageUrl || ""} 
                        alt="Property Street View" 
                        className="w-full h-full object-cover" 
                        crossOrigin="anonymous"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                        <svg className="w-12 h-12 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-10.5h16.5M2.25 9h19.5M3 18h1.5m1.5-6h1.5M10.5 12h1.5M16.5 12h1.5M3 9V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25V9m-18 9v-6H21v6H3z" />
                        </svg>
                        <span className="text-xs uppercase tracking-widest font-black">Google Street View Not Available</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Floating Badges */}
                <div className="absolute top-4 right-4 flex gap-2">
                    {property.availability_status && (
                        <span className="bg-emerald-100/90 text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg backdrop-blur-xs">
                            {property.availability_status}
                        </span>
                    )}
                    {property.is_qoz && (
                        <span className="bg-amber-100/90 text-amber-800 border border-amber-200 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg backdrop-blur-xs">
                            Opportunity Zone
                        </span>
                    )}
                    {(property.purchase_option_type || property.auction_type) && (
                        <span className="bg-purple-100/90 text-purple-800 border border-purple-200 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg backdrop-blur-xs">
                            {property.purchase_option_type || property.auction_type}
                        </span>
                    )}
                </div>

                {/* Floating Address Info - with heavy text shadow to guarantee contrast on imagery */}
                <div className="absolute bottom-4 left-6 max-w-[550px] space-y-1">
                    <h1 className="text-2xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {property.address || property.parcel_id || 'Premium Property Address'}
                    </h1>
                    <p className="text-xs font-semibold text-slate-200 mt-1 flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        <svg className="w-3.5 h-3.5 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {[property.city, property.county ? `${property.county} County` : '', property.state, property.zip_code].filter(Boolean).join(', ')}
                    </p>
                </div>

                {/* Deal Score Widget */}
                <div className="absolute bottom-4 right-6 bg-white/95 backdrop-blur-md p-2.5 px-3.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xl">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg border font-black text-base shadow-sm ${
                        displayScore.rating.startsWith('A') ? 'bg-emerald-55/80 border-emerald-200 text-emerald-700' :
                        displayScore.rating.startsWith('B') ? 'bg-indigo-55/80 border-indigo-200 text-indigo-700' :
                        'bg-amber-55/80 border-amber-200 text-amber-700'
                    }`}>
                        {displayScore.rating}
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Deal Score</span>
                        <span className="text-sm font-black text-slate-900 leading-none">
                            {displayScore.score}/100
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50">
                {/* Left Column: Basic Details */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-left">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-650 border-b border-slate-200 pb-2">
                        Property Profile
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Structure</span>
                            <span className="text-xs font-bold text-slate-800 block break-words">
                                {property.property_type || details?.property_type || 'Residential'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Beds / Baths</span>
                            <span className="text-xs font-bold text-slate-800 block">
                                {details?.bedrooms || property.bedrooms || '-'} br / {details?.bathrooms || property.bathrooms || '-'} ba
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Building Area</span>
                            <span className="text-xs font-bold text-slate-800 block">
                                {details?.building_area_sqft || details?.sqft || property.building_area_sqft || property.sqft ? `${(details?.building_area_sqft || details?.sqft || property.building_area_sqft || property.sqft).toLocaleString()} sqft` : '-'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Lot Acreage</span>
                            <span className="text-xs font-bold text-slate-800 block">
                                {details?.lot_acres ? `${details.lot_acres} acres` : property.lot_sqft ? `${(property.lot_sqft / 43560).toFixed(2)} acres` : '-'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Year Built</span>
                            <span className="text-xs font-bold text-slate-800 block">
                                {details?.year_built || property.year_built || '1995'}
                            </span>
                        </div>
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Parcel ID</span>
                            <span className="text-xs font-mono font-bold text-indigo-650 block break-all">
                                {property.parcel_id || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Legal description box */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Legal Description</span>
                        <p className="text-[10px] font-mono text-slate-600 leading-normal line-clamp-3">
                            {details?.legal_description || property.legal_description || 'No legal description available for this parcel.'}
                        </p>
                    </div>
                </div>

                {/* Right Column: Financial Highlights */}
                <div className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-5 space-y-4 shadow-sm text-left">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-650 border-b border-indigo-100 pb-2">
                        Financial Intelligence
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Opening Bid / Price</span>
                            <span className="text-lg font-black text-slate-800 block">
                                {price ? `$${price.toLocaleString()}` : 'N/A'}
                            </span>
                        </div>
                        {isTaxLien ? (
                            <>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Est. Debt Value</span>
                                    <span className="text-lg font-black text-rose-600 block">
                                        {price ? `$${price.toLocaleString()}` : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Target Interest Rate</span>
                                    <span className="text-lg font-black text-amber-600 block">
                                        &gt; 16%
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Assessed Value</span>
                                    <span className="text-lg font-black text-slate-800 block">
                                        {assessedVal ? `$${Math.round(assessedVal).toLocaleString()}` : 'N/A'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Estimated ARV</span>
                                    <span className="text-lg font-black text-emerald-600 block">
                                        {arv ? `$${Math.round(arv).toLocaleString()}` : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Recommended Max Bid</span>
                                    <span className="text-lg font-black text-amber-600 block">
                                        {maxBid ? `$${Math.round(maxBid).toLocaleString()}` : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Estimated Rent / Mo</span>
                                    <span className="text-lg font-black text-slate-800 block">
                                        {rent ? `$${Math.round(rent).toLocaleString()}` : 'N/A'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Spread Highlight Bar */}
                    {isTaxLien ? (
                        <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="space-y-0.5">
                                <span className="text-[8px] font-black text-rose-700 uppercase tracking-widest block">Tax Lien Investment</span>
                                <span className="text-[10px] font-semibold text-slate-500">Subject to redemption period</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="space-y-0.5">
                                <span className="text-[8px] font-black text-indigo-700 uppercase tracking-widest block">Potential Equity Spread</span>
                                <span className="text-[10px] font-semibold text-slate-500">Spread over Recommended Max Bid</span>
                            </div>
                            <span className="text-lg font-black text-indigo-650">
                                {equity ? `$${Math.round(equity).toLocaleString()}` : 'N/A'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Presentation info */}
            <div className="flex items-center justify-between p-6 bg-white border-t border-slate-200">
                <div className="flex-1 pr-6 text-left">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-black tracking-tight text-slate-900 uppercase">GoAuct</span>
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase">Brokerage Packets</span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 leading-normal max-w-[500px]">
                        Confidential real estate packet. Compiled algorithmically using the GoAuct valuation scoring engine. Data is deemed highly reliable but is subject to independent verification.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Scan to Visit</span>
                        <span className="text-[9px] font-black text-indigo-650 block leading-tight">GoAuct Platform</span>
                    </div>
                    <div className="p-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                        <QRCodeSVG value="https://www.goauct.com" size={48} bgColor="#ffffff" fgColor="#0b1329" />
                    </div>
                </div>
            </div>
        </div>
    );
};
