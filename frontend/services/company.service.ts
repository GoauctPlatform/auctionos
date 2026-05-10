import { API_URL, getHeaders } from './httpClient';

export interface Company {
    id: number;
    user_id: number;
    name: string;
    address?: string;
    contact?: string;
    is_active: boolean;
}

export interface CreateCompanyPayload {
    name: string;
    address?: string;
    contact?: string;
}

export const CompanyService = {
    list: async (): Promise<Company[]> => {
        const res = await fetch(`${API_URL}/companies/`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch companies');
        return res.json();
    },

    create: async (payload: CreateCompanyPayload): Promise<Company> => {
        const res = await fetch(`${API_URL}/companies/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to create company');
        }
        return res.json();
    },

    update: async (id: number, payload: Partial<CreateCompanyPayload>): Promise<Company> => {
        const res = await fetch(`${API_URL}/companies/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to update company');
        }
        return res.json();
    },

    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/companies/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to delete company');
    },

    selectActive: async (id: number): Promise<{ active_company_id: number; active_company_name: string }> => {
        const res = await fetch(`${API_URL}/companies/${id}/select`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to select active company');
        return res.json();
    },
};

export const RealtorService = {
    register: async (payload: { name: string; email: string; phone?: string }): Promise<any> => {
        const res = await fetch(`${API_URL}/realtors/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to register realtor');
        }
        return res.json();
    },

    getMe: async (): Promise<any> => {
        const res = await fetch(`${API_URL}/realtors/me`, { headers: getHeaders() });
        if (!res.ok) throw new Error('No realtor profile found');
        return res.json();
    },

    updateMe: async (payload: { name?: string; phone?: string; commission_model?: string }): Promise<any> => {
        const res = await fetch(`${API_URL}/realtors/me`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update realtor profile');
        return res.json();
    },

    getListings: async (params?: { state?: string; limit?: number }): Promise<any> => {
        const q = new URLSearchParams();
        if (params?.state) q.append('state', params.state);
        if (params?.limit) q.append('limit', String(params.limit));
        const res = await fetch(`${API_URL}/realtors/listings?${q}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch listings');
        return res.json();
    },
};
