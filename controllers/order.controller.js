import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import mongoose from "mongoose"
import Order from "../models/order.model.js"
import Shop from "../models/shop.models.js"
import User from "../models/users.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import Razorpay from "razorpay"
import dotenv from "dotenv"
import { emitToUser, emitToDeliveryBoy, emitToOrder, emitToOwner } from "../utils/socket.js";
dotenv.config();


let instance;
if (process.env.RAZORPAY_KEY && process.env.RAZORPAY_SECRET) {
    instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY,
        key_secret: process.env.RAZORPAY_SECRET,
    });
} else {
    console.warn("Razorpay keys missing. Payment features will be disabled.");
}

export const placeOrder = async (req, res) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, totalAmount, couponCode, discountAmount } = req.body
        if (cartItems.length == 0 || !cartItems) {
            return res.status(400).json({
                message: "cart is empty"
            })
        }
        if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
            return res.status(400).json({
                message: "send complete deliveryAddress"
            })
        }
        const groupItemsByShop = {}
        cartItems.forEach(item => {
            const shopId = item.shop
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = []

            }
            groupItemsByShop[shopId].push(item)
        });


        const shopOrders = await Promise.all(
            Object.keys(groupItemsByShop).map(
                async (shopId) => {
                    const shop = await Shop.findById(shopId).populate("owner");
                    if (!shop) {
                        return res.status(400).json({ message: "Shop not found" });
                    }
                    const items = groupItemsByShop[shopId]
                    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
                    return {
                        shop: shop._id,
                        owner: shop.owner._id,
                        subtotal,
                        shopOrderItems: items.map(
                            (i) => (
                                {
                                    item: i.id,
                                    price: i.price,
                                    quantity: i.quantity,
                                    name: i.name
                                }
                            )
                        )

                    }
                }
            )

        )
        if (paymentMethod === "online") {
            if (!instance) {
                return res.status(500).json({ message: "Online payment setup is not configured properly" });
            }
            const razorOrder = await instance.orders.create({
                amount: Math.round(totalAmount * 100),
                currency: "INR",
                receipt: `receipt_${Date.now()}`,
            })
            const newOrder = await Order.create(
                {
                    user: req.userId,
                    paymentMethod,
                    deliveryAddress,
                    totalAmount,
                    shopOrders,
                    couponCode,
                    discountAmount,
                    razorpayOrderId: (await razorOrder).id,
                    payment: false
                }
            )
            return res.status(200).json(
                {
                    razorOrder,
                    orderId: newOrder._id,
                    key_id: process.env.RAZORPAY_KEY
                }
            )
        }

        const newOrder = await Order.create(
            {
                user: req.userId,
                paymentMethod,
                deliveryAddress,
                totalAmount,
                shopOrders,
                couponCode,
                discountAmount

            }
        )
        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
        await newOrder.populate("shopOrders.shop", "name")

        // Notify shop owners about new order
        shopOrders.forEach(shopOrder => {
            emitToOwner(shopOrder.owner.toString(), 'new-order', {
                orderId: newOrder._id,
                shopId: shopOrder.shop,
                totalAmount: shopOrder.subtotal,
                itemCount: shopOrder.shopOrderItems.length,
                deliveryAddress: deliveryAddress.text,
                timestamp: new Date()
            });
        });

        return res.status(201).json(newOrder)

    } catch (error) {
        return res.status(500).json({ message: `Place order error: ${error}` })

    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body;
        if (!instance) {
            return res.status(500).json({ message: "Payment setup is not configured" });
        }
        const payment = await instance.payments.fetch(razorpay_payment_id);
        if (!payment || payment.status !== "captured") {
            return res.status(400).json({ message: "Payment not found" })
        }


        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).json({ message: "Order not found" })
        }
        order.payment = true;
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();
        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "_id")

        // Notify shop owners about new paid order
        order.shopOrders.forEach(shopOrder => {
            emitToOwner(shopOrder.owner._id.toString(), 'new-order', {
                orderId: order._id,
                shopId: shopOrder.shop._id,
                totalAmount: shopOrder.subtotal,
                itemCount: shopOrder.shopOrderItems.length,
                deliveryAddress: order.deliveryAddress.text,
                paymentMethod: 'online',
                timestamp: new Date()
            });
        });

        return res.status(201).json(order)
    } catch (error) {
        return res.status(500).json({ message: `verify payment error: ${error}` })

    }
}

export const getMyOrders = async (req, res) => {
    try {
        const user1 = await User.findById(req.userId)
        // console.log(user.role)
        if (user1.role == "user") {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price rating")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")

            return res.status(200).json(orders)

        } else if (user1.role == "owner") {
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")
                .populate({
                    path: "shopOrders.assignment",
                    populate: {
                        path: "broadcastedTo",
                        select: "_id fullName mobile"
                    }
                })
            // console.log(orders)
            const filteredOrder = orders.map(
                order => {
                    const myShopOrder = order.shopOrders.find(o => String(o.owner._id) === String(req.userId));
                    // Get available boys from assignment's broadcastedTo
                    const availableBoys = myShopOrder?.assignment?.broadcastedTo?.map(b => ({
                        _id: b._id,
                        fullName: b.fullName,
                        mobile: b.mobile
                    })) || [];

                    return {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: myShopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment,
                        availableBoys: availableBoys,
                        couponCode: order.couponCode,
                        discountAmount: order.discountAmount
                    }
                }

            )
            // console.log("filtered: ", filteredOrder)
            return res.status(200).json(filteredOrder)

        } else if (user1.role == "deliveryboy") {
            const orders = await Order.find({ "shopOrders.assignedDeliveryBoy": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user", "fullName mobile location")
                .populate("shopOrders.shopOrderItems.item", "name image price")

            const filteredOrders = [];

            orders.forEach(order => {
                // Find all shop orders assigned to this delivery boy in this order
                const myShopOrders = order.shopOrders.filter(
                    so => so.assignedDeliveryBoy && so.assignedDeliveryBoy.toString() === req.userId
                );

                myShopOrders.forEach(shopOrder => {
                    filteredOrders.push({
                        _id: order._id,
                        shopOrderId: shopOrder._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shop: shopOrder.shop,
                        items: shopOrder.shopOrderItems,
                        totalAmount: shopOrder.subtotal,
                        status: shopOrder.status,
                        createdAt: order.createdAt,
                        deliveredAt: shopOrder.deliveredAt,
                        deliveryAddress: order.deliveryAddress,
                        earnings: shopOrder.earnings || 50 // Default earning if not set
                    });
                });
            });

            return res.status(200).json(filteredOrders);
        }

    } catch (error) {
        return res.status(500).json({ message: `Get User Order error: ${error}` })

    }
}

// export const getOwnerOder = async (req, res) => {
//     try {
//         const orders = (await Order.find({ "shopOrders.owner": req.userId }))
//             .sort({ createdAt: -1 })
//             .populate("shopOrders.shop", "name")
//             .populate("user", "name email mobile")
//             .populate("shopOrders.shopOrderItems.item", "name image price")
//         return res.status(200).json(orders)


//     } catch (error) {
//         return res.status(500).json({ message: `Get Owner Order error: ${error}` })


//     }
// }

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params;
        const { status } = req.body;
        const order = await Order.findById(orderId);

        const shopOrder = order.shopOrders.find(o => o.shop == shopId)
        if (!shopOrder) {
            return res.status(400).json({
                message: "shop order not found"
            })
        }
        shopOrder.status = status;

        // Reset assignment if order is moved back from out of delivery/delivered state
        if (shopOrder.assignment && status !== 'out of delivery' && status !== 'delivered') {
            const existingAssignment = await DeliveryAssignment.findById(shopOrder.assignment);
            // Only delete if it hasn't been accepted yet (is still broadcasted)
            if (existingAssignment && existingAssignment.status === 'broadcasted') {
                await DeliveryAssignment.findByIdAndDelete(shopOrder.assignment);
                shopOrder.assignment = null;
                shopOrder.assignedDeliveryBoy = null;
            }
        }

        let deliveryBoysPayload = [];
        if (status == "out of delivery" && !shopOrder.assignment) {
            const { longitude, latitude } = order.deliveryAddress
            const searchLat = Number(latitude);
            const searchLon = Number(longitude);

            // Find delivery boys - first try nearby, then all as fallback
            let nearByDeliveryBoys = await User.find({
                role: "deliveryboy",
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [searchLon, searchLat]
                        },
                        $maxDistance: 10000
                    }
                }
            }).select("_id fullName mobile location").lean();

            if (nearByDeliveryBoys.length === 0) {
                nearByDeliveryBoys = await User.find({ role: "deliveryboy" })
                    .select("_id fullName mobile location").lean();
            }

            // Get busy delivery boy IDs in one query
            const nearByIds = nearByDeliveryBoys.map(o => o._id);
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: "assigned"
            }).distinct("assignedTo");

            const busyIdSet = new Set(busyIds.map(id => String(id)));
            const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(String(b._id)));
            const candidates = availableBoys.map(b => b._id);

            if (candidates.length === 0) {
                await order.save();
                return res.json({ message: "Order status updated but no delivery boys available", status });
            }

            const deliveryAssignment = await DeliveryAssignment.create({
                order: order._id,
                shop: shopOrder.shop,
                shopOrderId: shopOrder._id,
                broadcastedTo: candidates,
                status: "broadcasted"
            });

            shopOrder.assignment = deliveryAssignment._id;
            deliveryBoysPayload = availableBoys.map(b => ({
                _id: b._id,
                fullName: b.fullName,
                mobile: b.mobile
            }));
        }

        // Save order (this also saves the embedded shopOrder)
        await order.save();

        // Only populate if needed for response
        const updatedShopOrder = order.shopOrders.find(o => String(o.shop) === String(shopId));

        // Emit socket events asynchronously (don't wait)
        setImmediate(() => {
            emitToUser(order.user, 'order-status-updated', {
                orderId: order._id,
                shopOrderId: shopOrder._id,
                status: shopOrder.status,
                timestamp: new Date()
            });

            // Notify delivery boys if assignment was created
            if (shopOrder.assignment && deliveryBoysPayload.length > 0) {
                deliveryBoysPayload.forEach(boy => {
                    emitToDeliveryBoy(boy._id, 'new-delivery-assignment', {
                        assignmentId: shopOrder.assignment,
                        orderId: order._id,
                        shopOrderId: shopOrder._id,
                        timestamp: new Date()
                    });
                });
            }
        });

        return res.status(200).json({
            status: shopOrder.status,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment
        });


    } catch (error) {
        return res.status(500).json({ message: `UpdateOrder Status error: ${error}` })

    }
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371e3; // Earth radius in meters
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId;

        // Fetch broadcasted assignments where this delivery boy is in broadcastedTo
        const assignments = await DeliveryAssignment.find({
            status: "broadcasted",
            broadcastedTo: deliveryBoyId
        })
            .populate("order", "deliveryAddress shopOrders")
            .populate("shop", "name")
            .lean();

        const formatted = assignments
            .filter(a => a.order && a.shop)
            .map(a => {
                const shopOrder = a.order.shopOrders.find(so => String(so._id) === String(a.shopOrderId));
                return {
                    assignmentId: a._id,
                    orderId: a.order._id,
                    shopName: a.shop.name,
                    deliveryAddress: a.order.deliveryAddress,
                    items: shopOrder?.shopOrderItems || [],
                    subtotal: shopOrder?.subtotal || 0,
                    shopOrderId: a.shopOrderId
                };
            });

        return res.status(200).json(formatted);

    } catch (error) {
        return res.status(500).json({ message: `get Assignment error: ${error}` });
    }
}

export const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) {
            return res.status(400).json(
                {
                    message: "Assignment not found"
                }
            )
        }
        if (assignment.status !== "broadcasted") {
            return res.status(400).json(
                {
                    message: "assignment is required"
                }
            )
        }
        const alreadyAssigned = await DeliveryAssignment.findOne(
            {
                assignedTo: req.userId,
                status: {
                    $nin: [
                        "broadcasted", "completed"
                    ]
                }
            }
        )
        if (alreadyAssigned) {
            return res.status(400).json(
                {
                    message: "You are already assigned to another order"
                }
            )
        }
        assignment.assignedTo = req.userId;
        assignment.status = "assigned";
        assignment.acceptedAt = new Date();
        await assignment.save();

        const order = await Order.findById(assignment.order);
        if (!order) {
            return res.status(400).json({ message: "Order not found" })
        }
        const shopOrder = order.shopOrders.id(assignment.shopOrderId);
        if (shopOrder) {
            shopOrder.assignedDeliveryBoy = req.userId;
        }
        // shopOrder?.assignedDeliveryBoy = req.userId;
        await order.save()
        // await order.populate("shopOrders.assignedDeliveryBoy");

        // Notify user that delivery boy accepted the order
        emitToUser(order.user, 'delivery-accepted', {
            orderId: order._id,
            shopOrderId: assignment.shopOrderId,
            deliveryBoyId: req.userId,
            timestamp: new Date()
        });

        return res.status(200).json({
            message: "order accepted"
        })
    } catch (error) {
        return res.status(500).json({ message: `accept Order  error: ${error}` })

    }
}

export const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne(
            {
                assignedTo: req.userId,
                status: "assigned"
            }
        ).populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",

                populate: [{ path: "user", select: "fullName email location mobile" }]
            })
        if (!assignment) {
            return res.status(404).json({ message: "No current order found" })
        }
        if (!assignment.order) {
            return res.status(404).json({ message: " order not found" })
        }
        const shopOrder = assignment.order.shopOrders.find(so => String(so._id) == String(assignment.shopOrderId))
        if (!shopOrder) {
            return res.status(404).json({ message: " shop order not found" })
        }

        let deliveryBoyLocation = { lat: null, lon: null }
        if (assignment.assignedTo.location.coordinates.length == 2) {

            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1];
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0];
        }
        let customerLocation = {
            lat: null,
            lon: null
        }
        if (assignment.order.deliveryAddress) {

            customerLocation.lat = assignment.order.deliveryAddress.latitude;
            customerLocation.lon = assignment.order.deliveryAddress.longitude;
        }

        return res.status(200).json({
            _id: assignment.order._id,
            user: assignment.order.user,
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            deliveryBoyLocation,
            customerLocation
        })

    } catch (error) {

        return res.status(500).json({ message: `get Current Order error: ${error}` })
    }
}

export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .populate("user")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User",
                select: "fullName mobile location"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            })
            .lean()
        if (!order) {
            return res.status(404).json({ message: "Order not found" })
        }
        return res.status(200).json(order)

    } catch (error) {
        return res.status(500).json({ message: `Get Order By Id error: ${error}` })
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body;
        const order = await Order.findById(orderId).populate("user");
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder || !order) {
            return res.status(400).json({
                message: "enter valid order/shopOrderid"
            })
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        shopOrder.deliveryOtp = otp;
        shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        await order.save();
        await sendDeliveryOtpMail(order.user, otp);
        return res.status(200).json({ message: `Delivery OTP sent successfully ${order?.user?.fullName}`, otp })

    } catch (error) {
        return res.status(500).json({ message: ` Delivery Otp error: ${error}` })

    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body;
        const order = await Order.findById(orderId).populate("user");
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder || !order) {
            return res.status(400).json({
                message: "enter valid order/shopOrderid"
            })
        }
        if (shopOrder.deliveryOtp !== otp || !shopOrder.otpExpires || shopOrder.otpExpires < new Date()) {
            return res.status(400).json({ message: "Invalid OTP" })
        }
        shopOrder.status = "delivered";
        shopOrder.deliveredAt = new Date();

        // Update delivery boy stats
        if (shopOrder.assignedDeliveryBoy) {
            const deliveryBoy = await User.findById(shopOrder.assignedDeliveryBoy);
            if (deliveryBoy) {
                const earnings = shopOrder.earnings || 50;
                deliveryBoy.deliveryStats.totalDeliveries += 1;
                deliveryBoy.deliveryStats.totalEarnings += earnings;
                deliveryBoy.deliveryStats.todayDeliveries += 1;
                deliveryBoy.deliveryStats.todayEarnings += earnings;
                await deliveryBoy.save();
            }
        }

        await order.save();

        // Mark assignment as completed instead of deleting
        await DeliveryAssignment.findOneAndUpdate(
            {
                shopOrderId: shopOrder._id,
                order: order._id,
                assignedTo: shopOrder.assignedDeliveryBoy
            },
            {
                status: "completed"
            }
        );

        // Emit socket events for delivery completion
        emitToUser(order.user, 'order-delivered', {
            orderId: order._id,
            shopOrderId: shopOrder._id,
            timestamp: new Date()
        });

        if (shopOrder.assignedDeliveryBoy) {
            emitToDeliveryBoy(shopOrder.assignedDeliveryBoy, 'delivery-completed', {
                orderId: order._id,
                shopOrderId: shopOrder._id,
                earnings: shopOrder.earnings || 50,
                timestamp: new Date()
            });
        }

        return res.status(200).json({ message: `Order Delivered Successfully` })



    } catch (error) {
        return res.status(500).json({ message: ` Verify Delivery Otp error: ${error}` })
    }
}

export const getOwnerAnalytics = async (req, res) => {
    try {
        const ownerId = req.userId;

        // 1. Total Orders & Revenue
        // We match orders where ANY shopOrder belongs to this owner
        const generalStats = await Order.aggregate([
            { $unwind: "$shopOrders" },
            { $match: { "shopOrders.owner": new mongoose.Types.ObjectId(ownerId) } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$shopOrders.subtotal" },
                    avgOrderValue: { $avg: "$shopOrders.subtotal" }
                }
            }
        ]);

        // 2. Sales Trends

        // Daily Sales (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailySales = await Order.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $unwind: "$shopOrders" },
            { $match: { "shopOrders.owner": new mongoose.Types.ObjectId(ownerId) } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    sales: { $sum: "$shopOrders.subtotal" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Weekly Sales (Last 12 Weeks)
        const twelveWeeksAgo = new Date();
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (7 * 12));

        const weeklySales = await Order.aggregate([
            { $match: { createdAt: { $gte: twelveWeeksAgo } } },
            { $unwind: "$shopOrders" },
            { $match: { "shopOrders.owner": new mongoose.Types.ObjectId(ownerId) } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-W%U", date: "$createdAt" } },
                    sales: { $sum: "$shopOrders.subtotal" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Monthly Sales (Last 12 Months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);

        const monthlySales = await Order.aggregate([
            { $match: { createdAt: { $gte: twelveMonthsAgo } } },
            { $unwind: "$shopOrders" },
            { $match: { "shopOrders.owner": new mongoose.Types.ObjectId(ownerId) } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    sales: { $sum: "$shopOrders.subtotal" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Top Selling Items
        const topItems = await Order.aggregate([
            { $unwind: "$shopOrders" },
            { $match: { "shopOrders.owner": new mongoose.Types.ObjectId(ownerId) } },
            { $unwind: "$shopOrders.shopOrderItems" },
            {
                $group: {
                    _id: "$shopOrders.shopOrderItems.item", // Item ID
                    name: { $first: "$shopOrders.shopOrderItems.name" }, // Take the first name found
                    totalSold: { $sum: "$shopOrders.shopOrderItems.quantity" }
                }
            },
            {
                $lookup: {
                    from: "items", // Collection name (usually lowercase plural)
                    localField: "_id",
                    foreignField: "_id",
                    as: "itemDetails"
                }
            },
            { $unwind: { path: "$itemDetails", preserveNullAndEmptyArrays: true } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $project: {
                    name: 1,
                    totalSold: 1,
                    image: "$itemDetails.image",
                    price: "$itemDetails.price"
                }
            }
        ]);

        // 4. Order Status Distribution
        const statusDistribution = await Order.aggregate([
            { $unwind: "$shopOrders" },
            { $match: { "shopOrders.owner": new mongoose.Types.ObjectId(ownerId) } },
            {
                $group: {
                    _id: "$shopOrders.status",
                    count: { $sum: 1 }
                }
            }
        ]);


        return res.status(200).json({
            stats: generalStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
            dailySales,
            weeklySales,
            monthlySales,
            topItems,
            statusDistribution
        });

    } catch (error) {
        return res.status(500).json({ message: `Analytics error: ${error}` });
    }
}
