import React, { useState } from 'react';
import { AuthService } from '../../services/auth.service';
import { useLanguage } from "../../context/LanguageContext";

const ChangePasswordPage: React.FC = () => {
    const { t } = useLanguage();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState<'idle' | 'success' | 'loading'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
        setError("New passwords do not match.");
        return;
    }
    
    setStatus('loading');
    setError('');
    try {
        await AuthService.changePassword(form.current, form.next);
        setStatus('success');
        setForm({ current: '', next: '', confirm: '' });
        setTimeout(() => setStatus('idle'), 5000);
    } catch (err: any) {
        setError(err.message || 'Failed to update password');
        setStatus('idle');
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t('ChangePasswordPage.securityPassword')}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">{t('ChangePasswordPage.manageYourAccountSec')}</p>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('ChangePasswordPage.currentPassword')}<span className="text-red-500 ml-1">*</span>
            </label>
            <input
                type="password"
                value={form.current}
                onChange={(e) => setForm(prev => ({ ...prev, current: e.target.value }))}
                required
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('ChangePasswordPage.newPassword')}<span className="text-red-500 ml-1">*</span>
            </label>
            <input
                type="password"
                value={form.next}
                onChange={(e) => setForm(prev => ({ ...prev, next: e.target.value }))}
                required
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('ChangePasswordPage.confirmNewPassword')}<span className="text-red-500 ml-1">*</span>
            </label>
            <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm(prev => ({ ...prev, confirm: e.target.value }))}
                required
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{t('ChangePasswordPage.error')}</span>
                {error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full mt-2 py-2.5 px-4 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' && <span className="material-symbols-outlined animate-spin text-[18px]">{t('ChangePasswordPage.progressactivity')}</span>}
            {status === 'loading' ? 'Updating...' : 'Update Password'}
          </button>
          
          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800 text-sm">
              <span className="material-symbols-outlined text-[18px]">{t('ChangePasswordPage.checkcircle')}</span>
              {t('ChangePasswordPage.passwordUpdatedSucce')}</div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
