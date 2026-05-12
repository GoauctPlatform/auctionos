import React from 'react';
import { Property, PropertyStatus } from '../types';
import { ExternalLink, MapPin, BadgeDollarSign, Scan, Info, Edit, Eye, Share2 } from 'lucide-react';
import { getStreetViewUrl } from '../utils/maps';

interface PropertyCardProps {
    property: Property;
    onView: (property: Property) => void;
    onEdit: (property: Property) => void;
    onExport: (property: Property) => void;
    onDelete: (property: Property) => void;
    isSelected?: boolean;
    onSelect?: (id: string, checked: boolean) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onView,
    onEdit,
    onExport,
    onDelete,
    isSelected,
    onSelect
}) => {
    const [streetViewError, setStreetViewError] = React.useState(false);
    const streetViewUrl = getStreetViewUrl(property);

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
                        onChange={(e) => onSelect(property.id, e.target.checked)}
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

                {/* Status Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(property.status)}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        {property.status}
                    </span>
                </div>

                {/* Price Tag */}
                <div className="absolute bottom-3 left-3">
                    <div className="text-white font-bold text-xl drop-shadow-md">
                        {property.price ? `$${property.price.toLocaleString()}` : 'Price TBD'}
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
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <Scan size={14} className="text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Parcel ID</span>
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate w-20">
                                {property.smart_tag || '-'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <BadgeDollarSign size={14} className="text-slate-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Opening Bid</span>
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                {property.amount_due ? `$${property.amount_due.toLocaleString()}` : '-'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div className="text-slate-400 material-symbols-outlined text-[14px]">calendar_month</div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Auction</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {property.next_auction_date || '-'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div className="text-slate-400 material-symbols-outlined text-[14px]">person</div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Occupancy</span>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {property.occupancy || '-'}
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
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onView(property)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                            title="View Details"
                        >
                            <Eye size={18} />
                        </button>
                        <button
                            onClick={() => onEdit(property)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                            title="Edit"
                        >
                            <Edit size={18} />
                        </button>
                        <button
                            onClick={() => onExport(property)}
                            className="p-2 text-slate-400 hover:text-green-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                            title="Export"
                        >
                            <Share2 size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => onDelete(property)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete"
                    >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
