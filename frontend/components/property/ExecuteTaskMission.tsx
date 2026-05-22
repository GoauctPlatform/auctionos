import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckSquare, UploadCloud, X, Save, AlertTriangle, FileText, Info, Navigation, ExternalLink, Activity, ShieldCheck, Layers } from 'lucide-react';
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

    // Calculate answers completed for HUD
    const totalRequiredChecklistItems = Object.values(requiredChecklist).reduce((acc, curr) => acc + curr.length, 0);
    let completedChecklistItems = 0;
    Object.values(responses).forEach(cat => {
        Object.values(cat).forEach(item => {
            if (item.value !== null && item.value !== undefined) completedChecklistItems++;
        });
    });

    return (
        <div className="fixed inset-0 z-[100] bg-[#0B0F17] flex flex-col sm:p-4 overflow-hidden">
            
            {/* Devices Shield Container Wrapper for desktop, normal fluid view for mobile */}
            <div className="flex-1 max-w-3xl w-full mx-auto bg-[#0B0F17] flex flex-col overflow-hidden sm:border sm:border-slate-800/80 sm:rounded-2xl sm:shadow-[0_0_50px_rgba(0,0,0,0.85)] relative">
                
                {/* Tactical Operations Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white p-4 border-b border-slate-800/80 flex items-start justify-between shadow-lg shrink-0">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="h-2 w-2 rounded-full bg-[#13B8B5] animate-pulse" />
                            <span className="text-[9px] font-mono text-[#13B8B5] uppercase tracking-widest">[FIELD OPS DEVICE HUB]</span>
                        </div>
                        <h2 className="font-black text-base uppercase tracking-tight truncate max-w-[200px] md:max-w-xs">{task.title}</h2>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] md:max-w-xs mt-0.5">{task.address}</p>
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${task.latitude || ''},${task.longitude || ''}${!task.latitude ? encodeURIComponent(task.address) : ''}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[9px] font-bold text-[#0D8BFF] uppercase tracking-wider hover:text-white mt-2 w-max flex items-center gap-1 bg-[#0D8BFF]/5 px-2 py-0.5 rounded border border-[#0D8BFF]/20 transition-all"
                        >
                            <MapPin size={10}/> Establish Vector Routing
                        </a>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-slate-800/40 hover:bg-slate-800/80 rounded-full border border-slate-800 text-slate-400 hover:text-white transition-all shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28 scrollbar-thin">
                    
                    {/* Visual Overlay: Tactical Command HUD */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#131926]/40 p-4 border border-slate-800/80 rounded-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-15 pointer-events-none" />
                        
                        {/* Sat Lock HUD */}
                        <div className="flex flex-col justify-between p-3 rounded-lg bg-[#0B0F17]/80 border border-slate-800 space-y-2">
                            <div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Satelite Comms</span>
                                <span className="text-xs font-black uppercase text-slate-200 mt-0.5 block">Position Validation</span>
                            </div>
                            <div>
                                {gpsCoords ? (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono w-max">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LOCKED: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                                    </span>
                                ) : gpsStatus === 'loading' ? (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono w-max animate-pulse">
                                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" /> SCANNING SATELLITE...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono w-max">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> SYNC REQUIRED
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Evidence Check progress */}
                        <div className="flex flex-col justify-between p-3 rounded-lg bg-[#0B0F17]/80 border border-slate-800 space-y-2">
                            <div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Evidence Progress</span>
                                <span className="text-xs font-black uppercase text-slate-200 mt-0.5 block">Insitu Shutter captures</span>
                            </div>
                            <div>
                                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mb-1">
                                    <span>CAM CAPTURES:</span>
                                    <span className="font-bold text-[#0D8BFF]">{photos.length} / {task.min_photos} MIN</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-[#0D8BFF] to-[#13B8B5] h-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, (photos.length / task.min_photos) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Checklist progress */}
                        <div className="flex flex-col justify-between p-3 rounded-lg bg-[#0B0F17]/80 border border-slate-800 space-y-2">
                            <div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Audit Checklist</span>
                                <span className="text-xs font-black uppercase text-slate-200 mt-0.5 block">Diagnostics Subsystems</span>
                            </div>
                            <div>
                                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mb-1">
                                    <span>SYSTEM LOGS:</span>
                                    <span className="font-bold text-[#13B8B5]">{completedChecklistItems} / {totalRequiredChecklistItems} OK</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-[#13B8B5] to-indigo-500 h-full transition-all duration-300"
                                        style={{ width: `${totalRequiredChecklistItems > 0 ? (completedChecklistItems / totalRequiredChecklistItems) * 100 : 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Standard Operating Procedure (SOP) Tactical Briefing */}
                    <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-2xl shadow-lg space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-slate-600">SOP-BPO-09</div>
                        <h4 className="font-black text-xs flex items-center gap-2 text-indigo-400 uppercase tracking-widest">
                            <Info size={14} /> SOP Guidelines: Distressed Asset Inspections
                        </h4>
                        <ul className="text-xs text-slate-300 space-y-2 list-disc pl-5 leading-relaxed font-mono">
                            <li><strong>Zero Trespassing Directive:</strong> If the gate is padlocked or property is occupied, do not cross visual barrier boundaries. Conduct a strictly External visual Drive-by BPO assessment.</li>
                            <li><strong>Focus Sensors:</strong> Capture clear structural junction grids, roof outlines, and utilities input sockets (specifically electrical meter connection seals).</li>
                        </ul>
                        
                        <div className="pt-2 border-t border-slate-800/80">
                            <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                                <FileText size={12} /> Add Operational Intelligence log notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Add specific details regarding structural integrity issues, neighborhood decay factors, odors, or access constraints..."
                                className="w-full rounded-xl border border-slate-800 bg-[#0B0F17]/80 p-3 text-xs focus:outline-none focus:border-[#0D8BFF]/50 text-slate-200 placeholder-slate-600 font-mono transition-all"
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Property Location, Map and Street View Panel */}
                    <div className="bg-[#131926]/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg space-y-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-5 pointer-events-none" />
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Navigation className="text-[#0D8BFF]" size={16} /> Reference & Route Vectors
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Maps Iframe */}
                            <div className="rounded-xl overflow-hidden border border-slate-800 h-48 bg-[#0B0F17] relative">
                                <iframe
                                    title="Property Map"
                                    width="100%"
                                    height="100%"
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(task.address || '')}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight={0}
                                    marginWidth={0}
                                    className="opacity-95 filter invert hue-rotate-180 brightness-90 saturate-50"
                                />
                                <div className="absolute top-2 left-2 text-[8px] font-mono bg-[#0B0F17]/75 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                                    [VEC MAP OVERLAY]
                                </div>
                            </div>

                            {/* Street View Picture */}
                            <div className="rounded-xl overflow-hidden border border-slate-800 h-48 bg-[#0B0F17] relative flex items-center justify-center">
                                {(() => {
                                    const svUrl = getStreetViewUrl(task.address || '');
                                    if (svUrl) {
                                        return (
                                            <>
                                                <img
                                                    src={svUrl}
                                                    alt="Street View"
                                                    className="w-full h-full object-cover opacity-85 saturate-75"
                                                    onError={(e) => {
                                                        (e.target as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/70 to-transparent pointer-events-none" />
                                            </>
                                        );
                                    }
                                    return (
                                        <div className="text-[10px] font-mono text-slate-500 p-4 text-center">
                                            [STREET VIEW FEED NOT RESOLVED]
                                        </div>
                                    );
                                })()}
                                <div className="absolute top-2 left-2 text-[8px] font-mono bg-[#0B0F17]/75 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                                    [OPTICAL PREVIEW]
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address || '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-700 to-indigo-600 hover:opacity-95 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition-all border border-indigo-500/30"
                            >
                                <MapPin size={12} /> Launch Vector Routing
                                <ExternalLink size={10} />
                            </a>
                            <a
                                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${task.latitude || ''},${task.longitude || ''}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/40 hover:bg-slate-800/70 text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border border-slate-800"
                            >
                                <Navigation size={12} /> Launch Panoramic HUD View
                                <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>

                    {/* Step 1: GPS Lock */}
                    <div className="bg-[#131926]/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <MapPin className="text-rose-500 animate-pulse" size={16} /> 1. Geo-Validation Lock
                            </h3>
                            <span className="text-[8px] font-mono text-slate-500">ANTI-FRAUD RADIAL ENVELOPE</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 font-mono leading-relaxed">
                            You must stand physically within the registry boundary to authorize the telemetry handshake key.
                        </p>
                        
                        <button
                            onClick={handleCaptureGPS}
                            className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                                gpsStatus === 'ok' 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] font-mono' 
                                    : gpsStatus === 'error' 
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                        : gpsStatus === 'loading'
                                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse'
                                            : 'bg-[#0B0F17] hover:bg-[#131926]/60 border-slate-800 text-slate-300 hover:text-white'
                            }`}
                        >
                            {gpsStatus === 'loading' ? (
                                <>
                                    <span className="w-4 h-4 rounded-full border border-dashed border-cyan-400 animate-spin block shrink-0" />
                                    <span>RESOLVING SAT TELEMETRY LOCK VECTOR...</span>
                                </>
                            ) : gpsStatus === 'ok' ? (
                                <span>✅ SAT LOCK SECURED: [{gpsCoords?.lat.toFixed(5)}, {gpsCoords?.lng.toFixed(5)}]</span>
                            ) : gpsStatus === 'error' ? (
                                <span>❌ GEO-LOC HANDSHAKE TIMEOUT — Retrigger Lock</span>
                            ) : (
                                <span>📡 INITIATE GEO-INT POSITION LOCK</span>
                            )}
                        </button>
                    </div>

                    {/* Step 2: Checklist */}
                    {hasChecklist && (
                        <div className="bg-[#131926]/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 pointer-events-none" />
                            <div className="flex items-start justify-between mb-6 pb-2 border-b border-slate-800/80">
                                <div>
                                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <CheckSquare className="text-[#0D8BFF]" size={16} /> 2. Property Diagnostics Checklist
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">Tactical telemetry forms. Drafts auto-persisted.</p>
                                </div>
                                {initialDraft && (
                                    <span className="flex items-center gap-1.5 text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                                        <Save size={10}/> Draft Restored
                                    </span>
                                )}
                            </div>

                            <div className="space-y-6">
                                {Object.entries(requiredChecklist).map(([catId, items]) => (
                                    <div key={catId} className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#13B8B5]" /> {catId.replace(/_/g, ' ')}
                                        </h4>
                                        <div className="space-y-4">
                                            {items.map(itemId => (
                                                <div key={itemId} className="bg-[#0B0F17]/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <span className="text-xs font-black text-slate-200 block mb-1 uppercase tracking-wide">
                                                                {itemId.replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="text-xs text-slate-400 block leading-snug">
                                                                {CHECKLIST_DESCRIPTIONS[itemId] || "Checklist criteria specification."}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0 self-start sm:self-center">
                                                            <button 
                                                                onClick={() => handleToggleResponse(catId, itemId, true)}
                                                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${responses[catId]?.[itemId]?.value === true ? 'bg-gradient-to-r from-emerald-600 to-[#13B8B5] text-white shadow-lg shadow-emerald-500/15 scale-105 border border-emerald-500/20' : 'bg-[#0B0F17] text-slate-500 border border-slate-800 hover:bg-[#131926]/40 hover:text-slate-300'}`}
                                                            >
                                                                Yes
                                                            </button>
                                                            <button 
                                                                onClick={() => handleToggleResponse(catId, itemId, false)}
                                                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${responses[catId]?.[itemId]?.value === false ? 'bg-gradient-to-r from-rose-700 to-rose-600 text-white shadow-lg shadow-rose-500/15 scale-105 border border-rose-500/20' : 'bg-[#0B0F17] text-slate-500 border border-slate-800 hover:bg-[#131926]/40 hover:text-slate-300'}`}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="pt-3 border-t border-slate-800/80">
                                                        <input 
                                                            type="text"
                                                            placeholder="Comments / Structural Deviation Notes (Optional)..."
                                                            className="w-full bg-[#0B0F17]/50 rounded-lg border border-slate-800 p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-[#0D8BFF]/40 outline-none transition-all font-mono"
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
                        <div className="bg-[#131926]/40 p-5 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Camera className="text-[#13B8B5]" size={16} /> {hasChecklist ? '3' : '2'}. Evidence Optical Capture
                                </h3>
                                <span className="text-[8px] font-mono text-[#13B8B5]">LENS INTERFACE ACTIVE</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 font-mono leading-relaxed">
                                Record physical site imagery. Required: {task.min_photos} to {task.max_photos} secure photo captures.
                            </p>

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
                                    className="col-span-2 py-6 bg-[#0B0F17]/60 hover:bg-[#131926]/60 transition-all border-2 border-dashed border-slate-800 hover:border-[#0D8BFF]/40 rounded-xl flex flex-col items-center justify-center text-[#0D8BFF] gap-2 cursor-pointer shadow-lg group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-[#0D8BFF]/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Camera size={26} className="animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-widest">AQUIRE OPTICAL EXPOSURE (CAMERA)</span>
                                    {/* HUD corner lines */}
                                    <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-slate-700" />
                                    <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-slate-700" />
                                    <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-slate-700" />
                                    <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-slate-700" />
                                </button>
                            </div>

                            {photos.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0F17]/50 p-3 border border-slate-800 rounded-xl">
                                    {photos.map((f, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group">
                                            <img src={URL.createObjectURL(f)} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <button 
                                                onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                                                className="absolute top-1.5 right-1.5 size-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all z-10"
                                            >
                                                <X size={12}/>
                                            </button>
                                            {/* Viewfinder overlay */}
                                            <div className="absolute top-1 left-1 text-[8px] font-mono text-slate-400 bg-[#0b0f17]/75 px-1 py-0.5 rounded border border-slate-800">
                                                CAM-0{i+1}
                                            </div>
                                            <div className="absolute bottom-1 right-1 text-[7px] font-mono text-[#13B8B5] bg-[#0b0f17]/75 px-1 py-0.5 rounded border border-slate-800">
                                                SECURE
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-right text-[10px] mt-2 font-mono text-slate-500">
                                CAPTURED: <span className="font-bold text-[#0D8BFF]">{photos.length}</span> / {task.min_photos} MINIMUM REQUIREMENT
                            </p>
                        </div>
                    )}

                </div>
            </div>

            {/* Sticky Command Action Footer */}
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-950 via-[#131926]/95 to-[#131926]/90 border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] sm:rounded-b-2xl z-20">
                <div className="max-w-3xl mx-auto">
                    {!navigator.onLine && (
                        <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 py-2 px-3 rounded-lg border border-amber-500/20 font-mono uppercase tracking-widest">
                            <AlertTriangle size={14} className="shrink-0 animate-pulse"/> Offline State: Local checklist cache active. Please connect to sync files.
                        </div>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (task.task_type !== 'visual_feedback' && photos.length < task.min_photos) || !gpsCoords}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-[#13B8B5] hover:opacity-95 disabled:opacity-40 disabled:bg-[#1e293b] disabled:text-slate-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-xl hover:shadow-[0_0_20px_rgba(19,184,181,0.35)] transition-all duration-300 flex items-center justify-center gap-2 border border-emerald-500/20"
                    >
                        {submitting ? (
                            <>
                                <span className="w-4 h-4 rounded-full border border-dashed border-white animate-spin block shrink-0" />
                                <span>ENCRYPTING & SYNCING MISSION DATA DATASETS...</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud size={14}/>
                                <span>AUTHORIZE & SUBMIT TACTICAL MISSION DATA</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
