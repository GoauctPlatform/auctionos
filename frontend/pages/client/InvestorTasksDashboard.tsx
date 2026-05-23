import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../../services/httpClient';
import { PhotoViewerLightbox } from '../../components/PhotoViewerLightbox';
import { useTour } from '../../context/TourContext';
import { AuthService } from '../../services/auth.service';

interface InvestorTasksDashboardProps {
    onBack?: () => void;
}

export const InvestorTasksDashboard: React.FC<InvestorTasksDashboardProps> = ({ onBack }) => {
    const navigate = useNavigate();
    const { startTour } = useTour();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();

        fetchTasks();
        
        const hashParts = window.location.href.split('?');
        const urlParams = new URLSearchParams(hashParts[1] || '');
        const payment = urlParams.get('payment');
        const sessionId = urlParams.get('session_id');

        if (payment === 'success' && sessionId) {
            confirmPayment(sessionId);
        }
    }, []);

    const confirmPayment = async (sessionId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/investor/tasks/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ session_id: sessionId })
            });
            if (res.ok) {
                setShowSuccessToast(true);
                fetchTasks();
            }
        } catch (err) {
            console.error("Failed to confirm BPO payment:", err);
        } finally {
            const cleanUrl = window.location.href.split('?')[0];
            window.history.replaceState({}, document.title, cleanUrl);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/investor/tasks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissions = async (task: any) => {
        setSelectedTask(task);
        setSubmissions([]);
        if (task.status !== 'submitted' && task.status !== 'approved' && task.status !== 'disputed') return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/investor/tasks/${task.id}/submissions`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReview = async (approved: boolean) => {
        if (!approved && !reviewNotes.trim()) {
            alert('Rejection reason is required.');
            return;
        }

        setIsReviewing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/investor/tasks/${selectedTask.id}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ approved, review_notes: reviewNotes })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.review_status.includes('disputed')) {
                    alert('Task was rejected twice. It has been escalated to Support for mediation.');
                } else {
                    alert(`Task ${approved ? 'Approved' : 'Rejected'} successfully!`);
                }
                setSelectedTask(null);
                setReviewNotes('');
                fetchTasks();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (err) {
            console.error(err);
            alert('Review failed.');
        } finally {
            setIsReviewing(false);
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">Open</span>;
            case 'pending_payment': return <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded text-xs font-bold uppercase">Pending Escrow</span>;
            case 'claimed': return <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-bold uppercase">Claimed</span>;
            case 'submitted': return <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs font-bold uppercase">Review Ready</span>;
            case 'approved': return <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-bold uppercase">Approved</span>;
            case 'disputed': return <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold uppercase">Disputed (Admin)</span>;
            default: return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">{status}</span>;
        }
    };

    const currentUser = AuthService.getCurrentUser();
    if (currentUser?.subscription_tier === 'trial') {
        return (
            <div className="flex flex-col items-center justify-center p-8 py-16 text-center max-w-lg mx-auto size-full min-h-[60vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl backdrop-blur-md">
                <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-amber-500 animate-bounce">lock</span>
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-extrabold uppercase tracking-widest mb-3 border border-amber-500/20">
                    Premium Feature Locked
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    Field Missions (BPO)
                </h3>
                <p className="text-slate-650 dark:text-slate-400 text-sm leading-relaxed mb-8 font-medium">
                    Your current account is in **Trial Mode**. Publishing BPO (Broker Price Opinion) tasks, skip tracing vacancy runners, and real-time field tasks mapping are restricted to **Pro** and **Enterprise** subscribers.
                </p>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-workbench-widget', { detail: { widgetId: 'billings_and_plans' } }));
                    }}
                    className="w-full max-w-xs py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                >
                    Upgrade Plan Now
                </button>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center">Loading your BPO Missions...</div>;

    return (
        <div id="tour-missions-dashboard" className="max-w-7xl mx-auto px-4 py-8 h-full overflow-y-auto w-full scrollbar-thin">
            {showSuccessToast && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-xl animate-fade-in">
                    <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0" size={24} />
                        <div>
                            <p className="font-bold text-sm">Escrow Payment Confirmed!</p>
                            <p className="text-xs opacity-90">Your BPO Due Diligence mission has been successfully published to the Realtor Marketplace.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowSuccessToast(false)} 
                        className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 p-1 rounded-full hover:bg-emerald-100/50"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
            )}
            {onBack && (
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to folders
                </button>
            )}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Field Missions</h1>
                    <p className="text-slate-500">Track and review BPO Due Diligence requests.</p>
                </div>
                <button
                    onClick={() => startTour('bpo_missions')}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-lg transition-all shadow-sm bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse"
                >
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    Page Tour
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Task List */}
                <div id="tour-missions-grid" className="lg:col-span-1 space-y-4">
                    {tasks.length === 0 ? (
                        <div className="glass-card p-6 text-center text-slate-500 rounded-xl">No missions created yet.</div>
                    ) : (
                        tasks.map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => loadSubmissions(task)}
                                className={`glass-card p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedTask?.id === task.id ? 'border-indigo-500' : 'border-transparent hover:border-indigo-200'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{task.title}</h3>
                                    {renderStatusBadge(task.status)}
                                </div>
                                <p className="text-xs text-slate-500 mb-2 truncate">{task.address}</p>
                                <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    <span className="flex items-center gap-1"><Clock size={14}/> {new Date(task.created_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={14}/> ${(task.reward_points / 100).toFixed(2)} Escrow</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Task Details & Review Panel */}
                <div className="lg:col-span-2">
                    {selectedTask ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTask.title}</h2>
                                    <p className="text-slate-500">{selectedTask.address}</p>
                                </div>
                                {renderStatusBadge(selectedTask.status)}
                            </div>

                            {submissions.length > 0 && (
                                <div className="space-y-8">
                                    {submissions.map((sub, idx) => (
                                        <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                            <div id="tour-missions-verification-check" className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-bold text-slate-800 dark:text-white">Submission by {sub.realtor_name}</h3>
                                                    {sub.review_status === 'pending' && (
                                                        <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-md">
                                                            Pending Review
                                                        </span>
                                                    )}
                                                    {sub.review_status === 'approved' && (
                                                        <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-md">
                                                            Approved
                                                        </span>
                                                    )}
                                                    {sub.review_status === 'rejected' && (
                                                        <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 rounded-md">
                                                            Rejected
                                                        </span>
                                                    )}
                                                </div>
                                                {sub.geo_validated ? (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                                                        <MapPin size={12}/> GPS Validated ({sub.distance_meters}m)
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                                                        <AlertTriangle size={12}/> GPS Mismatch ({sub.distance_meters}m)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-4 space-y-6">
                                                {/* Photos */}
                                                <div>
                                                    <h4 className="font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-white"><FileText size={16}/> Evidence Photos</h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(() => {
                                                            const allImages = sub.file_path?.split(',').map((url: string) => url.startsWith('http') ? url : `${API_BASE_URL}${url}`) || [];
                                                            return allImages.map((fullUrl: string, i: number) => {
                                                                return (
                                                                    <div 
                                                                        key={i} 
                                                                        onClick={() => {
                                                                            setLightboxImages(allImages);
                                                                            setLightboxInitialIndex(i);
                                                                            setLightboxOpen(true);
                                                                        }}
                                                                        className="cursor-pointer group relative overflow-hidden rounded-lg"
                                                                    >
                                                                        <img 
                                                                            src={fullUrl} 
                                                                            alt="Evidence" 
                                                                            className="w-full h-24 object-cover rounded-lg hover:scale-105 hover:opacity-80 transition-all duration-300 bg-slate-100 dark:bg-slate-800"
                                                                            onError={(e) => {
                                                                                e.currentTarget.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";
                                                                                e.currentTarget.className = "w-full h-24 object-contain p-4 bg-slate-100 dark:bg-slate-800 rounded-lg opacity-50";
                                                                            }}
                                                                        />
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Checklist */}
                                                {sub.checklist_responses && (
                                                    <div id="tour-missions-checklist-review" className="space-y-4">
                                                        <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-white"><CheckCircle size={16}/> Checklist Responses</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {Object.entries(JSON.parse(sub.checklist_responses)).map(([catId, items]: [string, any]) => (
                                                                <div key={catId} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                                                                        {catId.replace(/_/g, ' ')}
                                                                    </h5>
                                                                    <div className="space-y-3">
                                                                        {Object.entries(items).map(([itemId, response]: [string, any]) => {
                                                                            const isObject = typeof response === 'object' && response !== null;
                                                                            const value = isObject ? response.value : response;
                                                                            const note = isObject ? response.note : '';
                                                                            
                                                                            return (
                                                                                <div key={itemId} className="flex flex-col gap-1.5">
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
                                                                                            {itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                                        </span>
                                                                                        {value === true ? (
                                                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded text-xs font-bold shrink-0 shadow-sm">Yes</span>
                                                                                        ) : value === false ? (
                                                                                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded text-xs font-bold shrink-0 shadow-sm">No</span>
                                                                                        ) : (
                                                                                            <span className="px-2 py-0.5 bg-slate-200 text-slate-500 dark:bg-slate-700 rounded text-xs font-bold shrink-0">N/A</span>
                                                                                        )}
                                                                                    </div>
                                                                                    {note && (
                                                                                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
                                                                                            <span className="font-bold block mb-0.5 text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">Comments</span>
                                                                                            {note}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rejection comments for historical items */}
                                                {sub.review_status === 'rejected' && sub.review_notes && (
                                                    <div className="p-4 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-1">
                                                        <h5 className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">
                                                            Investor Rejection Feedback
                                                        </h5>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                                                            "{sub.review_notes}"
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Review Action Form (Only active on latest submission if pending) */}
                                                {idx === 0 && sub.review_status === 'pending' && selectedTask.status === 'submitted' && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                        <h4 className="font-bold mb-2 text-slate-800 dark:text-white">Review Decision</h4>
                                                        <textarea 
                                                            value={reviewNotes} 
                                                            onChange={e => setReviewNotes(e.target.value)}
                                                            placeholder="Provide a reason if rejecting..."
                                                            className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mb-4"
                                                            rows={3}
                                                        />
                                                        
                                                        {selectedTask.rejections_count > 0 && (
                                                            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                                                                <AlertTriangle size={16} />
                                                                Warning: This task has already been rejected {selectedTask.rejections_count} times. Another rejection will escalate it to Admin Mediation.
                                                            </div>
                                                        )}

                                                        <div className="flex gap-4">
                                                            <button 
                                                                onClick={() => handleReview(true)}
                                                                disabled={isReviewing}
                                                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                                                            >
                                                                <CheckCircle size={18}/> Approve & Pay Escrow
                                                            </button>
                                                            <button 
                                                                onClick={() => handleReview(false)}
                                                                disabled={isReviewing}
                                                                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                                                            >
                                                                <XCircle size={18}/> Reject Submission
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedTask.status === 'open' && (
                                <div className="py-12 text-center text-slate-500">
                                    <div className="animate-pulse mb-4 flex justify-center"><Clock size={40} className="text-slate-300" /></div>
                                    Waiting for a Field Agent to claim this mission...
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                            Select a mission from the list to view details and review submissions.
                        </div>
                    )}
                </div>
            </div>
            <PhotoViewerLightbox 
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                images={lightboxImages}
                initialIndex={lightboxInitialIndex}
            />
        </div>
    );
};
