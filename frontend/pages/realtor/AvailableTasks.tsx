import React, { useEffect, useRef, useState } from 'react';
import { CircularProgress, Dialog, Button } from '@mui/material';
import { RealtorTaskService, Task } from '../../services/realtor_task.service';
import { InvestorTaskService } from '../../services/realtor_task.service';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  claimed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  submitted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const TaskCard: React.FC<{ task: Task; onClaim?: () => void; onSubmit?: () => void }> = ({ task, onClaim, onSubmit }) => {
  const usd = (task.reward_points / 100).toFixed(2);
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{task.title}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{task.address}</p>
        </div>
        <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] || 'bg-slate-100 text-slate-600'}`}>
          {task.status}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg">
          💰 ${usd} ({task.reward_points} pts)
        </span>
        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
          📷 {task.min_photos}–{task.max_photos} photos
        </span>
        <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg">
          📍 {task.geo_radius_meters || 50}m radius
        </span>
      </div>

      {task.deadline && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
          ⏰ Deadline: {new Date(task.deadline).toLocaleString()}
        </p>
      )}

      <div className="flex gap-2 mt-auto">
        {task.status === 'open' && onClaim && (
          <button
            onClick={onClaim}
            className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            Claim Task
          </button>
        )}
        {task.status === 'claimed' && onSubmit && (
          <button
            onClick={onSubmit}
            className="flex-1 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Submit Evidence
          </button>
        )}
      </div>
    </div>
  );
};

// ── Offline Upload Queue ──────────────────────────────────────────────────────
interface OfflineItem { taskId: number; files: File[]; lat?: number; lng?: number; notes?: string; }

function saveOffline(item: OfflineItem) {
  const queue: any[] = JSON.parse(localStorage.getItem('offline_task_queue') || '[]');
  queue.push({ ...item, files: item.files.map(f => f.name), savedAt: new Date().toISOString() });
  localStorage.setItem('offline_task_queue', JSON.stringify(queue));
}

const AvailableTasks: React.FC = () => {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'mine'>('available');

  // Claim dialog
  const [claimTask, setClaimTask] = useState<Task | null>(null);
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [claiming, setClaiming] = useState(false);

  // Submit dialog
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [avail, mine] = await Promise.all([
      RealtorTaskService.getAvailableTasks().catch(() => []),
      RealtorTaskService.getMyTasks().catch(() => []),
    ]);
    setAvailableTasks(avail);
    setMyTasks(mine);
    setLoading(false);
    const q = JSON.parse(localStorage.getItem('offline_task_queue') || '[]');
    setOfflineCount(q.length);
  };

  useEffect(() => { loadData(); }, []);

  const handleCaptureGPS = () => {
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ok');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClaim = async () => {
    if (!claimTask) return;
    setClaiming(true);
    try {
      await RealtorTaskService.claimTask(claimTask.id, deadlineHours);
      setClaimTask(null);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmit = async () => {
    if (!submitTask || photos.length < submitTask.min_photos) {
      alert(`Minimum ${submitTask?.min_photos} photos required.`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await RealtorTaskService.submitEvidence(
        submitTask.id, photos, gpsCoords?.lat, gpsCoords?.lng, notes
      );
      alert(result.auto_approved
        ? `✅ Evidence submitted and AUTO-APPROVED! You earned ${submitTask.reward_points} pts.`
        : `📤 Evidence submitted! Awaiting investor review.`
      );
      setSubmitTask(null);
      setPhotos([]);
      setGpsCoords(null);
      await loadData();
    } catch (e: any) {
      if (!navigator.onLine) {
        saveOffline({ taskId: submitTask.id, files: photos, lat: gpsCoords?.lat, lng: gpsCoords?.lng, notes });
        setOfflineCount(prev => prev + 1);
        alert('📴 You are offline. Evidence saved locally and will be sent when you reconnect.');
        setSubmitTask(null);
      } else {
        alert(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayTasks = tab === 'available' ? availableTasks : myTasks;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Field Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Claim tasks, submit photo evidence, earn commissions.</p>
        </div>
        {offlineCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-amber-600 text-[16px]">cloud_off</span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{offlineCount} offline uploads pending</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1">
        {[
          { key: 'available', label: 'Available', icon: 'explore', count: availableTasks.length },
          { key: 'mine', label: 'My Tasks', icon: 'assignment_ind', count: myTasks.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><CircularProgress /></div>
      ) : displayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">task_alt</span>
          <p className="text-sm font-medium">{tab === 'available' ? 'No available tasks right now.' : 'You have no active tasks.'}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClaim={tab === 'available' ? () => setClaimTask(task) : undefined}
              onSubmit={task.status === 'claimed' ? () => { setSubmitTask(task); setGpsStatus('idle'); setPhotos([]); setNotes(''); } : undefined}
            />
          ))}
        </div>
      )}

      {/* Claim Dialog */}
      <Dialog open={!!claimTask} onClose={() => setClaimTask(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
        <p className="text-base font-bold text-slate-800 dark:text-white mb-1">Claim Task</p>
        <p className="text-sm text-slate-500 mb-4">{claimTask?.title}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Commit to finish in:</label>
            <select
              value={deadlineHours}
              onChange={e => setDeadlineHours(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white h-10 px-3 text-sm"
            >
              <option value={24}>24 hours</option>
              <option value={48}>48 hours (default)</option>
              <option value={72}>72 hours</option>
              <option value={168}>1 week</option>
            </select>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
            ⚠️ Once claimed, no other realtor can take this task. If you miss the deadline, the task returns to the pool.
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => setClaimTask(null)} color="inherit" size="small">Cancel</Button>
          <Button onClick={handleClaim} variant="contained" color="success" size="small" disabled={claiming}>
            {claiming ? 'Claiming…' : 'Confirm Claim'}
          </Button>
        </div>
      </Dialog>

      {/* Submit Evidence Dialog */}
      <Dialog open={!!submitTask} onClose={() => setSubmitTask(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 2 } }}>
        <p className="text-base font-bold text-slate-800 dark:text-white mb-1">Submit Evidence</p>
        <p className="text-sm text-slate-500 mb-4">{submitTask?.title} — {submitTask?.address}</p>
        <div className="space-y-4">
          {/* GPS Capture */}
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">1. Capture your location</p>
            <button
              onClick={handleCaptureGPS}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                gpsStatus === 'ok' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                gpsStatus === 'error' ? 'bg-red-50 border-red-300 text-red-700' :
                'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">my_location</span>
              {gpsStatus === 'loading' ? 'Getting location…' :
               gpsStatus === 'ok' ? `✅ ${gpsCoords?.lat.toFixed(5)}, ${gpsCoords?.lng.toFixed(5)}` :
               gpsStatus === 'error' ? '❌ Location failed — try again' : 'Capture GPS Location'}
            </button>
          </div>

          {/* Photo Upload */}
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
              2. Upload photos ({submitTask?.min_photos}–{submitTask?.max_photos} required)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => setPhotos(prev => [...prev, ...Array.from(e.target.files || [])])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
              {photos.length > 0 ? `Add more photos (${photos.length} selected)` : 'Select Photos (camera or gallery)'}
            </button>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {photos.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                    {f.name}
                    <button 
                      className="hover:text-red-500 font-bold ml-1" 
                      onClick={(e) => { e.stopPropagation(); setPhotos(p => p.filter((_, idx) => idx !== i)); }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">3. Notes (optional)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe what you observed at the property…"
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!navigator.onLine && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">cloud_off</span>
              You're offline. Evidence will be saved locally and submitted when you reconnect.
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => setSubmitTask(null)} color="inherit" size="small">Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            size="small"
            disabled={submitting || photos.length < (submitTask?.min_photos || 3)}
          >
            {submitting ? 'Submitting…' : 'Submit Evidence'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default AvailableTasks;
