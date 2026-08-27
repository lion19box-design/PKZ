import { io } from 'socket.io-client';

// Если задана переменная VITE_SERVER_URL, используем её. Иначе fallback на http://localhost:3001
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
