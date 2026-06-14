import * as L from 'leaflet';
import 'leaflet-control-geocoder';

const CACHE_KEY = 'goauct_geocoding_cache';
const DELAY_MS = 1200; // Nominatim compliance (1 request per second)

// Load cache from localStorage
const getCache = (): Record<string, { lat: number, lng: number }> => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch {
        return {};
    }
};

// Save cache to localStorage
const setCache = (address: string, coords: { lat: number, lng: number }) => {
    try {
        const cache = getCache();
        cache[address] = coords;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Failed to save to geocoding cache', e);
    }
};

// Global queue to prevent hitting rate limits when multiple components request at once
class GeocodingQueue {
    private queue: Array<() => Promise<void>> = [];
    private isProcessing = false;

    async add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });
            this.process();
        });
    }

    private async process() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                await task();
                if (this.queue.length > 0) {
                    await new Promise(r => setTimeout(r, DELAY_MS));
                }
            }
        }
        this.isProcessing = false;
    }
}

const geocoderQueue = new GeocodingQueue();

/**
 * Geocodes an address. Uses LocalStorage cache first.
 * If not cached, it queues the network request to comply with Nominatim rate limits.
 */
export const geocodeAddress = async (address: string): Promise<{ lat: number, lng: number } | null> => {
    if (!address) return null;

    // 1. Check persistent cache
    const cache = getCache();
    if (cache[address]) {
        return cache[address];
    }

    // 2. Add to throttling queue
    return geocoderQueue.add(async () => {
        try {
            console.log('Geocoding fresh address via fetch:', address);
            const encodedAddr = encodeURIComponent(address);
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddr}&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'GoAuct-App/1.0'
                }
            });

            if (!response.ok) {
                console.error('Nominatim API error:', response.status, response.statusText);
                return null;
            }

            const data = await response.json();
            if (data && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                setCache(address, coords);
                console.log('Geocoded successfully:', address, coords);
                return coords;
            } else {
                console.warn('Nominatim returned no results for:', address);
                return null;
            }
        } catch (error) {
            console.error('Geocoding exception:', error);
            return null;
        }
    });
};

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

export interface ReverseGeocodeResult {
    city?: string;
    county?: string;
    state?: string;
    stateCode?: string;
    country?: string;
}

export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResult | null> => {
    return geocoderQueue.add(async () => {
        try {
            console.log('Reverse geocoding fresh coordinates via fetch:', lat, lng);
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'GoAuct-App/1.0'
                }
            });

            if (!response.ok) {
                console.error('Nominatim API error:', response.status, response.statusText);
                return null;
            }

            const data = await response.json();
            if (data && data.address) {
                const addr = data.address;
                const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '';
                const countyRaw = addr.county || '';
                // Clean county name: strip ' County' from the end
                const county = countyRaw.replace(/\s+county\s*$/i, '').trim();
                const state = addr.state || '';
                
                // Map state name to state code
                const stateLower = state.toLowerCase().trim();
                const stateCode = STATE_CODE_MAP[stateLower] || state.toUpperCase().slice(0, 2);

                const result = {
                    city,
                    county,
                    state,
                    stateCode,
                    country: addr.country || ''
                };
                console.log('Reverse geocoded successfully:', result);
                return result;
            }
            return null;
        } catch (error) {
            console.error('Reverse geocoding exception:', error);
            return null;
        }
    });
};
