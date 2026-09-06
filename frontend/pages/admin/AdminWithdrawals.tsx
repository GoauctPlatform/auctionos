import React, { useEffect, useState } from 'react';
import { CircularProgress, Button } from '@mui/material';
import { API_URL, getHeaders } from '../../services/httpClient';
import { useLanguage } from "../../context/LanguageContext";

const AdminWithdrawals: React.FC = () => {
    const { t } = useLanguage();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/realtor-economy/admin/withdrawals`, {
        headers: getHeaders()
      });
      if (res.ok) {
        setWithdrawals(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`${API_URL}/realtor-economy/admin/withdrawals/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        alert(`Withdrawal marked as ${status}`);
        fetchWithdrawals();
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('AdminWithdrawals.withdrawalRequests')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('AdminWithdrawals.reviewAndApprovePayo')}</p>
        </div>
        <Button onClick={fetchWithdrawals} variant="outlined" size="small">{t('AdminWithdrawals.refresh')}</Button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><CircularProgress /></div>
        ) : withdrawals.length === 0 ? (
          <div className="p-12 text-center text-slate-500">{t('AdminWithdrawals.noWithdrawalRequests')}</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {withdrawals.map(w => (
              <div key={w.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{w.realtor_name} ({w.realtor_email})</p>
                  <p className="text-xs text-slate-500 mt-1">{t('AdminWithdrawals.amount')}<strong className="text-slate-700 dark:text-slate-300">${w.amount_usd.toFixed(2)}</strong> ({w.points} {t('AdminWithdrawals.pts')}</p>
                  <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded text-xs text-slate-600 font-mono">
                    {w.payment_details}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">{t('AdminWithdrawals.requestedOn')}{new Date(w.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    w.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {w.status}
                  </span>
                  
                  {w.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button size="small" color="error" variant="outlined" onClick={() => handleUpdate(w.id, 'rejected')}>{t('AdminWithdrawals.reject')}</Button>
                      <Button size="small" color="success" variant="contained" onClick={() => handleUpdate(w.id, 'approved')} className="bg-emerald-600">{t('AdminWithdrawals.approve')}</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWithdrawals;
