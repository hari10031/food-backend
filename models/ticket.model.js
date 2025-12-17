import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["open", "resolved"],
        default: "open"
    },
    resolutionNote: {
        type: String
    }
}, { timestamps: true });

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
