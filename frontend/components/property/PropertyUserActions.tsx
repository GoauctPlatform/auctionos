import React, { useState } from 'react';
import { PropertyDetails as Property } from '../../types';
import { API_BASE_URL } from '../../services/httpClient';
import { CircularProgress } from '@mui/material';

interface Props {
    property: Property;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    onAddToList?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onUpdateNotes?: (notes: string) => void;
    onUploadAttachment?: (file: File) => void;
}

import api from '../../services/api';

export const PropertyUserActions: React.FC<Props> = ({ 
    property,
    isFavorite,
    onToggleFavorite,
    onAddToList,
    onUpdateNotes,
    onUploadAttachment
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingToList, setIsAddingToList] = useState(false);
    const [isBuyingPhotos, setIsBuyingPhotos] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-6 pb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-lg">dashboard_customize</span>
                    Investor Dashboard
                </h3>
                <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Cloud</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 px-6 mb-6">
                <button 
                    onClick={onToggleFavorite}
                    className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 group hover:shadow-md active:scale-95 ${isFavorite ? 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 shadow-sm' : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                    <span className={`material-symbols-outlined text-[24px] ${isFavorite ? 'text-rose-500 fill-current animate-in zoom-in' : 'text-slate-400 group-hover:text-rose-500 transition-colors'}`}>
                        {isFavorite ? 'favorite' : 'favorite_border'}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isFavorite ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700'}`}>
                        {isFavorite ? 'Saved' : 'Save'}
                    </span>
                </button>
                <button 
                    onClick={async (e) => {
                        if (!onAddToList || isAddingToList) return;
                        setIsAddingToList(true);
                        try {
                            await onAddToList(e);
                        } finally {
                            setIsAddingToList(false);
                        }
                    }}
                    disabled={isAddingToList}
                    className="p-4 border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all duration-300 group flex flex-col items-center justify-center gap-2 hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                    {isAddingToList ? (
                        <CircularProgress size={24} className="text-blue-500" />
                    ) : (
                        <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-blue-500 transition-colors">folder_zip</span>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-700">
                        {isAddingToList ? 'Adding...' : 'Add to List'}
                    </span>
                </button>
            </div>
            
            {property.has_realtor_media && !property.media_unlocked && (
                <div className="px-6 mb-6">
                    <button
                        onClick={async () => {
                            setIsBuyingPhotos(true);
                            try {
                                const checkoutRes = await api.post('/billing/checkout-photos', { property_id: property.id });
                                alert(checkoutRes.data.message + "\n\n(Mock Mode: Simulating successful payment...)");
                                await api.post('/billing/mock-webhook-action', { action_type: 'photos', property_id: property.id });
                                alert("✅ Success! Your updated photos request has been submitted. We will notify you once they are uploaded to the Secured Files vault.");
                            } catch(e:any) {
                                alert(e.response?.data?.detail || e.message || "Failed to process photo checkout.");
                            } finally {
                                setIsBuyingPhotos(false);
                            }
                        }}
                        disabled={isBuyingPhotos}
                        className="w-full p-3 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-all duration-300 group flex items-center justify-center gap-2 hover:shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isBuyingPhotos ? (
                            <CircularProgress size={16} className="text-emerald-500" />
                        ) : (
                            <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">add_a_photo</span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                            {isBuyingPhotos ? 'Processing...' : 'Buy Updated Photos'}
                        </span>
                    </button>
                </div>
            )}

            <div className="flex-1 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20 p-6 space-y-6 overflow-auto">
                {/* Notes */}
                <div className="flex flex-col gap-3 relative group">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">edit_note</span> Private Analysis
                        </span>
                        {isSaving && (
                            <span className="text-[9px] font-bold text-blue-500 animate-pulse uppercase">Saving...</span>
                        )}
                    </div>
                    <textarea
                        className="w-full p-4 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[140px] shadow-inner resize-none leading-relaxed placeholder:italic placeholder:text-slate-400"
                        placeholder="Type high-level property analysis, probate findings, or custom valuation notes..."
                        defaultValue={property.notes || ""}
                        onBlur={async (e) => {
                            if (onUpdateNotes && e.target.value !== property.notes) {
                                setIsSaving(true);
                                await onUpdateNotes(e.target.value);
                                setTimeout(() => setIsSaving(false), 500);
                            }
                        }}
                    />
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-slate-400 font-bold italic">Markdown Support Enabled</span>
                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">Syncs automatically</p>
                    </div>
                </div>

                {/* Attachments */}
                <div className="flex flex-col gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">attachments</span> Secured Files
                        </span>
                        <label className="cursor-pointer group">
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0] && onUploadAttachment) {
                                        onUploadAttachment(e.target.files[0]);
                                    }
                                }}
                            />
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-blue-500 transition-all text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[14px]">upload_file</span>
                                Upload
                            </div>
                        </label>
                    </div>
                    
                    {property.attachments && property.attachments.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                            {property.attachments.map((att: any, idx: number) => {
                                const handleDelete = async (e: React.MouseEvent) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!window.confirm(`Are you sure you want to delete "${att.filename}"?`)) {
                                        return;
                                    }
                                    try {
                                        await api.delete(`/client-data/attachments/${att.id}`);
                                        alert("File deleted successfully!");
                                        window.location.reload();
                                    } catch (err: any) {
                                        alert(err.response?.data?.detail || err.message || "Failed to delete file.");
                                    }
                                };

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group shadow-sm border-l-2 border-l-blue-500"
                                    >
                                        <a
                                            href={att.file_path.startsWith('http') ? att.file_path : `${API_BASE_URL}${att.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-3 flex-1 min-w-0"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">description</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                    {att.filename}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium">Added to Cloud Storage</p>
                                            </div>
                                        </a>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={att.file_path.startsWith('http') ? att.file_path : `${API_BASE_URL}${att.file_path}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="Download File"
                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-blue-500"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">download</span>
                                            </a>
                                            <button
                                                onClick={handleDelete}
                                                title="Delete File"
                                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors text-slate-350 hover:text-rose-600 dark:hover:text-rose-400"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            <span className="material-symbols-outlined text-3xl text-slate-200 mb-2">cloud_off</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vault Empty</p>
                            <p className="text-[9px] text-slate-300 mt-1 italic">Attach PDFs, Deeds, or Images here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
