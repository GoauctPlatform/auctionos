import React, { useState, useEffect } from 'react';
import { AuctionEvent } from '../../types';
import { AuctionService } from '../../services/auction.service';
import { useLanguage } from "../../context/LanguageContext";

interface AuctionFormProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingEvent?: AuctionEvent | null;
}

const defaultFormData: Partial<AuctionEvent> = {
    name: '',
    short_name: '',
    auction_date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    location: '',
    county: '',
    state: '',
    tax_status: '',
    parcels_count: 0,
    notes: '',
    search_link: '',
    register_link: '',
    list_link: '',
    purchase_info_link: '',
};

export const AuctionForm: React.FC<AuctionFormProps> = ({ open, onClose, onSuccess, editingEvent }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<Partial<AuctionEvent>>(defaultFormData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setFormData(editingEvent || defaultFormData);
        }
    }, [open, editingEvent]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'parcels_count' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingEvent?.id) {
                await AuctionService.updateAuctionEvent(editingEvent.id, formData);
                alert('Auction updated successfully!');
            } else {
                await AuctionService.createAuctionEvent(formData);
                alert('Auction created successfully!');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 relative animate-in zoom-in-95 duration-200 my-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {editingEvent ? 'Edit Auction' : 'Create New Auction'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                            <input type="text" name="name" required value={formData.name || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Short Name</label>
                            <input type="text" name="short_name" value={formData.short_name || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                            <input type="date" name="auction_date" required value={formData.auction_date || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
                            <input type="text" name="time" value={formData.time || ''} onChange={handleChange} placeholder="ex: 10:00 AM" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                            <input type="text" name="location" value={formData.location || ''} onChange={handleChange} placeholder="Online or Address" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">County</label>
                            <input type="text" name="county" value={formData.county || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
                            <input type="text" name="state" value={formData.state || ''} onChange={handleChange} placeholder="ex: CO" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Status</label>
                            <input type="text" name="tax_status" value={formData.tax_status || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parcels Count</label>
                            <input type="number" name="parcels_count" value={formData.parcels_count || 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                            <input type="text" name="notes" value={formData.notes || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Register Link</label>
                            <input type="url" name="register_link" value={formData.register_link || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">List Link</label>
                            <input type="url" name="list_link" value={formData.list_link || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-700">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50">
                            {loading ? 'Saving...' : (editingEvent ? 'Save Changes' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
