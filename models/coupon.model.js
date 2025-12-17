import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    discountType: {
        type: String,
        enum: ["flat", "percentage"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxDiscountAmount: {
        type: Number, // Applicable for percentage discount
    },
    expirationDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
