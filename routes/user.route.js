import { Router } from "express";
import { getCurrentUser, updateUserLocation, getDeliveryBoyStats, updateUser } from "../controllers/user.controller.js";
import isAuth from "../middlewares/auth.middleware.js";
const userRouter = Router();

userRouter.get('/current', isAuth, getCurrentUser);
userRouter.post('/update-location', isAuth, updateUserLocation);
userRouter.get('/delivery-stats', isAuth, getDeliveryBoyStats);
userRouter.put('/update-details', isAuth, updateUser);
// userRouter.post('/signin', signIn);
// userRouter.post('/signout', signOut);


export default userRouter;