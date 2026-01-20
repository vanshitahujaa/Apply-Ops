import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { authenticateSocket } from './middleware/auth';

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Store io instance in app locals so it can be accessed in routes
app.set('io', io);

// Socket.io middleware for authentication
// io.use(authenticateSocket); // We'll implement this next

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('join_user_room', (userId) => {
        if (userId) {
            socket.join(`user:${userId}`);
            console.log(`👤 Socket ${socket.id} joined room user:${userId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 ApplyOps API running on http://localhost:${PORT}`);
});
