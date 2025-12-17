import express from "express";
import isAuth from "../middlewares/auth.middleware.js";
import {
    getOrCreateChat,
    sendMessage,
    getChatMessages,
    markMessagesRead,
    getMyChats
} from "../controllers/chat.controller.js";

const router = express.Router();

// Get all my chats
router.get("/my-chats", isAuth, getMyChats);

// Get or create chat for an order
router.get("/order/:orderId/:shopOrderId", isAuth, getOrCreateChat);

// Get chat messages
router.get("/:chatId", isAuth, getChatMessages);

// Send message
router.post("/:chatId/message", isAuth, sendMessage);

// Mark messages as read
router.put("/:chatId/read", isAuth, markMessagesRead);

export default router;
