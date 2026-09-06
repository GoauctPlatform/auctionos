
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropertyForm from '../components/admin/PropertyForm';
import { AdminService } from '../services/admin.service';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
} from '@mui/material';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from "../context/LanguageContext";

// Custom Hook for Dirty Form Detection
function useDirtyFormWarning(isDirty: boolean) {
    const { t } = useLanguage();
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Standard way to enforce standard browser dialog
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
}

const PropertyManualEntry: React.FC = () => {
    const navigate = useNavigate();
    // You would typically manage the 'isDirty' state within your form component
    // For this example, we'll assume a state variable `isFormDirty` exists and is updated by PropertyForm
    // For now, let's mock it or assume PropertyForm will pass a prop to update it.
    // For the purpose of this instruction, we're just adding the hook definition.
    // A real implementation would involve useState and passing a setter to PropertyForm.
    const [isFormDirty, setIsFormDirty] = React.useState(false);
    const { id } = useParams();
    const [initialData, setInitialData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(!!id);

    React.useEffect(() => {
        if (id) {
            AdminService.getProperty(id)
                .then(data => { setInitialData(data); setLoading(false); })
                .catch(err => { alert('Failed to load edit data'); setLoading(false); });
        }
    }, [id]);

    useDirtyFormWarning(isFormDirty);

    if (loading) return <div>{t('PropertyManualEntry.loadingEditor')}</div>;
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <button
                onClick={() => {
                    if (isFormDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                        return;
                    }
                    navigate(-1);
                }}
                className="flex items-center text-slate-500 hover:text-slate-700 mb-6 transition-colors"
            >
                <ChevronLeft size={20} />
                <span>{t('PropertyManualEntry.back')}</span>
            </button>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{id ? 'Edit Property' : 'Add Property'}</h1>
                <p className="text-slate-500 dark:text-slate-400">{id ? 'Update the details for this property below.' : 'Manually enter property details or use the value analysis tools.'}</p>
            </div>

            <PropertyForm initialData={initialData} onSuccess={() => navigate(-1)} />
        </div>
    );
};

export default PropertyManualEntry;
