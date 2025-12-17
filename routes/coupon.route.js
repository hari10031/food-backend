import express from "express";
import isAuth from "../middlewares/auth.middleware.js";
import { createCoupon, getShopCoupons, applyCoupon, deleteCoupon } from "../controllers/coupon.controller.js";

const couponRouter = express.Router();

couponRouter.post("/create", isAuth, createCoupon);
couponRouter.get("/shop/:shopId", getShopCoupons);
couponRouter.post("/apply", isAuth, applyCoupon);
couponRouter.delete("/:couponId", isAuth, deleteCoupon);

export default couponRouter;
