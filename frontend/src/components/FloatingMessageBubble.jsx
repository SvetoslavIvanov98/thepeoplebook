import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import {
  getSocket,
  joinConversation,
  leaveConversation,
  emitTyping,
} from '../services/socket.service';
import { format, isToday, isYesterday } from 'date-fns';
import MediaLightbox from './MediaLightbox';

function formatTime(d) {
  return format(new Date(d), 'h:mm a');
}

function formatPreview(d) {
  const dt = new Date(d);
  if (isToday(dt)) return format(dt, 'h:mm a');
  if (isYesterday(dt)) return 'Yesterday';
  return format(dt, 'MM/dd/yy');
}

function bubbleRadius(isMine, isFirst, isLast) {
  if (isFirst && isLast) return 'rounded-2xl';
  if (isMine) {
    if (isFirst) return 'rounded-2xl rounded-br-[5px]';
    if (isLast) return 'rounded-2xl rounded-tr-[5px]';
    return 'rounded-2xl rounded-r-[5px]';
  }
  if (isFirst) return 'rounded-2xl rounded-bl-[5px]';
  if (isLast) return 'rounded-2xl rounded-tl-[5px]';
  return 'rounded-2xl rounded-l-[5px]';
}

function buildGroups(messages, myId) {
  const groups = [];
  let cur = null;
  for (const msg of messages) {
    const isMine = msg.sender_id === myId;
    const last = cur?.messages[cur.messages.length - 1];
    const gap = last ? new Date(msg.created_at) - new Date(last.created_at) : Infinity;
    if (cur && cur.sender_id === msg.sender_id && gap < 300000) {
      cur.messages.push(msg);
    } else {
      cur = {
        isMine,
        sender_id: msg.sender_id,
        username: msg.username,
        avatar_url: msg.avatar_url,
        messages: [msg],
      };
      groups.push(cur);
    }
  }
  return groups;
}

function IconChat() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-7 h-7"
    >
      <path
        fillRule="evenodd"
        d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconSend() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <polyline points="15 18 9 12 15 6" />
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
      className="w-5 h-5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TypingDots({ avatar }) {
  return (
    <div className="flex items-end gap-1.5 mb-1 px-3">
      <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
      <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-[4px] px-3 py-2 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:120ms]" />
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function MiniChat({ conversation, user, onBack }) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const bottomRef = useRef();
  const typingTimer = useRef(null);
  const typingCooldown = useRef(null);
  const convId = conversation.id;
  const partnerAvatar =
    conversation.partner_avatar ||
    'https://ui-avatars.com/api/?name=' + conversation.partner_username + '&size=48';

  const { data: initial } = useQuery({
    queryKey: ['messages', convId],
    queryFn: () => api.get('/messages/' + convId).then((r) => r.data),
  });

  useEffect(() => {
    if (initial) setMessages(initial);
  }, [initial]);

  useEffect(() => {
    joinConversation(convId);
    const s = getSocket();
    const onMsg = (msg) => {
      if (msg.conversation_id != convId) return;
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    const onTyping = ({ conversationId: cid }) => {
      if (cid != convId) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    };
    const onRead = ({ conversationId: cid }) => {
      if (cid != convId) return;
      setMessages((prev) => prev.map((m) => (m.sender_id === user?.id ? { ...m, read: true } : m)));
    };
    s?.on('new_message', onMsg);
    s?.on('typing', onTyping);
    s?.on('messages_read', onRead);
    return () => {
      leaveConversation(convId);
      s?.off('new_message', onMsg);
      s?.off('typing', onTyping);
      s?.off('messages_read', onRead);
      clearTimeout(typingTimer.current);
    };
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleChange = useCallback(
    (e) => {
      setText(e.target.value);
      if (typingCooldown.current) return;
      emitTyping(convId);
      typingCooldown.current = setTimeout(() => {
        typingCooldown.current = null;
      }, 2000);
    },
    [convId]
  );

  const { mutate: send, isPending } = useMutation({
    mutationFn: () => api.post('/messages/' + convId, { content: text.trim() }),
    onSuccess: ({ data }) => {
      setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
      setText('');
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const canSend = text.trim() && !isPending;
  const groups = buildGroups(messages, user?.id);
  const lastMyGroup = [...groups].reverse().find((g) => g.isMine);
  const lastSentRead = lastMyGroup?.messages.some((m) => m.read) ?? false;

  const chatMedia = messages.filter((m) => m.media_url).map((m) => m.media_url);

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-600 rounded-t-2xl flex-shrink-0">
        <button onClick={onBack} className="text-white/80 hover:text-white flex-shrink-0">
          <IconBack />
        </button>
        <img
          src={partnerAvatar}
          alt=""
          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
        />
        <span className="font-semibold text-white text-sm truncate flex-1">
          {conversation.partner_name || conversation.partner_username}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 bg-white dark:bg-gray-950">
        {groups.map((group) => {
          const count = group.messages.length;
          const isLastMyGroup = group === lastMyGroup;
          return (
            <div
              key={group.messages[0].id}
              className={'flex flex-col mb-1 px-3 ' + (group.isMine ? 'items-end' : 'items-start')}
            >
              <div
                className={
                  'flex items-end gap-1.5 ' + (group.isMine ? 'flex-row-reverse' : 'flex-row')
                }
              >
                {!group.isMine && (
                  <img
                    src={
                      group.avatar_url ||
                      'https://ui-avatars.com/api/?name=' + group.username + '&size=40'
                    }
                    alt=""
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0 self-end mb-0.5"
                  />
                )}
                <div
                  className={
                    'flex flex-col gap-[2px] max-w-[85%] ' +
                    (group.isMine ? 'items-end' : 'items-start')
                  }
                >
                  {group.messages.map((m, i) => (
                    <div key={m.id} className="group/b relative">
                      <div
                        className={
                          'px-3 py-2 text-sm leading-relaxed break-words ' +
                          bubbleRadius(group.isMine, i === 0, i === count - 1) +
                          ' ' +
                          (group.isMine
                            ? 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-700/60')
                        }
                      >
                        {m.content}
                        {m.media_url &&
                          (/\.(mp4|mov|avi|webm|mkv|ogg|wmv|flv)/i.test(m.media_url) ? (
                            <div
                              className="relative mt-1 rounded-lg overflow-hidden cursor-pointer group/vid"
                              onClick={() => {
                                const idx = chatMedia.indexOf(m.media_url);
                                if (idx !== -1) setLightboxIndex(idx);
                              }}
                            >
                              <video
                                src={m.media_url}
                                className="max-w-full max-h-40 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-black/40 flex items-center justify-center transition-colors">
                                <div className="bg-white/20 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center border border-white/30">
                                  <span className="text-white text-sm ml-0.5 leading-none">▶</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={m.media_url}
                              alt=""
                              className="mt-1 rounded-lg max-w-full max-h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                const idx = chatMedia.indexOf(m.media_url);
                                if (idx !== -1) setLightboxIndex(idx);
                              }}
                            />
                          ))}
                      </div>
                      <span
                        className={
                          'absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/b:opacity-100 transition-opacity text-[10px] text-gray-400 whitespace-nowrap ' +
                          (group.isMine ? 'right-full mr-1.5' : 'left-full ml-1.5')
                        }
                      >
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
                {group.isMine && <div className="w-5 flex-shrink-0" />}
              </div>
              {group.isMine && isLastMyGroup && lastSentRead && (
                <div className="flex items-center gap-1 mt-0.5 mr-7">
                  <img src={partnerAvatar} alt="" className="w-3 h-3 rounded-full object-cover" />
                  <span className="text-[9px] text-gray-400">Seen</span>
                </div>
              )}
            </div>
          );
        })}
        {typing && <TypingDots avatar={partnerAvatar} />}
        <div ref={bottomRef} />
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-b-2xl">
        <input
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) send();
            }
          }}
          placeholder="Aa"
          className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 text-xs outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
        <button
          onClick={() => canSend && send()}
          disabled={!canSend}
          className={
            'flex-shrink-0 transition-colors ' +
            (canSend ? 'text-brand-600 hover:text-brand-700' : 'text-gray-300 dark:text-gray-600')
          }
        >
          <IconSend />
        </button>
      </div>

      <MediaLightbox
        items={chatMedia}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNav={setLightboxIndex}
      />
    </>
  );
}

function ConversationList({ onSelect }) {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages').then((r) => r.data),
    refetchInterval: 30000,
  });
  return (
    <>
      <div className="px-4 py-3 bg-brand-600 rounded-t-2xl flex-shrink-0">
        <h3 className="font-bold text-white text-sm">Messages</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="text-center text-gray-400 text-xs py-6">Loading...</p>}
        {!isLoading && (conversations || []).length === 0 && (
          <p className="text-center text-gray-400 text-xs py-6">No conversations yet</p>
        )}
        {(conversations || []).map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-left"
          >
            <img
              src={c.partner_avatar || 'https://ui-avatars.com/api/?name=' + c.partner_username}
              alt=""
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p
                  className={
                    'text-sm truncate ' +
                    (c.unread_count > 0
                      ? 'font-bold text-gray-900 dark:text-white'
                      : 'font-medium text-gray-800 dark:text-gray-200')
                  }
                >
                  {c.partner_name || c.partner_username}
                </p>
                {c.last_message_at && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatPreview(c.last_message_at)}
                  </span>
                )}
              </div>
              <p
                className={
                  'text-xs truncate ' +
                  (c.unread_count > 0
                    ? 'font-semibold text-gray-700 dark:text-gray-300'
                    : 'text-gray-500')
                }
              >
                {c.last_message || 'No messages yet'}
              </p>
            </div>
            {c.unread_count > 0 && (
              <span className="w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                {c.unread_count}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

export default function FloatingMessageBubble() {
  const { pathname } = useLocation();
  const { token, unreadMessages, clearUnreadMessages } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [activeConv, setActiveConv] = useState(null);

  useEffect(() => {
    if (open || pathname.startsWith('/messages')) clearUnreadMessages();
  }, [open, pathname]);
  useEffect(() => {
    if (pathname.startsWith('/messages')) setOpen(false);
  }, [pathname]);

  if (!token) return null;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 h-[420px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {activeConv ? (
            <MiniChat conversation={activeConv} user={user} onBack={() => setActiveConv(null)} />
          ) : (
            <ConversationList onSelect={setActiveConv} />
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
        title="Messages"
        aria-label="Toggle messages"
      >
        {open ? <IconClose /> : <IconChat />}
        {!open && unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 shadow">
            {unreadMessages > 99 ? '99+' : unreadMessages}
          </span>
        )}
      </button>
    </div>
  );
}
