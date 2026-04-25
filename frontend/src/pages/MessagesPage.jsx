import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getSocket,
  joinConversation,
  leaveConversation,
  emitTyping,
} from '../services/socket.service';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import MediaLightbox from '../components/MediaLightbox';

// helpers

function formatSeparator(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

function formatTime(dateStr) {
  return format(new Date(dateStr), 'h:mm a');
}

function bubbleRadius(isMine, isFirst, isLast) {
  if (isFirst && isLast) return 'rounded-[20px]';
  if (isMine) {
    if (isFirst) return 'rounded-[20px] rounded-br-[6px]';
    if (isLast) return 'rounded-[20px] rounded-tr-[6px]';
    return 'rounded-[20px] rounded-r-[6px]';
  } else {
    if (isFirst) return 'rounded-[20px] rounded-bl-[6px]';
    if (isLast) return 'rounded-[20px] rounded-tl-[6px]';
    return 'rounded-[20px] rounded-l-[6px]';
  }
}

function buildRenderList(messages, myId) {
  const items = [];
  let lastDateKey = null;
  let currentGroup = null;

  for (const msg of messages) {
    const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      items.push({ type: 'separator', label: formatSeparator(msg.created_at) });
      currentGroup = null;
    }

    const isMine = msg.sender_id === myId;
    const lastMsgInGroup = currentGroup?.messages[currentGroup.messages.length - 1];
    const timeDiff = lastMsgInGroup
      ? new Date(msg.created_at) - new Date(lastMsgInGroup.created_at)
      : Infinity;

    if (currentGroup && currentGroup.sender_id === msg.sender_id && timeDiff < 5 * 60 * 1000) {
      currentGroup.messages.push(msg);
    } else {
      currentGroup = {
        type: 'group',
        isMine,
        sender_id: msg.sender_id,
        username: msg.username,
        avatar_url: msg.avatar_url,
        messages: [msg],
      };
      items.push(currentGroup);
    }
  }
  return items;
}

// sub-components

function TypingIndicator({ avatar }) {
  return (
    <div className="flex items-end gap-2 mb-1 px-4">
      <img src={avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
      <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-[5px] px-4 py-3 flex gap-1 items-center">
        <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:120ms]" />
        <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 my-3 px-4">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

function MessageGroup({ group, isLastGroup, lastSentRead, partnerAvatar, myId, onMediaClick }) {
  const { isMine, messages, username, avatar_url } = group;
  const count = messages.length;

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-1 px-4`}>
      <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMine && (
          <div className="w-6 flex-shrink-0 flex items-end self-end mb-0.5">
            <img
              src={avatar_url || `https://ui-avatars.com/api/?name=${username}&size=48`}
              alt={username}
              className="w-6 h-6 rounded-full object-cover"
            />
          </div>
        )}
        <div
          className={`flex flex-col gap-[3px] ${isMine ? 'items-end' : 'items-start'} max-w-[72vw] md:max-w-xs`}
        >
          {messages.map((m, i) => {
            const isFirst = i === 0;
            const isLast = i === count - 1;
            return (
              <div key={m.id} className="group/bubble relative">
                <div
                  className={`px-4 py-2.5 text-[15px] leading-relaxed break-words select-text transition-all ${bubbleRadius(isMine, isFirst, isLast)} ${
                    isMine
                      ? 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-700/60'
                  }`}
                >
                  {m.content && <span>{m.content}</span>}
                  {m.media_url &&
                    (/\.(mp4|mov|avi|webm|mkv|ogg|wmv|flv)/i.test(m.media_url) ? (
                      <div
                        className="relative mt-1 rounded-xl overflow-hidden cursor-pointer group/vid"
                        onClick={() => onMediaClick(m.media_url)}
                      >
                        <video src={m.media_url} className="max-w-full max-h-60 object-cover" />
                        <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-black/40 flex items-center justify-center transition-colors">
                          <div className="bg-white/20 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center border border-white/30">
                            <span className="text-white text-lg ml-0.5 leading-none">▶</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={m.media_url}
                        alt=""
                        className="mt-1 rounded-xl max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => onMediaClick(m.media_url)}
                      />
                    ))}
                </div>
                <span
                  className={`absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/bubble:opacity-100 transition-opacity text-[10px] text-gray-400 whitespace-nowrap ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}
                >
                  {formatTime(m.created_at)}
                </span>
              </div>
            );
          })}
        </div>
        {isMine && <div className="w-6 flex-shrink-0" />}
      </div>
      {isMine && isLastGroup && lastSentRead && (
        <div className="flex items-center gap-1 mt-1 mr-8">
          <img src={partnerAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
          <span className="text-[10px] text-gray-400">Seen</span>
        </div>
      )}
    </div>
  );
}

// icons (inline SVG to avoid encoding issues)

function IconAttach() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="w-3.5 h-3.5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-7 h-7"
    >
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.2}
      stroke="currentColor"
      className="w-14 h-14 opacity-30"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

// main component

export default function MessagesPage() {
  const { conversationId } = useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeUsername, setComposeUsername] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const bottomRef = useRef();
  const typingTimerRef = useRef(null);
  const typingCooldownRef = useRef(null);
  const fileInputRef = useRef();
  const [selectedFile, setSelectedFile] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
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

    const onMessage = (msg) => {
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };

    const onTyping = ({ conversationId: cid }) => {
      if (cid != conversationId) return;
      setPartnerTyping(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setPartnerTyping(false), 3000);
    };

    const onRead = ({ conversationId: cid }) => {
      if (cid != conversationId) return;
      setMessages((prev) => prev.map((m) => (m.sender_id === user?.id ? { ...m, read: true } : m)));
    };

    s?.on('new_message', onMessage);
    s?.on('typing', onTyping);
    s?.on('messages_read', onRead);

    return () => {
      leaveConversation(conversationId);
      s?.off('new_message', onMessage);
      s?.off('typing', onTyping);
      s?.off('messages_read', onRead);
      clearTimeout(typingTimerRef.current);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleTextChange = useCallback(
    (e) => {
      setText(e.target.value);
      if (!conversationId) return;
      if (typingCooldownRef.current) return;
      emitTyping(conversationId);
      typingCooldownRef.current = setTimeout(() => {
        typingCooldownRef.current = null;
      }, 2000);
    },
    [conversationId]
  );

  const { mutate: send, isPending: sending } = useMutation({
    mutationFn: () => {
      if (selectedFile) {
        const form = new FormData();
        if (text.trim()) form.append('content', text.trim());
        form.append('media', selectedFile);
        return api.post(`/messages/${conversationId}`, form);
      }
      return api.post(`/messages/${conversationId}`, { content: text.trim() });
    },
    onSuccess: ({ data }) => {
      setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
      setText('');
      setSelectedFile(null);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to send message'),
  });

  const canSend = (text.trim() || selectedFile) && !sending;

  const partner = conversations?.find((c) => c.id == conversationId);
  const partnerAvatar =
    partner?.partner_avatar ||
    `https://ui-avatars.com/api/?name=${partner?.partner_username || 'U'}&size=48`;

  const renderItems = buildRenderList(messages, user?.id);
  const groups = renderItems.filter((x) => x.type === 'group');
  const lastMyGroup = [...groups].reverse().find((g) => g.isMine);
  const lastSentRead = lastMyGroup ? lastMyGroup.messages.some((m) => m.read) : false;

  const chatMedia = messages.filter((m) => m.media_url).map((m) => m.media_url);

  const handleMediaClick = (url) => {
    const idx = chatMedia.indexOf(url);
    if (idx !== -1) setLightboxIndex(idx);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversations sidebar */}
      <div
        className={`w-full md:w-72 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 ${conversationId ? 'hidden md:flex' : 'flex'}`}
      >
        <header className="sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg">Messages</h1>
            <button
              onClick={() => setComposeOpen(true)}
              className="text-brand-600 hover:text-brand-700 text-sm font-semibold"
              title="New message"
            >
              + New
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
              <div className="relative flex-shrink-0">
                <img
                  src={c.partner_avatar || `https://ui-avatars.com/api/?name=${c.partner_username}`}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {c.partner_name || c.partner_username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {c.last_message || 'No messages yet'}
                </p>
              </div>
              {c.unread_count > 0 && (
                <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {c.unread_count}
                </span>
              )}
            </Link>
          ))}
          {(conversations || []).length === 0 && (
            <p className="text-center text-gray-400 text-sm p-8">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      {conversationId ? (
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex-shrink-0 sticky top-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 z-10 flex items-center gap-3">
            <button
              onClick={() => navigate('/messages')}
              className="md:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white mr-1 text-xl leading-none"
            >
              &larr;
            </button>
            {partner && (
              <>
                <img src={partnerAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                <Link
                  to={`/${partner.partner_username}`}
                  className="font-bold text-sm hover:underline"
                >
                  {partner.partner_name || partner.partner_username}
                </Link>
              </>
            )}
          </header>

          <div className="flex-1 overflow-y-auto py-3 space-y-0 bg-white dark:bg-gray-950">
            {renderItems.map((item, idx) =>
              item.type === 'separator' ? (
                <DateSeparator key={`sep-${idx}`} label={item.label} />
              ) : (
                <MessageGroup
                  key={`${item.sender_id}-${item.messages[0].id}`}
                  group={item}
                  isLastGroup={item === lastMyGroup}
                  lastSentRead={lastSentRead}
                  partnerAvatar={partnerAvatar}
                  myId={user?.id}
                  onMediaClick={handleMediaClick}
                />
              )
            )}
            {partnerTyping && <TypingIndicator avatar={partnerAvatar} />}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-brand-600 pb-1.5 flex-shrink-0"
              title="Attach image"
            >
              <IconAttach />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />

            <div className="flex-1 flex flex-col gap-1">
              {selectedFile && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1.5 text-xs">
                  <span className="truncate max-w-[12rem] text-gray-700 dark:text-gray-300">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 hover:text-red-400 ml-auto"
                  >
                    <IconClose />
                  </button>
                </div>
              )}
              <textarea
                value={text}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) send();
                  }
                }}
                placeholder="Aa"
                rows={1}
                className="w-full bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm outline-none resize-none max-h-32 overflow-y-auto leading-snug text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
            </div>

            <button
              onClick={() => canSend && send()}
              disabled={!canSend}
              className={`flex-shrink-0 pb-1.5 transition-colors ${canSend ? 'text-brand-600 hover:text-brand-700' : 'text-gray-300 dark:text-gray-600'}`}
              title="Send"
            >
              <IconSend />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-gray-400 gap-3">
          <IconChat />
          <p className="text-sm">Select a conversation to start chatting</p>
          <button
            onClick={() => setComposeOpen(true)}
            className="text-sm text-brand-600 hover:underline font-semibold"
          >
            Start a new conversation
          </button>
        </div>
      )}

      {/* Compose modal */}
      {composeOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setComposeOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg">New Message</h3>
            <input
              autoFocus
              value={composeUsername}
              onChange={(e) => setComposeUsername(e.target.value)}
              placeholder="Enter username..."
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setComposeOpen(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setComposeOpen(false);
                  setComposeUsername('');
                }}
                className="border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
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

      {/* Media Lightbox */}
      <MediaLightbox
        items={chatMedia}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNav={setLightboxIndex}
      />
    </div>
  );
}
