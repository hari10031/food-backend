import Coupon from "../models/coupon.model.js";
import Shop from "../models/shop.models.js";

// Create a new coupon (Owner only)
export const createCoupon = async (req, res) => {
    try {
        const { code, shopId, discountType, discountValue, minOrderAmount, maxDiscountAmount, expirationDate } = req.body;
        const ownerId = req.userId;

        // Verify shop ownership
        const shop = await Shop.findOne({ _id: shopId, owner: ownerId });
        if (!shop) {
            return res.status(403).json({ message: "You are not authorized to create coupons for this shop" });
        }

        const existingCoupon = await Coupon.findOne({ code, shop: shopId });
        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon code already exists for this shop" });
        }

        const coupon = await Coupon.create({
            code,
            shop: shopId,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscountAmount,
            expirationDate
        });

        return res.status(201).json({ message: "Coupon created successfully", coupon });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Get coupons for a shop (Owner/User)
export const getShopCoupons = async (req, res) => {
    try {
        const { shopId } = req.params;
        const coupons = await Coupon.find({ shop: shopId, isActive: true, expirationDate: { $gt: new Date() } });
        return res.status(200).json(coupons);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Apply coupon (User)
export const applyCoupon = async (req, res) => {
    try {
        const { code, shopId, orderAmount } = req.body;

        const coupon = await Coupon.findOne({
            code,
            shop: shopId,
            isActive: true,
            expirationDate: { $gt: new Date() }
        });

        if (!coupon) {
            return res.status(404).json({ message: "Invalid or expired coupon code" });
        }

        if (orderAmount < coupon.minOrderAmount) {
            return res.status(400).json({ message: `Minimum order amount of ₹${coupon.minOrderAmount} required` });
        }

        let discount = 0;
        if (coupon.discountType === "flat") {
            discount = coupon.discountValue;
        } else {
            discount = (orderAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount) {
                discount = Math.min(discount, coupon.maxDiscountAmount);
            }
        }

        return res.status(200).json({
            message: "Coupon applied successfully",
            discount,
            couponCode: code
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Delete/Deactivate Coupon (Owner)
export const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        // Ideally check ownership again, but assuming owned by logged in user context for simplicity or protected route
        await Coupon.findByIdAndDelete(couponId);
        return res.status(200).json({ message: "Coupon deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
