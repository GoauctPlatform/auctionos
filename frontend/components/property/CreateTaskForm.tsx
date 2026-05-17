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
    const [rewardPoints, setRewardPoints] = useState(10000); // 10000 points = $100 Combo
    const [gpsReferenceUrl, setGpsReferenceUrl] = useState('');
    
    // Checklist State
    const [selectedChecklist, setSelectedChecklist] = useState<Record<string, string[]>>({});
    
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                property_id: propertyId,
                title,
                description,
                task_type: taskType,
                min_photos: minPhotos,
                max_photos: minPhotos + 10,
                reward_points: rewardPoints,
                deadline_hours: deadlineHours,
                checklist_requirements: JSON.stringify(selectedChecklist),
                gps_photo_reference: gpsReferenceUrl || null
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
                    // Redirect to Stripe to pay the escrow!
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

    const usdPrice = (rewardPoints / 100).toFixed(2);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create BPO Mission</h2>
                        <p className="text-sm text-slate-500 mt-1">Request a field agent to investigate {propertyAddress}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="bpo-form" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Mission Title</label>
                                    <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Type</label>
                                    <select value={taskType} onChange={e => setTaskType(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white">
                                        <option value="bpo">Broker Price Opinion (Combo)</option>
                                        <option value="photo_verification">Photo Verification Only</option>
                                        <option value="visual_feedback">Visual Feedback (Checklist Only)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Instructions / Comments</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white" placeholder="Specific instructions for the field agent..."></textarea>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                    <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                        <Navigation size={16} /> GPS Reference Photo (Optional)
                                    </h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">Provide a Street View link or image URL so the agent targets the correct house.</p>
                                    <input type="text" value={gpsReferenceUrl} onChange={e => setGpsReferenceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded border border-blue-200 dark:border-blue-700/50 bg-white dark:bg-slate-800 dark:text-white" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Photos</label>
                                        <input type="number" min={3} max={50} value={minPhotos} onChange={e => setMinPhotos(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Deadline</label>
                                        <select value={deadlineHours} onChange={e => setDeadlineHours(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white">
                                            <option value={48}>48 Hours</option>
                                            <option value={72}>72 Hours</option>
                                            <option value={168}>1 Week</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Checklist Builder */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CheckSquare className="text-indigo-500" /> Property Condition Checklist
                                </h3>
                                <div className="space-x-3 text-sm">
                                    <button type="button" onClick={selectAllChecklist} className="text-indigo-600 font-medium hover:underline">Select All</button>
                                    <button type="button" onClick={clearChecklist} className="text-slate-500 hover:underline">Clear</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {CHECKLIST_CATEGORIES.map(category => (
                                    <div key={category.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                                        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{category.label}</h4>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {category.items.map(item => {
                                                const isChecked = (selectedChecklist[category.id] || []).includes(item.id);
                                                return (
                                                    <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isChecked}
                                                            onChange={() => toggleChecklistItem(category.id, item.id)}
                                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Escrow Total</p>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-900 dark:text-white">${usdPrice}</span>
                            <span className="text-sm text-slate-500 mb-1">({rewardPoints} pts)</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="bpo-form"
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-colors flex items-center gap-2"
                        >
                            {isSubmitting ? 'Processing...' : 'Pay & Publish Mission'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
