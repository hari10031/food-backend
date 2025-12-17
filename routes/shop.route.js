import { Router } from "express";
import { createEditShop, getMyShop, getShopByCity } from "../controllers/shop.controller.js";
import isAuth from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const shopRouter = Router();

shopRouter.post('/create-edit', isAuth, upload.single("image"), createEditShop);
shopRouter.get('/get-my', isAuth, getMyShop);
shopRouter.get('/get-by-city/:city', isAuth, getShopByCity);

export default shopRouter;