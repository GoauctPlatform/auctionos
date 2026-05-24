import React, { useState } from 'react';
import { X, CheckSquare, Image as ImageIcon, Navigation } from 'lucide-react';
import { API_BASE_URL } from '../../services/httpClient';

interface CreateTaskFormProps {
    propertyId: number;
    propertyAddress: string;
    onClose: () => void;
}

const CHECKLIST_CATEGORIES = [
    {
        id: 'exterior',
        label: 'Exterior Structure & Framing',
        items: [
            { id: 'roof_sagging', label: 'Roof Sagging' },
            { id: 'missing_shingles', label: 'Missing Shingles' },
            { id: 'foundation_cracks', label: 'Foundation Cracks' },
            { id: 'leaning_walls', label: 'Leaning Walls' },
            { id: 'fascia_rot', label: 'Fascia/Soffit Rot' }
        ]
    },
    {
        id: 'openings',
        label: 'Openings & Security',
        items: [
            { id: 'broken_windows', label: 'Broken Windows' },
            { id: 'boarded_doors', label: 'Boarded Windows/Doors' },
            { id: 'damaged_doors', label: 'Damaged Front/Back Doors' },
            { id: 'garage_functional', label: 'Garage Door Functional' }
        ]
    },
    {
        id: 'utilities',
        label: 'Utilities & Mechanicals',
        items: [
            { id: 'ac_present', label: 'AC Condenser Present' },
            { id: 'ac_damaged', label: 'AC Condenser Damaged' },
            { id: 'electric_meter', label: 'Electric Meter Present' },
            { id: 'water_meter', label: 'Water Meter Secured' },
            { id: 'gas_meter', label: 'Gas Meter Connected' }
        ]
    },
    {
        id: 'walls',
        label: 'Exterior Walls & Siding',
        items: [
            { id: 'missing_siding', label: 'Missing Siding/Stucco' },
            { id: 'wood_rot', label: 'Visible Wood Rot' },
            { id: 'peeling_paint', label: 'Peeling Paint' },
            { id: 'pest_trails', label: 'Termite/Pest Trails' }
        ]
    },
    {
        id: 'lot',
        label: 'Lot, Yard & Surroundings',
        items: [
            { id: 'overgrown_veg', label: 'Overgrown Vegetation' },
            { id: 'tree_hazards', label: 'Tree Hazards' },
            { id: 'standing_water', label: 'Standing Water/Flooding' },
            { id: 'debris', label: 'Debris/Trash Accumulation' },
            { id: 'fencing', label: 'Fencing Damaged' }
        ]
    },
    {
        id: 'occupancy',
        label: 'Occupancy Status',
        items: [
            { id: 'vacant', label: 'Property Vacant' },
            { id: 'squatters', label: 'Signs of Squatters/Tresspass' },
            { id: 'notices', label: 'Auction/Foreclosure Notices' }
        ]
    }
];

export const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ propertyId, propertyAddress, onClose }) => {
    const [title, setTitle] = useState(`Due Diligence BPO - ${propertyAddress}`);
    const [description, setDescription] = useState('');
    const [taskType, setTaskType] = useState('bpo');
    const [minPhotos, setMinPhotos] = useState(5);
    const [deadlineHours, setDeadlineHours] = useState(168); // 7 days

    
    // Checklist State
    const [selectedChecklist, setSelectedChecklist] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle type change and update pricing/photo rules
    const handleTaskTypeChange = (type: string) => {
        setTaskType(type);
        if (type === 'bpo') {
            setMinPhotos(5);
        } else if (type === 'photo_verification') {
            setMinPhotos(3);
        } else {
            setMinPhotos(0); // visual_feedback (Checklist Only) requires 0 photos
        }
    };

    const toggleChecklistItem = (categoryId: string, itemId: string) => {
        setSelectedChecklist(prev => {
            const currentCatItems = prev[categoryId] || [];
            if (currentCatItems.includes(itemId)) {
                return { ...prev, [categoryId]: currentCatItems.filter(i => i !== itemId) };
            } else {
                return { ...prev, [categoryId]: [...currentCatItems, itemId] };
            }
        });
    };

    const selectAllChecklist = () => {
        const all: Record<string, string[]> = {};
        CHECKLIST_CATEGORIES.forEach(cat => {
            all[cat.id] = cat.items.map(i => i.id);
        });
        setSelectedChecklist(all);
    };

    const clearChecklist = () => setSelectedChecklist({});

    // Dynamic visual price structure
    const getPricing = () => {
        if (taskType === 'bpo') {
            return { points: 10000, displayUsd: '$100.00', displayTestBrl: 'R$ 0.51' };
        }
        return { points: 5000, displayUsd: '$50.00', displayTestBrl: 'R$ 0.51' };
    };

    const priceInfo = getPricing();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Apply strict restrictions on payload submission based on chosen BPO task type
            const finalMinPhotos = taskType === 'visual_feedback' ? 0 : minPhotos;
            const finalMaxPhotos = taskType === 'visual_feedback' ? 0 : finalMinPhotos + 10;
            const finalChecklist = taskType === 'photo_verification' ? '{}' : JSON.stringify(selectedChecklist);

            const payload = {
                property_id: propertyId,
                title,
                description,
                task_type: taskType,
                min_photos: finalMinPhotos,
                max_photos: finalMaxPhotos,
                reward_points: priceInfo.points,
                deadline_hours: deadlineHours,
                checklist_requirements: finalChecklist,
                gps_photo_reference: null
            };

            const res = await fetch(`${API_BASE_URL}/api/v1/investor/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                if (data.checkout_url) {
                    // Redirect directly to Stripe sandbox session (charging BRL 0.51)
                    window.location.href = data.checkout_url;
                } else {
                    alert('Task created successfully (Mock Mode without Stripe).');
                    onClose();
                }
            } else {
                alert(`Error: ${data.detail}`);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to submit task.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            {/* Ultra-Premium Glassmorphism Container */}
            <div className="glass-card bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">add_moderator</span>
                            Create BPO Mission
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Request a field agent to investigate {propertyAddress}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Form Area */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white/10 dark:bg-slate-900/10">
                    <form id="bpo-form" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Mission Title</label>
                                    <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Type</label>
                                    <select value={taskType} onChange={e => handleTaskTypeChange(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all">
                                        <option value="bpo">Broker Price Opinion (Combo - Photos + Checklist)</option>
                                        <option value="photo_verification">Photo Verification Only (No Checklist)</option>
                                        <option value="visual_feedback">Visual Feedback (Checklist Only - No Photos)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Instructions / Comments</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" placeholder="Specific instructions for the field agent..."></textarea>
                                </div>
                            </div>

                            <div className="space-y-4">

                                {/* Dynamic constraints & Photo verification warning boxes */}
                                {taskType === 'visual_feedback' ? (
                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-md border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl p-4 flex gap-3 shadow-inner">
                                        <span className="material-symbols-outlined text-2xl text-emerald-500">fact_check</span>
                                        <div>
                                            <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm mb-0.5">Checklist Mode Active</h4>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-400">This mission will require 0 photos. The field agent will focus entirely on completing the visual property condition checklist.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Photos Required</label>
                                            <input type="number" min={3} max={50} value={minPhotos} onChange={e => setMinPhotos(Number(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Deadline</label>
                                            <select value={deadlineHours} onChange={e => setDeadlineHours(Number(e.target.value))} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
                                                <option value={48}>48 Hours</option>
                                                <option value={72}>72 Hours</option>
                                                <option value={168}>1 Week</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Interactive Checklist Builder - Conditionally Hidden / Restricted */}
                        {taskType === 'photo_verification' ? (
                            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 backdrop-blur-md border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl p-6 text-center shadow-inner">
                                <span className="material-symbols-outlined text-4xl text-indigo-500/80 mb-2">photo_camera</span>
                                <h4 className="font-bold text-indigo-950 dark:text-indigo-300 text-base mb-1">Photo Verification Mode Active</h4>
                                <p className="text-sm text-indigo-700 dark:text-indigo-400 max-w-lg mx-auto">This task requires the field agent to submit geo-located condition photos only. No custom inspection checklists will be generated or sent.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <CheckSquare className="text-indigo-500" /> Property Condition Checklist Builder
                                    </h3>
                                    <div className="space-x-3 text-sm">
                                        <button type="button" onClick={selectAllChecklist} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Select All</button>
                                        <button type="button" onClick={clearChecklist} className="text-slate-500 dark:text-slate-400 font-bold hover:underline">Clear</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {CHECKLIST_CATEGORIES.map(category => (
                                        <div key={category.id} className="border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden bg-white/30 dark:bg-slate-800/20 backdrop-blur-md shadow-sm">
                                            <div className="bg-slate-50/50 dark:bg-slate-800/40 px-4 py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">{category.label}</h4>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                {category.items.map(item => {
                                                    const isChecked = (selectedChecklist[category.id] || []).includes(item.id);
                                                    return (
                                                        <label key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/40 cursor-pointer transition-all border border-transparent hover:border-slate-200/40 dark:hover:border-slate-700/30">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={() => toggleChecklistItem(category.id, item.id)}
                                                                className="w-4 h-4 text-indigo-600 rounded border-slate-350 focus:ring-indigo-550 focus:ring-offset-0 bg-transparent transition-all"
                                                            />
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer with Premium Escrow Summary */}
                <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Escrow Total</p>
                        <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{priceInfo.displayUsd}</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-100/50 dark:border-emerald-900/30 shadow-sm flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Test BRL: {priceInfo.displayTestBrl}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-400">({priceInfo.points} points escrowed)</span>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="bpo-form"
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-indigo-300 transition-all flex items-center gap-2"
                        >
                            {isSubmitting ? 'Processing Payment...' : 'Pay & Publish Mission'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
