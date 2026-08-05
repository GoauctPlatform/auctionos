import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { API_URL, getHeaders } from '../../services/httpClient';

export const AdminAffiliates: React.FC = () => {
  const { t } = useLanguage();
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'affiliates' | 'withdrawals'>('affiliates');

  useEffect(() => {
    if (tab === 'affiliates') {
      fetchAffiliates();
    } else {
      fetchWithdrawals();
    }
  }, [tab]);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/affiliate/admin/all`, { headers: getHeaders() });
      if (res.ok) setAffiliates(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/affiliate/admin/withdrawals`, { headers: getHeaders() });
      if (res.ok) setWithdrawals(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/affiliate/admin/${id}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) fetchAffiliates();
    } catch (err) {
      console.error(err);
      alert('Failed to approve');
    }
  };

  const handleApproveWithdrawal = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/affiliate/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) fetchWithdrawals();
    } catch (err) {
      console.error(err);
      alert('Failed to approve withdrawal');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Affiliate Management</h1>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setTab('affiliates')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${tab === 'affiliates' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            Affiliates
          </button>
          <button 
            onClick={() => setTab('withdrawals')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${tab === 'withdrawals' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            Withdrawals
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {tab === 'affiliates' ? (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
              <th className="p-4">User ID</th>
              <th className="p-4">Code</th>
              <th className="p-4">Status</th>
              <th className="p-4">Earnings / Bal</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>
            ) : affiliates.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No affiliates found.</td></tr>
            ) : (
              affiliates.map(aff => (
                <tr key={aff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-bold">{aff.user_id}</td>
                  <td className="p-4 font-mono text-blue-600">{aff.affiliate_code}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                      aff.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {aff.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-emerald-600 font-bold">${aff.total_earnings?.toFixed(2) || '0.00'}</span>
                    <span className="text-slate-400 mx-2">/</span>
                    <span className="text-blue-600 font-bold">${aff.available_balance?.toFixed(2) || '0.00'}</span>
                  </td>
                  <td className="p-4">
                    {aff.status === 'pending' && (
                      <button 
                        onClick={() => handleApprove(aff.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
              <th className="p-4">Date</th>
              <th className="p-4">Affiliate ID</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Method / Details</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
            ) : withdrawals.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No withdrawals found.</td></tr>
            ) : (
              withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">{w.affiliate_id}</td>
                  <td className="p-4 font-bold text-slate-800 dark:text-white">${w.amount.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="font-bold">{w.payment_method}</div>
                    <div className="text-xs text-slate-500 font-mono mt-1">{w.payment_details}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                      w.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {w.status === 'pending' && (
                      <button 
                        onClick={() => handleApproveWithdrawal(w.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors"
                      >
                        Mark Processed
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};

export default AdminAffiliates;
