import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckSquare, UploadCloud, X, Save, AlertTriangle } from 'lucide-react';
import { RealtorTaskService, Task } from '../../services/realtor_task.service';

interface ExecuteTaskMissionProps {
    task: Task;
    onClose: () => void;
    onSuccess: () => void;
}

export const ExecuteTaskMission: React.FC<ExecuteTaskMissionProps> = ({ task, onClose, onSuccess }) => {
    // Determine checklist requirements
    const requiredChecklist: Record<string, string[]> = task.checklist_requirements 
        ? (typeof task.checklist_requirements === 'string' ? JSON.parse(task.checklist_requirements) : task.checklist_requirements)
        : {};

    const hasChecklist = task.task_type !== 'photo_verification' && Object.keys(requiredChecklist).length > 0;

    // Load initial drafted responses from LocalStorage if they exist (Offline Draft Persistence)
    const storageKey = `bpo_draft_${task.id}`;
    const initialDraft = localStorage.getItem(storageKey);
    const [responses, setResponses] = useState<Record<string, Record<string, boolean>>>(
        initialDraft ? JSON.parse(initialDraft) : {}
    );

    const [photos, setPhotos] = useState<File[]>([]);
    const [notes, setNotes] = useState('');
    
    // GPS State
    const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Save draft automatically on change
    useEffect(() => {
        if (Object.keys(responses).length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(responses));
        }
    }, [responses, storageKey]);

    const handleToggleResponse = (categoryId: string, itemId: string, value: boolean) => {
        setResponses(prev => ({
            ...prev,
            [categoryId]: {
                ...(prev[categoryId] || {}),
                [itemId]: value
            }
        }));
    };

    const handleCaptureGPS = () => {
        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
            pos => {
                setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsStatus('ok');
            },
            () => setGpsStatus('error'),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const handleSubmit = async () => {
        if (task.task_type !== 'visual_feedback' && photos.length < task.min_photos) {
            alert(`Minimum ${task.min_photos} photos required.`);
            return;
        }
        if (!gpsCoords) {
            alert('GPS Location is required for anti-fraud validation. Please capture your location.');
            return;
        }

        setSubmitting(true);
        try {
            const checklistJson = hasChecklist ? JSON.stringify(responses) : undefined;
            const result = await RealtorTaskService.submitEvidence(
                task.id, 
                photos, 
                gpsCoords.lat, 
                gpsCoords.lng, 
                notes,
                checklistJson
            );
            
            // Clean up draft
            localStorage.removeItem(storageKey);

            alert(result.auto_approved
                ? `✅ Evidence submitted and AUTO-APPROVED! You earned ${task.reward_points} pts.`
                : `📤 Mission executed! Awaiting investor review.`
            );
            onSuccess();
        } catch (e: any) {
            if (!navigator.onLine) {
                alert('📴 You are currently offline. Your checklist answers are saved. Please try submitting photos again when you have internet connection.');
            } else {
                alert(e.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col sm:p-4 overflow-hidden">
            {/* Mobile Header */}
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md shrink-0 sm:rounded-t-2xl">
                <div>
                    <h2 className="font-bold text-lg leading-tight truncate w-64">{task.title}</h2>
                    <p className="text-xs text-indigo-200 truncate w-64">{task.address}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-indigo-500 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:bg-slate-50 sm:dark:bg-slate-800/50 pb-24">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Step 1: GPS Lock */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold mb-1 flex items-center gap-2">
                            <MapPin className="text-rose-500" /> 1. Geo-Validation Lock
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">You must be physically present at the property to lock your coordinates.</p>
                        
                        <button
                            onClick={handleCaptureGPS}
                            className={`w-full py-4 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${
                                gpsStatus === 'ok' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                                gpsStatus === 'error' ? 'bg-rose-50 border-rose-300 text-rose-700' :
                                'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            {gpsStatus === 'loading' ? <span className="animate-pulse">Locking Satellite...</span> :
                             gpsStatus === 'ok' ? `✅ Locked: ${gpsCoords?.lat.toFixed(5)}, ${gpsCoords?.lng.toFixed(5)}` :
                             gpsStatus === 'error' ? '❌ Location failed — Tap to retry' : 'Capture GPS Coordinates'}
                        </button>
                    </div>

                    {/* Step 2: Checklist */}
                    {hasChecklist && (
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold flex items-center gap-2">
                                        <CheckSquare className="text-blue-500" /> 2. Property Checklist
                                    </h3>
                                    <p className="text-xs text-slate-500">Drafts are saved automatically if offline.</p>
                                </div>
                                {initialDraft && (
                                    <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">
                                        <Save size={12}/> Draft Loaded
                                    </span>
                                )}
                            </div>

                            <div className="space-y-6">
                                {Object.entries(requiredChecklist).map(([catId, items]) => (
                                    <div key={catId}>
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-700 pb-1">
                                            {catId.replace('_', ' ')}
                                        </h4>
                                        <div className="space-y-3">
                                            {items.map(itemId => (
                                                <div key={itemId} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleToggleResponse(catId, itemId, true)}
                                                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${responses[catId]?.[itemId] === true ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}
                                                        >
                                                            Yes
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleResponse(catId, itemId, false)}
                                                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${responses[catId]?.[itemId] === false ? 'bg-rose-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Photos */}
                    {task.task_type !== 'visual_feedback' && (
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold mb-1 flex items-center gap-2">
                                <Camera className="text-indigo-500" /> {hasChecklist ? '3' : '2'}. Evidence Camera
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Take {task.min_photos} to {task.max_photos} photos of the property condition.</p>
                            
                            {task.gps_photo_reference && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex gap-3">
                                    <img src={task.gps_photo_reference} alt="Reference" className="w-16 h-16 object-cover rounded-lg border border-blue-200" />
                                    <div>
                                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Investor's Target Match</p>
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Please ensure the facade matches this reference.</p>
                                    </div>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={e => setPhotos(prev => [...prev, ...Array.from(e.target.files || [])])}
                            />
                            
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="col-span-2 py-4 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 transition-colors border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 gap-1"
                                >
                                    <Camera size={24} />
                                    <span className="text-sm font-bold">Open Camera</span>
                                </button>
                            </div>

                            {photos.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {photos.map((f, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                                            <img src={URL.createObjectURL(f)} alt="Evidence" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 size-5 bg-black/50 text-white rounded-full flex items-center justify-center text-xs"
                                            >
                                                <X size={12}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-right text-xs mt-2 font-medium text-slate-500">
                                {photos.length} / {task.min_photos} Minimum Required
                            </p>
                        </div>
                    )}

                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="absolute bottom-0 left-0 w-full p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:rounded-b-2xl">
                {!navigator.onLine && (
                    <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 py-1.5 rounded border border-amber-200">
                        <AlertTriangle size={12}/> Offline Mode: Draft Saved. Find connection to upload photos.
                    </div>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || (task.task_type !== 'visual_feedback' && photos.length < task.min_photos) || !gpsCoords}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:bg-slate-400 text-white font-black text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    {submitting ? 'Uploading...' : <><UploadCloud size={20}/> Submit Mission Data</>}
                </button>
            </div>
        </div>
    );
};
