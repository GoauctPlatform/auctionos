import { API_URL, getHeaders } from './httpClient';

export interface CountyContact {
    name: string;
    phone: string;
    url: string;
}

class CountyService {
    async getContacts(state: string, county: string): Promise<CountyContact[]> {
        if (!state || !county) return [];

        try {
            const formattedState = encodeURIComponent(state.toLowerCase().trim());
            const formattedCounty = encodeURIComponent(county.toLowerCase().trim());

            const response = await fetch(`${API_URL}/counties/${formattedState}/${formattedCounty}/contacts`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch county contacts');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch county contacts:', error);
            return [];
        }
    }

    async getCounties(state: string): Promise<string[]> {
        if (!state) return [];

        try {
            const formattedState = encodeURIComponent(state.toLowerCase().trim());
            const response = await fetch(`${API_URL}/counties/${formattedState}/counties`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to fetch counties');
            }

            const counties: string[] = await response.json();
            return counties.map(c => c.replace(/_/g, ' ').trim());
        } catch (error) {
            console.error('Failed to fetch counties:', error);
            return [];
        }
    }

    async getStateContact(state: string): Promise<{state: string, url: string} | null> {
        if (!state) return null;

        try {
            const formattedState = encodeURIComponent(state.toLowerCase().trim());
            const response = await fetch(`${API_URL}/counties/${formattedState}/contact`, {
                headers: getHeaders()
            });

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch state contact:', error);
            return null;
        }
    }
}

export const countyService = new CountyService();
