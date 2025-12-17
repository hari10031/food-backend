import Chat from "../models/chat.model.js";
import Order from "../models/order.model.js";
import User from "../models/users.model.js";

// Get or create chat for an order
export const getOrCreateChat = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.params;
        const userId = req.userId;

        // Find existing chat
        let chat = await Chat.findOne({ order: orderId, shopOrderId })
            .populate("user", "fullName")
            .populate("deliveryBoy", "fullName")
            .lean();

        if (chat) {
            return res.status(200).json({ success: true, chat });
        }

        // Find the order to get delivery boy info
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!shopOrder) {
            return res.status(404).json({ success: false, message: "Shop order not found" });
        }

        // Check for assigned delivery boy (field is assignedDeliveryBoy)
        if (!shopOrder.assignedDeliveryBoy) {
            return res.status(400).json({ success: false, message: "No delivery boy assigned yet" });
        }

        // Create new chat
        const newChat = new Chat({
            order: orderId,
            shopOrderId,
            user: order.user,
            deliveryBoy: shopOrder.assignedDeliveryBoy,
            messages: []
        });

        await newChat.save();

        chat = await Chat.findById(newChat._id)
            .populate("user", "fullName")
            .populate("deliveryBoy", "fullName")
            .lean();

        return res.status(201).json({ success: true, chat });
    } catch (error) {
        console.error("Get/Create chat error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Send message
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;
        const userId = req.userId;

        // Get user to determine role
        const currentUser = await User.findById(userId).select("role").lean();
        if (!currentUser) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        if (!content || content.trim() === "") {
            return res.status(400).json({ success: false, message: "Message content required" });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        // Verify user is part of this chat
        const isUser = chat.user.toString() === userId.toString();
        const isDeliveryBoy = chat.deliveryBoy.toString() === userId.toString();

        if (!isUser && !isDeliveryBoy) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const senderRole = isUser ? "user" : "deliveryboy";

        const message = {
            sender: userId,
            senderRole,
            content: content.trim(),
            read: false
        };

        chat.messages.push(message);
        await chat.save();

        const savedMessage = chat.messages[chat.messages.length - 1];

        // Emit socket event for real-time updates
        const io = req.app.get("io");
        if (io) {
            const recipientId = isUser ? chat.deliveryBoy.toString() : chat.user.toString();
            // Emit to the recipient's user room (use hyphen to match socket.js)
            io.to(`user-${recipientId}`).emit("new_message", {
                chatId: chat._id,
                message: savedMessage,
                senderId: userId.toString()
            });
            // Note: Don't emit to chat room to avoid duplicate messages
            // The sender already gets the message from API response
        }

        return res.status(200).json({ success: true, message: savedMessage });
    } catch (error) {
        console.error("Send message error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get chat messages
export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.userId;

        const chat = await Chat.findById(chatId)
            .populate("user", "fullName")
            .populate("deliveryBoy", "fullName")
            .lean();

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        // Verify user is part of this chat
        const isUser = chat.user._id.toString() === userId.toString();
        const isDeliveryBoy = chat.deliveryBoy._id.toString() === userId.toString();

        if (!isUser && !isDeliveryBoy) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        return res.status(200).json({ success: true, chat });
    } catch (error) {
        console.error("Get chat messages error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Mark messages as read
export const markMessagesRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.userId;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        // Verify user is part of this chat
        const isUser = chat.user.toString() === userId.toString();
        const isDeliveryBoy = chat.deliveryBoy.toString() === userId.toString();

        if (!isUser && !isDeliveryBoy) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // Mark messages from the other person as read
        const senderRoleToMark = isUser ? "deliveryboy" : "user";

        chat.messages.forEach(msg => {
            if (msg.senderRole === senderRoleToMark && !msg.read) {
                msg.read = true;
            }
        });

        await chat.save();

        return res.status(200).json({ success: true, message: "Messages marked as read" });
    } catch (error) {
        console.error("Mark messages read error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get all chats for a user (for delivery boy to see all active chats)
export const getMyChats = async (req, res) => {
    try {
        const userId = req.userId;

        // Get user to determine role
        const currentUser = await User.findById(userId).select("role").lean();
        if (!currentUser) {
            return res.status(401).json({ success: false, message: "User not found" });
        }
        const userRole = currentUser.role;

        let query = { isActive: true };

        if (userRole === "deliveryboy") {
            query.deliveryBoy = userId;
        } else {
            query.user = userId;
        }

        const chats = await Chat.find(query)
            .populate("user", "fullName")
            .populate("deliveryBoy", "fullName")
            .populate("order", "totalAmount")
            .sort({ updatedAt: -1 })
            .lean();

        // Add unread count for each chat
        const chatsWithUnread = chats.map(chat => {
            const senderRoleToCount = userRole === "deliveryboy" ? "user" : "deliveryboy";
            const unreadCount = chat.messages.filter(
                msg => msg.senderRole === senderRoleToCount && !msg.read
            ).length;
            return { ...chat, unreadCount };
        });

        return res.status(200).json({ success: true, chats: chatsWithUnread });
    } catch (error) {
        console.error("Get my chats error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
