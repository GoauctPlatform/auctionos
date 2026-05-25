import { API_URL, getHeaders } from './httpClient';
import { UserRole, User } from '../types';

export const UserService = {
    list: async (): Promise<User[]> => {
        const response = await fetch(`${API_URL}/users/`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    getUsers: async (): Promise<User[]> => {
        return UserService.list();
    },

    getAllLogs: async (): Promise<any[]> => {
        const response = await fetch(`${API_URL}/users/logs/all`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch logs');
        return response.json();
    },

    create: async (data: { email: string, password: string, role: UserRole, company_ids?: number[] }): Promise<User> => {
        const response = await fetch(`${API_URL}/users/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to create user');
        }
        return response.json();
    },

    update: async (id: number, data: { email?: string, password?: string, role?: UserRole, company_ids?: number[], is_active?: boolean }): Promise<User> => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to update user');
        }
        return response.json();
    },

    delete: async (id: number): Promise<void> => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete user');
    },

    deleteInactiveTrials: async (): Promise<{ deleted_count: number }> => {
        const response = await fetch(`${API_URL}/users/bulk/inactive-trials`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to delete inactive trial users');
        }
        return response.json();
    },

    /** Get all companies linked to a specific user (many-to-many) */
    getUserCompanies: async (userId: number): Promise<{ id: number; name: string; role: string }[]> => {
        const response = await fetch(`${API_URL}/users/${userId}/companies`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch user companies');
        return response.json();
    },

    /** Replace the full set of companies linked to a user */
    setUserCompanies: async (userId: number, companyIds: number[]): Promise<void> => {
        const response = await fetch(`${API_URL}/users/${userId}/companies`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ company_ids: companyIds })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to update user companies');
        }
    },

    /** Switch the current user's active company context */
    switchActiveCompany: async (companyId: number): Promise<void> => {
        const response = await fetch(`${API_URL}/users/me/active-company`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ company_id: companyId })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to switch company');
        }
    },
};
