import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../../services/httpClient';

interface InvestorTasksDashboardProps {
    onBack?: () => void;
}

export const InvestorTasksDashboard: React.FC<InvestorTasksDashboardProps> = ({ onBack }) => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
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

    if (loading) return <div className="p-8 text-center">Loading your BPO Missions...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Task List */}
                <div className="lg:col-span-1 space-y-4">
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

                            {selectedTask.status === 'submitted' && submissions.length > 0 && (
                                <div className="space-y-8">
                                    {submissions.map((sub, idx) => (
                                        <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                            <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                <h3 className="font-bold">Submission by {sub.realtor_name}</h3>
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
                                                    <h4 className="font-bold mb-3 flex items-center gap-2"><FileText size={16}/> Evidence Photos</h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {sub.file_path?.split(',').map((url: string, i: number) => {
                                                            const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
                                                            return (
                                                                <a href={fullUrl} target="_blank" rel="noreferrer" key={i}>
                                                                    <img src={fullUrl} alt="Evidence" className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity" />
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Checklist */}
                                                {sub.checklist_responses && (
                                                    <div>
                                                        <h4 className="font-bold mb-3 flex items-center gap-2"><CheckCircle size={16}/> Checklist Responses</h4>
                                                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-xs overflow-auto">
                                                            {JSON.stringify(JSON.parse(sub.checklist_responses), null, 2)}
                                                        </pre>
                                                    </div>
                                                )}

                                                {/* Review Action Form */}
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <h4 className="font-bold mb-2">Review Decision</h4>
                                                    <textarea 
                                                        value={reviewNotes} 
                                                        onChange={e => setReviewNotes(e.target.value)}
                                                        placeholder="Provide a reason if rejecting..."
                                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 mb-4"
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
        </div>
    );
};
