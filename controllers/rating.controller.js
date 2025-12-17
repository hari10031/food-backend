import Rating from "../models/rating.model.js";
import DeliveryBoyRating from "../models/deliveryBoyRating.model.js";
import Item from "../models/items.models.js";
import User from "../models/users.model.js";
import Order from "../models/order.model.js";

// Add rating for food items
export const addItemRating = async (req, res) => {
    try {
        const { itemId, orderId, rating, review } = req.body;

        if (!itemId || !orderId || !rating) {
            return res.status(400).json({ message: "Item ID, Order ID, and rating are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        // Check if order exists and belongs to user
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== req.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Check if item exists in the order
        let itemFound = false;
        let shopOrderId = null;

        for (const shopOrder of order.shopOrders) {
            const itemInOrder = shopOrder.shopOrderItems.find(
                item => item.item.toString() === itemId
            );
            if (itemInOrder) {
                itemFound = true;
                shopOrderId = shopOrder._id;
                break;
            }
        }

        if (!itemFound) {
            return res.status(400).json({ message: "Item not found in this order" });
        }

        // Create or update rating
        const existingRating = await Rating.findOne({
            user: req.userId,
            item: itemId,
            order: orderId
        });

        if (existingRating) {
            // Update existing rating
            const oldRating = existingRating.rating;
            existingRating.rating = rating;
            existingRating.review = review || "";
            await existingRating.save();

            // Update item's average rating
            const item = await Item.findById(itemId);
            const totalRating = (item.rating.average * item.rating.count) - oldRating + rating;
            item.rating.average = totalRating / item.rating.count;
            await item.save();

            return res.status(200).json({ message: "Rating updated successfully", rating: existingRating });
        } else {
            // Create new rating
            const newRating = await Rating.create({
                user: req.userId,
                item: itemId,
                order: orderId,
                rating,
                review: review || ""
            });

            // Update item's average rating
            const item = await Item.findById(itemId);
            const totalRating = (item.rating.average * item.rating.count) + rating;
            item.rating.count += 1;
            item.rating.average = totalRating / item.rating.count;
            await item.save();

            return res.status(201).json({ message: "Rating added successfully", rating: newRating });
        }
    } catch (error) {
        console.error("Add Item Rating Error:", error);
        return res.status(500).json({ message: `Add Item Rating error: ${error.message}` });
    }
};

// Add rating for delivery boy
export const addDeliveryBoyRating = async (req, res) => {
    try {
        const { deliveryBoyId, orderId, shopOrderId, rating, review } = req.body;

        if (!deliveryBoyId || !orderId || !shopOrderId || !rating) {
            return res.status(400).json({ message: "Delivery Boy ID, Order ID, Shop Order ID, and rating are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        // Check if order exists and belongs to user
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== req.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Find the shop order
        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!shopOrder) {
            return res.status(404).json({ message: "Shop order not found" });
        }

        // Verify delivery boy
        if (!shopOrder.assignedDeliveryBoy || shopOrder.assignedDeliveryBoy.toString() !== deliveryBoyId) {
            return res.status(400).json({ message: "Invalid delivery boy for this order" });
        }

        // Check if order is delivered
        if (shopOrder.status !== "delivered") {
            return res.status(400).json({ message: "Can only rate after delivery is completed" });
        }

        // Create or update rating
        const existingRating = await DeliveryBoyRating.findOne({
            user: req.userId,
            deliveryBoy: deliveryBoyId,
            shopOrderId
        });

        if (existingRating) {
            // Update existing rating
            const oldRating = existingRating.rating;
            existingRating.rating = rating;
            existingRating.review = review || "";
            await existingRating.save();

            // Update delivery boy's average rating
            const deliveryBoy = await User.findById(deliveryBoyId);
            const totalRating = (deliveryBoy.deliveryStats.rating.average * deliveryBoy.deliveryStats.rating.count) - oldRating + rating;
            deliveryBoy.deliveryStats.rating.average = totalRating / deliveryBoy.deliveryStats.rating.count;
            await deliveryBoy.save();

            // Update shopOrder rating flag
            shopOrder.deliveryBoyRated = true;
            await order.save();

            return res.status(200).json({ message: "Rating updated successfully", rating: existingRating });
        } else {
            // Create new rating
            const newRating = await DeliveryBoyRating.create({
                user: req.userId,
                deliveryBoy: deliveryBoyId,
                order: orderId,
                shopOrderId,
                rating,
                review: review || ""
            });

            // Update delivery boy's average rating
            const deliveryBoy = await User.findById(deliveryBoyId);
            const totalRating = (deliveryBoy.deliveryStats.rating.average * deliveryBoy.deliveryStats.rating.count) + rating;
            deliveryBoy.deliveryStats.rating.count += 1;
            deliveryBoy.deliveryStats.rating.average = totalRating / deliveryBoy.deliveryStats.rating.count;
            await deliveryBoy.save();

            // Update shopOrder rating flag
            shopOrder.deliveryBoyRated = true;
            await order.save();

            return res.status(201).json({ message: "Rating added successfully", rating: newRating });
        }
    } catch (error) {
        console.error("Add Delivery Boy Rating Error:", error);
        return res.status(500).json({ message: `Add Delivery Boy Rating error: ${error.message}` });
    }
};

// Get ratings for an item
export const getItemRatings = async (req, res) => {
    try {
        const { itemId } = req.params;

        const ratings = await Rating.find({ item: itemId })
            .populate("user", "fullName")
            .sort({ createdAt: -1 })
            .limit(50);

        const item = await Item.findById(itemId);

        return res.status(200).json({
            ratings,
            averageRating: item?.rating?.average || 0,
            totalRatings: item?.rating?.count || 0
        });
    } catch (error) {
        console.error("Get Item Ratings Error:", error);
        return res.status(500).json({ message: `Get Item Ratings error: ${error.message}` });
    }
};

// Get ratings for a delivery boy
export const getDeliveryBoyRatings = async (req, res) => {
    try {
        const { deliveryBoyId } = req.params;

        const ratings = await DeliveryBoyRating.find({ deliveryBoy: deliveryBoyId })
            .populate("user", "fullName")
            .sort({ createdAt: -1 })
            .limit(50);

        const deliveryBoy = await User.findById(deliveryBoyId);

        return res.status(200).json({
            ratings,
            averageRating: deliveryBoy?.deliveryStats?.rating?.average || 0,
            totalRatings: deliveryBoy?.deliveryStats?.rating?.count || 0
        });
    } catch (error) {
        console.error("Get Delivery Boy Ratings Error:", error);
        return res.status(500).json({ message: `Get Delivery Boy Ratings error: ${error.message}` });
    }
};

// Check if user can rate items/delivery boy for an order
export const checkRatingStatus = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== req.userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!shopOrder) {
            return res.status(404).json({ message: "Shop order not found" });
        }

        return res.status(200).json({
            canRate: shopOrder.status === "delivered",
            itemsRated: shopOrder.itemsRated || false,
            deliveryBoyRated: shopOrder.deliveryBoyRated || false,
            shopOrderItems: shopOrder.shopOrderItems
        });
    } catch (error) {
        console.error("Check Rating Status Error:", error);
        return res.status(500).json({ message: `Check Rating Status error: ${error.message}` });
    }
};

// Mark items as rated
export const markItemsAsRated = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!shopOrder) {
            return res.status(404).json({ message: "Shop order not found" });
        }

        shopOrder.itemsRated = true;
        await order.save();

        return res.status(200).json({ message: "Items marked as rated" });
    } catch (error) {
        console.error("Mark Items as Rated Error:", error);
        return res.status(500).json({ message: `Mark Items as Rated error: ${error.message}` });
    }
};
