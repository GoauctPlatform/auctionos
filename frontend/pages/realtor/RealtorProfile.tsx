import React, { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { RealtorService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';
import { useLanguage } from "../../context/LanguageContext";

const RealtorProfile: React.FC = () => {
    const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', commission_model: '' });
  const [saved, setSaved] = useState(false);
  const user = AuthService.getCurrentUser();

  useEffect(() => {
    RealtorService.getMe()
      .then(p => { setProfile(p); setForm({ name: p.name || '', phone: p.phone || '', commission_model: p.commission_model || '' }); })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await RealtorService.updateMe(form);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><CircularProgress color="success" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('RealtorProfile.myProfile')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('RealtorProfile.manageYourRealtorAcc')}</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
        <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-2xl shrink-0">
          {(form.name || user?.email || 'C').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{form.name || user?.email}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
            profile?.verification_status === 'verified'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          }`}>
            {profile?.verification_status === 'verified' ? '✓ Verified Partner' : '⏳ Verification Pending'}
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-500">{t('RealtorProfile.edit')}</span>
          {t('RealtorProfile.editInformation')}</h2>
        {[
          { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name' },
          { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
          { label: 'Commission Model', key: 'commission_model', type: 'text', placeholder: 'e.g. 3%, negotiable' },
        ].map(field => (
          <label key={field.key} className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{field.label}</span>
            <input
              type={field.type}
              value={(form as any)[field.key]}
              onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
        >
          {saving ? (
            <><CircularProgress size={14} color="inherit" /> {t('RealtorProfile.saving')}</>
          ) : saved ? '✅ Saved!' : (
            <><span className="material-symbols-outlined text-[18px]">{t('RealtorProfile.save')}</span> {t('RealtorProfile.saveChanges')}</>
          )}
        </button>
      </div>

      {/* Account Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">{t('RealtorProfile.account')}</h2>
        {[
          { label: 'Email', value: user?.email },
          { label: 'Role', value: 'Realtor Partner' },
          { label: 'Member ID', value: `#${profile?.id || '—'}` },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <span className="text-xs text-slate-500">{row.label}</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealtorProfile;
