import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const ACTION_TYPES = [
  { value: 'content_removed', label: 'Remove content' },
  { value: 'account_suspended', label: 'Suspend account' },
  { value: 'warning', label: 'Issue warning' },
  { value: 'no_action', label: 'No action' },
];

function ResolveModal({ report, onClose }) {
  const [dismiss, setDismiss] = useState(false);
  const [actionType, setActionType] = useState('content_removed');
  const [reason, setReason] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/admin/reports/${report.id}/resolve`, {
      dismiss,
      action_type: dismiss ? undefined : actionType,
      reason,
      legal_basis: legalBasis || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Resolve report #{report.id}</h3>

        <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <p><strong>Reason:</strong> {report.reason}</p>
          <p><strong>Reporter:</strong> @{report.reporter_username}</p>
          <p><strong>Target:</strong> @{report.target_username}</p>
          {report.description && <p><strong>Description:</strong> {report.description}</p>}
          {report.target_content && (
            <p className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs mt-2 line-clamp-4">{report.target_content}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dismiss} onChange={(e) => setDismiss(e.target.checked)} className="accent-brand-600" />
          Dismiss report (no action)
        </label>

        {!dismiss && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Legal basis (optional, DSA Art. 17)</label>
              <input
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Regulation (EU) 2022/2065 Art. 16"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Reason / statement of reasons *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Explain the decision (this will be shown to the affected user)…"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700">Cancel</button>
          <button
            onClick={() => mutate()}
            disabled={!reason.trim() || isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Resolve'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [resolving, setResolving] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', page, status],
    queryFn: () => api.get('/admin/reports', { params: { page, limit: 20, status: status || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Content Reports (DSA)</h1>

      <div className="flex gap-2 mb-4">
        {['pending', 'action_taken', 'dismissed', ''].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1 rounded-full text-sm border ${status === s ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 dark:border-gray-700'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Reporter</th>
              <th className="px-4 py-3 font-semibold">Target</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            )}
            {data?.reports?.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                <td className="px-4 py-3">{r.reason.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {r.reported_user_id ? '👤 User' : r.post_id ? '📝 Post' : '💬 Comment'}
                </td>
                <td className="px-4 py-3">@{r.reporter_username}</td>
                <td className="px-4 py-3">@{r.target_username}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    r.status === 'action_taken' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {r.status === 'pending' && (
                    <button
                      onClick={() => setResolving(r)}
                      className="text-brand-600 hover:underline text-sm font-medium"
                    >
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 disabled:opacity-40">← Prev</button>
          <span className="text-gray-500">Page {page} of {data.pages}</span>
          <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}
            className="px-3 py-1 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 disabled:opacity-40">Next →</button>
        </div>
      )}

      {resolving && <ResolveModal report={resolving} onClose={() => setResolving(null)} />}
    </div>
  );
}
