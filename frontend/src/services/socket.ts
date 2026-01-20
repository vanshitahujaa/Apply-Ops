import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store';

// Initialize socket connection
// In development, we connect to the backend URL (defaulting to localhost:4000)
// In production, we use the relative path so it goes through the Nginx proxy
const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/' : 'http://localhost:4000');

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect() {
        if (this.socket?.connected) return;

        const { user } = useAuthStore.getState();

        if (!user) return;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected');
            // Join user room
            this.socket?.emit('join_user_room', user.id);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public on(event: string, callback: (...args: any[]) => void) {
        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    public off(event: string, callback: (...args: any[]) => void) {
        this.socket?.off(event, callback);
    }
}

export const socketService = SocketService.getInstance();
