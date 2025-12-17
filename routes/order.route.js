import express from "express"
import isAuth from "../middlewares/auth.middleware.js"
import { acceptOrder, getCurrentOrder, getDeliveryBoyAssignment, getMyOrders, getOrderById, placeOrder, sendDeliveryOtp, updateOrderStatus, verifyDeliveryOtp, verifyPayment, getOwnerAnalytics } from "../controllers/order.controller.js";

const orderRouter = express.Router();
orderRouter.post("/place-order", isAuth, placeOrder)
orderRouter.get("/my-orders", isAuth, getMyOrders)
orderRouter.post("/update-status/:orderId/:shopId", isAuth, updateOrderStatus)
orderRouter.get("/get-assignments", isAuth, getDeliveryBoyAssignment)
orderRouter.get("/accept-order/:assignmentId", isAuth, acceptOrder)
orderRouter.get("/get-current-order", isAuth, getCurrentOrder)
orderRouter.get("/get-order-by-id/:orderId", isAuth, getOrderById)
orderRouter.post("/send-delivery-otp", isAuth, sendDeliveryOtp)
orderRouter.post("/verify-delivery-otp", isAuth, verifyDeliveryOtp)
orderRouter.post("/verify-payment", isAuth, verifyPayment)
orderRouter.get("/owner-analytics", isAuth, getOwnerAnalytics)



export default orderRouter;