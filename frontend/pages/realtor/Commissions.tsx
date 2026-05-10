import React, { useEffect, useState } from 'react';
import { CircularProgress, Dialog, TextField, Button } from '@mui/material';
import { RealtorTaskService, CommissionsResponse } from '../../services/realtor_task.service';
import { getHeaders, API_URL } from '../../services/httpClient';

const STATUS_STYLES: Record<string, string> = {
  earned: 'text-emerald-600 dark:text-emerald-400',
  withdrawn: 'text-red-500 dark:text-red-400',
  refunded: 'text-blue-500 dark:text-blue-400',
};

const Commissions: React.FC = () => {
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'history' | 'in_progress'>('history');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', payment_details: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    RealtorTaskService.getCommissions()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWithdraw = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/realtor-economy/withdraw`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          amount_usd: parseFloat(withdrawForm.amount),
          payment_details: withdrawForm.payment_details
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Withdrawal failed');
      }
      setWithdrawOpen(false);
      loadData();
      alert('Withdrawal request submitted successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><CircularProgress color="success" /></div>;

  const earned = data?.commissions.filter(c => c.type === 'earned') || [];
  const inProgress = data?.commissions.filter(c => c.status === 'pending_withdrawal') || [];
  const display = tab === 'history' ? earned : inProgress;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Commissions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track your earnings and payment history.</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Earned', value: `$${data?.total_earned_usd.toFixed(2) || '0.00'}`, sub: `${data?.total_earned_points || 0} pts`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
          { label: 'Available', value: `$${data?.available_usd.toFixed(2) || '0.00'}`, sub: `${data?.available_points || 0} pts`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
          { label: 'Withdrawn', value: `$${(data?.withdrawn_points || 0) / 100}`, sub: `${data?.withdrawn_points || 0} pts`, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
          { label: 'Rate', value: '100pts = $1', sub: 'Min task: $5', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border p-4 ${card.bg}`}>
            <p className={`text-lg font-extrabold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{card.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Withdrawal Banner */}
      {(data?.available_usd || 0) >= 200 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">You have ${data?.available_usd.toFixed(2)} available for withdrawal!</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Minimum withdrawal is $200. Request a payout now.</p>
          </div>
          <button 
            onClick={() => {
                setWithdrawForm({ amount: String(data?.available_usd.toFixed(2)), payment_details: '' });
                setWithdrawOpen(true);
            }}
            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Request Payout
          </button>
        </div>
      )}

      {/* Withdrawal Modal */}
      <Dialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Request Payout</h2>
          <p className="text-xs text-slate-500 mt-1">Available balance: ${data?.available_usd.toFixed(2)}</p>
        </div>
        <div className="p-5 space-y-4">
          <TextField 
            label="Amount (USD)" 
            type="number" 
            fullWidth 
            value={withdrawForm.amount} 
            onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} 
            InputProps={{ inputProps: { min: 200, max: data?.available_usd } }}
            helperText="Minimum withdrawal is $200"
          />
          <TextField 
            label="Payment Details (e.g. PayPal Email or Bank Info)" 
            fullWidth 
            multiline 
            rows={3} 
            value={withdrawForm.payment_details} 
            onChange={e => setWithdrawForm({ ...withdrawForm, payment_details: e.target.value })} 
          />
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
          <Button onClick={() => setWithdrawOpen(false)} fullWidth>Cancel</Button>
          <Button 
            onClick={handleWithdraw} 
            disabled={submitting || parseFloat(withdrawForm.amount) < 200 || !withdrawForm.payment_details} 
            fullWidth variant="contained" color="success" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </Dialog>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {[
          { key: 'history', label: 'Earnings History', icon: 'history' },
          { key: 'in_progress', label: 'Pending', icon: 'pending' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t.key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Commission List */}
      {display.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">payments</span>
          <p className="text-sm font-medium">No records yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {display.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-full flex items-center justify-center text-white text-[13px] font-black ${c.type === 'earned' ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                  {c.type === 'earned' ? '+' : '-'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{c.description || c.task_title}</p>
                  <p className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-extrabold ${STATUS_STYLES[c.type] || ''}`}>
                  {c.type === 'earned' ? '+' : '-'}${c.usd_value.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400">{c.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Commissions;
