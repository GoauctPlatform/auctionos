import { API_BASE_URL } from '../services/httpClient';

/**
 * Generates a Google Street View Static API URL for a given location.
 * Supports both a single property object or individual address components.
 */
export function getStreetViewUrl(
    locationOrProperty: string | any,
    city?: string,
    state?: string,
    zip?: string,
    size: string = '640x400'
): string {
    // 1. If we have an object with a pre-saved or dynamically injected gsi_url, use it directly!
    if (typeof locationOrProperty === 'object' && locationOrProperty !== null) {
        const dbGsiUrl = locationOrProperty.gsi_url || locationOrProperty.details?.gsi_url || '';
        if (dbGsiUrl) {
            if (dbGsiUrl.startsWith('/')) {
                return `${API_BASE_URL}${dbGsiUrl}`;
            }
            return dbGsiUrl;
        }
    }

    const key = import.meta.env.VITE_GOOGLE_STREET_VIEW_KEY;
    if (!key) return '';

    let locationStr = '';

    // If first argument is an object (Property), extract fields
    if (typeof locationOrProperty === 'object' && locationOrProperty !== null) {
        const p = locationOrProperty.details || locationOrProperty;
        
        // Prefer coordinate-based locations if coordinates exist for perfect Street View accuracy
        if (p.latitude && p.longitude) {
            locationStr = `${p.latitude},${p.longitude}`;
        } else {
            const rawAddr = p.address || (p.owner_address ? String(p.owner_address).split('\n')[0] : null) || '';
            const c = p.city || '';
            const s = p.state || '';
            const z = p.zip_code || p.zip || '';
            locationStr = [rawAddr, c, s, z].filter(Boolean).join(', ');
        }
    } else {
        // Individual strings provided
        locationStr = [locationOrProperty, city, state, zip].filter(Boolean).join(', ');
    }

    if (!locationStr || locationStr.trim() === ', ,') return '';

    const sanitizedLocation = encodeURIComponent(locationStr.replace(/\n/g, ' ').trim());
    
    // Using high-quality parameters: fov=90 (standard), pitch=10 (slightly up to see house)
    return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${sanitizedLocation}&fov=90&pitch=10&key=${key}`;
}
