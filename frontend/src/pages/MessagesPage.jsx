import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { useEffect, useRef, useState } from 'react';
import { getSocket, joinConversation, leaveConversation } from '../services/socket.service';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { conversationId } = useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeUsername, setComposeUsername] = useState('');
  const bottomRef = useRef();
  const qc = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: initialMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.get(`/messages/${conversationId}`).then((r) => r.data),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    const s = getSocket();
    const handler = (msg) => setMessages((m) => [...m, msg]);
    s?.on('new_message', handler);
    return () => {
      leaveConversation(conversationId);
      s?.off('new_message', handler);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { mutate: send } = useMutation({
    mutationFn: () => api.post(`/messages/${conversationId}`, { content: text }),
    onSuccess: ({ data }) => {
      setMessages((m) => [...m, data]);
      setText('');
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to send message'),
  });

  return (
    <div className="flex h-screen">
      {/* Conversations list */}
      <div className={`w-full md:w-72 border-r border-gray-200 dark:border-gray-800 flex flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
        <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg">Messages</h1>
            <button
              onClick={() => setComposeOpen(true)}
              className="text-brand-600 hover:text-brand-700 text-sm font-semibold"
              title="New message"
            >
              ✏️ New
            </button>
          </div>
        </header>
        <div className="overflow-y-auto flex-1">
          {(conversations || []).map((c) => (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 ${c.id == conversationId ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            >
              <img
                src={c.partner_avatar || `https://ui-avatars.com/api/?name=${c.partner_username}`}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{c.partner_name || c.partner_username}</p>
                <p className="text-xs text-gray-500 truncate">{c.last_message || 'No messages yet'}</p>
              </div>
              {c.unread_count > 0 && (
                <span className="bg-brand-500 text-white text-xs rounded-full px-2 py-0.5">{c.unread_count}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {conversationId ? (
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <button onClick={() => navigate('/messages')} className="md:hidden mr-2">←</button>
            <span className="font-bold">
              {conversations?.find((c) => c.id == conversationId)?.partner_username || 'Chat'}
            </span>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${m.sender_id === user?.id ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {m.content}
                  {m.media_url && <img src={m.media_url} alt="" className="mt-1 rounded-xl max-w-full" />}
                  <p className="text-xs opacity-60 mt-1 text-right">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), text.trim() && send())}
              placeholder="Type a message…"
              className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm outline-none"
            />
            <button
              onClick={() => text.trim() && send()}
              className="bg-brand-600 text-white rounded-full px-4 py-2 text-sm font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center text-gray-400">
          Select a conversation to start chatting
        </div>
      )}

      {/* Compose / new conversation modal */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">New Message</h3>
            <input
              autoFocus
              value={composeUsername}
              onChange={(e) => setComposeUsername(e.target.value)}
              placeholder="Enter username…"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-sm bg-transparent outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && composeUsername.trim()) e.target.closest('div.space-y-4').querySelector('button[data-go]')?.click();
                if (e.key === 'Escape') setComposeOpen(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setComposeOpen(false); setComposeUsername(''); }}
                className="border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                data-go
                onClick={async () => {
                  const uname = composeUsername.trim();
                  if (!uname) return;
                  try {
                    const { data: profile } = await api.get(`/users/${uname}`);
                    const { data: conv } = await api.post(`/messages/with/${profile.id}`);
                    setComposeOpen(false);
                    setComposeUsername('');
                    navigate(`/messages/${conv.id}`);
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'User not found');
                  }
                }}
                className="bg-brand-600 text-white rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-brand-700"
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
