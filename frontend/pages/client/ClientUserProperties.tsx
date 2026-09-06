import React, { useState, useEffect } from 'react';
import { Typography, Button, IconButton, Dialog, TextField, CircularProgress } from '@mui/material';
import { UserPropertyService, CustomPropertyPayload } from '../../services/user_property.service';
import { PlusIcon, Edit2Icon, Trash2Icon, ArrowLeftIcon } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { ClientDataService } from '../../services/property.service';
import { AuthService } from '../../services/auth.service';
import { useLanguage } from "../../context/LanguageContext";

interface Props {
    onBack?: () => void;
}

const EMPTY_FORM: CustomPropertyPayload = {
    address: '', city: '', state: '', zip_code: '', property_type: '', assessed_value: 0, visibility: 'private',
    parcel_id: '', county: '', bedrooms: 0, bathrooms: 0, sqft: 0, year_built: 0, amount_due: 0,
    owner_name: '', lot_size: 0, occupancy: '', description: '', tax_amount: 0, tax_year: 0,
    legal_description: '', zoning: '', num_units: 0
};

export const ClientUserProperties: React.FC<Props> = ({ onBack }) => {
    const { t } = useLanguage();
    const { activeCompany } = useCompany();
    const user = AuthService.getCurrentUser();
    const [lists, setLists] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CustomPropertyPayload>(EMPTY_FORM);

    const loadProperties = async () => {
        setLoading(true);
        try {
            const data = await UserPropertyService.getAll();
            setProperties(data);
        } catch (err) {
            console.error('Failed to load user properties', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLists = async () => {
        if (!activeCompany?.id) return;
        try {
            const fetchedLists = await ClientDataService.getLists(activeCompany.id);
            setLists(fetchedLists);
        } catch (e) {
            console.error('Failed to load lists', e);
        }
    };

    useEffect(() => {
        loadProperties();
        loadLists();
    }, [activeCompany?.id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingId) {
                await UserPropertyService.update(editingId, formData);
            } else {
                await UserPropertyService.create(formData);
            }
            setModalOpen(false);
            setEditingId(null);
            setFormData(EMPTY_FORM);
            await loadProperties();
        } catch (err: any) {
            alert(err.message || 'Error saving property');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, address: string) => {
        if (!window.confirm(`Delete "${address || 'this property'}"? This action cannot be undone.`)) return;
        setDeleting(id);
        try {
            await UserPropertyService.delete(id);
            await loadProperties();
        } catch (err: any) {
            alert(err.message || 'Error deleting property');
        } finally {
            setDeleting(null);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditingId(p.id);
        setFormData({
            address: p.address || '', city: p.city || '', state: p.state || '', zip_code: p.zip_code || '',
            property_type: p.property_type || '', assessed_value: p.assessed_value || 0, visibility: p.visibility || 'private',
            parcel_id: p.parcel_id || '', county: p.county || '', bedrooms: p.bedrooms || 0,
            bathrooms: p.bathrooms || 0, sqft: p.sqft || 0, year_built: p.year_built || 0,
            amount_due: p.amount_due || 0, owner_name: p.owner_name || '', lot_size: p.lot_size || 0,
            occupancy: p.occupancy || '', description: p.description || '', tax_amount: p.tax_amount || 0,
            tax_year: p.tax_year || 0, legal_description: p.legal_description || '', zoning: p.zoning || '',
            num_units: p.num_units || 0
        });
        setModalOpen(true);
    };

    const f = (field: keyof CustomPropertyPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const v = e.target.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
        setFormData(prev => ({ ...prev, [field]: v }));
    };

    return (
        <div className="flex-1 flex flex-col p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <IconButton onClick={onBack} size="small" className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800">
                            <ArrowLeftIcon size={18} className="text-slate-600 dark:text-slate-300" />
                        </IconButton>
                    )}
                    <div>
                        <Typography variant="h5" className="font-bold text-slate-800 dark:text-white">{t('ClientUserProperties.myProperties')}</Typography>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('ClientUserProperties.customPropertiesCrea')}{user?.email?.split('@')[0]} · {activeCompany?.name || 'No company'}
                        </p>
                    </div>
                </div>
                <Button
                    variant="contained" color="primary"
                    startIcon={<PlusIcon size={18} />}
                    onClick={openCreate}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                    {t('ClientUserProperties.addProperty')}</Button>
            </div>

            {/* Properties Grid */}
            {loading ? (
                <div className="flex justify-center p-10"><CircularProgress /></div>
            ) : properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                    <span className="material-symbols-outlined text-[56px] mb-4 opacity-40">{t('ClientUserProperties.realestateagent')}</span>
                    <Typography className="font-semibold">{t('ClientUserProperties.noCustomPropertiesYe')}</Typography>
                    <p className="text-sm mt-1">{t('ClientUserProperties.createACustomPropert')}</p>
                    <button onClick={openCreate} className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{t('ClientUserProperties.add')}</span> {t('ClientUserProperties.addFirstProperty')}</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col group hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col flex-1 min-w-0">
                                    <Typography variant="subtitle1" className="font-bold text-slate-800 dark:text-white truncate">
                                        {p.address || 'Untitled Property'}
                                    </Typography>
                                    {p.parcel_id && (
                                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">{t('ClientUserProperties.pID')}{p.parcel_id}</span>
                                    )}
                                </div>
                                <div className="flex gap-1 shrink-0 ml-2">
                                    <IconButton
                                        size="small"
                                        onClick={() => openEdit(p)}
                                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                        <Edit2Icon size={14} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => p.id && handleDelete(p.id, p.address)}
                                        disabled={deleting === p.id}
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        {deleting === p.id
                                            ? <span className="material-symbols-outlined animate-spin text-[14px]">{t('ClientUserProperties.progressactivity')}</span>
                                            : <Trash2Icon size={14} />
                                        }
                                    </IconButton>
                                </div>
                            </div>

                            <Typography variant="body2" className="text-slate-500 mb-2">
                                {[p.city, p.county, p.state].filter(Boolean).join(', ')}
                            </Typography>

                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {p.property_type && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{p.property_type}</span>
                                )}
                                {p.bedrooms > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{p.bedrooms}bd</span>}
                                {p.bathrooms > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{p.bathrooms}ba</span>}
                                {p.sqft > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{p.sqft?.toLocaleString()} {t('ClientUserProperties.sqft')}</span>}
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold">{t('ClientUserProperties.assessedValue')}</span>
                                    <span className="text-sm font-bold text-emerald-600">${p.assessed_value?.toLocaleString() || '0'}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold">{t('ClientUserProperties.openingBid')}</span>
                                    <span className="text-sm font-bold text-red-500">${p.amount_due?.toLocaleString() || '0'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
                <Typography variant="h6" className="font-bold mb-4">
                    {editingId ? 'Edit Property' : 'New Custom Property'}
                </Typography>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                        <TextField label="Parcel ID" size="small" value={formData.parcel_id || ''} onChange={f('parcel_id')} fullWidth />
                        <TextField label="County" size="small" value={formData.county || ''} onChange={f('county')} fullWidth />
                    </div>
                    <TextField label="Address" size="small" value={formData.address || ''} onChange={f('address')} fullWidth />
                    <div className="flex gap-3">
                        <TextField label="City" size="small" value={formData.city || ''} onChange={f('city')} fullWidth />
                        <TextField label="State" size="small" value={formData.state || ''} onChange={f('state')} sx={{ width: 100 }} />
                        <TextField label="Zip" size="small" value={formData.zip_code || ''} onChange={f('zip_code')} sx={{ width: 120 }} />
                    </div>
                    <TextField label="Description" size="small" multiline rows={2} value={formData.description || ''} onChange={f('description')} fullWidth />
                    <div className="flex gap-3">
                        <TextField label="Property Type" size="small" value={formData.property_type || ''} onChange={f('property_type')} fullWidth />
                        <TextField label="Occupancy" size="small" value={formData.occupancy || ''} onChange={f('occupancy')} fullWidth />
                    </div>
                    <div className="flex gap-3">
                        <TextField label="Beds" type="number" size="small" value={formData.bedrooms || ''} onChange={f('bedrooms')} fullWidth />
                        <TextField label="Baths" type="number" size="small" value={formData.bathrooms || ''} onChange={f('bathrooms')} fullWidth />
                        <TextField label="Year Built" type="number" size="small" value={formData.year_built || ''} onChange={f('year_built')} fullWidth />
                    </div>
                    <div className="flex gap-3">
                        <TextField label="SqFt" type="number" size="small" value={formData.sqft || ''} onChange={f('sqft')} fullWidth />
                        <TextField label="Lot Size" type="number" size="small" value={formData.lot_size || ''} onChange={f('lot_size')} fullWidth />
                    </div>
                    <div className="flex gap-3">
                        <TextField label="Assessed Value ($)" type="number" size="small" value={formData.assessed_value || ''} onChange={f('assessed_value')} fullWidth />
                        <TextField label="Opening Bid ($)" type="number" size="small" value={formData.amount_due || ''} onChange={f('amount_due')} fullWidth />
                    </div>
                    <div className="flex gap-3">
                        <TextField label="Owner Name" size="small" value={formData.owner_name || ''} onChange={f('owner_name')} fullWidth />
                        <TextField label="Zoning" size="small" value={formData.zoning || ''} onChange={f('zoning')} fullWidth />
                    </div>
                    <div className="flex gap-3">
                        <TextField label="# Units" type="number" size="small" value={formData.num_units || ''} onChange={f('num_units')} fullWidth />
                        <TextField label="Tax Amount ($)" type="number" size="small" value={formData.tax_amount || ''} onChange={f('tax_amount')} fullWidth />
                        <TextField label="Tax Year" type="number" size="small" value={formData.tax_year || ''} onChange={f('tax_year')} fullWidth />
                    </div>
                    <TextField label="Legal Description" size="small" multiline rows={2} value={formData.legal_description || ''} onChange={f('legal_description')} fullWidth />
                    {!editingId && (
                        <div className="mt-1">
                            <TextField select SelectProps={{ native: true }} label="Target Folder" size="small" fullWidth
                                value={formData.target_list_id || ''}
                                onChange={e => setFormData({ ...formData, target_list_id: e.target.value ? parseInt(e.target.value) : undefined })}
                            >
                                <option value="">{t('ClientUserProperties.DefaultCustomFolder')}</option>
                                {lists.map(list => (
                                    <option key={list.id} value={list.id}>{list.name}</option>
                                ))}
                            </TextField>
                        </div>
                    )}
                    <div className="mt-1">
                        <TextField select SelectProps={{ native: true }} label="Visibility" size="small" fullWidth
                            value={formData.visibility || 'private'}
                            onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                        >
                            <option value="private">{t('ClientUserProperties.privateOnlyMyCompany')}</option>
                            <option value="public">{t('ClientUserProperties.publicShareWithNetwo')}</option>
                        </TextField>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => { setModalOpen(false); setEditingId(null); }} color="inherit">{t('ClientUserProperties.cancel')}</Button>
                        <Button onClick={handleSave} variant="contained" color="primary" disabled={saving}>
                            {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Property')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
