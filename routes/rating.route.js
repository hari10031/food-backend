import express from "express";
import {
    addItemRating,
    addDeliveryBoyRating,
    getItemRatings,
    getDeliveryBoyRatings,
    checkRatingStatus,
    markItemsAsRated
} from "../controllers/rating.controller.js";
import isAuth from "../middlewares/auth.middleware.js";

const router = express.Router();

// Add rating for item
router.post("/item", isAuth, addItemRating);

// Add rating for delivery boy
router.post("/delivery-boy", isAuth, addDeliveryBoyRating);

// Get ratings for an item
router.get("/item/:itemId", getItemRatings);

// Get ratings for a delivery boy
router.get("/delivery-boy/:deliveryBoyId", getDeliveryBoyRatings);

// Check rating status for an order
router.get("/status/:orderId/:shopOrderId", isAuth, checkRatingStatus);

// Mark items as rated
router.post("/mark-items-rated", isAuth, markItemsAsRated);

export default router;
