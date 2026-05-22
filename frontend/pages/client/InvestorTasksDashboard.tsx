import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle, MapPin, Activity, ShieldCheck, Layers } from 'lucide-react';
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
        if (currentUser?.subscription_tier === 'trial') {
            navigate('/client/trial-limit?feature=tasks', { replace: true });
            return;
        }

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
            case 'open': 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" /> Open
                    </span>
                );
            case 'pending_payment': 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Pending Escrow
                    </span>
                );
            case 'claimed': 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" /> Claimed
                    </span>
                );
            case 'submitted': 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse animate-[ping_1.5s_infinite]" /> Review Ready
                    </span>
                );
            case 'approved': 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Approved
                    </span>
                );
            case 'disputed': 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" /> Disputed (Admin)
                    </span>
                );
            default: 
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        {status}
                    </span>
                );
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#0D8BFF] animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing Operational Command Telemetry...</p>
        </div>
    );

    return (
        <div id="tour-missions-dashboard" className="min-h-screen bg-[#0B0F17] text-slate-100 p-4 md:p-8 h-full overflow-y-auto w-full scrollbar-thin">
            {showSuccessToast && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-xl animate-fade-in">
                    <div className="flex items-center gap-3 text-emerald-300">
                        <CheckCircle className="text-emerald-400 shrink-0" size={24} />
                        <div>
                            <p className="font-black text-sm uppercase tracking-wide">Escrow Payment Confirmed!</p>
                            <p className="text-xs text-emerald-400/90 mt-0.5">Your BPO Due Diligence mission has been successfully published to the Realtor Marketplace.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowSuccessToast(false)} 
                        className="text-emerald-400 hover:text-emerald-200 p-1.5 rounded-full hover:bg-emerald-500/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px] block">close</span>
                    </button>
                </div>
            )}
            
            {onBack && (
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#0D8BFF] transition-all"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to lists
                </button>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-[#13B8B5] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#13B8B5]">System: Field Intelligence</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Operational Command</h1>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                        Transform fragmented county workflows into scalable acquisition infrastructure.
                    </p>
                </div>
                <button
                    onClick={() => startTour('bpo_missions')}
                    className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 animate-pulse shrink-0 self-start md:self-center"
                >
                    <span className="material-symbols-outlined text-[16px] block">menu_book</span>
                    Launch Page Tour
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Task List */}
                <div id="tour-missions-grid" className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Mission Telemetry</span>
                        <span className="text-[10px] font-mono text-[#0D8BFF]">{tasks.length} LOGS RECORDED</span>
                    </div>
                    {tasks.length === 0 ? (
                        <div className="border border-slate-800 bg-[#131926]/20 p-6 text-center text-slate-500 rounded-xl font-mono text-xs">
                            [NO CREATED MISSION INTEL RECORDED]
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => loadSubmissions(task)}
                                className={`group p-4 rounded-xl cursor-pointer transition-all border relative overflow-hidden bg-[#131926]/40 backdrop-blur-sm ${
                                    selectedTask?.id === task.id 
                                        ? 'border-[#0D8BFF] shadow-[0_0_20px_rgba(13,139,255,0.15)] bg-[#131926]/80' 
                                        : 'border-slate-800/80 hover:border-[#0D8BFF]/40 hover:bg-[#131926]/60'
                                }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0D8BFF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="flex justify-between items-start gap-2 mb-3">
                                    <h3 className="font-black text-sm text-slate-100 uppercase tracking-tight truncate max-w-[150px] md:max-w-none">
                                        {task.title}
                                    </h3>
                                    {renderStatusBadge(task.status)}
                                </div>
                                <p className="text-xs text-slate-400 mb-4 truncate font-mono">{task.address}</p>
                                <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-[10px] font-mono text-slate-400">
                                    <span className="flex items-center gap-1 text-slate-500">
                                        <Clock size={12}/> {new Date(task.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1 text-[#13B8B5] font-black">
                                        <CheckCircle size={12}/> ${(task.reward_points / 100).toFixed(2)} ESCROW
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Task Details & Review Panel */}
                <div className="lg:col-span-2">
                    {selectedTask ? (
                        <div className="border border-slate-800 bg-[#131926]/50 backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0D8BFF] via-[#13B8B5] to-indigo-600" />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
                                <div>
                                    <span className="text-[10px] font-mono text-[#0D8BFF] uppercase tracking-widest block mb-1">Mission Dossier Details</span>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedTask.title}</h2>
                                    <p className="text-sm text-slate-400 font-mono mt-1">{selectedTask.address}</p>
                                </div>
                                <div className="self-start sm:self-center shrink-0">
                                    {renderStatusBadge(selectedTask.status)}
                                </div>
                            </div>

                            {submissions.length > 0 && (
                                <div className="space-y-8">
                                    {submissions.map((sub, idx) => (
                                        <div key={idx} className="border border-slate-800 bg-[#0B0F17]/80 rounded-xl overflow-hidden shadow-lg">
                                            <div id="tour-missions-verification-check" className="bg-[#131926]/80 p-4 border-b border-slate-800 flex flex-wrap gap-4 justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-black text-sm text-slate-100 uppercase tracking-wider">
                                                        Agent: {sub.realtor_name}
                                                    </h3>
                                                    {sub.review_status === 'pending' && (
                                                        <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                                                            Pending Audit
                                                        </span>
                                                    )}
                                                    {sub.review_status === 'approved' && (
                                                        <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                                                            Authorized
                                                        </span>
                                                    )}
                                                    {sub.review_status === 'rejected' && (
                                                        <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                                                            Rejected
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {sub.geo_validated ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
                                                        <MapPin size={12}/> GPS Validated ({sub.distance_meters}m)
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded">
                                                        <AlertTriangle size={12}/> GPS Mismatch ({sub.distance_meters}m)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-4 space-y-6">
                                                
                                                {/* Geospatial Audit & Telemetry Visualizer */}
                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 bg-[#131926]/40 p-5 border border-slate-800/80 rounded-xl relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-10 pointer-events-none" />
                                                    
                                                    {/* SVG Radar Sweep */}
                                                    <div className="md:col-span-2 flex items-center justify-center bg-[#0B0F17]/80 rounded-lg p-4 border border-slate-800 relative">
                                                        {(() => {
                                                            const isOk = sub.geo_validated;
                                                            const dist = sub.distance_meters || 0;
                                                            // map distance to pixel offset (scale: max 75px at center (150, 150))
                                                            const offset = Math.min(75, 15 + (dist / 8));
                                                            // plot coordinate offset (angle 45 deg)
                                                            const angle = Math.PI / 4;
                                                            const ptX = 150 + offset * Math.cos(angle);
                                                            const ptY = 150 - offset * Math.sin(angle);
                                                            
                                                            return (
                                                                <svg width="100%" height="200" viewBox="0 0 300 300" className="max-w-[200px] w-full">
                                                                    <defs>
                                                                        <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                                                                            <stop offset="0%" stopColor="#0D8BFF" stopOpacity="0.15" />
                                                                            <stop offset="100%" stopColor="#0D8BFF" stopOpacity="0" />
                                                                        </radialGradient>
                                                                    </defs>
                                                                    <style>{`
                                                                        @keyframes radar-sweep {
                                                                            from { transform: rotate(0deg); }
                                                                            to { transform: rotate(360deg); }
                                                                        }
                                                                    `}</style>
                                                                    
                                                                    {/* Background Radar concentric rings */}
                                                                    <circle cx="150" cy="150" r="140" fill="url(#radar-glow)" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
                                                                    <circle cx="150" cy="150" r="105" fill="none" stroke="#1E293B" strokeWidth="1" />
                                                                    <circle cx="150" cy="150" r="70" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,3" />
                                                                    <circle cx="150" cy="150" r="35" fill="none" stroke="#1E293B" strokeWidth="1" />
                                                                    
                                                                    {/* Crosshair grid lines */}
                                                                    <line x1="10" y1="150" x2="290" y2="150" stroke="#1E293B" strokeWidth="1" />
                                                                    <line x1="150" y1="10" x2="150" y2="290" stroke="#1E293B" strokeWidth="1" />
                                                                    
                                                                    {/* Rotating radar sweep */}
                                                                    <g transform="translate(150,150)">
                                                                        <line x1="0" y1="0" x2="140" y2="0" stroke={isOk ? "#13B8B5" : "#EF4444"} strokeWidth="1.5" strokeOpacity="0.4" style={{ transformOrigin: "0px 0px", animation: "radar-sweep 8s linear infinite" }} />
                                                                    </g>
                                                                    
                                                                    {/* Threshold Rings */}
                                                                    <circle cx="150" cy="150" r="50" fill="none" stroke="#13B8B5" strokeWidth="1" strokeOpacity="0.25" />
                                                                    
                                                                    {/* Vector line connecting Target and Submission */}
                                                                    <line x1="150" y1="150" x2={ptX} y2={ptY} stroke={isOk ? "#13B8B5" : "#EF4444"} strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                                                                    
                                                                    {/* Official target point (Center) */}
                                                                    <g>
                                                                        <circle cx="150" cy="150" r="8" fill="#0D8BFF" fillOpacity="0.2" />
                                                                        <circle cx="150" cy="150" r="4" fill="#0D8BFF" />
                                                                        <circle cx="150" cy="150" r="1" fill="#FFFFFF" />
                                                                    </g>
                                                                    
                                                                    {/* Realtor submitted point */}
                                                                    <g>
                                                                        <circle cx={ptX} cy={ptY} r="8" fill={isOk ? "#13B8B5" : "#EF4444"} fillOpacity="0.3" className="animate-ping" style={{ animationDuration: '3s' }} />
                                                                        <circle cx={ptX} cy={ptY} r="4.5" fill={isOk ? "#13B8B5" : "#EF4444"} />
                                                                        <circle cx={ptX} cy={ptY} r="1.5" fill="#FFFFFF" />
                                                                    </g>
                                                                </svg>
                                                            );
                                                        })()}
                                                    </div>
                                                    
                                                    {/* Telemetry Stats Details */}
                                                    <div className="md:col-span-3 flex flex-col justify-between space-y-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="h-2.5 w-2.5 rounded-full bg-[#0D8BFF] animate-pulse" />
                                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Geospatial Intelligence</h4>
                                                            </div>
                                                            <p className="text-lg font-black text-slate-100 uppercase tracking-tight">
                                                                {sub.geo_validated ? "GPS Verification Secure" : "GPS Validation Warning"}
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                                Comparing mobile coordinate telemetry submitted by the agent against the county register parcel geometry.
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-3 bg-[#0B0F17]/60 p-3 rounded-lg border border-slate-800">
                                                            <div>
                                                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Offset Vector</span>
                                                                <span className={`text-sm font-black ${sub.geo_validated ? 'text-[#13B8B5]' : 'text-rose-400'}`}>
                                                                    {sub.distance_meters.toFixed(1)}m
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Zone Status</span>
                                                                <span className={`text-sm font-black uppercase ${sub.geo_validated ? 'text-[#13B8B5]' : 'text-rose-400'}`}>
                                                                    {sub.geo_validated ? "IN RANGE" : "OUT OF BOUNDS"}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-2 border-t border-slate-800/80 pt-2 mt-1">
                                                                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Target Acquisition</span>
                                                                <span className="text-[10px] text-slate-300 font-mono block truncate">
                                                                    LAT {selectedTask.latitude || '29.4241'} • LON {selectedTask.longitude || '-98.4936'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Photos */}
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <FileText size={14}/> Evidence Photos Vault
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-3">
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
                                                                        className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-800 bg-[#0B0F17] aspect-[4/3] flex items-center justify-center"
                                                                    >
                                                                        <img 
                                                                            src={fullUrl} 
                                                                            alt="Evidence" 
                                                                            className="w-full h-full object-cover hover:scale-105 hover:opacity-85 transition-all duration-500 bg-slate-900"
                                                                            onError={(e) => {
                                                                                e.currentTarget.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231e293b'%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";
                                                                                e.currentTarget.className = "w-full h-full object-contain p-4 opacity-30";
                                                                            }}
                                                                        />
                                                                        {/* HUD corners */}
                                                                        <div className="absolute top-2 left-2 text-[8px] font-mono text-slate-500 bg-[#0B0F17]/75 px-1 py-0.5 rounded border border-slate-800">
                                                                            CAM-0{i+1}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* Checklist */}
                                                {sub.checklist_responses && (
                                                    <div id="tour-missions-checklist-review" className="space-y-4">
                                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <CheckCircle size={14}/> Operational Systems Checklist
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {Object.entries(JSON.parse(sub.checklist_responses)).map(([catId, items]: [string, any]) => (
                                                                <div key={catId} className="bg-[#131926]/40 p-4 rounded-xl border border-slate-800/80 backdrop-blur-md">
                                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                                                                        {catId.replace(/_/g, ' ')}
                                                                    </h5>
                                                                    <div className="space-y-3.5">
                                                                        {Object.entries(items).map(([itemId, response]: [string, any]) => {
                                                                            const isObject = typeof response === 'object' && response !== null;
                                                                            const value = isObject ? response.value : response;
                                                                            const note = isObject ? response.note : '';
                                                                            
                                                                            return (
                                                                                <div key={itemId} className="flex flex-col gap-1.5">
                                                                                    <div className="flex items-start justify-between gap-4">
                                                                                        <span className="text-xs font-bold text-slate-300 leading-tight uppercase tracking-wide">
                                                                                            {itemId.replace(/_/g, ' ')}
                                                                                        </span>
                                                                                        {value === true ? (
                                                                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm">Yes</span>
                                                                                        ) : value === false ? (
                                                                                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm">No</span>
                                                                                        ) : (
                                                                                            <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded text-[10px] font-bold shrink-0">N/A</span>
                                                                                        )}
                                                                                    </div>
                                                                                    {note && (
                                                                                        <div className="text-xs text-slate-300 bg-[#0B0F17]/60 p-2.5 rounded-lg border border-slate-800 mt-1 font-mono leading-relaxed relative">
                                                                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                                                                                                [SECURE LOG ENTRY: COMMENTS]
                                                                                            </span>
                                                                                            {note}
                                                                                        </div>
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
                                                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
                                                        <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                                                            [AUDITOR DEVIATION FEEDBACK]
                                                        </h5>
                                                        <p className="text-xs text-rose-300/90 italic font-mono leading-relaxed">
                                                            "{sub.review_notes}"
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Review Action Form (Only active on latest submission if pending) */}
                                                {idx === 0 && sub.review_status === 'pending' && selectedTask.status === 'submitted' && (
                                                    <div className="bg-[#131926]/40 p-4 rounded-xl border border-slate-800/80 backdrop-blur-md">
                                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Due Diligence Review Decisions</h4>
                                                        <textarea 
                                                            value={reviewNotes} 
                                                            onChange={e => setReviewNotes(e.target.value)}
                                                            placeholder="Provide structural deviation details or verification arguments..."
                                                            className="w-full p-3 rounded-lg border border-slate-800 bg-[#0B0F17]/85 text-slate-100 placeholder-slate-500 focus:border-[#0D8BFF]/50 focus:ring-1 focus:ring-[#0D8BFF]/50 transition-all duration-300 mb-4 text-xs font-mono"
                                                            rows={3}
                                                        />
                                                        
                                                        {selectedTask.rejections_count > 0 && (
                                                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2 font-mono">
                                                                <AlertTriangle size={16} className="shrink-0" />
                                                                <span>
                                                                    WARNING: Mission rejected {selectedTask.rejections_count} times previously. Additional rejection triggers escalation protocol (Admin Mediation).
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <button 
                                                                onClick={() => handleReview(true)}
                                                                disabled={isReviewing}
                                                                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-[#13B8B5] hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_15px_rgba(19,184,181,0.3)]"
                                                            >
                                                                <CheckCircle size={14}/> Approve & Authorize Payout
                                                            </button>
                                                            <button 
                                                                onClick={() => handleReview(false)}
                                                                disabled={isReviewing}
                                                                className="flex-1 py-3 bg-gradient-to-r from-rose-700 to-rose-600 hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                                            >
                                                                <XCircle size={14}/> Reject Intel Submission
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
                                <div className="py-16 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl bg-[#0B0F17]/50">
                                    <Clock size={40} className="text-[#0D8BFF]/45 mx-auto mb-4 animate-pulse" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-300">
                                        Waiting for Field Agent Claim
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">
                                        Mission active on public GoAuct realtor marketplace.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-[500px] flex flex-col items-center justify-center border border-slate-800/80 bg-[#131926]/40 backdrop-blur-md rounded-2xl p-8 text-center relative overflow-hidden">
                            {/* Decorative Blueprint SVG Grid Background */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-10 pointer-events-none" />
                            
                            {/* Target/Radar animation icon */}
                            <div className="w-24 h-24 rounded-full border border-[#0D8BFF]/30 flex items-center justify-center mb-6 relative bg-[#0B0F17]/50">
                                <div className="absolute inset-2 rounded-full border border-dashed border-[#13B8B5]/40 animate-[spin_10s_linear_infinite]" />
                                <div className="absolute inset-4 rounded-full bg-[#0D8BFF]/5 animate-ping" />
                                <MapPin className="text-[#0D8BFF] animate-pulse" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200 mb-2 tracking-wide uppercase">Operational Intel Dossier</h3>
                            <p className="text-slate-400 max-w-md text-sm leading-relaxed">
                                Select an acquisition mission from the telemetry logs to inspect physical verification data, audit checklist responses, and authorize escrow payouts.
                            </p>
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
