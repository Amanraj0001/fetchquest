import { io } from 'socket.io-client';

// Same-origin in production; Vite proxies Socket.IO to port 8000 locally.
export const socket = io({ autoConnect: false });
