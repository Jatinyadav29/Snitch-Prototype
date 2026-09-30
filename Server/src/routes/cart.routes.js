import { Router } from "express";
import { addToCartController } from "../controllers/cart.controller.js";
import validateBody from "../middlewares/validator.middleware.js";
import cartSchema from "../validator/cart.zod.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", authenticate, validateBody(cartSchema), addToCartController);

export default router;
