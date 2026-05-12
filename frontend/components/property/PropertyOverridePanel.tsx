/**
 * PropertyOverridePanel
 *
 * Inline edit panel for the JSONB Override feature.
 * Renders when the user activates edit mode on a property detail page.
 *
 * Design principles:
 * - Shows ONLY the most actionable, user-facing fields (not internal IDs or system fields).
 * - Fields with active overrides show a yellow "customized" indicator with a reset button.
 * - Saving is atomic: only changed fields are sent to PUT /{parcel_id}/override.
 * - Cancel discards local edits without touching the DB.
 */
import React, { useState, useEffect } from 'react';
import { PropertyService } from '../../services/property.service';
import { RotateCcw, Save, X, PencilLine, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OverridePanelProps {
    property: any;
    onClose: () => void;
    onSaved: (updatedData: Record<string, any>) => void;
}

/** Fields exposed for user editing — ordered by importance. */
const EDITABLE_FIELDS: { key: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }[] = [
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'county', label: 'County', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'occupancy', label: 'Occupancy', type: 'select', options: ['Unknown', 'Vacant', 'Owner Occupied', 'Tenant Occupied', 'Abandoned'] },
    { key: 'amount_due', label: 'Opening Bid ($)', type: 'number' },
    { key: 'assessed_value', label: 'Assessed Value ($)', type: 'number' },
    { key: 'estimated_value', label: 'My Estimated ARV ($)', type: 'number' },
    { key: 'rental_value', label: 'My Estimated Rent ($)', type: 'number' },
    { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { key: 'bathrooms', label: 'Bathrooms', type: 'number' },
    { key: 'sqft', label: 'Sq Ft (Building)', type: 'number' },
    { key: 'lot_acres', label: 'Lot Acres', type: 'number' },
    { key: 'year_built', label: 'Year Built', type: 'number' },
    { key: 'property_type', label: 'Property Type', type: 'text' },
    { key: 'legal_description', label: 'Legal Description', type: 'text' },
    { key: 'owner_name', label: 'Owner Name', type: 'text' },
    { key: 'owner_address', label: 'Owner Address', type: 'text' },
    { key: 'availability_status', label: 'Availability', type: 'select', options: ['available', 'sold', 'pending', 'off_market', 'redeemed'] },
    { key: 'zoning', label: 'Zoning', type: 'text' },
    { key: 'flood_zone_code', label: 'Flood Zone Code', type: 'text' },
    { key: 'description', label: 'Notes / Description', type: 'text' },
];

export const PropertyOverridePanel: React.FC<OverridePanelProps> = ({ property, onClose, onSaved }) => {
    // Local draft: starts from the current property values (already merged with existing overrides)
    const [draft, setDraft] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        EDITABLE_FIELDS.forEach(f => {
            initial[f.key] = property[f.key] ?? '';
        });
        return initial;
    });

    // Track which fields are already overridden (from API response)
    const existingOverrides: Record<string, any> = property.original_values || {};
    const [changedFields, setChangedFields] = useState<Set<string>>(new Set(Object.keys(existingOverrides)));

    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (key: string, value: string) => {
        setDraft(prev => ({ ...prev, [key]: value }));
        setChangedFields(prev => {
            const next = new Set(prev);
            // If value matches the original master value, remove from changed set
            const masterVal = String(existingOverrides[key] !== undefined ? existingOverrides[key] : property[key] ?? '');
            if (value === masterVal) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleReset = async (key: string) => {
        try {
            await PropertyService.resetPropertyOverride(property.parcel_id, key);
            // Restore the original master value locally
            const masterVal = existingOverrides[key] !== undefined ? existingOverrides[key] : property[key];
            setDraft(prev => ({ ...prev, [key]: masterVal ?? '' }));
            setChangedFields(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        } catch (err: any) {
            alert(`Failed to reset ${key}: ${err.message}`);
        }
    };

    const handleSave = async () => {
        if (changedFields.size === 0) {
            onClose();
            return;
        }
        setSaving(true);
        setSaveStatus('idle');
        try {
            // Build payload with only the fields that actually changed
            const payload: Record<string, any> = {};
            changedFields.forEach(key => {
                const f = EDITABLE_FIELDS.find(ef => ef.key === key);
                const val = draft[key];
                if (f?.type === 'number') {
                    payload[key] = val === '' ? null : parseFloat(String(val));
                } else {
                    payload[key] = val === '' ? null : val;
                }
            });

            await PropertyService.savePropertyOverride(property.parcel_id, payload);
            setSaveStatus('success');
            onSaved(payload);
            setTimeout(() => {
                setSaveStatus('idle');
                onClose();
            }, 1200);
        } catch (err: any) {
            setSaveStatus('error');
            setErrorMsg(err.message || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetAll = async () => {
        if (!confirm('Reset ALL your customizations for this property? The original data will be restored.')) return;
        try {
            await PropertyService.resetPropertyOverride(property.parcel_id);
            const original: Record<string, any> = {};
            EDITABLE_FIELDS.forEach(f => {
                original[f.key] = (existingOverrides[f.key] !== undefined ? existingOverrides[f.key] : property[f.key]) ?? '';
            });
            setDraft(original);
            setChangedFields(new Set());
            onSaved({});
        } catch (err: any) {
            alert('Failed to reset all: ' + err.message);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-400 dark:border-amber-500 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
                        <PencilLine size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white text-sm">Private View Editor</h3>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Changes are visible only to you. Master data is never modified.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {changedFields.size > 0 && (
                        <button
                            onClick={handleResetAll}
                            className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <RotateCcw size={12} />
                            Reset All
                        </button>
                    )}
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Fields Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EDITABLE_FIELDS.map(field => {
                    const isOverridden = changedFields.has(field.key);
                    const hasExistingOverride = Object.prototype.hasOwnProperty.call(existingOverrides, field.key);

                    return (
                        <div key={field.key} className={`relative group ${isOverridden ? 'col-span-1' : 'col-span-1'}`}>
                            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                {field.label}
                                {isOverridden && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[9px] font-black">
                                        CUSTOM
                                    </span>
                                )}
                            </label>
                            <div className={`flex items-center gap-1 rounded-lg border ${
                                isOverridden
                                    ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800'
                                    : 'border-slate-200 dark:border-slate-600'
                                } overflow-hidden transition-all`}>
                                {field.type === 'select' ? (
                                    <select
                                        value={draft[field.key] ?? ''}
                                        onChange={e => handleChange(field.key, e.target.value)}
                                        className="flex-1 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none"
                                    >
                                        {field.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        value={draft[field.key] ?? ''}
                                        onChange={e => handleChange(field.key, e.target.value)}
                                        className="flex-1 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none"
                                        step={field.type === 'number' ? 'any' : undefined}
                                    />
                                )}
                                {/* Reset single field button */}
                                {(isOverridden || hasExistingOverride) && (
                                    <button
                                        onClick={() => handleReset(field.key)}
                                        title={`Restore original value for ${field.label}`}
                                        className="px-2 text-slate-300 hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    {saveStatus === 'success' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={14} /> Saved successfully
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                            <AlertCircle size={14} /> {errorMsg}
                        </span>
                    )}
                    {saveStatus === 'idle' && changedFields.size > 0 && (
                        <span className="text-xs text-slate-400">
                            {changedFields.size} field{changedFields.size !== 1 ? 's' : ''} customized
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || changedFields.size === 0}
                        className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                        <Save size={13} />
                        {saving ? 'Saving...' : 'Save My View'}
                    </button>
                </div>
            </div>
        </div>
    );
};
