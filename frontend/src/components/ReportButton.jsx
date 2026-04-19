import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const REASONS = [
  { value: 'illegal_content', label: 'Illegal content' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'spam', label: 'Spam' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
];

export default function ReportButton({ postId, commentId, userId, variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/reports', {
      post_id: postId || undefined,
      comment_id: commentId || undefined,
      reported_user_id: userId || undefined,
      reason,
      description: description.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Report submitted — thank you');
      setOpen(false);
      setReason('');
      setDescription('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit report'),
  });

  return (
    <>
      {variant === 'menu' ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          🚩 Report user
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
          title="Report content"
        >
          <Flag size={16} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Report content</h3>
            <p className="text-sm text-gray-500">
              Under the EU Digital Services Act, we are required to provide a mechanism for reporting
              potentially illegal content. Your report will be reviewed by our moderation team.
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Reason *</label>
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-brand-600"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Additional details (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Explain why you believe this content should be reviewed…"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => mutate()}
                disabled={!reason || isPending}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
