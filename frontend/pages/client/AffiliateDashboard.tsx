import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const AffiliateDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentDetails, setPaymentDetails] = useState('');
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/affiliate/me');
      setProfile(res.data);
      if (res.data.status === 'approved') {
        fetchReferrals();
        fetchWithdrawals();
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Failed to fetch affiliate profile', err);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReferrals = async () => {
    try {
      const res = await api.get('/affiliate/me/referrals');
      setReferrals(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await api.get('/affiliate/me/withdrawals');
      setWithdrawals(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleApply = async () => {
    try {
      setApplying(true);
      const res = await api.post('/affiliate/apply');
      setProfile(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to apply. Please try again later.');
    } finally {
      setApplying(false);
    }
  };
  
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 50) {
      return alert(t('affiliate.minWithdraw50') || 'Minimum withdrawal is $50.');
    }
    try {
      await api.post('/affiliate/withdraw', {
        amount,
        payment_method: 'Pix',
        payment_details: user?.email // simplistic for now
      });
      alert('Withdrawal requested successfully!');
      setWithdrawAmount('');
      fetchProfile();
      fetchWithdrawals();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Withdrawal failed');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t('common.loading')}</div>;
  }

  // Not applied yet
  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-xl border border-slate-100 dark:border-slate-700">
          <div className="size-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px]">handshake</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{t('affiliate.applyTitle')}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
            {t('affiliate.applyDesc')}
          </p>
          
          <button 
            onClick={handleApply}
            disabled={applying}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
          >
            {applying ? t('common.loading') : t('affiliate.apply')}
          </button>
        </div>
      </div>
    );
  }

  // Pending approval
  if (profile.status === 'pending') {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-xl border border-slate-100 dark:border-slate-700">
          <div className="size-20 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px]">hourglass_empty</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{t('affiliate.applicationPending')}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
            {t('affiliate.applicationPendingDesc')}
          </p>
        </div>
      </div>
    );
  }

  // Approved Dashboard
  const referralLink = `${window.location.origin}/#/signup?ref=${profile.affiliate_code}`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">{t('affiliate.dashboard')}</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back, Partner.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('affiliate.referralCode')}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-white">{profile.affiliate_code}</span>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(referralLink);
              alert(t('affiliate.codeCopied'));
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold transition-colors"
          >
            {t('affiliate.copyCode')}
          </button>
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{t('affiliate.totalReferrals')}</span>
          <div className="text-3xl font-black text-slate-800 dark:text-white mt-2">{referrals.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{t('affiliate.conversions')}</span>
          <div className="text-3xl font-black text-slate-800 dark:text-white mt-2">
            {referrals.filter(r => r.status === 'converted').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{t('affiliate.earnings')}</span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ${profile.total_earnings.toFixed(2)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <span className="text-blue-100 text-xs font-bold uppercase tracking-wider">{t('affiliate.availableBalance')}</span>
          <div className="text-3xl font-black mt-2">
            ${profile.available_balance.toFixed(2)}
          </div>
          {profile.available_balance >= 50 && (
            <div className="mt-4 flex gap-2">
              <input 
                type="number" 
                min="50" 
                max={profile.available_balance}
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Amt"
                className="w-20 px-2 py-1 rounded bg-white/20 border border-white/30 text-white placeholder:text-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button 
                onClick={handleWithdraw}
                className="flex-1 py-1 bg-white text-blue-600 text-sm font-bold rounded hover:bg-blue-50 transition-colors"
              >
                {t('affiliate.requestWithdraw')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Referrals Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
          <h2 className="font-bold text-slate-800 dark:text-white">{t('affiliate.referralsTable')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="p-4">{t('common.date')}</th>
                <th className="p-4">{t('common.status')}</th>
                <th className="p-4">{t('affiliate.commission')}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800/60">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">{t('common.noData')}</td>
                </tr>
              ) : referrals.map(ref => (
                <tr key={ref.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 text-slate-800 dark:text-slate-300">
                    {new Date(ref.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      ref.status === 'converted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : ref.status === 'churned' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {t(`affiliate.${ref.status}`)}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-300">
                    {ref.status === 'registered' ? (
                      <span className="text-blue-600 dark:text-blue-400 text-xs">{t('affiliate.freeMonth')}</span>
                    ) : (
                      `$${ref.commission_amount.toFixed(2)}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};
