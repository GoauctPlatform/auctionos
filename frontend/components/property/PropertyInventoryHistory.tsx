import React from 'react';
import { Property } from '../../types';
import { useLanguage } from "../../context/LanguageContext";

interface PropertyInventoryHistoryProps {
    property: Property;
}

export const PropertyInventoryHistory: React.FC<PropertyInventoryHistoryProps> = ({ property }) => {
    const { t } = useLanguage();
    // Note: This would typically fetch from property.availability_history if it were pre-populated.
    // For now, we'll use a data-driven structure based on property.availability_status
    
    const status = property.availability_status || 'available';
    const isSold = status.toLowerCase().includes('sold');
    const isPurchased = status.toLowerCase().includes('purchased');
    
    const d = property.details || (property as any);
    const lastSaleDate = property.last_sale_date || d.last_sale_date;
    const inventoryDate = (property as any).state_inventory_entered_date || d.state_inventory_entered_date;

    const events = [
        {
            date: inventoryDate ? new Date(inventoryDate).toISOString().split('T')[0] : 'Historical',
            label: 'Initial Listing',
            desc: 'Property ingested into GoAuct.',
            status: 'completed',
            icon: 'inventory_2'
        },
        {
            date: lastSaleDate ? new Date(lastSaleDate).toISOString().split('T')[0] : 'Data Analyzed',
            label: 'Recorded Sale / Transfer',
            desc: 'Last recorded public transfer event.',
            status: 'completed',
            icon: 'analytics'
        },
        {
            date: 'System Time',
            label: 'Market Update',
            desc: 'Availability status currently ' + status + '.',
            status: isSold || isPurchased ? 'completed' : 'active',
            icon: 'update'
        }
    ];

    if (isSold || isPurchased) {
        events.push({
            date: new Date().toISOString().split('T')[0],
            label: 'Archive Ready',
            desc: 'Transaction verified and recorded.',
            status: 'upcoming',
            icon: 'archive'
        });
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-purple-500 text-lg">history</span>
                Inventory History
            </h3>
            
            <div className="space-y-6 flex-1 px-1">
                {events.map((event, idx) => (
                    <div key={idx} className="relative flex gap-4">
                        {/* Timeline Line */}
                        {idx !== events.length - 1 && (
                            <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-slate-100 dark:bg-slate-700/50"></div>
                        )}
                        
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                            event.status === 'completed' ? 'bg-emerald-500 text-white' :
                            event.status === 'active' ? 'bg-blue-500 text-white' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}>
                            <span className="material-symbols-outlined text-[16px]">{event.icon}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{event.label}</span>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">{event.date}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                {event.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center">
                <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700">
                    ID: {property.parcel_id}
                </span>
            </div>
        </div>
    );
};
