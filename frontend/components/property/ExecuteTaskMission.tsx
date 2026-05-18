import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckSquare, UploadCloud, X, Save, AlertTriangle, FileText, Info, Navigation, ExternalLink } from 'lucide-react';
import { RealtorTaskService, Task } from '../../services/realtor_task.service';
import { getStreetViewUrl } from '../../utils/maps';

const CHECKLIST_DESCRIPTIONS: Record<string, string> = {
    'roof_sagging': 'Does the roof have visible sagging or dipping?',
    'missing_shingles': 'Are there missing, loose, or broken shingles?',
    'foundation_cracks': 'Are there visible cracks in the concrete foundation?',
    'leaning_walls': 'Do any exterior walls appear to be leaning or bowing?',
    'fascia_rot': 'Is there visible rot on the fascia or soffit under the roof?',
    'broken_windows': 'Are there any broken glass or cracked windows?',
    'boarded_doors': 'Are any doors or windows boarded up?',
    'damaged_doors': 'Are the exterior doors damaged or forced open?',
    'garage_functional': 'Does the garage door appear intact and aligned?',
    'ac_present': 'Is the exterior AC condenser unit present? (Commonly stolen in auction properties)',
    'ac_damaged': 'Does the AC unit appear vandalized or stripped of parts?',
    'electric_meter': 'Is the electric meter installed? (If not, wiring might be cut)',
    'water_meter': 'Is the water meter visible and secured?',
    'gas_meter': 'Is the gas meter connected (if applicable)?',
    'missing_siding': 'Is there missing vinyl, wood, or stucco siding?',
    'wood_rot': 'Is there any exposed wood rot due to weather?',
    'peeling_paint': 'Is the exterior paint severely peeling?',
    'pest_trails': 'Are there mud tubes on the walls (signs of termites)?',
    'overgrown_veg': 'Is the vegetation overgrown or covering the structure?',
    'tree_hazards': 'Are there large tree branches touching or fallen on the roof?',
    'standing_water': 'Is there standing water around the house? (Sign of drainage issues)',
    'debris': 'Is there accumulated trash, old cars, or debris in the yard?',
    'fencing': 'Are the isolation fences fallen down or broken?',
    'vacant': 'Does the house appear completely vacant and abandoned?',
    'squatters': 'Are there signs of squatters (recent trash, graffiti)?',
    'notices': 'Are there any legal or foreclosure notices posted on the door/window?'
};

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
    const [responses, setResponses] = useState<Record<string, Record<string, { value: boolean | null, note: string }>>>(() => {
        if (!initialDraft) return {};
        try {
            const draft = JSON.parse(initialDraft);
            const migrated: any = {};
            for (const cat in draft) {
                migrated[cat] = {};
                for (const item in draft[cat]) {
                    if (typeof draft[cat][item] === 'boolean') {
                        migrated[cat][item] = { value: draft[cat][item], note: '' };
                    } else {
                        migrated[cat][item] = draft[cat][item];
                    }
                }
            }
            return migrated;
        } catch { return {}; }
    });

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
                [itemId]: { ...(prev[categoryId]?.[itemId] || { note: '' }), value }
            }
        }));
    };

    const handleUpdateNote = (categoryId: string, itemId: string, note: string) => {
        setResponses(prev => ({
            ...prev,
            [categoryId]: {
                ...(prev[categoryId] || {}),
                [itemId]: { ...(prev[categoryId]?.[itemId] || { value: null }), note }
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
            <div className="bg-indigo-600 text-white p-4 flex items-start justify-between shadow-md shrink-0 sm:rounded-t-2xl">
                <div className="flex flex-col">
                    <h2 className="font-bold text-lg leading-tight truncate w-64">{task.title}</h2>
                    <p className="text-xs text-indigo-200 truncate w-64 mt-0.5">{task.address}</p>
                    <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${task.latitude || ''},${task.longitude || ''}${!task.latitude ? encodeURIComponent(task.address) : ''}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-bold text-white underline mt-1.5 opacity-80 hover:opacity-100 w-max flex items-center gap-1"
                    >
                        <MapPin size={12}/> Open in GPS / Maps
                    </a>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-indigo-500 rounded-full transition-colors shrink-0">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:bg-slate-50 sm:dark:bg-slate-800/50 pb-24">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Disclaimers & General Notes */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-5 rounded-2xl shadow-sm space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-blue-800 dark:text-blue-300">
                            <Info size={18} /> 💡 Execution Tips for Auction/BPO
                        </h4>
                        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-2 list-disc pl-5">
                            <li><strong>Avoid trespassing:</strong> If the property is locked, never force entry. Limit yourself to an external visual diagnosis (Drive-by BPO). Entering an auction property without authorization is considered trespassing.</li>
                            <li><strong>Zoom in photos:</strong> Focus well on the energy meter (to see if there is a municipal seal) and the roof junctions, where leaks usually start.</li>
                        </ul>
                        
                        <div className="pt-2">
                            <label className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1 block flex items-center gap-1">
                                <FileText size={14} /> General Execution Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Add any extra observations about the neighborhood, smells, or access issues here..."
                                className="w-full rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Property Location, Map and Street View Panel */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <Navigation className="text-indigo-500" size={20} /> Property Navigation & Reference
                        </h3>
                        <p className="text-xs text-slate-500">
                            Below is the target property location. Use the interactive map or open GPS directly.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Maps Iframe */}
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48 bg-slate-100 dark:bg-slate-900 relative">
                                <iframe
                                    title="Property Map"
                                    width="100%"
                                    height="100%"
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(task.address || '')}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight={0}
                                    marginWidth={0}
                                />
                            </div>

                            {/* Street View Picture */}
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center">
                                {(() => {
                                    const svUrl = getStreetViewUrl(task.address || '');
                                    if (svUrl) {
                                        return (
                                            <img
                                                src={svUrl}
                                                alt="Street View"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLElement).style.display = 'none';
                                                }}
                                            />
                                        );
                                    }
                                    return (
                                        <div className="text-xs text-slate-400 p-4 text-center">
                                            Street View not available or missing API Key.
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address || '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
                            >
                                <MapPin size={16} /> Open Google Maps GPS
                                <ExternalLink size={14} />
                            </a>
                            <a
                                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${task.latitude || ''},${task.longitude || ''}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all border border-slate-200 dark:border-slate-600"
                            >
                                <Navigation size={16} /> Open Interactive Street View
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>

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
                                                <div key={itemId} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mb-1">
                                                                {itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 block leading-snug">
                                                                {CHECKLIST_DESCRIPTIONS[itemId] || "Description not available."}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0 mt-1">
                                                            <button 
                                                                onClick={() => handleToggleResponse(catId, itemId, true)}
                                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${responses[catId]?.[itemId]?.value === true ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                            >
                                                                Yes
                                                            </button>
                                                            <button 
                                                                onClick={() => handleToggleResponse(catId, itemId, false)}
                                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${responses[catId]?.[itemId]?.value === false ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                                        <input 
                                                            type="text"
                                                            placeholder="Comments / Details (Optional)..."
                                                            className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none"
                                                            value={responses[catId]?.[itemId]?.note || ''}
                                                            onChange={(e) => handleUpdateNote(catId, itemId, e.target.value)}
                                                        />
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
