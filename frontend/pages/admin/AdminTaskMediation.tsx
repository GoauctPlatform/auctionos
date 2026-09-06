import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../services/httpClient';
import { ShieldAlert, CheckCircle, XCircle, Clock, MapPin, Search } from 'lucide-react';
import { PhotoViewerLightbox } from '../../components/PhotoViewerLightbox';
import { useLanguage } from "../../context/LanguageContext";

export const AdminTaskMediation: React.FC = () => {
    const { t } = useLanguage();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'open' | 'resolved'>('open');
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [taskDetails, setTaskDetails] = useState<any>(null);
    const [resolving, setResolving] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        fetchDisputedTickets(statusFilter);
    }, [statusFilter]);

    const fetchDisputedTickets = async (status: 'open' | 'resolved') => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/support-tickets?status=${status}&type=task_conflict`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            } else {
                setTickets([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTicket = async (ticket: any) => {
        setSelectedTicket(ticket);
        setTaskDetails(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/realtor-tasks/${ticket.task_id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTaskDetails(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleResolve = async (decision: 'approve_realtor' | 'refund_investor') => {
        if (!resolutionNotes) return alert('Resolution notes are required.');
        setResolving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/support-tickets/${selectedTicket.id}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ decision, notes: resolutionNotes })
            });

            if (res.ok) {
                alert(`Mediation concluded: ${decision}`);
                setSelectedTicket(null);
                setResolutionNotes('');
                fetchDisputedTickets(statusFilter);
            } else {
                alert('Failed to resolve mediation.');
            }
        } catch (error) {
            console.error(error);
            alert('Error during mediation resolution.');
        } finally {
            setResolving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-medium">{t('AdminTaskMediation.loadingMediationQueu')}</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldAlert className="text-rose-500" size={32} />
                        {t('AdminTaskMediation.disputeMediationCent')}</h1>
                    <p className="text-slate-500 mt-1">{t('AdminTaskMediation.reviewDoubleRejected')}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
                <button
                    onClick={() => {
                        setStatusFilter('open');
                        setSelectedTicket(null);
                    }}
                    className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${statusFilter === 'open' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t('AdminTaskMediation.activeDisputes')}</button>
                <button
                    onClick={() => {
                        setStatusFilter('resolved');
                        setSelectedTicket(null);
                    }}
                    className={`pb-3 px-4 font-bold text-sm border-b-2 transition-colors ${statusFilter === 'resolved' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t('AdminTaskMediation.resolvedHistory')}</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Tickets List */}
                <div className="lg:col-span-1 space-y-4">
                    {tickets.length === 0 ? (
                        <div className="glass-card p-12 text-center text-slate-500 rounded-2xl flex flex-col items-center">
                            <CheckCircle size={48} className="text-emerald-500 opacity-50 mb-4" />
                            <h3 className="font-bold text-lg mb-1">{t('AdminTaskMediation.queueIsEmpty')}</h3>
                            <p className="text-sm">{t('AdminTaskMediation.noConflictsFoundMatc')}</p>
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => handleSelectTicket(ticket)}
                                className={`glass-card p-4 rounded-xl cursor-pointer transition-all border-l-4 ${selectedTicket?.id === ticket.id ? (statusFilter === 'open' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/10' : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10') : 'border-transparent hover:border-slate-300'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{t('AdminTaskMediation.task')}{ticket.task_id}</h3>
                                    {ticket.status === 'resolved' ? (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">{t('AdminTaskMediation.resolved')}</span>
                                    ) : (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">{t('AdminTaskMediation.doubleRejected')}</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mb-2 truncate">{t('AdminTaskMediation.investorUserID')}{ticket.user_id}</p>
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock size={12}/> {t('AdminTaskMediation.escalated')}{new Date(ticket.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Mediation Panel */}
                <div className="lg:col-span-2">
                    {selectedTicket ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-full flex flex-col">
                            
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('AdminTaskMediation.mediationTicket')}{selectedTicket.id}</h2>
                                <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 p-4 rounded-xl border border-rose-200 dark:border-rose-800/30 mb-4">
                                    <p className="font-bold mb-1">{t('AdminTaskMediation.conflictSummary')}</p>
                                    <p className="text-sm">{selectedTicket.message}</p>
                                </div>

                                {selectedTicket.status === 'resolved' && (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/30 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="text-emerald-500 shrink-0" size={20} />
                                            <span className="font-black text-lg">{t('AdminTaskMediation.conflictConcluded')}</span>
                                        </div>
                                        <p className="text-sm font-semibold mb-3">
                                            {t('AdminTaskMediation.verdict')}{taskDetails?.status === 'approved' ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg">{t('AdminTaskMediation.forceApprovedAgentPa')}</span>
                                            ) : (
                                                <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-100 dark:bg-rose-900/40 px-2.5 py-1 rounded-lg">{t('AdminTaskMediation.refundedInvestorSubm')}</span>
                                            )}
                                        </p>
                                        {selectedTicket.admin_response && (
                                            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">{t('AdminTaskMediation.administratorSAuditN')}</span>
                                                <p className="text-sm italic text-slate-700 dark:text-slate-350 font-medium">"{selectedTicket.admin_response}"</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {taskDetails ? (
                                <div className="flex-1 overflow-y-auto space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('AdminTaskMediation.investorTarget')}</p>
                                            <p className="font-medium">{taskDetails.property_address || 'Unknown Property'}</p>
                                            <p className="text-sm mt-2"><span className="font-bold text-slate-700">{t('AdminTaskMediation.requirement')}</span> {taskDetails.min_photos} {t('AdminTaskMediation.photosChecklist')}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('AdminTaskMediation.agentSubmissionData')}</p>
                                            <div className="flex items-center gap-1 text-sm font-medium">
                                                {taskDetails.geo_validated ? (
                                                    <span className="text-emerald-600 flex items-center gap-1"><MapPin size={14}/> {t('AdminTaskMediation.gPSValidated')}{taskDetails.distance_meters}m)</span>
                                                ) : (
                                                    <span className="text-rose-600 flex items-center gap-1"><MapPin size={14}/> {t('AdminTaskMediation.gPSMismatch')}{taskDetails.distance_meters}m)</span>
                                                )}
                                            </div>
                                            <p className="text-sm mt-2">{taskDetails.submission_photos?.length || 0} {t('AdminTaskMediation.photosUploaded')}</p>
                                        </div>
                                    </div>

                                    {/* Agent's Notes */}
                                    {taskDetails.agent_notes && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('AdminTaskMediation.agentSFieldComments')}</p>
                                            <p className="text-sm italic text-slate-700 dark:text-slate-350">"{taskDetails.agent_notes}"</p>
                                        </div>
                                    )}

                                    {/* Evidence Photos */}
                                    {taskDetails.submission_photos && taskDetails.submission_photos.length > 0 && (
                                        <div>
                                            <h4 className="font-bold mb-3 text-slate-800 dark:text-white flex items-center gap-2">
                                                {t('AdminTaskMediation.uploadedEvidencePhot')}{taskDetails.submission_photos.length})
                                            </h4>
                                            <div className="grid grid-cols-4 gap-3">
                                                {taskDetails.submission_photos.map((photo: string, index: number) => {
                                                    const fullUrl = photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`;
                                                    return (
                                                        <div 
                                                            key={index} 
                                                            onClick={() => {
                                                                setLightboxIndex(index);
                                                                setLightboxOpen(true);
                                                            }}
                                                            className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity relative group"
                                                        >
                                                            <img 
                                                                src={fullUrl} 
                                                                alt={`Evidence ${index + 1}`} 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "/placeholder-house.png";
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                                                {t('AdminTaskMediation.viewFullscreen')}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Checklist Responses */}
                                    {taskDetails.checklist_responses && (
                                        <div className="space-y-4">
                                            <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-white flex items-center gap-2">
                                                <CheckCircle size={16}/> {t('AdminTaskMediation.checklistResponses')}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {Object.entries(JSON.parse(taskDetails.checklist_responses)).map(([catId, items]: [string, any]) => (
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
                                                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded text-xs font-bold shrink-0 shadow-sm">{t('AdminTaskMediation.yes')}</span>
                                                                            ) : value === false ? (
                                                                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded text-xs font-bold shrink-0 shadow-sm">No</span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 bg-slate-200 text-slate-500 dark:bg-slate-700 rounded text-xs font-bold shrink-0">{t('AdminTaskMediation.nA')}</span>
                                                                            )}
                                                                        </div>
                                                                        {note && (
                                                                            <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
                                                                                <span className="font-bold block mb-0.5 text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">{t('AdminTaskMediation.comments')}</span>
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

                                    {/* Admin Decision Form */}
                                    {selectedTicket.status === 'open' ? (
                                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                                            <h3 className="font-black text-lg mb-4">{t('AdminTaskMediation.executiveDecision')}</h3>
                                            <textarea 
                                                value={resolutionNotes} 
                                                onChange={e => setResolutionNotes(e.target.value)}
                                                placeholder="Document your findings and justification for this decision..."
                                                className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 mb-4 h-32"
                                            />
                                            
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => handleResolve('approve_realtor')}
                                                    disabled={resolving}
                                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                                >
                                                    <CheckCircle size={20}/> {t('AdminTaskMediation.forceApprovePayAgent')}</button>
                                                <button 
                                                    onClick={() => handleResolve('refund_investor')}
                                                    disabled={resolving}
                                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                                >
                                                    <XCircle size={20}/> {t('AdminTaskMediation.rejectSubmissionRefu')}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-slate-400 font-bold text-sm italic">
                                            {t('AdminTaskMediation.thisDisputeHasBeenCo')}</div>
                                    )}

                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400">{t('AdminTaskMediation.loadingMissionEviden')}</div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                            {t('AdminTaskMediation.selectAMediationTick')}</div>
                    )}
                </div>
            </div>

            {/* Lightbox modal */}
            {lightboxOpen && taskDetails?.submission_photos && (
                <PhotoViewerLightbox
                    isOpen={lightboxOpen}
                    onClose={() => setLightboxOpen(false)}
                    images={taskDetails.submission_photos.map((photo: string) => 
                        photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`
                    )}
                    initialIndex={lightboxIndex}
                />
            )}
        </div>
    );
};
