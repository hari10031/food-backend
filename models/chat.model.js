import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    senderRole: {
        type: String,
        enum: ["user", "deliveryboy"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    shopOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    deliveryBoy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    messages: [messageSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Index for faster lookups
chatSchema.index({ order: 1, shopOrderId: 1 });
chatSchema.index({ user: 1, isActive: 1 });
chatSchema.index({ deliveryBoy: 1, isActive: 1 });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
