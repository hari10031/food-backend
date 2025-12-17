import Ticket from "../models/ticket.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.models.js";

// Create a new support ticket
export const createTicket = async (req, res) => {
    try {
        const { orderId, shopId, subject, description } = req.body;
        const userId = req.userId;

        if (!orderId || !shopId || !subject || !description) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const ticket = await Ticket.create({
            user: userId,
            order: orderId,
            shop: shopId,
            subject,
            description
        });

        return res.status(201).json({ message: "Ticket raised successfully", ticket });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Get tickets for a logged-in user
export const getUserTickets = async (req, res) => {
    try {
        const userId = req.userId;
        const tickets = await Ticket.find({ user: userId })
            .populate("shop", "name")
            .sort({ createdAt: -1 });
        return res.status(200).json(tickets);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Get tickets for an owner (tickets related to their shops)
export const getOwnerTickets = async (req, res) => {
    try {
        const ownerId = req.userId;
        // Find shops owned by this user
        const shops = await Shop.find({ owner: ownerId });
        const shopIds = shops.map(shop => shop._id);

        const tickets = await Ticket.find({ shop: { $in: shopIds } })
            .populate("user", "fullName email mobile")
            .populate("shop", "name")
            .populate("order", "totalAmount createdAt")
            .sort({ createdAt: -1 });

        return res.status(200).json(tickets);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Resolve a ticket
export const resolveTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { resolutionNote } = req.body;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        ticket.status = "resolved";
        ticket.resolutionNote = resolutionNote || "Issue resolved by shop owner.";
        await ticket.save();

        return res.status(200).json({ message: "Ticket resolved", ticket });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
