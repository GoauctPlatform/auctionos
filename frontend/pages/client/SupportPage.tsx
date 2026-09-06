import React, { useState, useEffect } from 'react';
import { API_URL, getHeaders } from '../../services/httpClient';
import { AuthService } from '../../services/auth.service';
import { useLanguage } from "../../context/LanguageContext";

const ClientSupportPage: React.FC = () => {
    const { t } = useLanguage();
  const currentUser = AuthService.getCurrentUser();
  const isClient = currentUser?.role === 'client';
  
  const [activeTab, setActiveTab] = useState<'support' | 'security' | 'billing'>('support');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Change Password State
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [pwdError, setPwdError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch(`${API_URL}/auth/contact-support`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message
        })
      });
      if (!res.ok) throw new Error('Failed to send message');
      setStatus('success');
      setForm({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => setStatus('idle'), 4000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }
    setPwdStatus('submitting');
    setPwdError('');
    try {
      const res = await fetch(`${API_URL}/users/me/password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          current_password: pwdForm.currentPassword,
          new_password: pwdForm.newPassword
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update password");
      }
      setPwdStatus('success');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwdStatus('idle'), 4000);
    } catch (err: any) {
      setPwdStatus('error');
      setPwdError(err.message);
    }
  };

  const [billingInfo, setBillingInfo] = useState<{tier: string, searches: number} | null>(null);
  useEffect(() => {
    if (activeTab === 'billing' && !billingInfo) {
      fetch(`${API_URL}/users/me`, { headers: getHeaders() })
        .then(res => res.json())
        .then(data => setBillingInfo({
          tier: data.subscription_tier || 'trial',
          searches: data.property_searches_used || 0
        }))
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  const limitMap: Record<string, number> = {
    'trial': 5,
    'advanced': 1000,
    'pro': 2000,
    'enterprise': 10000
  };

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('SupportPage.contactSupport')}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        {t('SupportPage.sendUsAMessageAndOur')}</p>

      {activeTab === 'support' ? (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('SupportPage.name')}<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your full name"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t('SupportPage.phone')}</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(555) 000-0000"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t('SupportPage.email')}<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t('SupportPage.message')}<span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Describe your question or issue in detail..."
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">{t('SupportPage.refresh')}</span>
                {t('SupportPage.sending')}</>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">{t('SupportPage.send')}</span>
                {t('SupportPage.sendMessage')}</>
            )}
          </button>

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800 text-sm">
              <span className="material-symbols-outlined text-[18px]">{t('SupportPage.checkcircle')}</span>
              {t('SupportPage.messageSentOurTeamWi')}</div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 text-sm">
              <span className="material-symbols-outlined text-[18px]">{t('SupportPage.error')}</span>
              {t('SupportPage.failedToSendMessageP')}</div>
          )}
        </form>
      </div>
      ) : activeTab === 'security' ? (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('SupportPage.changePassword')}</h2>
        <p className="text-sm text-slate-500 mb-6">{t('SupportPage.updateYourAccountPas')}</p>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('SupportPage.currentPassword')}</label>
            <input
              type="password"
              value={pwdForm.currentPassword}
              onChange={e => setPwdForm(p => ({...p, currentPassword: e.target.value}))}
              required
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('SupportPage.newPassword')}</label>
            <input
              type="password"
              value={pwdForm.newPassword}
              onChange={e => setPwdForm(p => ({...p, newPassword: e.target.value}))}
              required
              minLength={6}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('SupportPage.confirmNewPassword')}</label>
            <input
              type="password"
              value={pwdForm.confirmPassword}
              onChange={e => setPwdForm(p => ({...p, confirmPassword: e.target.value}))}
              required
              minLength={6}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
            />
          </div>

          {pwdError && <div className="text-red-500 text-sm font-medium">{pwdError}</div>}

          <button
            type="submit"
            disabled={pwdStatus === 'submitting'}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {pwdStatus === 'submitting' ? 'Updating...' : 'Update Password'}
          </button>

          {pwdStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
              <span className="material-symbols-outlined text-[18px]">{t('SupportPage.checkcircle')}</span>
              {t('SupportPage.passwordUpdatedSucce')}</div>
          )}
        </form>
      </div>
      ) : (activeTab === 'billing' && isClient) ? (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t('SupportPage.currentPlan')}<span className="uppercase text-blue-600">{billingInfo?.tier || '...'}</span></h2>
        
        <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">{t('SupportPage.propertyDetailsSearc')}</span>
                <span className="text-slate-500">{billingInfo?.searches} / {billingInfo ? (limitMap[billingInfo.tier] === 999999 ? 'Unlimited' : limitMap[billingInfo.tier]) : '...'}</span>
            </div>
            {billingInfo && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div 
                        className={`h-2.5 rounded-full ${billingInfo.tier === 'trial' && billingInfo.searches >= 5 ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, (billingInfo.searches / limitMap[billingInfo.tier]) * 100)}%` }}
                    ></div>
                </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
                {t('SupportPage.yourQuotaIsConsumedE')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t('SupportPage.proPlan')}</h3>
                <p className="text-slate-500 text-sm mt-1 mb-4">{t('SupportPage.2000PropertySearches')}</p>
                <div className="text-2xl font-black text-slate-800 dark:text-white mb-4">{t('SupportPage.130')}<span className="text-sm font-medium text-slate-500">{t('SupportPage.Mo')}</span></div>
                <button className="w-full py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition-colors">{t('SupportPage.upgradeToPro')}</button>
            </div>
            <div className="border-2 border-blue-500 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-xl relative">
                <span className="absolute -top-3 right-4 bg-blue-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">{t('SupportPage.recommended')}</span>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t('SupportPage.enterprise')}</h3>
                <p className="text-slate-500 text-sm mt-1 mb-4">{t('SupportPage.10000SearchesPriorit')}</p>
                <div className="text-2xl font-black text-slate-800 dark:text-white mb-4">{t('SupportPage.350')}<span className="text-sm font-medium text-slate-500">{t('SupportPage.Mo')}</span></div>
                <button className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">{t('SupportPage.upgradeToEnterprise')}</button>
            </div>
        </div>
      </div>
      ) : null}
    </div>
  );
};

export default ClientSupportPage;
