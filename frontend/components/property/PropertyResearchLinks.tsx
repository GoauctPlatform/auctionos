import React from 'react';
import { Property } from '../../types';

interface Props {
    property: Property;
}

export const PropertyResearchLinks: React.FC<Props> = ({ property }) => {
    // Safely construct search queries
    const addressQuery = encodeURIComponent(property.address || property.parcel_address || '');
    const locationQuery = encodeURIComponent(`${property.city || ''} ${property.state || ''} ${property.zip_code || ''}`);
    const fullQuery = encodeURIComponent(`${property.address || property.parcel_address || ''} ${property.city || ''} ${property.state || ''}`);
    const ownerNameFallback = property.owner_name || property.details?.owner_name || '';

    // Advanced Formatting Variables for robust linking
    const cityFormatted = property.city ? property.city.replace(/ /g, '_') : '';
    const cityStateQuery = property.city && property.state ? `${cityFormatted}_${property.state}` : property.city || '';
    const nsCity = property.city ? property.city.toLowerCase().replace(/ /g, '-') : '';
    const nsState = property.state ? property.state.toLowerCase() : '';

    const categories = [
        {
            title: 'Official Auction Portal',
            icon: 'gavel',
            links: [
                ...(property.auction_info_link ? [{ label: 'Official Registration', url: property.auction_info_link }] : []),
                ...(property.auction_list_link ? [{ label: 'Official Property List', url: property.auction_list_link }] : []),
                { label: 'Search County Portal', url: property.auction_info_link || `https://www.google.com/search?q=${encodeURIComponent(`${property.county} County ${property.state} tax sale portal`)}` }
            ]
        },
        {
            title: 'Owner Research',
            icon: 'person_search',
            links: [
                { label: 'Google Search', url: `https://www.google.com/search?q=${encodeURIComponent(ownerNameFallback)}` },
                { label: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(ownerNameFallback)}` },
                { label: 'Obituary Search', url: `https://www.google.com/search?q=${encodeURIComponent(ownerNameFallback + ' obituary')}` },
                { label: 'Social Media', url: `https://www.facebook.com/search/people/?q=${encodeURIComponent(ownerNameFallback)}` }
            ]
        },
        {
            title: 'Skip Trace',
            icon: 'find_in_page',
            links: [
                { label: 'Fast People Search', url: `https://www.fastpeoplesearch.com/name/${encodeURIComponent(ownerNameFallback)}` },
                { label: 'True People Search', url: `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(ownerNameFallback)}` },
                { label: 'Cyber Background', url: `https://www.cyberbackgroundchecks.com/people/${encodeURIComponent(ownerNameFallback.replace(/ /g, '-'))}` },
                { label: 'FamilyTreeNow', url: `https://www.familytreenow.com/search/genealogy/results?first=${encodeURIComponent(ownerNameFallback.split(' ')[0])}&last=${encodeURIComponent(ownerNameFallback.split(' ').slice(-1)[0])}` }
            ]
        },
        {
            title: 'Property Research',
            icon: 'home_work',
            links: [
                { label: 'Zillow Report', url: `https://www.zillow.com/homes/${fullQuery}_rb` },
                { label: 'Regrid Property Map', url: `https://app.regrid.com/us?q=${fullQuery}` },
                { label: 'EPA EnviroFacts', url: `https://www.epa.gov/enviro/myenvironment` },
                { label: 'FEMA Flood Maps', url: `https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(property.address || '')}` },
                { label: 'Google Earth', url: `https://earth.google.com/web/search/${fullQuery}` }
            ]
        },
        {
            title: 'Comparables',
            icon: 'compare_arrows',
            links: [
                { label: 'Realtor.com Comps', url: `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(property.zip_code || cityStateQuery)}/show-recently-sold` },
                { label: 'Redfin Estimator', url: property.redfin_url || (property.zip_code ? `https://www.redfin.com/zipcode/${property.zip_code}` : `https://www.redfin.com/city/${encodeURIComponent(property.city || '')}/${property.state}`) },
                { label: 'Trulia Local Comps', url: `https://www.trulia.com/${property.state}/${encodeURIComponent(cityFormatted)}/` },
                { label: 'Zillow Recently Sold', url: `https://www.zillow.com/homes/recently_sold/${encodeURIComponent(property.zip_code || cityStateQuery)}_rb/` }
            ]
        },
        {
            title: 'Local Market',
            icon: 'trending_up',
            links: [
                { label: 'Market Overview', url: `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(property.zip_code || cityStateQuery)}/overview` },
                { label: 'Redfin Insights', url: `https://www.redfin.com/city/${encodeURIComponent(property.city || '')}/${property.state}/housing-market` },
                { label: 'Neighborhood Scout', url: `https://www.neighborhoodscout.com/${nsState}/${encodeURIComponent(nsCity)}` },
                { label: 'Local News Crime', url: `https://www.google.com/search?q=${encodeURIComponent(property.city || '')}+${property.state}+crime+rates` }
            ]
        }
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-hidden h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-emerald-500 text-lg">search_insights</span>
                Research Ecosystem
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 flex-1 overflow-auto pr-1">
                {categories.map((cat, idx) => (
                    <div key={idx} className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{cat.title}</span>
                        </div>
                        <ul className="space-y-2">
                            {cat.links.map((link, lIdx) => (
                                <li key={lIdx}>
                                    <a 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1.5 transition-colors group"
                                    >
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-blue-500 transition-colors"></span>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <p className="text-[10px] text-slate-400 italic font-medium">Verified External Databases</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Live Index</span>
                </div>
            </div>
        </div>
    );
};
