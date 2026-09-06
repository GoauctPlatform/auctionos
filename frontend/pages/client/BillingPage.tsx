import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { Shield, Zap, CheckCircle, AlertTriangle, HardDrive, Star, Lock } from 'lucide-react';
import { useLanguage } from "../../context/LanguageContext";

interface UsageStats {
  used?: number;
  limit: number | string;
}

interface BillingUsage {
  plan_type: string;
  status: string;
  usage: {
    views: UsageStats;
    companies: UsageStats;
    managers: UsageStats;
    agents: UsageStats;
  };
  features: {
    community: boolean;
    tasks: boolean;
    exports: boolean;
  };
}

const BillingPage: React.FC = () => {
    const { t } = useLanguage();
  const [data, setData] = useState<BillingUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [annual, setAnnual] = useState(true);
  const [affiliateCode, setAffiliateCode] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const fetchUsage = useCallback(async () => {
    try {
      const res = await api.get('/billing/usage');
      setData(res.data);
      
      // If plan is upgraded and no longer expired, clear the trial_expired flag
      if (res.data?.status === 'active' && res.data?.plan_type !== 'trial') {
        localStorage.removeItem('trial_expired');
        // Fetch new profile in background to update tier context
        try {
          const updatedUser = await AuthService.getMe();
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (profileErr) {
          console.error("Failed to refresh profile tier:", profileErr);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load billing usage.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle redirect back from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('payment');
    const plan = params.get('plan');
    const sessionId = params.get('session_id');

    if (paymentStatus === 'success' && plan && sessionId) {
      // Confirm the payment with backend (safety net in case webhook is slow)
      api.post('/billing/confirm-payment', { session_id: sessionId, plan })
        .then(() => {
          setSuccessMessage(`🎉 Payment successful! Your account has been upgraded to ${plan.toUpperCase()}.`);
          fetchUsage();
        })
        .catch((err) => {
          // If confirm fails, still refresh usage (webhook may have already run)
          fetchUsage();
          console.warn('Payment confirmation check:', err.response?.data?.detail);
        });
    } else if (paymentStatus === 'cancelled') {
      setError('Payment was cancelled. No charges were made.');
    }
  }, [location.search, fetchUsage]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Handle back button/navigation away from billing page while expired
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If user is still expired and tries to leave billing page, redirect to expired
      if (AuthService.isTrialExpired() && data?.status === 'expired') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data]);

  const handleUpgrade = async (plan: 'advanced' | 'pro' | 'enterprise') => {
    setUpgradeLoading(plan);
    setError(null);
    try {
      const payload: any = { plan, billing_cycle: annual ? 'annual' : 'monthly' };
      if (affiliateCode.trim()) {
        payload.affiliate_code = affiliateCode.trim();
      }
      const res = await api.post('/billing/create-checkout-session', payload);
      const { checkout_url, session_id } = res.data;

      if (session_id) {
        // Real Stripe flow – redirect to the hosted Stripe checkout page
        window.location.href = checkout_url;
      } else {
        // Mock fallback – no real Stripe configured, simulate locally
        await api.post('/billing/mock-webhook', payload);
        setSuccessMessage(`✅ Mock Mode: Your plan has been upgraded to ${plan.toUpperCase()}!`);
        await fetchUsage();
        setUpgradeLoading(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upgrade failed. Please try again.');
      setUpgradeLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will be downgraded to the Trial plan immediately.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/billing/cancel-subscription');
      setSuccessMessage(res.data.message);
      await fetchUsage();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel subscription. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">{t('BillingPage.loadingBillingData')}</p>
      </div>
    </div>
  );

  if (!data) {
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300">
            <AlertTriangle size={48} className="text-red-500" />
            <h2 className="text-xl font-bold">{t('BillingPage.failedToLoadBilling')}</h2>
            <p className="text-sm">{error}</p>
            <button 
              onClick={fetchUsage} 
              className="mt-2 px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              {t('BillingPage.tryAgain')}</button>
          </div>
        </div>
      );
    }
    return null;
  }

  const isTrial = data.plan_type === 'trial';
  const isAdvanced = data.plan_type === 'advanced';
  const isPro = data.plan_type === 'pro';
  const isEnterprise = data.plan_type === 'enterprise';

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('BillingPage.billingUsage')}</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">{t('BillingPage.manageYourGoAuctSubs')}</p>
        </div>
        <div className="flex items-center gap-3">
          {data.status === 'expired' && (
            <button
              onClick={() => navigate('/client/expired')}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-sm transition-all"
            >
              {t('BillingPage.Back')}</button>
          )}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-sm ${data.status === 'active'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}>
            <Shield size={16} />
            {data.plan_type.toUpperCase()} — {data.status}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.status === 'expired' && (
        <div className="mb-6 flex items-start gap-4 p-5 bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 rounded-lg text-rose-700 dark:text-rose-300">
          <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{t('BillingPage.yourTrialPeriodHasEn')}</h3>
            <p className="text-sm mt-1">{t('BillingPage.your7DayTrialPeriodH')}</p>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300">
          <CheckCircle size={20} className="flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
          <AlertTriangle size={20} className="flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Usage Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
              <HardDrive className="text-blue-500" size={20} />
              {t('BillingPage.usageMeters')}</h2>

            <div className="space-y-6">
              <UsageBar
                label="Property Details Viewed"
                used={data.usage.views.used || 0}
                limit={data.usage.views.limit}
              />
              <LimitDisplay label="Company Profiles Allowed" limit={data.usage.companies.limit} />
              <LimitDisplay label="Manager Profiles Allowed" limit={data.usage.managers.limit} />
              <LimitDisplay label="Field Agent Profiles Allowed" limit={data.usage.agents.limit} />
            </div>

            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="font-semibold mb-4 text-slate-700 dark:text-slate-300">{t('BillingPage.featureAccess')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FeatureToggle label="Community & Groups" active={data.features.community} />
                <FeatureToggle label="Due Diligence Tasks" active={data.features.tasks} />
                <FeatureToggle label="Data Exports" active={data.features.exports} />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Cards */}
        <div id="tour-billing-plans" className="space-y-5">
          <div className="flex justify-center items-center gap-4 mb-6 mt-2">
            <span className={`text-sm font-medium ${!annual ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{t('BillingPage.monthly')}</span>
            <button 
              onClick={() => setAnnual(!annual)}
              className="relative w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center px-1 transition-colors"
            >
              <div 
                className={`w-5 h-5 bg-blue-500 rounded-full shadow-md transform transition-transform duration-300 ${annual ? 'translate-x-7' : 'translate-x-0'}`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
              {t('BillingPage.annually')}<span className="text-blue-600 dark:text-cyan-400 text-xs ml-1 bg-blue-100 dark:bg-cyan-400/10 px-2 py-0.5 rounded-full">{t('BillingPage.save20')}</span>
            </span>
          </div>

          {/* Affiliate Code Input */}
          <div className="mb-8 p-[1px] bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-500/20 dark:to-purple-500/20 rounded-2xl shadow-sm">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <span className="material-symbols-outlined text-[20px]">{t('BillingPage.handshake')}</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{t('BillingPage.haveAPartnerCode')}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('BillingPage.supportThePartnerWho')}</p>
                </div>
              </div>
              
              <div className="w-full sm:w-72 relative group mt-2 sm:mt-0">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors text-[18px]">{t('BillingPage.sell')}</span>
                <input 
                  type="text" 
                  value={affiliateCode}
                  onChange={e => setAffiliateCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:border-transparent outline-none transition-all uppercase tracking-wide placeholder:font-normal placeholder:tracking-normal"
                />
              </div>
            </div>
          </div>

          {/* Advanced Plan */}
          <div className={`relative p-6 rounded-2xl border-2 transition-all ${isAdvanced
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-lg shadow-emerald-100 dark:shadow-none'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}>
            {isAdvanced && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t('BillingPage.cURRENTPLAN')}</div>
            )}
            <div className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
              {t('BillingPage.pROMOSAVE33')}</div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('BillingPage.advanced')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('BillingPage.individualPowerPlan')}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 line-through">{annual ? "$90" : "$110"}</div>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{annual ? "$60" : "$72"}</span>
                <span className="text-sm text-slate-400">{t('BillingPage.Mo')}</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6 text-sm">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.1000PropertyDetailsV')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.1Company0Managers0Ag')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.unlimitedCustomPrope')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.calendarAuctionsTask')}</li>
            </ul>
            <button
              onClick={() => handleUpgrade('advanced')}
              disabled={isAdvanced || isPro || isEnterprise || upgradeLoading !== null}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {upgradeLoading === 'advanced' ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('BillingPage.processing')}</>
              ) : isAdvanced ? 'Current Plan' : isPro || isEnterprise ? 'Lower Plan' : (
                <><Lock size={14} /> {t('BillingPage.subscribeToAdvanced')}</>
              )}
            </button>
          </div>

          {/* Pro Plan */}
          <div className={`relative p-6 rounded-2xl border-2 transition-all ${isPro
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg shadow-blue-100 dark:shadow-none'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}>
            {isPro && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t('BillingPage.cURRENTPLAN')}</div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('BillingPage.pro')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('BillingPage.forGrowingTeams')}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{annual ? "$130" : "$156"}</span>
                <span className="text-sm text-slate-400">{t('BillingPage.Mo')}</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6 text-sm">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.2000PropertyDetailsV')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.2Companies1Manager1A')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.unlimitedCustomPrope')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.communityAccessDueDi')}</li>
            </ul>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={isPro || isEnterprise || upgradeLoading !== null}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {upgradeLoading === 'pro' ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('BillingPage.processing')}</>
              ) : isPro ? 'Current Plan' : isEnterprise ? 'Lower Plan' : (
                <><Lock size={14} /> {t('BillingPage.subscribeToPro')}</>
              )}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className={`relative p-6 rounded-2xl border-2 transition-all ${isEnterprise
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-lg shadow-purple-100 dark:shadow-none'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}>
            {isEnterprise && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t('BillingPage.cURRENTPLAN')}</div>
            )}
            <div className="absolute top-4 right-4">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('BillingPage.enterprise')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('BillingPage.forLargeScaleOperati')}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{annual ? "$350" : "$420"}</span>
                <span className="text-sm text-slate-400">{t('BillingPage.Mo')}</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6 text-sm">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.10000PropertyViews')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.4Companies2Managers3')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.unlimitedCustomPrope')}</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> {t('BillingPage.priorityExclusive247')}</li>
            </ul>
            <button
              onClick={() => handleUpgrade('enterprise')}
              disabled={isEnterprise || upgradeLoading !== null}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {upgradeLoading === 'enterprise' ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('BillingPage.processing')}</>
              ) : isEnterprise ? 'Current Plan' : (
                <><Zap size={14} /> {t('BillingPage.subscribeToEnterpris')}</>
              )}
            </button>
          </div>

          {/* Stripe Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Lock size={10} />
            {t('BillingPage.securePaymentBy')}<span className="font-bold text-slate-500">{t('BillingPage.stripe')}</span>
          </div>
        </div>
      </div>

      {/* Affiliate Program Section */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">{t('BillingPage.handshake')}</span>
            {t('BillingPage.becomeAnAffiliatePar')}</h2>
          <p className="text-sm text-blue-800/80 dark:text-blue-200/80 mb-2 max-w-2xl">
            {t('BillingPage.didYouKnowYouCanEarn')}</p>
          <ul className="text-xs text-blue-800/70 dark:text-blue-200/70 list-disc pl-4 space-y-1">
            <li>{t('BillingPage.generateCustomReferr')}</li>
            <li>{t('BillingPage.earnCommissionsForEv')}</li>
            <li>{t('BillingPage.trackLeadsConversion')}</li>
          </ul>
        </div>
        
        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
                detail: { type: 'affiliate_dashboard', title: '🤝 Affiliate Dashboard' }
              }));
            }}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <span className="material-symbols-outlined">{t('BillingPage.dashboard')}</span>
            {t('BillingPage.goToAffiliateDashboa')}</button>
        </div>
      </div>

      {/* Cancel Section */}
      <div id="tour-billing-invoice" className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-[20px]">{t('BillingPage.cancel')}</span>
          {t('BillingPage.manageSubscription')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t('BillingPage.toCancelYourSubscrip')}</p>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold mb-1">{t('BillingPage.beforeYouCancel')}</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>{t('BillingPage.youWillLoseAccessToA')}</li>
            <li>{t('BillingPage.yourSavedListsAndPro')}</li>
            <li>{t('BillingPage.cancellationTakesEff')}</li>
          </ul>
        </div>
        <button
          onClick={handleCancelSubscription}
          disabled={loading || data?.plan_type === 'trial'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">{t('BillingPage.cancel')}</span>
          {t('BillingPage.cancelSubscription')}</button>
      </div>
    </div>
  );
};

export default BillingPage;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

const UsageBar = ({ label, used, limit }: { label: string; used: number; limit: number | string }) => {
    const { t } = useLanguage();
  const isUnlimited = limit === 'Unlimited';
  const percentage = isUnlimited ? 0 : Math.min(100, (used / (limit as number)) * 100);

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-slate-500 font-mono text-xs">
          {isUnlimited ? '∞ Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${isUnlimited ? 'bg-purple-400 w-full opacity-30' : percentage > 85 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
          style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const LimitDisplay = ({ label, limit }: { label: string; limit: number | string }) => (
  <div className="flex justify-between text-sm py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
    <span className="font-medium text-slate-600 dark:text-slate-400">{label}</span>
    <span className={`font-bold ${limit === 'Unlimited' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-800 dark:text-white'}`}>
      {limit === 'Unlimited' ? '∞ Unlimited' : limit}
    </span>
  </div>
);

const FeatureToggle = ({ label, active }: { label: string; active: boolean }) => (
  <div className={`flex items-center gap-2 text-sm p-3 rounded-xl border ${active
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
    }`}>
    {active
      ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
      : <AlertTriangle size={14} className="text-slate-400 flex-shrink-0" />}
    <span className={active ? 'font-medium' : 'line-through'}>{label}</span>
  </div>
);
