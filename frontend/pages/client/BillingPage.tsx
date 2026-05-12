import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Shield, Zap, CheckCircle, AlertTriangle, HardDrive } from 'lucide-react';

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

  const fetchUsage = async () => {
    try {
      const res = await api.get('/billing/usage');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load billing usage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    setUpgradeLoading(plan);
    try {
      const res = await api.post('/billing/create-checkout-session', { plan });
      // Mock flow: immediately call the mock webhook to simulate successful payment
      alert(res.data.message + "\n\n(Mock Mode: Simulating successful payment...)");
      await api.post('/billing/mock-webhook', { plan });
      await fetchUsage();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Upgrade failed.');
    } finally {
      setUpgradeLoading(null);
    }
  };

  if (loading) return <div className="p-8">Loading billing data...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!data) return null;

  const isTrial = data.plan_type === 'trial';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Usage</h1>
          <p className="text-gray-500 mt-1">Manage your GoAuct subscription and resource limits.</p>
        </div>
        <div className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
          data.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <Shield size={20} />
          Current Plan: {data.plan_type.toUpperCase()} ({data.status})
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><HardDrive className="text-blue-500" /> Usage Meters</h2>
            
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

            <div className="mt-8 border-t pt-6">
              <h3 className="font-semibold mb-3">Feature Access</h3>
              <div className="grid grid-cols-2 gap-4">
                <FeatureToggle label="Community & Groups" active={data.features.community} />
                <FeatureToggle label="Create Due Diligence Tasks" active={data.features.tasks} />
                <FeatureToggle label="Data Exports" active={data.features.exports} />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Section */}
        <div className="space-y-6">
          {/* Pro Plan */}
          <div className={`p-6 rounded-xl border-2 ${data.plan_type === 'pro' ? 'border-blue-500 bg-blue-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Pro</h3>
              <span className="text-xl font-bold text-gray-500">$130<span className="text-sm font-normal">/mo</span></span>
            </div>
            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 5,000 Property Views</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 5 Companies, 2 Managers, 10 Agents</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 100 Custom Properties</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Community Access</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Data Exports & Tasks</li>
            </ul>
            <button 
              onClick={() => handleUpgrade('pro')}
              disabled={data.plan_type === 'pro' || data.plan_type === 'enterprise'}
              className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {upgradeLoading === 'pro' ? 'Processing...' : data.plan_type === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className={`p-6 rounded-xl border-2 ${data.plan_type === 'enterprise' ? 'border-purple-500 bg-purple-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Enterprise</h3>
              <span className="text-xl font-bold text-gray-500">$350<span className="text-sm font-normal">/mo</span></span>
            </div>
            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Unlimited Property Views</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Unlimited Team Members</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Unlimited Custom Properties</li>
              <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Priority Exclusive Support</li>
            </ul>
            <button 
              onClick={() => handleUpgrade('enterprise')}
              disabled={data.plan_type === 'enterprise'}
              className="w-full py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {upgradeLoading === 'enterprise' ? 'Processing...' : data.plan_type === 'enterprise' ? 'Current Plan' : <><Zap size={16}/> Upgrade to Enterprise</>}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-[20px]">cancel</span>
          Manage Subscription
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Want to cancel your subscription? Please read the information below before proceeding.
        </p>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold mb-1">Before you cancel:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>You will lose access to all premium features at the end of your billing period</li>
            <li>Your saved lists and watchlists will be retained for 30 days</li>
            <li>Cancellation takes effect at the end of your current billing period</li>
          </ul>
        </div>
        <a
          href="/client/contact-support"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">contact_support</span>
          Contact Support to Cancel
        </a>
      </div>
    </div>
  );
};

export default BillingPage;

// --- Helper Components ---

const UsageBar = ({ label, used, limit }: { label: string; used: number; limit: number | string }) => {
  const isUnlimited = limit === 'Unlimited';
  const percentage = isUnlimited ? 0 : Math.min(100, (used / (limit as number)) * 100);
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500">{used} / {limit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

const LimitDisplay = ({ label, limit }: { label: string; limit: number | string }) => (
  <div className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700">
    <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
    <span className="font-bold text-gray-900 dark:text-white">{limit}</span>
  </div>
);

const FeatureToggle = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex items-center gap-2 text-sm">
    {active ? <CheckCircle size={18} className="text-green-500" /> : <AlertTriangle size={18} className="text-gray-400" />}
    <span className={active ? "text-gray-900 dark:text-gray-100" : "text-gray-400 line-through"}>{label}</span>
  </div>
);
