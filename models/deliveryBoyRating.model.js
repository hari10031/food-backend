import mongoose from "mongoose";

const deliveryBoyRatingSchema = new mongoose.Schema(
    {
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
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true
        },
        shopOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        review: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate ratings from same user for same delivery boy in same shop order
deliveryBoyRatingSchema.index({ user: 1, deliveryBoy: 1, shopOrderId: 1 }, { unique: true });

const DeliveryBoyRating = mongoose.model("DeliveryBoyRating", deliveryBoyRatingSchema);
export default DeliveryBoyRating;
