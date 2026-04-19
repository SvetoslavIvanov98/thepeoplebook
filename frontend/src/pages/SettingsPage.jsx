import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ACTION_LABELS = {
  content_removed: 'Content removed',
  account_suspended: 'Account suspended',
  warning: 'Warning issued',
  no_action: 'No action taken',
};

function AppealModal({ decision, onClose }) {
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/reports/decisions/${decision.id}/appeal`, { note }),
    onSuccess: () => {
      toast.success('Appeal submitted');
      qc.invalidateQueries({ queryKey: ['my-decisions'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit appeal'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Appeal decision</h3>
        <p className="text-sm text-gray-500">
          You have the right to appeal this decision under the EU Digital Services Act.
          Explain why you believe this decision should be reconsidered.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Describe why you believe this decision is incorrect…"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700">Cancel</button>
          <button
            onClick={() => mutate()}
            disabled={!note.trim() || isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Submitting…' : 'Submit appeal'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [appealing, setAppealing] = useState(null);

  const { data: decisions, isLoading } = useQuery({
    queryKey: ['my-decisions'],
    queryFn: () => api.get('/reports/decisions').then((r) => r.data),
  });

  const { data: myReports } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => api.get('/reports/mine').then((r) => r.data),
  });

  return (
    <div>
      <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 z-10">
        <h1 className="font-bold text-lg">Settings</h1>
      </header>

      {/* Moderation decisions */}
      <section className="p-4">
        <h2 className="font-bold text-base mb-3">Moderation decisions</h2>
        <p className="text-xs text-gray-500 mb-4">
          Under the EU Digital Services Act (Art. 17), you are entitled to see any moderation
          decisions that affect your account and to appeal them.
        </p>

        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

        {!isLoading && (!decisions || decisions.length === 0) && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-700 dark:text-green-400">
            No moderation decisions on your account.
          </div>
        )}

        <div className="space-y-3">
          {(decisions || []).map((d) => (
            <div key={d.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  d.action_type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  d.action_type === 'content_removed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  d.action_type === 'account_suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {ACTION_LABELS[d.action_type] || d.action_type}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                </span>
              </div>

              <div className="text-sm space-y-1">
                <p><strong className="text-gray-700 dark:text-gray-300">Reason:</strong> {d.reason}</p>
                {d.report_reason && (
                  <p><strong className="text-gray-700 dark:text-gray-300">Report category:</strong> {d.report_reason.replace(/_/g, ' ')}</p>
                )}
                {d.legal_basis && (
                  <p><strong className="text-gray-700 dark:text-gray-300">Legal basis:</strong> {d.legal_basis}</p>
                )}
              </div>

              {/* Appeal status */}
              {d.appealed ? (
                <div className={`text-xs rounded-lg p-2 ${
                  d.appeal_outcome === 'overturned' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                  d.appeal_outcome === 'upheld' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                }`}>
                  {d.appeal_outcome
                    ? `Appeal ${d.appeal_outcome}${d.appeal_note ? ': ' + d.appeal_note : ''}`
                    : 'Appeal submitted — under review'}
                </div>
              ) : (
                <button
                  onClick={() => setAppealing(d)}
                  className="text-sm text-brand-600 hover:underline font-medium"
                >
                  Appeal this decision
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* My reports */}
      <section className="p-4 border-t border-gray-200 dark:border-gray-800">
        <h2 className="font-bold text-base mb-3">My reports</h2>
        <p className="text-xs text-gray-500 mb-4">
          Reports you have submitted and their current status.
        </p>

        {(!myReports || myReports.length === 0) && (
          <p className="text-sm text-gray-400">You haven't submitted any reports.</p>
        )}

        <div className="space-y-2">
          {(myReports || []).map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
              <div className="text-sm">
                <p className="font-medium">{r.reason.replace(/_/g, ' ')}</p>
                {r.description && <p className="text-xs text-gray-500 truncate max-w-xs">{r.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  r.status === 'action_taken' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {appealing && <AppealModal decision={appealing} onClose={() => setAppealing(null)} />}
    </div>
  );
}
