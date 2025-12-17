
import User from '../models/users.model.js';
import DeliveryAssignment from '../models/deliveryAssignment.model.js';
import { emitToOrder } from '../utils/socket.js';

export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;
        console.log("UserId in getCurrentUser:", userId);
        if (!userId) {
            return res.status(401).json({ message: "userid is not found" });

        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "user is not found" });
        }
        return res.status(200).json({ user });

    } catch (error) {
        return res.status(500).json({ message: `Get current user error ${error}` });


    }

}

export const updateUserLocation = async (req, res) => {
    try {
        const { lat, lon } = req.body;
        const user = await User.findByIdAndUpdate(req.userId, {
            location: {
                type: 'Point',
                coordinates: [lon, lat]
            },
        }, { new: true });

        console.log(`Location updated for user: ${user?._id}`);
        if (!user) {
            return res.status(400).json({ message: "user is not found" });
        }

        // If delivery boy, find their active order and emit real-time location
        let activeOrderId = null;
        if (user.role === 'deliveryboy') {
            const activeAssignment = await DeliveryAssignment.findOne({
                assignedTo: req.userId,
                status: 'accepted'
            });

            if (activeAssignment) {
                activeOrderId = activeAssignment.order.toString();
                // Emit real-time location update to users tracking this order
                emitToOrder(activeOrderId, 'delivery-location-updated', {
                    deliveryBoyId: req.userId,
                    latitude: lat,
                    longitude: lon,
                    timestamp: new Date()
                });
            }
        }

        return res.status(200).json({ message: 'location updated', activeOrderId });

    } catch (error) {
        return res.status(500).json({ message: `Unable to update user location error ${error}` });

    }
}

export const getDeliveryBoyStats = async (req, res) => {
    try {
        const deliveryBoy = await User.findById(req.userId);

        if (!deliveryBoy) {
            return res.status(404).json({ message: "User not found" });
        }

        if (deliveryBoy.role !== "deliveryboy") {
            return res.status(403).json({ message: "Access denied. Not a delivery boy" });
        }

        // Check if we need to reset today's stats (new day)
        const lastReset = new Date(deliveryBoy.deliveryStats.lastResetDate);
        const now = new Date();

        if (lastReset.getDate() !== now.getDate() ||
            lastReset.getMonth() !== now.getMonth() ||
            lastReset.getFullYear() !== now.getFullYear()) {
            // Reset today's stats
            deliveryBoy.deliveryStats.todayDeliveries = 0;
            deliveryBoy.deliveryStats.todayEarnings = 0;
            deliveryBoy.deliveryStats.lastResetDate = now;
            await deliveryBoy.save();
        }

        return res.status(200).json({
            todayDeliveries: deliveryBoy.deliveryStats.todayDeliveries || 0,
            todayEarnings: deliveryBoy.deliveryStats.todayEarnings || 0,
            totalDeliveries: deliveryBoy.deliveryStats.totalDeliveries || 0,
            totalEarnings: deliveryBoy.deliveryStats.totalEarnings || 0,
            rating: {
                average: deliveryBoy.deliveryStats.rating.average || 0,
                count: deliveryBoy.deliveryStats.rating.count || 0
            }
        });

    } catch (error) {
        console.error("Get Delivery Boy Stats Error:", error);
        return res.status(500).json({ message: `Get Delivery Boy Stats error: ${error.message}` });
    }
}

export const updateUser = async (req, res) => {
    try {
        const { fullName, email, mobile } = req.body;
        const userId = req.userId;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { fullName, email, mobile },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ message: "User details updated successfully", user: updatedUser });
    } catch (error) {
        return res.status(500).json({ message: `Update user error: ${error.message}` });
    }
};