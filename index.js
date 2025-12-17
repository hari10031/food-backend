import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import Authrouter from './routes/auth.route.js';
import cors from 'cors';
import userRouter from './routes/user.route.js';
import shopRouter from './routes/shop.route.js';
import itemRouter from './routes/item.routes.js'
import orderRouter from './routes/order.route.js';
import ratingRouter from './routes/rating.route.js';
import ticketRouter from './routes/ticket.route.js';
import couponRouter from './routes/coupon.route.js';
import chatRouter from './routes/chat.route.js';
import { createServer } from 'http';
import { initializeSocket } from './utils/socket.js';
dotenv.config();
const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 5000;
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}))
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', Authrouter);
app.use('/api/user', userRouter);
app.use('/api/shop', shopRouter);
app.use('/api/item', itemRouter);
app.use('/api/order', orderRouter);
app.use('/api/rating', ratingRouter);
app.use('/api/ticket', ticketRouter);
app.use('/api/coupon', couponRouter);
app.use('/api/chat', chatRouter);


// Initialize Socket.IO
const io = initializeSocket(httpServer);
app.set("io", io);

httpServer.listen(port, () => {
    connectDB();
    console.log(`Server is running on port: ${port}`);
    console.log(`Socket.IO is ready`);
});