import { io } from 'socket.io-client';

// В разработке используем локальный сервер, в проде - можно использовать window.location
const URL = import.meta.env.PROD ? undefined : 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: true,
});
