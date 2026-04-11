import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket = null;

export const initSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io('/', { auth: { token }, transports: ['websocket'] });

  socket.on('notification', (notification) => {
    useAuthStore.getState().addNotification(notification);
  });

  // Increment unread message badge when a message arrives while not in the chat
  socket.on('new_message', () => {
    if (!window.location.pathname.startsWith('/messages')) {
      useAuthStore.getState().addUnreadMessage();
    }
  });

  return socket;
};

export const getSocket = () => socket;

export const joinConversation = (id) => socket?.emit('join_conversation', id);
export const leaveConversation = (id) => socket?.emit('leave_conversation', id);
export const emitTyping = (conversationId) => socket?.emit('typing', { conversationId });
