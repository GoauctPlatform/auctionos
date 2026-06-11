import React from 'react';
import { Property, PropertyStatus } from '../types';
import { ExternalLink, MapPin, BadgeDollarSign, Scan, Info, Edit, Eye, Share2 } from 'lucide-react';
import { getStreetViewUrl } from '../utils/maps';
import { calculateDealScore } from '../intelligence/scoringEngine';

interface PropertyCardProps {
    property: Property;
    onView: (property: Property) => void;
    onFavorite?: (property: Property) => void;
    onFlyer?: (property: Property) => void;
    isFavorite?: boolean;
    isSelected?: boolean;
    onSelect?: (id: string, checked: boolean) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onView,
    onFavorite,
    onFlyer,
    isFavorite,
    isSelected,
    onSelect
}) => {
    const [streetViewError, setStreetViewError] = React.useState(false);
    const streetViewUrl = getStreetViewUrl(property);

    // Calculate or retrieve Deal Score & Grade
    const scoreResult = calculateDealScore(property);
    const grade = property.deal_rating || scoreResult.rating;
    const score = property.deal_score !== null && property.deal_score !== undefined 
        ? Math.round(property.deal_score) 
        : scoreResult.score;

    // Financial Metrics Calculation
    const assessedVal = property.assessed_value ? Number(property.assessed_value) : 0;
    const arv = property.estimated_value || property.details?.estimated_value || (assessedVal ? assessedVal * 1.5 : 0);
    const maxBid = property.max_bid || property.details?.max_bid || (arv * 0.7);
    const spread = arv - maxBid;

    const getStatusColor = (status: PropertyStatus) => {
        switch (status) {
            case PropertyStatus.Active: return 'bg-green-500';
            case PropertyStatus.Pending: return 'bg-yellow-500';
            case PropertyStatus.Sold: return 'bg-slate-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <div className={`group relative bg-white dark:bg-slate-800 rounded-2xl border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-slate-200 dark:border-slate-700'} overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}>
            {/* Selection Checkbox */}
            {onSelect && (
                <div className="absolute top-3 left-3 z-10">
                    <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer transition-transform hover:scale-110"
                        checked={isSelected}
                        onChange={(e) => onSelect(String(property.id), e.target.checked)}
                    />
                </div>
            )}

            {/* Media / Image */}
            <div className="relative h-48 overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-900" onClick={() => onView(property)}>
                {streetViewUrl && !streetViewError ? (
                    <img 
                        src={streetViewUrl} 
                        alt={property.address}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setStreetViewError(true)}
                    />
                ) : (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundImage: `url('${property.imageUrl || '/placeholder.png'}')` }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                {/* Grade Badge */}
                {grade && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-md z-10 border border-slate-200/50 dark:border-slate-800/50">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            grade === 'A+' ? 'bg-emerald-600 text-white' :
                            grade === 'A' ? 'bg-emerald-500 text-white' :
                            grade === 'B' ? 'bg-blue-500 text-white' :
                            grade === 'C' ? 'bg-amber-500 text-white' :
                            grade === 'D' ? 'bg-orange-500 text-white' :
                            grade === 'F' ? 'bg-red-500 text-white' :
                            'bg-slate-500 text-white'
                        }`}>
                            {grade}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                            {score}%
                        </span>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(property.status)}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        {property.status}
                    </span>
                </div>

                {/* Max Bid & Spread Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end select-none">
                    <div className="flex flex-col text-left">
                        <span className="text-[9px] font-black text-slate-350 dark:text-slate-400 uppercase tracking-widest leading-none mb-1 drop-shadow-md">Max Bid</span>
                        <div className="text-white font-black text-sm drop-shadow-md leading-none">
                            {maxBid ? `$${Math.round(maxBid).toLocaleString()}` : 'TBD'}
                        </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                        <span className="text-[9px] font-black text-indigo-300 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1 drop-shadow-md">Est. Spread</span>
                        <div className="text-emerald-400 font-black text-sm drop-shadow-md leading-none">
                            {spread && spread > 0 ? `$${Math.round(spread).toLocaleString()}` : 'TBD'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Address & City */}
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                        {property.address || property.title}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                        <MapPin size={12} />
                        <span>{property.city}, {property.state} {property.zip_code}</span>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Parcel ID */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <Scan size={14} className="text-slate-400" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Parcel ID</span>
                            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 truncate" title={property.parcel_id || property.smart_tag}>
                                {property.parcel_id || property.smart_tag || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Opening Bid */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <BadgeDollarSign size={14} className="text-red-500" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Opening Bid</span>
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 truncate">
                                {property.amount_due ? `$${property.amount_due.toLocaleString()}` : '-'}
                            </span>
                        </div>
                    </div>

                    {/* Assessed Value */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <div className="text-slate-400 material-symbols-outlined text-[16px]">payments</div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Assessed Value</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {property.assessed_value || property.details?.assessed_value ? `$${(property.assessed_value || property.details?.assessed_value)?.toLocaleString()}` : '-'}
                            </span>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <div className="text-slate-400 material-symbols-outlined text-[16px]">tag</div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Category</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {property.property_category || property.details?.property_category || property.auction_type || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Occupancy */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <div className="text-slate-400 material-symbols-outlined text-[16px]">sensor_door</div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Occupancy</span>
                            <span className={`text-xs font-semibold truncate ${
                                (property.occupancy || '').toLowerCase() === 'occupied' ? 'text-orange-600 dark:text-orange-400' :
                                (property.occupancy || '').toLowerCase() === 'vacant' ? 'text-green-600 dark:text-green-400' :
                                'text-slate-700 dark:text-slate-300'
                            }`}>
                                {property.occupancy || (property.owner_occupied === 'true' || property.owner_occupied === true ? 'Occupied' : property.owner_occupied === 'false' || property.owner_occupied === false ? 'Vacant' : 'Unknown')}
                            </span>
                        </div>
                    </div>

                    {/* Acreage */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <div className="text-slate-400 material-symbols-outlined text-[16px]">landscape</div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Acreage</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {property.lot_acres || property.details?.lot_acres ? `${property.lot_acres || property.details?.lot_acres} Acres` : '-'}
                            </span>
                        </div>
                    </div>

                    {/* Property Type */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <div className="text-slate-400 material-symbols-outlined text-[16px]">home</div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Parcel Type</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={property.property_type || property.details?.property_type}>
                                {property.property_type || property.details?.property_type || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Auction Date */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <div className="text-slate-400 material-symbols-outlined text-[16px]">calendar_month</div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Auction Date</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={property.next_auction_date || property.auction_name}>
                                {property.next_auction_date || property.auction_name || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* External Links */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {property.details?.zillow_url && (
                        <a href={property.details.zillow_url} target="_blank" rel="noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" title="Zillow">
                            <ExternalLink size={16} />
                        </a>
                    )}
                    {property.details?.regrid_url && (
                        <a href={property.details.regrid_url} target="_blank" rel="noreferrer" className="p-1.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors" title="Regrid">
                            <ExternalLink size={16} />
                        </a>
                    )}
                    {property.details?.fema_url && (
                        <a href={property.details.fema_url} target="_blank" rel="noreferrer" className="p-1.5 text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-md transition-colors" title="FEMA">
                            <Info size={16} />
                        </a>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 w-full justify-between">
                        <button
                            onClick={() => onView(property)}
                            className="flex-1 flex justify-center items-center gap-2 p-2 text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                            title="View Details"
                        >
                            <Eye size={18} />
                            <span className="text-xs font-semibold">Preview</span>
                        </button>
                        {onFavorite && (
                            <button
                                onClick={() => onFavorite(property)}
                                className={`flex-1 flex justify-center items-center gap-2 p-2 rounded-lg transition-all ${isFavorite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-slate-500 hover:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                            >
                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                                <span className="text-xs font-semibold">Favorite</span>
                            </button>
                        )}
                        {onFlyer && (
                            <button
                                onClick={() => onFlyer(property)}
                                className="flex-1 flex justify-center items-center gap-2 p-2 text-slate-500 hover:text-purple-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                                title="Generate Flyer"
                            >
                                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                <span className="text-xs font-semibold">Flyer</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
