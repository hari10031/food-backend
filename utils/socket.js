import { Server } from 'socket.io';

let io;

export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // Join room based on user ID
        socket.on('join', (userId) => {
            socket.join(`user-${userId}`);
            console.log(`User ${userId} joined their room`);
        });

        // Join delivery boy room
        socket.on('join-delivery-boy', (deliveryBoyId) => {
            socket.join(`deliveryboy-${deliveryBoyId}`);
            console.log(`Delivery boy ${deliveryBoyId} joined their room`);
        });

        // Join order tracking room
        socket.on('join-order', (orderId) => {
            socket.join(`order-${orderId}`);
            console.log(`Joined order room: ${orderId}`);
        });

        // Delivery boy location update
        socket.on('update-location', (data) => {
            const { orderId, latitude, longitude, deliveryBoyId } = data;
            // Broadcast location to users tracking this order
            socket.to(`order-${orderId}`).emit('delivery-location-updated', {
                latitude,
                longitude,
                deliveryBoyId,
                timestamp: new Date()
            });
        });

        // Leave order tracking room
        socket.on('leave-order', (orderId) => {
            socket.leave(`order-${orderId}`);
            console.log(`Left order room: ${orderId}`);
        });

        // Chat socket handlers
        socket.on('join-chat', (chatId) => {
            socket.join(`chat-${chatId}`);
        });

        socket.on('leave-chat', (chatId) => {
            socket.leave(`chat-${chatId}`);
        });

        socket.on('typing', (data) => {
            const { chatId, userId, isTyping } = data;
            socket.to(`chat-${chatId}`).emit('user-typing', { userId, isTyping });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

export const getSocketIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
};

// Emit events to specific users/rooms
export const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user-${userId}`).emit(event, data);
    }
};

export const emitToDeliveryBoy = (deliveryBoyId, event, data) => {
    if (io) {
        io.to(`deliveryboy-${deliveryBoyId}`).emit(event, data);
    }
};

export const emitToOrder = (orderId, event, data) => {
    if (io) {
        io.to(`order-${orderId}`).emit(event, data);
    }
};

export const emitToChat = (chatId, event, data) => {
    if (io) {
        io.to(`chat-${chatId}`).emit(event, data);
    }
};

export const emitToOwner = (ownerId, event, data) => {
    if (io) {
        io.to(`user-${ownerId}`).emit(event, data);
    }
};
