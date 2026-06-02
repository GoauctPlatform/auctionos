import { API_URL, getHeaders, getMultiPartHeaders } from './httpClient';
import { PropertyDetails as Property } from '../types';

export const PropertyService = {
    getProperties: async (filters: any = {}): Promise<Property[]> => {
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value)) {
                        value.forEach(v => queryParams.append(key, v));
                    } else {
                        queryParams.append(key, String(value));
                    }
                }
            });

            const response = await fetch(`${API_URL}/properties/?${queryParams.toString()}`, {
                headers: getHeaders()
            });
            if (!response.ok) {
                throw new Error('Failed to fetch properties');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching properties:', error);
            throw error;
        }
    },

    getAvailabilityHistory: async (limit: number = 100): Promise<any[]> => {
        const response = await fetch(`${API_URL}/properties/availability-history?limit=${limit}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch availability history');
        return await response.json();
    },

    bulkUpdate: async (ids: string[], action: 'update_status' | 'delete', status?: string): Promise<any> => {
        const response = await fetch(`${API_URL}/properties/bulk-update`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ids, action, status })
        });
        if (!response.ok) throw new Error('Failed to perform bulk update');
        return response.json();
    },

    getProperty: async (id: string): Promise<Property> => {
        try {
            const response = await fetch(`${API_URL}/properties/${id}`, {
                headers: getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch property');
            return await response.json();
        } catch (error) {
            console.error('Error fetching property:', error);
            throw error;
        }
    },

    /**
     * Create a new property or claim an existing one.
     *
     * Returns:
     *   { status: "created", parcel_id }       — new property was created.
     *   { status: "already_exists", parcel_id, property_id, override_created }
     *     — property already exists. A private override record was created so
     *       the user can customize it. Redirect to the property detail page.
     */
    createProperty: async (data: Partial<Property>): Promise<{
        status: 'created' | 'already_exists';
        parcel_id: string;
        property_id?: string;
        override_created?: boolean;
        message: string;
    }> => {
        const response = await fetch(`${API_URL}/properties/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to create property');
        }
        return await response.json();
    },

    /**
     * Save private customizations for a property (JSONB Override pattern).
     * Only the provided fields are stored — existing overrides are preserved.
     * The master property_details record is never modified.
     */
    savePropertyOverride: async (parcelId: string, overrideData: Record<string, any>): Promise<{
        status: string;
        message: string;
        overridden_fields: string[];
    }> => {
        const response = await fetch(`${API_URL}/properties/${parcelId}/override`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(overrideData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to save customization');
        }
        return await response.json();
    },

    /**
     * Reset a user's private customization.
     * - field param: resets only that field to original value.
     * - no field param: resets all customizations.
     */
    resetPropertyOverride: async (parcelId: string, field?: string): Promise<{ status: string; message: string }> => {
        const url = field
            ? `${API_URL}/properties/${parcelId}/override?field=${encodeURIComponent(field)}`
            : `${API_URL}/properties/${parcelId}/override`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to reset customization');
        }
        return await response.json();
    },

    updateProperty: async (id: string, data: Partial<Property>): Promise<Property> => {
        try {
            const response = await fetch(`${API_URL}/properties/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update property');
            return await response.json();
        } catch (error) {
            console.error('Error updating property:', error);
            throw error;
        }
    },

    updatePropertyNotes: async (parcelId: string, notes: string): Promise<any> => {
        try {
            const response = await fetch(`${API_URL}/properties/${parcelId}/notes`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ notes })
            });
            if (!response.ok) throw new Error('Failed to update property notes');
            return await response.json();
        } catch (error) {
            console.error('Error updating property notes:', error);
            throw error;
        }
    },

    deleteProperty: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/properties/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete property');
    },

    enrichProperty: async (id: string): Promise<Property> => {
        const response = await fetch(`${API_URL}/properties/${id}/enrich`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Enrichment failed');
        return response.json();
    },

    geocodeAddress: async (address: string, autocomplete: boolean = false): Promise<any> => {
        const response = await fetch(`${API_URL}/properties/geocode?address=${encodeURIComponent(address)}&autocomplete=${autocomplete}`, {
            headers: getHeaders(),
        });
        if (!response.ok) {
            if (autocomplete && response.status === 404) return [];
            throw new Error('Geocoding failed');
        }
        return response.json();
    },

    uploadMedia: async (propertyId: string, file: File) => {
        const formData = new FormData();
        formData.append('files', file);

        const response = await fetch(`${API_URL}/media/${propertyId}/upload`, {
            method: 'POST',
            headers: getMultiPartHeaders(),
            body: formData,
        });

        if (!response.ok) throw new Error('File upload failed');
        return response.json();
    },

    getPropertyReport: async (propertyId: string): Promise<{ report_url: string }> => {
        const response = await fetch(`${API_URL}/properties/${propertyId}/report`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to generate report');
        return response.json();
    },

    validateGSI: async (propertyId: string): Promise<any> => {
        const response = await fetch(`${API_URL}/properties/${propertyId}/validate-gsi`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('GSI Validation failed');
        return response.json();
    },

    toggleFavorite: async (propertyId: number, companyId?: number): Promise<{ is_favorite: boolean }> => {
        const qs = companyId ? `?company_id=${companyId}` : '';
        const response = await fetch(`${API_URL}/client-data/favorites/toggle/${propertyId}${qs}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to toggle favorite');
        return response.json();
    },

    getFavorites: async (companyId?: number): Promise<number[]> => {
        const qs = companyId ? `?company_id=${companyId}` : '';
        const response = await fetch(`${API_URL}/client-data/favorites${qs}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch favorites');
        return response.json();
    },

    getAuctionRedirect: async (parcelId: string): Promise<{ url: string }> => {
        const response = await fetch(`${API_URL}/properties/${parcelId}/redirect/auction`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to get auction link');
        return response.json();
    },

    logAction: async (parcelId: string, action: string): Promise<void> => {
        const formData = new FormData();
        formData.append('action', action);
        await fetch(`${API_URL}/properties/${parcelId}/log-action`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
    },

    getValuationMetrics: async (county: string, state: string): Promise<{ arv: number | null, rent: number | null, confidence: number, sample_size: number }> => {
        const response = await fetch(`${API_URL}/properties/valuation/metrics?county=${encodeURIComponent(county)}&state=${encodeURIComponent(state)}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch valuation metrics');
        return response.json();
    }
};

const triggerListUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('goauct-lists-updated'));
    }
};

export const ClientDataService = {
    getLists: async (companyId?: number): Promise<any[]> => {
        const qs = companyId ? `?company_id=${companyId}` : '';
        const response = await fetch(`${API_URL}/client-data/lists${qs}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch lists');
        return response.json();
    },

    /** Returns distinct states + counties from user's saved properties (for dynamic Home). */
    getPreferences: async (companyId?: number): Promise<{ states: string[]; counties: string[]; total_properties: number }> => {
        const query = companyId ? `?company_id=${companyId}` : '';
        const response = await fetch(`${API_URL}/client-data/lists/preferences${query}`, { headers: getHeaders() });
        if (!response.ok) return { states: [], counties: [], total_properties: 0 };
        return response.json();
    },

    getCountiesForState: async (state: string): Promise<string[]> => {
        const response = await fetch(`${API_URL}/counties/${encodeURIComponent(state)}/counties`, { headers: getHeaders() });
        if (!response.ok) return [];
        return response.json();
    },

    createList: async (name: string, tags?: string, companyId?: number): Promise<any> => {
        const response = await fetch(`${API_URL}/client-data/lists`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, tags, company_id: companyId ?? null })
        });
        if (!response.ok) throw new Error('Failed to create list');
        const data = await response.json();
        triggerListUpdate();
        return data;
    },

    updateList: async (id: number, data: { name?: string; tags?: string; notes?: string }): Promise<any> => {
        const response = await fetch(`${API_URL}/client-data/lists/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update list');
        const result = await response.json();
        triggerListUpdate();
        return result;
    },

    deleteList: async (id: number): Promise<void> => {
        const response = await fetch(`${API_URL}/client-data/lists/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete list');
        triggerListUpdate();
    },

    deleteSubfolder: async (listId: number, countyName: string): Promise<void> => {
        const response = await fetch(`${API_URL}/client-data/lists/${listId}/county/${encodeURIComponent(countyName)}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete county folder');
        triggerListUpdate();
    },

    addPropertyToList: async (listId: number, propertyId: number): Promise<void> => {
        const response = await fetch(`${API_URL}/client-data/lists/${listId}/properties/${propertyId}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to add property to list');
        triggerListUpdate();
    },

    addPropertyToStandardList: async (propertyId: number, companyId?: number): Promise<any> => {
        const url = `${API_URL}/client-data/lists/standard/add/${propertyId}${companyId ? `?company_id=${companyId}` : ''}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to add property to standard list');
        const data = await response.json();
        triggerListUpdate();
        return data;
    },

    removePropertyFromList: async (listId: number, propertyId: number): Promise<void> => {
        const response = await fetch(`${API_URL}/client-data/lists/${listId}/properties/${propertyId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove property from list');
        triggerListUpdate();
    },

    movePropertyBetweenLists: async (listId: number, propertyId: number, targetListId: number): Promise<void> => {
        const response = await fetch(`${API_URL}/client-data/lists/${listId}/move/${propertyId}?target_list_id=${targetListId}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to move property');
        triggerListUpdate();
    },

    getBroadcastedLists: async (): Promise<any[]> => {
        const response = await fetch(`${API_URL}/client-data/broadcasted`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch broadcasted lists');
        return response.json();
    },

    importBroadcastedList: async (listId: number): Promise<any> => {
        const response = await fetch(`${API_URL}/client-data/broadcasted/${listId}/import`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to import broadcasted list');
        const data = await response.json();
        triggerListUpdate();
        return data;
    },

    createNote: async (propertyId: number, noteText: string): Promise<any> => {
        const response = await fetch(`${API_URL}/client-data/notes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ property_id: propertyId, note_text: noteText })
        });
        if (!response.ok) throw new Error('Failed to create note');
        return response.json();
    },

    uploadAttachment: async (propertyId: number, file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('property_id', propertyId.toString());
        formData.append('file', file);

        const response = await fetch(`${API_URL}/client-data/attachments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Upload failed');
        }
        return response.json();
    },

    getListProperties: async (listId: number): Promise<any[]> => {
        const response = await fetch(`${API_URL}/client-data/lists/${listId}/properties`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch list properties');
        return response.json();
    },

    moveProperty: async (sourceListId: number, propertyId: number, targetListId: number): Promise<void> => {
        const response = await fetch(`${API_URL}/client-data/lists/${sourceListId}/move/${propertyId}?target_list_id=${targetListId}`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to move property');
    },

    forceStatusUpdate: async (): Promise<any> => {
        const response = await fetch(`${API_URL}/properties/force-status-update`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to force status update');
        return response.json();
    },

    createCustomProperty: async (data: any): Promise<any> => {
        const response = await fetch(`${API_URL}/client-data/custom-properties`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to create custom property');
        }
        return response.json();
    }
};

export const GISService = {
    async getGeoJSON(parcelId: string): Promise<any> {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/gis/${parcelId}/geojson`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to fetch GIS data');
        }
        return response.json();
    },
    async triggerSnapshot(parcelId: string): Promise<any> {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/gis/${parcelId}/snapshot`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to trigger snapshot');
        return response.json();
    }
};
