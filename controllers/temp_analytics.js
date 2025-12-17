
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

        // 2. Daily Sales (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailySales = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
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
            topItems,
            statusDistribution
        });

    } catch (error) {
        return res.status(500).json({ message: `Analytics error: ${error}` });
    }
}
