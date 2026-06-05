import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CompanyService, Company } from '../services/company.service';
import { AuthService } from '../services/auth.service';
import { API_URL, getHeaders } from '../services/httpClient';
import { useAuth } from './AuthContext';

interface CompanyContextType {
    companies: Company[];
    activeCompany: Company | null;
    loading: boolean;
    refresh: () => Promise<void>;
    selectCompany: (id: number) => Promise<void>;
    createCompany: (name: string, address?: string, contact?: string) => Promise<Company>;
    updateCompany: (id: number, data: Partial<Company>) => Promise<void>;
    deleteCompany: (id: number) => Promise<void>;
}

const CACHE_KEY = 'goauct_companies';

const CompanyContext = createContext<CompanyContextType | null>(null);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize from cache to prevent first-render flicker
    const cached = (() => {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') as Company[]; }
        catch { return [] as Company[]; }
    })();

    const [companies, setCompanies] = useState<Company[]>(cached);
    const [loading, setLoading] = useState(cached.length === 0); // Only show loading if no cached data
    const { user, updateUser } = useAuth();

    const refresh = useCallback(async () => {
        if (!user) return;
        try {
            if (user.role === 'client' || user.role === 'admin' || user.role === 'superuser') {
                // Owners: fetch companies they created
                const data = await CompanyService.list();
                setCompanies(data);
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } else if (user.role === 'manager' || user.role === 'agent') {
                // Members: fetch companies they are linked to via many-to-many
                const res = await fetch(`${API_URL}/users/${user.id}/companies`, { headers: getHeaders() });
                if (res.ok) {
                    const links: { id: number; name: string; role: string }[] = await res.json();
                    // Map to Company shape; mark active by comparing to active_company_id from token
                    const mapped: Company[] = links.map(l => ({
                        id: l.id,
                        user_id: 0,
                        name: l.name,
                        is_active: l.id === user.active_company_id,
                    }));
                    setCompanies(mapped);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
                }
            }
        } catch {
            // Keep previous data on error
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.role]);

    useEffect(() => {
        if (user) {
            refresh();
        } else {
            setLoading(false);
        }
    }, [user?.id, refresh]);

    // Derive active company: for managers use active_company_id from token
    const activeCompany = companies.find(c =>
        user?.role === 'manager' || user?.role === 'agent'
            ? c.id === user?.active_company_id
            : c.is_active
    ) || companies[0] || null;

    const selectCompany = async (id: number) => {
        if (user?.role === 'manager' || user?.role === 'agent') {
            // Use the multi-company switch endpoint
            await fetch(`${API_URL}/users/me/active-company`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ company_id: id }),
            });
            updateUser({ active_company_id: id });
        } else {
            await CompanyService.selectActive(id);
            updateUser({ active_company_id: id });
        }
        await refresh();
    };

    const createCompany = async (name: string, address?: string, contact?: string): Promise<Company> => {
        const created = await CompanyService.create({ name, address, contact });
        await refresh();
        return created;
    };

    const updateCompany = async (id: number, data: Partial<Company>) => {
        await CompanyService.update(id, data);
        await refresh();
    };

    const deleteCompany = async (id: number) => {
        await CompanyService.delete(id);
        await refresh();
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            activeCompany,
            loading,
            refresh,
            selectCompany,
            createCompany,
            updateCompany,
            deleteCompany,
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = (): CompanyContextType => {
    const ctx = useContext(CompanyContext);
    if (!ctx) throw new Error('useCompany must be used within a CompanyProvider');
    return ctx;
};
