import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
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

// Prevent duplicate ratings from same user for same item in same order
ratingSchema.index({ user: 1, item: 1, order: 1 }, { unique: true });

const Rating = mongoose.model("Rating", ratingSchema);
export default Rating;
