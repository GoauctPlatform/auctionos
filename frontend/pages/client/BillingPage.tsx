import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { Shield, Zap, CheckCircle, AlertTriangle, HardDrive, Star, Lock } from 'lucide-react';

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
  const [data, setData] = useState<BillingUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const location = useLocation();

  const fetchUsage = useCallback(async () => {
    try {
      const res = await api.get('/billing/usage');
      setData(res.data);
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

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    setUpgradeLoading(plan);
    setError(null);
    try {
      const res = await api.post('/billing/create-checkout-session', { plan });
      const { checkout_url, session_id } = res.data;

      if (session_id) {
        // Real Stripe flow – redirect to the hosted Stripe checkout page
        window.location.href = checkout_url;
      } else {
        // Mock fallback – no real Stripe configured, simulate locally
        await api.post('/billing/mock-webhook', { plan });
        setSuccessMessage(`✅ Mock Mode: Your plan has been upgraded to ${plan.toUpperCase()}!`);
        await fetchUsage();
        setUpgradeLoading(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upgrade failed. Please try again.');
      setUpgradeLoading(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading billing data...</p>
      </div>
    </div>
  );

  if (!data) return null;

  const isTrial = data.plan_type === 'trial';
  const isPro = data.plan_type === 'pro';
  const isEnterprise = data.plan_type === 'enterprise';

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Usage</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Manage your GoAuct subscription and resource limits.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-sm ${data.status === 'active'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
          <Shield size={16} />
          {data.plan_type.toUpperCase()} — {data.status}
        </div>
      </div>

      {/* Alerts */}
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
              Usage Meters
            </h2>

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
              <h3 className="font-semibold mb-4 text-slate-700 dark:text-slate-300">Feature Access</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FeatureToggle label="Community & Groups" active={data.features.community} />
                <FeatureToggle label="Due Diligence Tasks" active={data.features.tasks} />
                <FeatureToggle label="Data Exports" active={data.features.exports} />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Cards */}
        <div className="space-y-5">

          {/* Pro Plan */}
          <div className={`relative p-6 rounded-2xl border-2 transition-all ${isPro
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg shadow-blue-100 dark:shadow-none'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}>
            {isPro && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                CURRENT PLAN
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Pro</h3>
                <p className="text-xs text-slate-400 mt-0.5">For growing teams</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-800 dark:text-white">US$130</span>
                <span className="text-sm text-slate-400">/mo</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6 text-sm">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> 5,000 property details views</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> 5 Companies · 2 Managers · 10 Agents</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> 100 Custom properties</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> Community access & data exports</li>
            </ul>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={isPro || isEnterprise || upgradeLoading !== null}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {upgradeLoading === 'pro' ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
              ) : isPro ? 'Current Plan' : isEnterprise ? 'Lower Plan' : (
                <><Lock size={14} /> Subscribe to Pro</>
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
                CURRENT PLAN
              </div>
            )}
            <div className="absolute top-4 right-4">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Enterprise</h3>
                <p className="text-xs text-slate-400 mt-0.5">For large scale operations</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-800 dark:text-white">US$350</span>
                <span className="text-sm text-slate-400">/mo</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6 text-sm">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> Unlimited property views</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> Unlimited team members</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> Unlimited custom properties</li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><CheckCircle size={14} className="text-green-500 flex-shrink-0" /> Priority exclusive support</li>
            </ul>
            <button
              onClick={() => handleUpgrade('enterprise')}
              disabled={isEnterprise || upgradeLoading !== null}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {upgradeLoading === 'enterprise' ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
              ) : isEnterprise ? 'Current Plan' : (
                <><Zap size={14} /> Subscribe to Enterprise</>
              )}
            </button>
          </div>

          {/* Stripe Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Lock size={10} />
            Secure payment by <span className="font-bold text-slate-500">Stripe</span>
          </div>
        </div>
      </div>

      {/* Cancel Section */}
      <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-[20px]">cancel</span>
          Manage Subscription
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          To cancel your subscription or request a refund, please contact our support team.
        </p>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold mb-1">Before you cancel:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>You will lose access to all premium features at the end of the billing period.</li>
            <li>Your saved lists and properties are kept for 30 days.</li>
            <li>Cancellation takes effect at the end of your current billing cycle.</li>
          </ul>
        </div>
        <a
          href="/client/support"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">contact_support</span>
          Contact Support to Cancel
        </a>
      </div>
    </div>
  );
};

export default BillingPage;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

const UsageBar = ({ label, used, limit }: { label: string; used: number; limit: number | string }) => {
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
