import React, { useState, useEffect } from 'react';
import { Typography, IconButton, TextField, Dialog, Button, CircularProgress, Chip, Tabs, Tab, Autocomplete } from '@mui/material';
import { FolderPlusIcon, Trash2Icon, Edit2Icon, ExternalLinkIcon } from 'lucide-react';
import { ClientDataService, PropertyService } from '../../services/property.service';
import { countyService, CountyContact } from '../../services/county.service';
import { StatesService, StateContact } from '../../services/states.service';
import { geocodeAddress } from '../../services/geocoding.service';
import { useNavigate } from 'react-router-dom';
import { SwipeActionItem } from '../../components/SwipeActionItem';
import { PropertyPreviewDrawer } from '../../components/PropertyPreviewDrawer';
import { useCompany } from '../../context/CompanyContext';
import { InvestorTaskService } from '../../services/realtor_task.service';
import { AuthService } from '../../services/auth.service';
import api from '../../services/api';
import { API_URL, getHeaders } from '../../services/httpClient';
import { StreetViewThumbnail } from '../../components/StreetViewThumbnail';
import { ClientUserProperties } from './ClientUserProperties';

// Helper to map state names to codes for the SVG silhouette
const STATE_CODE_MAP: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

interface CustomList {
    id: number;
    name: string;
    property_count: number;
    is_favorite_list: boolean;
    is_broadcasted: boolean;
    tags?: string;
    has_upcoming_auction?: boolean;
    upcoming_auctions_count?: number;
    notes?: string;
}



// ── Investor My Tasks View ───────────────────────────────────────────────────
const STATUS_BADGES: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    claimed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    submitted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const InvestorMyTasksView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [editingTask, setEditingTask] = React.useState<any | null>(null);
    const [editForm, setEditForm] = React.useState({ title: '', description: '', min_photos: 3, max_photos: 10, reward_points: 500 });
    const [tasks, setTasks] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [reviewing, setReviewing] = React.useState<{ taskId: number; open: boolean } | null>(null);
    const [reviewNotes, setReviewNotes] = React.useState('');
    const [submissions, setSubmissions] = React.useState<any[]>([]);
    const [subLoading, setSubLoading] = React.useState(false);

    const load = async () => {
        setLoading(true);
        const data = await InvestorTaskService.getMyTasks().catch(() => []);
        setTasks(data);
        setLoading(false);
    };

    React.useEffect(() => { load(); }, []);

    const openReview = async (taskId: number) => {
        setReviewing({ taskId, open: true });
        setReviewNotes('');
        setSubLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/investor/tasks/${taskId}/submissions`,
                { headers: getHeaders() }
            );
            if (res.ok) setSubmissions(await res.json());
            else setSubmissions([]);
        } finally {
            setSubLoading(false);
        }
    };

    const handleReview = async (taskId: number, approved: boolean) => {
        try {
            await InvestorTaskService.reviewSubmission(taskId, approved, reviewNotes || undefined);
            setReviewing(null);
            await load();
            alert(approved ? '✅ Task approved! Realtor earned their commission.' : '❌ Task rejected. Realtor will be notified to resubmit.');
        } catch (e: any) { alert(e.message); }
    };

    const openEdit = (task: any) => {
        setEditingTask(task);
        setEditForm({ 
            title: task.title, 
            description: task.description || '', 
            min_photos: task.min_photos, 
            max_photos: task.max_photos, 
            reward_points: task.reward_points 
        });
    };

    const handleSaveEdit = async () => {
        if (!editingTask) return;
        try {
            const res = await InvestorTaskService.updateTask(editingTask.id, editForm);
            setEditingTask(null);
            await load();
            if (res.realtor_notified) {
                alert('✅ Task updated! The realtor who had claimed it was notified and must re-accept.');
            } else {
                alert('✅ Task updated successfully.');
            }
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (task: any) => {
        const locked = ['submitted', 'approved'].includes(task.status);
        if (locked) { alert('⚠️ Cannot delete: task has submissions. Review and reject first.'); return; }
        const confirmMsg = task.status === 'claimed'
            ? `This task is claimed by ${task.realtor_name || 'a realtor'}. They will be notified. Delete anyway?`
            : 'Delete this task? This action cannot be undone.';
        if (!window.confirm(confirmMsg)) return;
        try {
            await InvestorTaskService.deleteTask(task.id);
            await load();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to My List
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[18px]">task_alt</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">My Field Tasks</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex justify-center py-20"><CircularProgress size={28} /></div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">task_alt</span>
                        <p className="text-sm font-medium">No tasks created yet.</p>
                        <p className="text-xs mt-1 text-slate-400">Create tasks from any property in your lists using the Create Task button.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task: any) => (
                            <div key={task.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-sm transition-all group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{task.title}</p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{task.address}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {['open', 'claimed', 'rejected'].includes(task.status) && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <IconButton size="small" onClick={() => openEdit(task)} className="text-slate-400 hover:text-blue-500">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDelete(task)} className="text-slate-400 hover:text-red-500">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </IconButton>
                                            </div>
                                        )}
                                        <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_BADGES[task.status] || 'bg-slate-100 text-slate-600'}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg">
                                        💰 ${(task.reward_points / 100).toFixed(2)} ({task.reward_points} pts)
                                    </span>
                                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
                                        📷 {task.min_photos}–{task.max_photos} photos
                                    </span>
                                    {task.realtor_name && (
                                        <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
                                            👤 {task.realtor_name}
                                        </span>
                                    )}
                                </div>

                                {task.submitted_at && (
                                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-2">
                                        📤 Submitted: {new Date(task.submitted_at).toLocaleDateString()}
                                    </p>
                                )}

                                {task.status === 'submitted' && (
                                    <button
                                        onClick={() => openReview(task.id)}
                                        className="mt-3 w-full py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-sm active:scale-95"
                                    >
                                        Review Submission
                                    </button>
                                )}
                                {task.status === 'approved' && (
                                    <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Approved on {task.approved_at ? new Date(task.approved_at).toLocaleDateString() : '—'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Dialog */}
            <Dialog open={!!reviewing?.open} onClose={() => setReviewing(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <Typography variant="h6" className="font-black text-slate-900 dark:text-white leading-none">Review Submission</Typography>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Due Diligence Verification</p>
                    </div>
                    <IconButton onClick={() => setReviewing(null)} size="small"><span className="material-symbols-outlined">close</span></IconButton>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {subLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <CircularProgress size={32} thickness={5} className="text-purple-600" />
                            <p className="text-sm font-bold text-slate-400 animate-pulse">Fetching submission data...</p>
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="py-20 text-center">
                            <span className="material-symbols-outlined text-slate-200 text-[64px]">cloud_off</span>
                            <p className="text-sm text-slate-500 font-bold mt-2">No submissions found for this task.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {submissions.map((s: any, i: number) => (
                                <div key={s.id} className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm font-black text-slate-800 dark:text-white">Submission #{submissions.length - i}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(s.submitted_at).toLocaleString()}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_BADGES[s.review_status] || 'bg-slate-100 text-slate-600'}`}>
                                            {s.review_status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Photos</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white">{s.photo_count} Captured</p>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${s.geo_validated ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50'}`}>
                                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">GPS Verification</p>
                                            <p className={`text-sm font-black ${s.geo_validated ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {s.geo_validated ? 'Verified Active' : 'Outside Radius'}
                                            </p>
                                        </div>
                                    </div>

                                    {s.notes && (
                                        <div className="mb-5">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Realtor Notes</p>
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 italic text-sm text-slate-600 dark:text-slate-300">
                                                "{s.notes}"
                                            </div>
                                        </div>
                                    )}

                                    {/* Photos Gallery */}
                                    {s.file_path && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Attached Evidence</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {s.file_path.split(',').map((path: string, idx: number) => {
                                                    const fullUrl = `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}/uploads/${path.trim()}`;
                                                    return (
                                                        <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                            <img src={fullUrl} alt={`Evidence ${idx}`} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <IconButton size="small" component="a" href={fullUrl} target="_blank" className="bg-white/20 hover:bg-white/40 text-white">
                                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                                </IconButton>
                                                                <IconButton size="small" component="a" href={fullUrl} download className="bg-white/20 hover:bg-white/40 text-white">
                                                                    <span className="material-symbols-outlined text-[20px]">download</span>
                                                                </IconButton>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase font-black text-slate-400 mb-3 tracking-widest text-center">Investor Decision</p>
                        <TextField
                            placeholder="Add internal notes or feedback for the realtor..."
                            fullWidth multiline rows={3}
                            variant="outlined"
                            value={reviewNotes}
                            onChange={e => setReviewNotes(e.target.value)}
                            sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(0,0,0,0.02)',
                                    fontSize: '0.875rem'
                                } 
                            }}
                        />
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                    <Button 
                        onClick={() => setReviewing(null)} 
                        fullWidth 
                        variant="outlined"
                        className="rounded-xl font-bold py-2.5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    >
                        Close
                    </Button>
                    <Button 
                        onClick={() => reviewing && handleReview(reviewing.taskId, false)} 
                        fullWidth 
                        variant="contained" 
                        color="error"
                        className="rounded-xl font-bold py-2.5 shadow-md shadow-red-500/10"
                    >
                        Reject Submission
                    </Button>
                    <Button 
                        onClick={() => reviewing && handleReview(reviewing.taskId, true)} 
                        fullWidth 
                        variant="contained" 
                        color="success"
                        className="rounded-xl font-bold py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/10"
                    >
                        Approve & Pay
                    </Button>
                </div>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={!!editingTask} onClose={() => setEditingTask(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <Typography variant="h6" className="font-bold text-slate-900 dark:text-white">Edit Task</Typography>
                </div>
                <div className="p-5 space-y-4">
                    <TextField label="Task Title" fullWidth value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                    <TextField label="Description" fullWidth multiline rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                        <TextField type="number" label="Min Photos" fullWidth value={editForm.min_photos} onChange={e => setEditForm({ ...editForm, min_photos: parseInt(e.target.value) })} />
                        <TextField type="number" label="Max Photos" fullWidth value={editForm.max_photos} onChange={e => setEditForm({ ...editForm, max_photos: parseInt(e.target.value) })} />
                    </div>
                    <TextField type="number" label="Reward Points" fullWidth value={editForm.reward_points} onChange={e => setEditForm({ ...editForm, reward_points: parseInt(e.target.value) })} helperText={`$${(editForm.reward_points / 100).toFixed(2)} USD`} />
                    
                    {editingTask?.status === 'claimed' && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase leading-tight">
                                ⚠️ Task is currently claimed. Saving changes will notify the realtor and they must re-accept the task.
                            </p>
                        </div>
                    )}
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                    <Button onClick={() => setEditingTask(null)} fullWidth>Cancel</Button>
                    <Button onClick={handleSaveEdit} fullWidth variant="contained" color="primary" className="rounded-xl bg-blue-600">Save Changes</Button>
                </div>
            </Dialog>
        </div>
    );
};


// ── Investor My Exports View ────────────────────────────────────────────────
const InvestorMyExportsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [exports, setExports] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editingExport, setEditingExport] = React.useState<any | null>(null);
    const [editForm, setEditForm] = React.useState({ contact_name: '', contact_phone: '', contact_email: '', notes: '', requested_sale_price: '' });

    const load = async () => {
        setLoading(true);
        const data = await InvestorTaskService.getMyExports().catch(() => []);
        setExports(data);
        setLoading(false);
    };

    React.useEffect(() => { load(); }, []);

    const openEdit = (exp: any) => {
        setEditingExport(exp);
        setEditForm({
            contact_name: exp.contact_name || '',
            contact_phone: exp.contact_phone || '',
            contact_email: exp.contact_email || '',
            notes: exp.notes || '',
            requested_sale_price: exp.requested_sale_price || '',
        });
    };

    const handleSaveEdit = async () => {
        if (!editingExport) return;
        try {
            await InvestorTaskService.updateExport(editingExport.id, editForm);
            setEditingExport(null);
            await load();
            alert('✅ Export info updated successfully.');
        } catch (e: any) { alert(e.message); }
    };

    const handleCancelExport = async (exp: any) => {
        if (!window.confirm('Are you sure you want to cancel this export? It will no longer be visible to realtors.')) return;
        try {
            await InvestorTaskService.cancelExport(exp.id);
            await load();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center gap-3">
                <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to My List
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[18px]">upload</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">My Exported Properties</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex justify-center py-20"><CircularProgress size={28} /></div>
                ) : exports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">upload</span>
                        <p className="text-sm font-medium">No properties exported yet.</p>
                        <p className="text-xs mt-1 text-slate-400">Export properties to realtors from your folders using the Export action.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exports.map((exp: any) => (
                            <div key={exp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-sm transition-all group relative">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{exp.address || exp.parcel_id}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">{exp.county}, {exp.state}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <IconButton size="small" onClick={() => openEdit(exp)} className="text-slate-400 hover:text-blue-500">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleCancelExport(exp)} className="text-slate-400 hover:text-red-500">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </IconButton>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-1">
                                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Shared Contact Info</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">person</span> {exp.contact_name || '—'}
                                    </p>
                                    {exp.contact_phone && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">phone</span> {exp.contact_phone}
                                        </p>
                                    )}
                                    {exp.requested_sale_price && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-bold">
                                            <span className="material-symbols-outlined text-[14px]">sell</span> Target: ${Number(exp.requested_sale_price).toLocaleString()}
                                        </p>
                                    )}
                                    {exp.contact_email && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">mail</span> {exp.contact_email}
                                        </p>
                                    )}
                                </div>

                                {exp.notes && (
                                    <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-[11px] text-slate-500 italic truncate">
                                        "{exp.notes}"
                                    </div>
                                )}

                                <p className="text-[9px] text-slate-400 mt-4">Exported on {new Date(exp.exported_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Export Dialog */}
            <Dialog open={!!editingExport} onClose={() => setEditingExport(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <Typography variant="h6" className="font-bold text-slate-900 dark:text-white">Edit Export Info</Typography>
                </div>
                <div className="p-5 space-y-4">
                    <TextField label="Contact Name" fullWidth value={editForm.contact_name} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })} />
                    <TextField label="Contact Phone" fullWidth value={editForm.contact_phone} onChange={e => setEditForm({ ...editForm, contact_phone: e.target.value })} />
                    <TextField label="Contact Email" fullWidth value={editForm.contact_email} onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })} />
                    <TextField label="Requested Sale Price" type="number" fullWidth value={editForm.requested_sale_price} onChange={e => setEditForm({ ...editForm, requested_sale_price: e.target.value })} />
                    <TextField label="Notes for Realtors" fullWidth multiline rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                    <Button onClick={() => setEditingExport(null)} fullWidth>Cancel</Button>
                    <Button onClick={handleSaveEdit} fullWidth variant="contained" color="primary" className="rounded-xl bg-blue-600">Save Changes</Button>
                </div>
            </Dialog>
        </div>
    );
};


const ClientLists: React.FC = () => {
    const navigate = useNavigate();
    const { activeCompany } = useCompany();
    const [lists, setLists] = useState<CustomList[]>([]);
    const [selectedListId, setSelectedListId] = useState<number | null>(null);
    const [selectedListProperties, setSelectedListProperties] = useState<any[]>([]);

    // Edit Folder Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<CustomList | null>(null);
    const [editFolderType, setEditFolderType] = useState<'custom' | 'standard'>('custom');
    const [editFolderName, setEditFolderName] = useState('');
    const [editFolderState, setEditFolderState] = useState<StateContact | null>(null);
    const [editFolderCounty, setEditFolderCounty] = useState<string | null>(null);
    const [editFolderAvailableCounties, setEditFolderAvailableCounties] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [propsLoading, setPropsLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [newListName, setNewListName] = useState('');

    const [dragOverListId, setDragOverListId] = useState<number | null>(null);
    const [broadcastedLists, setBroadcastedLists] = useState<CustomList[]>([]);
    const [importing, setImporting] = useState<number | null>(null);
    const [countyContacts, setCountyContacts] = useState<CountyContact[]>([]);
    const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        smart: false,
        standard: false,
        custom: false,
        broadcasted: false
    });

    const [creationMode, setCreationMode] = useState<'custom' | 'standard'>('standard');
    const [stateContacts, setStateContacts] = useState<StateContact[]>([]);
    const [availableCounties, setAvailableCounties] = useState<string[]>([]);
    const [selectedState, setSelectedState] = useState<StateContact | null>(null);
    const [newCountyName, setNewCountyName] = useState<string | null>(null);
    const [openListNotes, setOpenListNotes] = useState<boolean>(false);
    const [selectedStateName, setSelectedStateName] = useState<string | null>(null);
    const [selectedCountyName, setSelectedCountyName] = useState<string | null>(null);
    const [previewPropertyId, setPreviewPropertyId] = useState<number | string | null>(null);
    const [geocodedProperties, setGeocodedProperties] = useState<Record<number, { lat: number, lng: number }>>({});
    const [folderNotes, setFolderNotes] = useState<string>('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [viewMode, setViewMode] = useState<'folders' | 'my_tasks' | 'my_exports' | 'my_properties'>('folders');
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
    const [movingPropertyId, setMovingPropertyId] = useState<number | null>(null);
    const [moveTargetListId, setMoveTargetListId] = useState<number | string>('');
    const [creating, setCreating] = useState(false);

    // Task & Export state
    const [taskProperty, setTaskProperty] = useState<any | null>(null);
    const [exportProperty, setExportProperty] = useState<any | null>(null);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', min_photos: 3, max_photos: 10, reward_usd: 10 });
    const [exportForm, setExportForm] = useState({ contact_name: '', contact_phone: '', contact_email: '', notes: '', requested_sale_price: '' });
    const [taskSubmitting, setTaskSubmitting] = useState(false);
    const [exportSubmitting, setExportSubmitting] = useState(false);
    
    const [favoritesSet, setFavoritesSet] = useState<Set<number>>(new Set());
    const currentUser = AuthService.getCurrentUser();
    const isAgent = currentUser?.role === 'agent';
    const isTrial = currentUser?.subscription_tier === 'trial';

    // Global listener for dynamic property additions
    useEffect(() => {
        const handlePropertyAdded = async (event: any) => {
            const newProperty = event.detail;
            if (!newProperty) return;

            // 1. Refresh list data implicitly to update counts
            loadLists();

            // 2. If we are currently viewing the folder this property belongs to, inject it into the UI
            if (
                (selectedListId && newProperty.list_id === selectedListId) ||
                (selectedStateName && newProperty.state && newProperty.state.toLowerCase() === selectedStateName.toLowerCase())
            ) {
                setSelectedListProperties(prev => {
                    if (prev.find(p => p.id === newProperty.id)) return prev;
                    return [newProperty, ...prev];
                });

                // 3. Geocode on-the-fly and update map instantly
                if ((!newProperty.latitude || !newProperty.longitude) && newProperty.address) {
                    try {
                        let coords = await geocodeAddress(newProperty.address);
                        if (!coords && (newProperty.county || newProperty.state)) {
                            const fallback = `${newProperty.county || ''} County, ${newProperty.state || ''}`;
                            coords = await geocodeAddress(fallback);
                        }
                        if (!coords && newProperty.state) {
                            coords = await geocodeAddress(newProperty.state);
                        }

                        if (coords) {
                            setGeocodedProperties(prev => ({ ...prev, [newProperty.id]: coords }));
                        }
                    } catch (err) {
                        console.error('Dynamic geocoding error', err);
                    }
                }
            }
        };

        window.addEventListener('propertyAdded', handlePropertyAdded);
        return () => window.removeEventListener('propertyAdded', handlePropertyAdded);
    }, [selectedListId, selectedStateName]);

    const toggleState = (stateName: string) => {
        setExpandedStates(prev => ({ ...prev, [stateName]: !prev[stateName] }));
    };

    useEffect(() => {
        // Always reload when company changes and reset folder selection
        setSelectedListId(null);
        setSelectedStateName(null);
        setSelectedCountyName(null);
        setSelectedListProperties([]);
        loadLists();
        StatesService.getContacts().then(setStateContacts).catch(() => { });
    }, [activeCompany?.id]);

    useEffect(() => {
        if (selectedState) {
            countyService.getCounties(selectedState.state).then(setAvailableCounties).catch(() => setAvailableCounties([]));
        } else {
            setAvailableCounties([]);
            setNewCountyName(null);
        }
    }, [selectedState]);

    useEffect(() => {
        if (selectedListId) {
            loadListProperties(selectedListId);
            const selList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);
            if (selList?.tags === 'STANDARD') { // Now these are just states. We clear county contacts until they pick a county subfolder, but we can load state contacts if needed.
                if (selectedCountyName) {
                    countyService.getContacts(selList.name, selectedCountyName).then(setCountyContacts).catch(() => setCountyContacts([]));
                } else {
                    setCountyContacts([]);
                }
            } else {
                setCountyContacts([]);
            }
        } else if (selectedStateName) {
            loadStateProperties(selectedStateName);
            // If they clicked a specific county subfolder, load those county contacts
            if (selectedCountyName) {
                countyService.getContacts(selectedStateName, selectedCountyName).then(setCountyContacts).catch(() => setCountyContacts([]));
            } else {
                setCountyContacts([]);
            }
        } else {
            setSelectedListProperties([]);
            setCountyContacts([]);
        }
    }, [selectedListId, selectedStateName, selectedCountyName, lists, broadcastedLists]);

    const parseNotes = (rawNotes: string) => {
        try {
            const parsed = JSON.parse(rawNotes);
            if (typeof parsed === 'object' && parsed !== null) return parsed;
        } catch (e) { }
        return { __root__: rawNotes || '' };
    };

    // Update folderNotes state when list changes
    useEffect(() => {
        const selList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);
        if (selList) {
            const notesObj = parseNotes(selList.notes || '');
            const activeKey = selectedCountyName || '__root__';
            setFolderNotes(notesObj[activeKey] || '');
        } else {
            setFolderNotes('');
        }
    }, [selectedListId, selectedCountyName, lists, broadcastedLists]);

    const handleSaveNotes = async (newText: string) => {
        if (!selectedListId) return;
        setSavingNotes(true);
        try {
            const selList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);
            const notesObj = parseNotes(selList?.notes || '');
            const activeKey = selectedCountyName || '__root__';
            
            // Check if there is actually a change to avoid unnecessary writes
            if (notesObj[activeKey] === newText) {
                setSavingNotes(false);
                return;
            }

            const updatedNotesObj = { ...notesObj, [activeKey]: newText };
            const jsonString = JSON.stringify(updatedNotesObj);

            await ClientDataService.updateList(selectedListId, { notes: jsonString });
            
            // Reflect in local state
            setLists(prev => prev.map(l => l.id === selectedListId ? { ...l, notes: jsonString } : l));
        } catch (err) {
            console.error('Error saving notes:', err);
        } finally {
            setSavingNotes(false);
        }
    };

    const loadLists = async () => {
        try {
            setLoading(true);
            const data = await ClientDataService.getLists(activeCompany?.id);
            setLists(data);

            // Load favorites to determine priority sorting
            try {
                const favs = await PropertyService.getFavorites(activeCompany?.id);
                console.log("Loaded Favorites for Priority Sorting:", favs);
                setFavoritesSet(new Set(favs));
            } catch (favErr) {
                console.error("Failed to load favorites for priority:", favErr);
            }

            if (data.length > 0 && !selectedListId && !selectedStateName) {
                // Select favorites by default if available, otherwise stay at 'Select a Folder'
                const fav = data.find(l => l.is_favorite_list);
                if (fav) setSelectedListId(fav.id);
            }
        } catch (err: any) {
            console.error('Error loading lists:', err);
        } finally {
            setLoading(false);
        }

        try {
            const bData = await ClientDataService.getBroadcastedLists();
            setBroadcastedLists(bData);
        } catch (err: any) {
            console.error('Error loading broadcasted lists:', err);
        }
    };

    const handleExpandStateList = async (listId: number, stateName: string) => {
        toggleState(stateName);
        if (!expandedStates[stateName]) {
            // About to expand, fetch properties to group by county in the sidebar
            try {
                const data = await ClientDataService.getListProperties(listId);
                // Keep it in some state Map if needed, but easier: simply group selectedListProperties if selected
            } catch (err) { }
        }
    };

    const loadListProperties = async (listId: number) => {
        try {
            setPropsLoading(true);
            const data = await ClientDataService.getListProperties(listId);
            setSelectedListProperties(data);
        } catch (err) {
            console.error('Error loading properties:', err);
        } finally {
            setPropsLoading(false);
        }
    };

    const loadStateProperties = async (stateName: string) => {
        try {
            setPropsLoading(true);
            const stateList = lists.find(l => l.tags === 'STANDARD' && l.name === stateName);
            if (!stateList) {
                setSelectedListProperties([]);
                return;
            }
            const data = await ClientDataService.getListProperties(stateList.id);
            setSelectedListProperties(data);

            // Geocode properties missing coordinates without blocking the UI
            const missingCoords = data.filter((p: any) => (!p.latitude || !p.longitude) && p.address);
            if (missingCoords.length > 0) {
                (async () => {
                    for (const prop of missingCoords) {
                        try {
                            if (geocodedProperties[prop.id]) continue;

                            let coords = await geocodeAddress(prop.address);
                            if (!coords && (prop.county || prop.state)) {
                                const fallback = `${prop.county || ''} County, ${prop.state || ''}`;
                                console.log(`Fallback geocoding for property ${prop.id}: ${fallback}`);
                                coords = await geocodeAddress(fallback);
                            }
                            if (!coords && prop.state) {
                                coords = await geocodeAddress(prop.state);
                            }

                            if (coords) {
                                console.log(`Map debug: Setting geocoded coords for property ${prop.id}`, coords);
                                setGeocodedProperties(prev => ({ ...prev, [prop.id]: coords }));
                            }
                        } catch (e) {
                            console.error('Geocoding error for', prop.id, e);
                        }
                        // Small delay to prevent API rate limiting
                        await new Promise(r => setTimeout(r, 1000));
                    }
                })();
            }
        } catch (err) {
            console.error('Error loading state properties:', err);
        } finally {
            setPropsLoading(false);
        }
    };

    const handleRemoveProperty = async (propertyId: number) => {
        try {
            if (selectedListId) {
                await ClientDataService.removePropertyFromList(selectedListId, propertyId);
                loadListProperties(selectedListId);
            } else if (selectedStateName) {
                const stateList = lists.find(l => l.tags === 'STANDARD' && l.name === selectedStateName);
                if (stateList) {
                    await ClientDataService.removePropertyFromList(stateList.id, propertyId);
                    loadStateProperties(selectedStateName);
                }
            }
            loadLists();
        } catch (err: any) {
            alert(err.message || 'Failed to remove property');
        }
    };

    const handleMoveProperty = async () => {
        if (!selectedListId || !movingPropertyId || !moveTargetListId) return;
        try {
            await ClientDataService.movePropertyBetweenLists(selectedListId, movingPropertyId, Number(moveTargetListId));
            setMovingPropertyId(null);
            setMoveTargetListId('');
            loadLists();
            loadListProperties(selectedListId);
        } catch (e) {
            console.error(e);
            alert("Error moving property.");
        }
    };

    const handleCreateList = async () => {
        if (creating) return;
        setCreating(true);
        try {
            if (creationMode === 'custom') {
                if (!newListName) return;
                await ClientDataService.createList(newListName, undefined, activeCompany?.id);
            } else {
                if (!selectedState) return;
                
                // Always use State as the primary folder name
                const folderName = selectedState.state;
                const existingFolder = lists.find(l => l.tags && l.tags.startsWith('STANDARD') && l.name === folderName);
                
                // Construct tags string including the new county if selected
                let finalTags = 'STANDARD';
                if (newCountyName) {
                    const trimmedCounty = newCountyName.trim();
                    if (existingFolder && existingFolder.tags && existingFolder.tags.includes(':')) {
                        const parts = existingFolder.tags.split(':');
                        const prefix = parts[0];
                        const existingCounties = parts[1].split(',').map(c => c.trim());
                        if (!existingCounties.some(c => c.toLowerCase() === trimmedCounty.toLowerCase())) {
                            finalTags = `${prefix}:${existingCounties.join(',')},${trimmedCounty}`;
                        } else {
                            finalTags = existingFolder.tags;
                        }
                    } else {
                        finalTags = `STANDARD:${trimmedCounty}`;
                    }
                }

                if (existingFolder) {
                    // Update tags if we have a new county to pin
                    if (newCountyName && existingFolder.tags !== finalTags) {
                        await ClientDataService.updateList(existingFolder.id, { tags: finalTags });
                    }
                    setSelectedListId(existingFolder.id);
                    setSelectedStateName(existingFolder.name);
                    if (newCountyName) {
                        setSelectedCountyName(newCountyName);
                        countyService.getContacts(folderName, newCountyName).then(setCountyContacts);
                        setExpandedStates(prev => ({ ...prev, [folderName]: true }));
                    }
                } else {
                    const res = await ClientDataService.createList(folderName, finalTags, activeCompany?.id);
                    if (res && res.id) {
                        setSelectedListId(res.id);
                        setSelectedStateName(folderName);
                        if (newCountyName) {
                            setSelectedCountyName(newCountyName);
                            countyService.getContacts(folderName, newCountyName).then(setCountyContacts);
                            setExpandedStates(prev => ({ ...prev, [folderName]: true }));
                        }
                    }
                }
            }
            setNewListName('');
            setNewCountyName(null);
            setSelectedState(null);
            setOpenModal(false);
            loadLists();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteList = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this folder?")) return;
        try {
            await ClientDataService.deleteList(id);
            if (selectedListId === id) {
                setSelectedListId(null);
                setSelectedStateName(null);
                setSelectedCountyName(null);
            }
            loadLists();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteSubfolder = async (listId: number, countyName: string) => {
        if (!window.confirm(`Are you sure you want to delete the county "${countyName}"? This will remove all properties in this county from the folder.`)) return;
        try {
            await ClientDataService.deleteSubfolder(listId, countyName);
            if (selectedListId === listId && selectedCountyName === countyName) {
                setSelectedCountyName(null);
            }
            loadLists();
            if (selectedListId === listId) {
                loadListProperties(listId);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleStartRename = (list: CustomList) => {
        setListToEdit(list);
        if (list.tags === 'STANDARD') {
            setEditFolderType('standard');
            const parts = list.name.split(' - ');
            const stName = parts[0];
            const coName = parts[1] || null;
            const stObj = stateContacts.find(c => c.state === stName) || null;
            setEditFolderState(stObj);
            setEditFolderCounty(coName);
            if (stObj) {
                countyService.getCounties(stObj.state).then(setEditFolderAvailableCounties).catch(() => setEditFolderAvailableCounties([]));
            } else {
                setEditFolderAvailableCounties([]);
            }
        } else {
            setEditFolderType('custom');
            setEditFolderName(list.name);
        }
        setEditModalOpen(true);
    };

    const handleEditFolderSave = async () => {
        if (!listToEdit) return;
        try {
            if (editFolderType === 'custom') {
                if (!editFolderName) return;
                await ClientDataService.updateList(listToEdit.id, { name: editFolderName });
            } else {
                if (!editFolderState) return;
                const finalName = editFolderState.state;
                let finalTags = 'STANDARD';
                if (editFolderCounty) {
                    finalTags = `STANDARD:${editFolderCounty}`;
                }
                await ClientDataService.updateList(listToEdit.id, { name: finalName, tags: finalTags });
            }
            setEditModalOpen(false);
            setListToEdit(null);
            loadLists();
        } catch (err: any) {
            alert(err.message);
        }
    };



    const handleDragStart = (e: React.DragEvent, propertyId: number) => {
        e.dataTransfer.setData("propertyId", propertyId.toString());
        e.dataTransfer.setData("sourceListId", selectedListId?.toString() || "");
    };

    const handleDrop = async (e: React.DragEvent, targetListId: number) => {
        e.preventDefault();
        setDragOverListId(null);
        const propertyId = parseInt(e.dataTransfer.getData("propertyId"));
        const sourceListId = parseInt(e.dataTransfer.getData("sourceListId"));

        if (sourceListId === targetListId) return;

        try {
            await ClientDataService.moveProperty(sourceListId, propertyId, targetListId);
            loadLists();
            if (selectedListId === sourceListId) {
                loadListProperties(sourceListId);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleImportBroadcasted = async (listId: number) => {
        setImporting(listId);
        try {
            const newList = await ClientDataService.importBroadcastedList(listId);
            await loadLists();
            setSelectedListId(newList.id);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setImporting(null);
        }
    };

    const selectedList = lists.find(l => l.id === selectedListId) || broadcastedLists.find(l => l.id === selectedListId);

    if (loading && !lists.length && !broadcastedLists.length) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <CircularProgress size={24} />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 border-x border-slate-200 dark:border-slate-800">
            {/* Left Sidebar */}
            <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden shrink-0`}>
                <div className="p-4 flex justify-between items-center w-64">
                    <Typography variant="h6" className="font-bold text-slate-800 dark:text-white tracking-tight">Folders</Typography>
                    <IconButton size="small" onClick={() => setOpenModal(true)} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <FolderPlusIcon size={18} className="text-blue-600" />
                    </IconButton>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    <div className="space-y-6">
                        {/* smart lists / favorites */}
                        {lists.some(l => l.is_favorite_list) && (
                            <div>
                                <div
                                    className="flex items-center justify-between px-3 cursor-pointer group"
                                    onClick={() => setCollapsedSections(prev => ({ ...prev, smart: !prev.smart }))}
                                >
                                    <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">Smart Lists</Typography>
                                    <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.smart ? '-rotate-90' : ''}`}>expand_more</span>
                                </div>
                                {!collapsedSections.smart && (
                                    <div className="mt-1 space-y-0.5">
                                        {lists.filter(l => l.is_favorite_list).map(list => (
                                            <div
                                                key={list.id}
                                                onClick={() => { setSelectedListId(list.id); setSelectedStateName(null); setSelectedCountyName(null); }}
                                                onDragOver={(e) => { e.preventDefault(); setDragOverListId(list.id); }}
                                                onDragLeave={() => setDragOverListId(null)}
                                                onDrop={(e) => handleDrop(e, list.id)}
                                                className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
                                                    ${selectedListId === list.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
                                                    ${dragOverListId === list.id ? 'ring-2 ring-blue-400 ring-inset scale-[1.02]' : ''}`}
                                            >
                                                <span className={`material-symbols-outlined text-[18px] ${selectedListId === list.id ? 'text-white' : 'text-red-500'}`}>favorite</span>
                                                <span className="flex-1 text-sm font-medium truncate">{list.name}</span>
                                                {list.has_upcoming_auction && (
                                                    <div className="flex items-center gap-0.5 bg-orange-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                                                        <span className="material-symbols-outlined text-[10px]">gavel</span>
                                                        <span className="text-[9px] font-black">{list.upcoming_auctions_count}</span>
                                                    </div>
                                                )}
                                                <span className={`text-xs ${selectedListId === list.id ? 'text-blue-100' : 'text-slate-400'}`}>{list.property_count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {lists.some(l => l.tags === 'STANDARD') && (
                            <div>
                                <div
                                    className="flex items-center justify-between px-3 cursor-pointer group"
                                    onClick={() => setCollapsedSections(prev => ({ ...prev, standard: !prev.standard }))}
                                >
                                    <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">Standard Folders</Typography>
                                    <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.standard ? '-rotate-90' : ''}`}>expand_more</span>
                                </div>
                                {!collapsedSections.standard && (
                                    <div className="mt-1 space-y-1">
                                        {lists.filter(l => l.tags && l.tags.startsWith('STANDARD')).sort((a, b) => a.name.localeCompare(b.name)).map(list => {
                                            // Compute dynamic county groupings if this state is selected
                                            const isSelectedState = selectedStateName === list.name;
                                            const stateProperties = isSelectedState ? selectedListProperties : [];
                                            const countyMap = new Map<string, number>();
                                            
                                            // Add pinned counties from tags
                                            if (list.tags && list.tags.includes(':')) {
                                                const pinnedCounties = list.tags.split(':')[1].split(',');
                                                pinnedCounties.forEach(c => {
                                                    const trimmed = c.trim();
                                                    if (trimmed) countyMap.set(trimmed, 0);
                                                });
                                            }

                                            stateProperties.forEach(p => {
                                                const c = (p.county || 'Unknown County').trim();
                                                countyMap.set(c, (countyMap.get(c) || 0) + 1);
                                            });
                                            const sortedCounties = Array.from(countyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

                                            return (
                                                <div key={list.id} className="flex flex-col">
                                                    {/* State Header (Click to select) */}
                                                    <div
                                                        onClick={() => {
                                                            setSelectedListId(list.id);
                                                            setSelectedStateName(list.name);
                                                            setSelectedCountyName(null);
                                                            setCountyContacts([]);
                                                            handleExpandStateList(list.id, list.name);
                                                        }}
                                                        onDragOver={(e) => { e.preventDefault(); setDragOverListId(list.id); }}
                                                        onDragLeave={() => setDragOverListId(null)}
                                                        onDrop={(e) => handleDrop(e, list.id)}
                                                        className={`group flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-slate-700 dark:text-slate-300 transition-colors 
                                                            ${selectedStateName === list.name && !selectedCountyName ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 shadow-sm' : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
                                                            ${dragOverListId === list.id ? 'ring-2 ring-blue-400 ring-inset scale-[1.02]' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${expandedStates[list.name] ? 'rotate-90 text-blue-500' : 'text-slate-400'}`}>
                                                                chevron_right
                                                            </span>
                                                            <span className="text-sm font-bold truncate tracking-tight">{list.name}</span>
                                                            {list.has_upcoming_auction && (
                                                                <div className="flex items-center gap-0.5 bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                                                                    <span className="material-symbols-outlined text-[10px]">gavel</span>
                                                                    <span className="text-[9px] font-black">{list.upcoming_auctions_count}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <IconButton
                                                                    size="small"
                                                                    className="p-0.5"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                                                >
                                                                    <Trash2Icon size={12} className={selectedStateName === list.name && !selectedCountyName ? 'text-blue-600' : 'text-slate-400'} />
                                                                </IconButton>
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${selectedStateName === list.name && !selectedCountyName ? 'text-blue-600 bg-blue-200/50 dark:bg-blue-800/50 dark:text-blue-300' : 'text-slate-400 bg-slate-200 dark:bg-slate-800'}`}>
                                                                {list.property_count} Props
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Dynamic County Lists */}
                                                    {expandedStates[list.name] && isSelectedState && sortedCounties.length > 0 && (
                                                        <div className="mt-1 ml-4 border-l-2 border-slate-200 dark:border-slate-800 pl-2 space-y-0.5">
                                                            {sortedCounties.map(([county, count]) => {
                                                                // Check if any property in this county has an upcoming auction
                                                                const hasAuction = stateProperties.some(p =>
                                                                    (p.county || '').trim().toLowerCase() === (county || '').trim().toLowerCase() &&
                                                                    (p.auction_status === "started" || (p.auction_date && new Date(p.auction_date).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000))
                                                                );

                                                                return (
                                                                    <div
                                                                        key={`${list.id}-${county}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedListId(list.id);
                                                                            setSelectedStateName(list.name);
                                                                            setSelectedCountyName(county);
                                                                            // Fetch county contacts using the existing service logic
                                                                            countyService.getContacts(list.name, county)
                                                                                .then(setCountyContacts)
                                                                                .catch(() => setCountyContacts([]));
                                                                        }}
                                                                        className={`group flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 
                                                                        ${selectedCountyName === county ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                                                    >
                                                                        <span className={`material-symbols-outlined text-[16px] ${selectedCountyName === county ? 'text-white' : 'text-emerald-500'}`}>map</span>
                                                                        <span className="flex-1 text-sm font-medium truncate">{county}</span>
                                                                        {hasAuction && (
                                                                            <div className="flex items-center gap-0.5 bg-orange-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                                                                <span className="material-symbols-outlined text-[10px]">gavel</span>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <IconButton
                                                                                size="small"
                                                                                className="p-0.5"
                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSubfolder(list.id, county); }}
                                                                            >
                                                                                <Trash2Icon size={12} className={selectedCountyName === county ? 'text-white' : 'text-slate-400 hover:text-red-500'} />
                                                                            </IconButton>
                                                                        </div>

                                                                        <span className={`text-xs ${selectedCountyName === county ? 'text-emerald-100' : 'text-slate-400'}`}>{count}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <div
                                className="flex items-center justify-between px-3 cursor-pointer group"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, custom: !prev.custom }))}
                            >
                                <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">Custom Folders</Typography>
                                <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.custom ? '-rotate-90' : ''}`}>expand_more</span>
                            </div>
                            {!collapsedSections.custom && (
                                <div className="mt-1 space-y-0.5">
                                    {lists.filter(l => !l.is_favorite_list && (!l.tags || !l.tags.startsWith('STANDARD'))).sort((a, b) => a.name.localeCompare(b.name)).map(list => (
                                        <div
                                            key={list.id}
                                            onClick={() => { setSelectedListId(list.id); setSelectedStateName(null); setSelectedCountyName(null); }}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverListId(list.id); }}
                                            onDragLeave={() => setDragOverListId(null)}
                                            onDrop={(e) => handleDrop(e, list.id)}
                                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
                                                ${selectedListId === list.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
                                                ${dragOverListId === list.id ? 'ring-2 ring-blue-400 ring-inset scale-[1.02]' : ''}`}
                                        >
                                            <span className={`material-symbols-outlined text-[18px] ${selectedListId === list.id ? 'text-white' : 'text-blue-500'}`}>folder</span>
                                            {list.has_upcoming_auction && (
                                                <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-sm z-10">
                                                    <span className="material-symbols-outlined text-[12px]">gavel</span>
                                                </div>
                                            )}
                                                <span className="flex-1 text-sm font-medium truncate">{list.name}</span>
                                                    {list.has_upcoming_auction && (
                                                        <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-md font-black">
                                                            AUCTION
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <IconButton
                                                            size="small"
                                                            className="p-0.5"
                                                            onClick={(e) => { e.stopPropagation(); handleStartRename(list); }}
                                                        >
                                                            <Edit2Icon size={12} className={selectedListId === list.id ? 'text-white' : 'text-slate-400'} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            className="p-0.5"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                                        >
                                                            <Trash2Icon size={12} className={selectedListId === list.id ? 'text-white' : 'text-slate-400'} />
                                                        </IconButton>
                                                    </div>
                                                    <span className={`text-xs ${selectedListId === list.id ? 'text-blue-100' : 'text-slate-400'}`}>{list.property_count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* broadcasted folders */}
                        {broadcastedLists.length > 0 && (
                            <div>
                                <div
                                    className="flex items-center justify-between px-3 cursor-pointer group"
                                    onClick={() => setCollapsedSections(prev => ({ ...prev, broadcasted: !prev.broadcasted }))}
                                >
                                    <Typography variant="overline" className="text-slate-400 font-bold text-[10px]">From Admin</Typography>
                                    <span className={`material-symbols-outlined text-[14px] text-slate-400 transition-transform ${collapsedSections.broadcasted ? '-rotate-90' : ''}`}>expand_more</span>
                                </div>
                                {!collapsedSections.broadcasted && (
                                    <div className="mt-1 space-y-0.5">
                                        {[...broadcastedLists].sort((a, b) => a.name.localeCompare(b.name)).map(list => (
                                            <div
                                                key={list.id}
                                                onClick={() => { setSelectedListId(list.id); setSelectedStateName(null); setSelectedCountyName(null); }}
                                                className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 
                                                    ${selectedListId === list.id ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                            >
                                                <span className={`material-symbols-outlined text-[18px] ${selectedListId === list.id ? 'text-white' : 'text-green-500'}`}>campaign</span>
                                                <span className="flex-1 text-sm font-medium truncate">{list.name}</span>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="small" variant="contained" color="success" className="text-[10px] py-0 min-w-0 px-2" onClick={(e) => { e.stopPropagation(); handleImportBroadcasted(list.id); }} disabled={importing === list.id}>
                                                        {importing === list.id ? '...' : 'Save'}
                                                    </Button>
                                                </div>
                                                {importing !== list.id && (
                                                    <span className={`text-xs ${selectedListId === list.id ? 'text-green-100' : 'text-slate-400'}`}>{list.property_count}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Content / Tasks */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Typography variant="overline" className="px-3 text-slate-400 font-bold text-[10px] tracking-widest uppercase">Team Collaboration</Typography>
                            <div className="mt-2 space-y-0.5">
                                <div
                                    onClick={() => { 
                                        if (isTrial) {
                                            alert("🚀 My Tasks is a Pro feature! \n\nThis tool allows you to assign field visits and due diligence tasks to realtors. Upgrade to Pro or Enterprise to start building your field team.");
                                            return;
                                        }
                                        setViewMode('my_tasks'); 
                                        setSelectedListId(null); 
                                        setSelectedStateName(null); 
                                        setSelectedCountyName(null); 
                                    }}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 
                                        ${viewMode === 'my_tasks' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${viewMode === 'my_tasks' ? 'text-white' : 'text-blue-500'}`}>task_alt</span>
                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                        <span className="text-sm font-medium truncate">My Tasks</span>
                                        {isTrial && <span className="material-symbols-outlined text-[14px] text-slate-400">lock</span>}
                                    </div>
                                </div>
                                <div
                                    onClick={() => { 
                                        if (isTrial) {
                                            alert("📤 Property Export is a Pro feature! \n\nThis allows you to export property packets and CSVs to your partners or realtors. Upgrade to Pro or Enterprise to enable data exports.");
                                            return;
                                        }
                                        setViewMode('my_exports'); 
                                        setSelectedListId(null); 
                                        setSelectedStateName(null); 
                                        setSelectedCountyName(null); 
                                    }}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 
                                        ${viewMode === 'my_exports' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${viewMode === 'my_exports' ? 'text-white' : 'text-blue-500'}`}>upload</span>
                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                        <span className="text-sm font-medium truncate">My Exports</span>
                                        {isTrial && <span className="material-symbols-outlined text-[14px] text-slate-400">lock</span>}
                                    </div>
                                </div>
                                <div
                                    onClick={() => { setViewMode('my_properties'); setSelectedListId(null); setSelectedStateName(null); setSelectedCountyName(null); }}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 
                                        ${viewMode === 'my_properties' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${viewMode === 'my_properties' ? 'text-white' : 'text-emerald-500'}`}>real_estate_agent</span>
                                    <span className="flex-1 text-sm font-medium truncate">My Properties</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <IconButton size="small" onClick={() => setOpenModal(true)} className="text-blue-600">
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    </IconButton>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">New Folder</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
                {viewMode === 'my_tasks' ? (
                    <InvestorMyTasksView onBack={() => setViewMode('folders')} />
                ) : viewMode === 'my_exports' ? (
                    <InvestorMyExportsView onBack={() => setViewMode('folders')} />
                ) : viewMode === 'my_properties' ? (
                    <ClientUserProperties onBack={() => setViewMode('folders')} />
                ) : (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-900 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <IconButton 
                                        onClick={() => setSidebarOpen(!sidebarOpen)} 
                                        size="medium" 
                                        className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 shadow-sm border border-blue-200 dark:border-blue-800 transition-all"
                                        title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
                                    >
                                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[22px]">{sidebarOpen ? 'left_panel_close' : 'left_panel_open'}</span>
                                    </IconButton>
                                    <div>
                                        <Typography variant="h5" className="font-bold text-slate-900 dark:text-white capitalize leading-tight">
                                            {selectedStateName
                                                ? (selectedCountyName ? `${selectedStateName} - ${selectedCountyName}` : selectedStateName)
                                                : (selectedList?.name || 'Select a Folder')}
                                        </Typography>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                {selectedStateName && selectedCountyName
                                                    ? selectedListProperties.filter(p => (p.county || '').trim().toLowerCase() === selectedCountyName.trim().toLowerCase()).length
                                                    : selectedListProperties.length} Properties
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                <div className="flex-1 overflow-y-auto p-3 md:p-6">
                    {/* Upcoming Auction Alert Banner */}
                    {(selectedList?.has_upcoming_auction || selectedListProperties.some(p => p.auction_status === "started" || (p.auction_date && new Date(p.auction_date).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000))) && (
                        <div className="mb-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-xl p-4 flex gap-4 items-start">
                            <div className="size-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-xl">warning</span>
                            </div>
                            <div>
                                <h4 className="text-orange-800 dark:text-orange-400 font-bold text-sm">Action Required: Approaching Auctions</h4>
                                <p className="text-orange-700 dark:text-orange-500 text-xs mt-1">
                                    One or more properties in this watchlist have an upcoming auction date within the next 7 days or have already started. Please verify funds and register to bid on the respective county portal.
                                </p>
                            </div>
                        </div>
                    )}

                    {selectedStateName && (() => {
                        const contactInfo = stateContacts.find(c => c.state === selectedStateName);
                        const stateCode = STATE_CODE_MAP[selectedStateName] || 'FL'; // Default to FL fallback if missing
                        const silhouetteUrl = `https://static.simplemaps.com/resources/svg-library/us/${stateCode.toLowerCase()}.svg`;

                        // Helper to match county name robustly (ignoring case, spaces, and the "County" suffix)
                        const normalizedMatch = (c1: string, c2: string) => {
                            if (!c1 || !c2) return false;
                            const n1 = c1.trim().toLowerCase().replace(/[\s\-_]+county$/i, '').replace(/[^a-z0-9]/g, '');
                            const n2 = c2.trim().toLowerCase().replace(/[\s\-_]+county$/i, '').replace(/[^a-z0-9]/g, '');
                            return n1 === n2 || n1.includes(n2) || n2.includes(n1);
                        };

                        // Aggregate auction links from all properties in the selected folder
                        const filteredForLinks = selectedCountyName 
                            ? selectedListProperties.filter(p => normalizedMatch(p.county, selectedCountyName))
                            : selectedListProperties;
                        const auctionLinks = filteredForLinks.reduce((acc: any[], p: any) => {
                            if (p.auction_info_link || p.auction_list_link) {
                                // Unique key by links
                                const key = `${p.auction_info_link}-${p.auction_list_link}`;
                                if (!acc.find(item => item.key === key)) {
                                    acc.push({
                                        key,
                                        name: p.auction_name || 'Auction Portal',
                                        register: p.auction_info_link,
                                        list: p.auction_list_link
                                    });
                                }
                            }
                            return acc;
                        }, []);

                        return (
                            <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg md:rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                {/* Header and Silhouette Wrapper */}
                                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-slate-200 dark:border-slate-800">
                                    {/* Left Side: Contact and Links */}
                                    <div className="flex-1 p-3 md:p-4 flex flex-col gap-3 md:gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">public</span>
                                                <Typography className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                    {selectedStateName} Official Info
                                                </Typography>
                                            </div>
                                            {contactInfo?.url && (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    href={contactInfo.url}
                                                    target="_blank"
                                                    className="text-[10px] h-6 px-2 rounded-sm border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 normal-case"
                                                    startIcon={<ExternalLinkIcon size={10} />}
                                                >
                                                    State Portal
                                                </Button>
                                            )}
                                        </div>

                                        {/* Dynamic Auction Links Section */}
                                        <div className="space-y-2">
                                            <Typography variant="overline" className="text-[10px] font-bold text-slate-400">Active Auction Portals</Typography>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {auctionLinks.length > 0 ? (
                                                    auctionLinks.map((link, idx) => (
                                                        <div key={idx} className="bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700 flex flex-col gap-1 shadow-xs">
                                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate">{link.name}</span>
                                                            <div className="flex gap-2">
                                                                {link.register && (
                                                                    <a href={link.register} target="_blank" rel="noreferrer" className="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-bold">
                                                                        <span className="material-symbols-outlined text-[10px]">app_registration</span> Registration / Instructions
                                                                    </a>
                                                                )}
                                                                {link.list && (
                                                                    <a href={link.list} target="_blank" rel="noreferrer" className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-bold">
                                                                        <span className="material-symbols-outlined text-[10px]">list_alt</span> Auction List
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full py-3 bg-slate-100/50 dark:bg-slate-800/40 rounded-lg text-center">
                                                        <span className="text-[10px] text-slate-400 italic">No auction links found for properties in this list.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Folder Notes Section */}
                                        <div className="mt-2 text-left">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Typography variant="overline" className="text-[10px] font-bold text-slate-400">
                                                    {selectedCountyName ? `${selectedCountyName} Specific Notes` : 'General Folder Notes'}
                                                </Typography>
                                                {selectedCountyName && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-bold">Subfolder</span>}
                                            </div>
                                            <TextField
                                                multiline
                                                fullWidth
                                                rows={3}
                                                placeholder={selectedCountyName ? `Specific annotations for properties in ${selectedCountyName}...` : "Add private notes about this state search, strategy or contacts..."}
                                                variant="outlined"
                                                value={folderNotes}
                                                onChange={(e) => setFolderNotes(e.target.value)}
                                                onBlur={(e) => handleSaveNotes(e.target.value)}
                                                className="bg-white dark:bg-slate-900/80 rounded-xl"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        fontSize: '13px',
                                                        borderRadius: '12px',
                                                        '& fieldset': { borderColor: 'rgba(226, 232, 240, 0.5)' },
                                                        '&:hover fieldset': { borderColor: '#3b82f6' },
                                                        className: 'dark:border-slate-700'
                                                    }
                                                }}
                                            />
                                            {savingNotes && <span className="text-[9px] text-blue-500 animate-pulse ml-1">Saving changes...</span>}
                                        </div>
                                    </div>

                                    {/* Right Side: State Silhouette */}
                                    {!selectedCountyName && (
                                        <div className="w-full md:w-48 h-full bg-white dark:bg-slate-900 flex items-center justify-center p-6 shrink-0 group/silhouette overflow-hidden relative">
                                            <img
                                                src={silhouetteUrl}
                                                alt={`${selectedStateName} silhouette`}
                                                className="w-full h-full object-contain opacity-50 dark:opacity-60 group-hover/silhouette:opacity-80 dark:group-hover/silhouette:opacity-90 transition-all duration-700 pointer-events-none drop-shadow-sm"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className="text-4xl font-black text-slate-200 dark:text-slate-800 tracking-tighter opacity-50">{stateCode}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* County Contacts (Overlay/Replacement) */}
                                    {selectedCountyName && (
                                        <div className="w-full md:w-64 p-4 bg-white dark:bg-slate-800 overflow-y-auto max-h-[300px]">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{selectedCountyName} Sub-Links</h3>
                                            <div className="space-y-2">
                                                {countyContacts.length > 0 ? (
                                                    countyContacts.map((contact, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={contact.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800"
                                                        >
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-[10px] truncate">{contact.name}</span>
                                                                {contact.phone && <span className="text-[9px] text-slate-500 opacity-70 italic">{contact.phone}</span>}
                                                            </div>
                                                            <span className="material-symbols-outlined text-[14px] text-blue-500">open_in_new</span>
                                                        </a>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">No specific county links.</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                    {propsLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <CircularProgress size={24} />
                        </div>
                    ) : selectedListProperties.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <span className="material-symbols-outlined text-[64px] text-slate-300 mb-4">folder_open</span>
                            <Typography className="text-slate-500 text-sm font-medium">No Properties in this folder</Typography>
                            <Typography className="text-slate-400 text-xs mt-1">Drag and drop properties here from search or other lists.</Typography>
                        </div>
                    ) : (() => {
                        // Filter by county if a subfolder is selected
                        const displayProperties = [...(selectedStateName && selectedCountyName
                            ? selectedListProperties.filter(p => normalizedMatch(p.county, selectedCountyName))
                            : selectedListProperties)]
                            .sort((a, b) => {
                                const isAFav = favoritesSet.has(a.id);
                                const isBFav = favoritesSet.has(b.id);
                                if (isAFav && !isBFav) return -1;
                                if (!isAFav && isBFav) return 1;
                                return 0;
                            });

                        if (displayProperties.length === 0) {
                            return (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <span className="material-symbols-outlined text-[64px] text-slate-300 mb-4">folder_open</span>
                                    <Typography className="text-slate-500 text-sm font-medium">No properties found in this specific county.</Typography>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3">
                                {selectedList?.has_upcoming_auction && (
                                    <div className="mb-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-orange-100 dark:bg-orange-800/40 rounded-lg text-orange-600 dark:text-orange-400 shadow-inner">
                                                <span className="material-symbols-outlined pt-0.5">notification_important</span>
                                            </div>
                                            <div>
                                                <h5 className="font-extrabold text-orange-800 dark:text-orange-300 text-sm tracking-tight">Upcoming Auctions Detected!</h5>
                                                <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5 font-medium">There are {selectedList.upcoming_auctions_count} properties in this folder scheduled for auction soon. Review them immediately.</p>
                                            </div>
                                        </div>
                                        <Button variant="contained" color="warning" size="small" className="whitespace-nowrap shadow-none font-bold text-xs" onClick={() => { }}>
                                            Review Agenda
                                        </Button>
                                    </div>
                                )}
                                {displayProperties.map((prop: any) => (
                                    <SwipeActionItem 
                                        key={prop.id} 
                                        onDelete={() => handleRemoveProperty(prop.id)}
                                        onMove={() => setMovingPropertyId(prop.id)}
                                    >
                                        <div
                                            onClick={() => setPreviewPropertyId(prop.parcel_id || prop.id)}
                                            className={`group relative border rounded-xl p-3 sm:p-4 shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-3 sm:gap-4
                                            ${favoritesSet.has(prop.id) 
                                                ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 shadow-md ring-1 ring-amber-100 dark:ring-amber-900/20' 
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900'}`}
                                        >
                                            <div className="relative group/thumb">
                                                <StreetViewThumbnail 
                                                    property={prop}
                                                    size={64}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                                                    <span className="material-symbols-outlined text-white text-sm">zoom_in</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">
                                                            {prop.owner_address ? prop.owner_address.split('\n')[0] : (prop.title || 'Untitled Property')}
                                                        </h4>
                                                        <Chip
                                                            label={prop.availability_status || 'Unknown'}
                                                            size="small"
                                                            className={`h-4 text-[8px] font-bold uppercase transition-colors px-0
                                                            ${prop.availability_status === 'available' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}
                                                        />
                                                    </div>

                                                    <IconButton
                                                        size="small"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const res = await PropertyService.toggleFavorite(prop.id, activeCompany?.id);
                                                                console.log("Toggle Favorite Result for Prop", prop.id, ":", res);
                                                                setFavoritesSet(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(prop.id)) next.delete(prop.id);
                                                                    else next.add(prop.id);
                                                                    return next;
                                                                });
                                                            } catch (err) {
                                                                console.error("Failed to toggle priority", err);
                                                            }
                                                        }}
                                                        className={`relative z-10 transition-all duration-300 p-1.5 -mr-1.5 ${favoritesSet.has(prop.id) ? 'text-amber-400 scale-125' : 'text-slate-200 hover:text-amber-200'}`}
                                                    >
                                                        <span 
                                                            className="material-symbols-outlined text-[22px]"
                                                            style={{ 
                                                                fontVariationSettings: favoritesSet.has(prop.id) ? "'FILL' 1, 'wght' 700" : "'FILL' 0, 'wght' 400"
                                                            }}
                                                        >
                                                            star
                                                        </span>
                                                    </IconButton>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{prop.parcel_id}</span>
                                                    <span className="opacity-30">|</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-red-500">location_on</span>
                                                        <span className="truncate">{prop.address || 'No Address Listed'}</span>
                                                    </div>
                                                    <span className="opacity-30">|</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-emerald-500">map</span>
                                                        <span className="truncate text-emerald-600 dark:text-emerald-400">{prop.county || 'Unknown County'}</span>
                                                    </div>
                                                </div>

                                                {/* Description Field Requested by User */}
                                                {prop.description && (
                                                    <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                                                        {prop.description}
                                                    </p>
                                                )}

                                                <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Opening Bid</span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-white">${prop.amount_due?.toLocaleString() || '0'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Acres</span>
                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{prop.lot_acres || 'N/A'}</span>
                                                    </div>
                                                    {/* Legal Description Hover Badge */}
                                                    {prop.legal_description && (
                                                        <div className="relative group/legal flex flex-col cursor-default">
                                                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Legal Desc.</span>
                                                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 underline decoration-dotted">View ℹ</span>
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full left-0 mb-2 z-50 w-72 invisible opacity-0 group-hover/legal:visible group-hover/legal:opacity-100 transition-all duration-200 pointer-events-none">
                                                                <div className="bg-slate-900 dark:bg-slate-700 text-white text-[11px] leading-relaxed rounded-xl shadow-2xl p-3 border border-slate-700 dark:border-slate-600">
                                                                    <p className="font-black uppercase tracking-wider text-indigo-300 text-[9px] mb-1">Legal Description</p>
                                                                    <p className="font-mono break-words">{prop.legal_description}</p>
                                                                </div>
                                                                {/* Arrow */}
                                                                <div className="w-3 h-3 bg-slate-900 dark:bg-slate-700 rotate-45 ml-4 -mt-1.5 border-r border-b border-slate-700" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {prop.is_auction_upcoming && (
                                                        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                                            <span className="material-symbols-outlined text-[16px] text-orange-600 animate-bounce">gavel</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] text-orange-600 font-black uppercase tracking-tighter">Auction Soon</span>
                                                                <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                                                                    {prop.days_until_auction === 0 ? 'TODAY' : `${prop.days_until_auction} days left`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(prop.auction_info_link || prop.auction_list_link) && (
                                                        <div className="flex items-center gap-3 bg-blue-50/50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100/50 dark:border-blue-800/30">
                                                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Portals:</span>
                                                            <div className="flex gap-2">
                                                                {prop.auction_info_link && (
                                                                    <a href={prop.auction_info_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-bold">
                                                                        Registration / Instructions
                                                                    </a>
                                                                )}
                                                                {prop.auction_list_link && (
                                                                    <a href={prop.auction_list_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-bold">
                                                                        Auction List
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/client/properties/${prop.parcel_id || prop.id}`); }}
                                                >
                                                    <ExternalLinkIcon size={16} />
                                                </div>
                                                <div className="opacity-40 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, prop.id)}
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
                                                </div>
                                            </div>
                                            {/* Task & Export action buttons */}
                                            {!isAgent && (
                                                <div className="mt-3 flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            if (isTrial) {
                                                                alert('Due Diligence Tasks are a premium feature. Upgrade to Pro or Enterprise to track your workflow.');
                                                                return;
                                                            }
                                                            setTaskProperty(prop); 
                                                            setTaskForm({ title: `Photo Verification — ${(prop.address || prop.parcel_id || '').slice(0, 40)}`, description: '', min_photos: 3, max_photos: 10, reward_usd: 10 }); 
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">task_alt</span>
                                                        Create Task
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (isTrial) {
                                                                alert('Data Exports to Realtors are a premium feature. Upgrade to Pro or Enterprise to access this tool.');
                                                                return;
                                                            }
                                                            setExportProperty(prop); 
                                                            setExportForm({ contact_name: '', contact_phone: '', contact_email: '', notes: '', requested_sale_price: '' }); 
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">upload</span>
                                                        Export to Realtors
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </SwipeActionItem>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>
            )}
            </div>

            {/* Create Folder Modal */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} PaperProps={{ className: "rounded-2xl dark:bg-slate-900", sx: { overflow: 'visible' } }}>
                <div className="p-6 min-w-[320px] max-w-[400px]">
                    <Typography variant="h6" className="font-bold mb-4 dark:text-white">New Folder</Typography>

                    <Tabs value={creationMode} onChange={(_, v) => setCreationMode(v)} className="mb-6 border-b border-slate-100 dark:border-slate-800">
                        <Tab value="custom" label="Custom" className="font-bold capitalize rounded-t-lg" />
                        <Tab value="standard" label="Standard (State)" className="font-bold capitalize rounded-t-lg" />
                    </Tabs>

                    {creationMode === 'custom' ? (
                        <TextField
                            autoFocus
                            fullWidth
                            placeholder="Name of your new folder..."
                            variant="outlined"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="mb-4"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                        />
                    ) : (
                        <div className="flex flex-col gap-3 mb-4">
                            <Autocomplete
                                options={stateContacts}
                                getOptionLabel={(option) => option.state}
                                value={selectedState}
                                onChange={(_, newValue) => setSelectedState(newValue)}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a US State..." autoFocus className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                            <Autocomplete
                                options={availableCounties}
                                getOptionLabel={(option) => option}
                                value={newCountyName}
                                onChange={(_, newValue) => setNewCountyName(newValue)}
                                disabled={!selectedState}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a County (Optional)" className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button color="inherit" onClick={() => setOpenModal(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleCreateList}
                            disabled={creating || (creationMode === 'custom' ? !newListName : !selectedState)}
                            className="bg-blue-600 rounded-lg shadow-none"
                        >
                            {creating ? <CircularProgress size={20} color="inherit" /> : 'Create'}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Edit Folder Modal */}
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} PaperProps={{ className: "rounded-2xl dark:bg-slate-900", sx: { overflow: 'visible' } }}>
                <div className="p-6 min-w-[320px] max-w-[400px]">
                    <Typography variant="h6" className="font-bold mb-4 dark:text-white">Edit Folder</Typography>

                    {editFolderType === 'custom' ? (
                        <TextField
                            autoFocus
                            fullWidth
                            placeholder="Name of your folder..."
                            variant="outlined"
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            className="mb-4"
                            onKeyDown={(e) => e.key === 'Enter' && handleEditFolderSave()}
                        />
                    ) : (
                        <div className="flex flex-col gap-3 mb-4">
                            <Autocomplete
                                options={stateContacts}
                                getOptionLabel={(option) => option.state}
                                value={editFolderState}
                                onChange={(_, newValue) => {
                                    setEditFolderState(newValue);
                                    setEditFolderCounty(null);
                                    if (newValue) {
                                        countyService.getCounties(newValue.state).then(setEditFolderAvailableCounties).catch(() => setEditFolderAvailableCounties([]));
                                    } else {
                                        setEditFolderAvailableCounties([]);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a US State..." autoFocus className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                            <Autocomplete
                                options={editFolderAvailableCounties}
                                getOptionLabel={(option) => option}
                                value={editFolderCounty}
                                onChange={(_, newValue) => setEditFolderCounty(newValue)}
                                disabled={!editFolderState}
                                renderInput={(params) => (
                                    <TextField {...params} variant="outlined" placeholder="Select a County (Optional)" className="bg-white dark:bg-slate-800 rounded-lg" />
                                )}
                                fullWidth
                                disablePortal
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => setEditModalOpen(false)} className="text-slate-500 font-bold capitalize">Cancel</Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            className="font-bold capitalize shadow-none rounded-lg"
                            onClick={handleEditFolderSave}
                            disabled={editFolderType === 'custom' ? !editFolderName : !editFolderState}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Dialog>

            <PropertyPreviewDrawer
                open={!!previewPropertyId}
                propertyId={previewPropertyId}
                onClose={() => setPreviewPropertyId(null)}
                basePath="/client"
            />

            {/* Move Property Dialog */}
            <Dialog open={!!movingPropertyId} onClose={() => setMovingPropertyId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold mb-4 text-slate-800 dark:text-white">Move Property to Folder</Typography>
                <Typography variant="body2" className="text-slate-500 mb-4">Select the destination folder for this property.</Typography>
                <TextField
                    select
                    SelectProps={{ native: true }}
                    fullWidth
                    size="small"
                    value={moveTargetListId}
                    onChange={(e) => setMoveTargetListId(e.target.value)}
                >
                    <option value="" disabled>-- Select a Folder --</option>
                    {lists.filter(l => l.id !== selectedListId).map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </TextField>
                <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={() => setMovingPropertyId(null)} color="inherit">Cancel</Button>
                    <Button onClick={handleMoveProperty} variant="contained" color="primary" disabled={!moveTargetListId}>Move Property</Button>
                </div>
            </Dialog>

            {/* Create Task Dialog */}
            <Dialog open={!!taskProperty} onClose={() => setTaskProperty(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold mb-1 text-slate-800 dark:text-white">Create Field Task</Typography>
                <Typography variant="body2" className="text-slate-500 mb-4 text-xs">{taskProperty?.address || taskProperty?.parcel_id}</Typography>
                <div className="space-y-3">
                    <TextField label="Task Title" size="small" fullWidth value={taskForm.title} onChange={e => setTaskForm(p => ({...p, title: e.target.value}))} />
                    <TextField label="Description (what the realtor needs to do)" size="small" fullWidth multiline rows={2} value={taskForm.description} onChange={e => setTaskForm(p => ({...p, description: e.target.value}))} />
                    <div className="flex gap-3">
                        <TextField label="Min Photos" type="number" size="small" fullWidth value={taskForm.min_photos} onChange={e => setTaskForm(p => ({...p, min_photos: Math.max(3, Math.min(10, parseInt(e.target.value)||3))}))} inputProps={{min:3,max:10}} />
                        <TextField label="Max Photos" type="number" size="small" fullWidth value={taskForm.max_photos} onChange={e => setTaskForm(p => ({...p, max_photos: Math.max(taskForm.min_photos, Math.min(10, parseInt(e.target.value)||10))}))} inputProps={{min:3,max:10}} />
                    </div>
                    <TextField label="Task Reward ($ USD)" type="number" size="small" fullWidth value={taskForm.reward_usd} onChange={e => setTaskForm(p => ({...p, reward_usd: Math.max(7.5, parseFloat(e.target.value)||7.5)}))} inputProps={{min:7.5,step:1}} />
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
                        This is the amount that will be charged to your wallet for the task completion.
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <Button onClick={() => setTaskProperty(null)} color="inherit">Cancel</Button>
                    <Button
                        variant="contained" color="primary"
                        disabled={taskSubmitting || !taskForm.title}
                        onClick={async () => {
                            setTaskSubmitting(true);
                            try {
                                // 1. Initiate Checkout
                                const checkoutRes = await api.post('/billing/checkout-task', { amount_usd: taskForm.reward_usd, property_id: taskProperty.id });
                                alert(checkoutRes.data.message + "\n\n(Mock Mode: Simulating successful payment...)");
                                
                                // 2. Simulate Webhook Success
                                await api.post('/billing/mock-webhook-action', { action_type: 'task', property_id: taskProperty.id });

                                // 3. Create the Task
                                const calculatedRewardPoints = Math.round((taskForm.reward_usd * 0.70) * 100);
                                await InvestorTaskService.createTask({ property_id: taskProperty.id, ...taskForm, reward_points: calculatedRewardPoints });
                                
                                setTaskProperty(null);
                                alert('✅ Task created and payment successful! Realtors can now claim it.');
                            } catch(e:any) { 
                                // Catch specific permission errors from the interceptor/API
                                alert(e.response?.data?.detail || e.message || "Failed to process task checkout."); 
                            }
                            finally { setTaskSubmitting(false); }
                        }}
                    >
                        {taskSubmitting ? 'Processing Payment…' : 'Pay & Create Task'}
                    </Button>
                </div>
            </Dialog>

            {/* Export Property Dialog */}
            <Dialog open={!!exportProperty} onClose={() => setExportProperty(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold mb-1 text-slate-800 dark:text-white">Export to Realtors</Typography>
                <Typography variant="body2" className="text-slate-500 mb-4 text-xs">{exportProperty?.address || exportProperty?.parcel_id}</Typography>
                <div className="space-y-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        📤 Realtors will see this property in their listings and can contact you for commission negotiations.
                    </div>
                    <TextField label="Your Name (visible to realtors)" size="small" fullWidth value={exportForm.contact_name} onChange={e => setExportForm(p => ({...p, contact_name: e.target.value}))} />
                    <TextField label="Contact Phone" size="small" fullWidth value={exportForm.contact_phone} onChange={e => setExportForm(p => ({...p, contact_phone: e.target.value}))} />
                    <TextField label="Contact Email" size="small" fullWidth value={exportForm.contact_email} onChange={e => setExportForm(p => ({...p, contact_email: e.target.value}))} />
                    <TextField label="Requested Sale Price (Target)" type="number" size="small" fullWidth value={exportForm.requested_sale_price} onChange={e => setExportForm(p => ({...p, requested_sale_price: e.target.value}))} />
                    <TextField label="Additional Notes (optional)" size="small" fullWidth multiline rows={2} value={exportForm.notes} onChange={e => setExportForm(p => ({...p, notes: e.target.value}))} />
                </div>
                <div className="flex gap-2 mt-4">
                    <Button onClick={() => setExportProperty(null)} color="inherit">Cancel</Button>
                    <Button
                        variant="contained" color="success"
                        disabled={exportSubmitting}
                        onClick={async () => {
                            setExportSubmitting(true);
                            try {
                                const payload = { 
                                    property_id: exportProperty.id, 
                                    ...exportForm,
                                    requested_sale_price: exportForm.requested_sale_price ? parseFloat(exportForm.requested_sale_price) : undefined
                                };
                                await InvestorTaskService.exportProperty(payload);
                                setExportProperty(null);
                                alert('✅ Property exported! Realtors can now see it in their listings.');
                            } catch(e:any) { alert(e.message); }
                            finally { setExportSubmitting(false); }
                        }}
                    >
                        {exportSubmitting ? 'Exporting…' : 'Export Property'}
                    </Button>
                </div>
            </Dialog>
        </div>
    );
};

export default ClientLists;
