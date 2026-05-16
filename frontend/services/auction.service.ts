import { API_URL, getHeaders } from './httpClient';
import { AuctionEvent } from '../types';

export const AuctionService = {
    getAuctionEvents: async (filters: any = {}): Promise<{ items: AuctionEvent[], total: number }> => {
        const queryParams = new URLSearchParams();
        if (filters.name) queryParams.append('name', filters.name);
        if (filters.state) queryParams.append('state', filters.state);
        if (filters.county) queryParams.append('county', filters.county);
        if (filters.isPresencial !== undefined) queryParams.append('is_presential', String(filters.isPresencial));
        if (filters.startDate) queryParams.append('start_date', filters.startDate);
        if (filters.endDate) queryParams.append('end_date', filters.endDate);
        if (filters.minParcels) queryParams.append('min_parcels', String(filters.minParcels));
        if (filters.maxParcels) queryParams.append('max_parcels', String(filters.maxParcels));
        if (filters.skip !== undefined) queryParams.append('skip', String(filters.skip));
        if (filters.limit !== undefined) queryParams.append('limit', String(filters.limit));
        if (filters.sortBy) queryParams.append('sort_by', filters.sortBy);
        if (filters.order) queryParams.append('order', filters.order);
        if (filters.tax_status) queryParams.append('tax_statuses', filters.tax_status);
        if (filters.tax_statuses && Array.isArray(filters.tax_statuses)) {
            filters.tax_statuses.forEach((s: string) => queryParams.append('tax_statuses', s));
        }

        const response = await fetch(`${API_URL}/auctions/?${queryParams.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch auction events');
        return response.json();
    },

    createAuctionEvent: async (data: Partial<AuctionEvent>): Promise<AuctionEvent> => {
        const response = await fetch(`${API_URL}/auctions/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create auction event');
        return response.json();
    },

    updateAuctionEvent: async (id: number, data: Partial<AuctionEvent>): Promise<AuctionEvent> => {
        const response = await fetch(`${API_URL}/auctions/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update auction event');
        return response.json();
    },

    deleteAuctionEvent: async (id: number) => {
        const response = await fetch(`${API_URL}/auctions/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete auction');
        return true;
    },

    getCounties: async (stateCode: string): Promise<any> => {
        const response = await fetch(`${API_URL}/auctions/counties?state=${stateCode}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch counties');
        return response.json();
    },

    getCalendarEvents: async (filters: any = {}): Promise<any[]> => {
        const queryParams = new URLSearchParams();
        if (filters.name) queryParams.append('name', filters.name);
        if (filters.state) queryParams.append('state', filters.state);
        if (filters.county) queryParams.append('county', filters.county);
        if (filters.isPresencial !== undefined) queryParams.append('is_presential', String(filters.isPresencial));
        if (filters.startDate) queryParams.append('start_date', filters.startDate);
        if (filters.endDate) queryParams.append('end_date', filters.endDate);
        if (filters.q) queryParams.append('q', filters.q);
        if (filters.tax_status) queryParams.append('tax_statuses', filters.tax_status);
        if (filters.tax_statuses && Array.isArray(filters.tax_statuses)) {
            filters.tax_statuses.forEach((s: string) => queryParams.append('tax_statuses', s));
        }

        const response = await fetch(`${API_URL}/auctions/calendar?${queryParams.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch calendar');
        return response.json();
    }
};
