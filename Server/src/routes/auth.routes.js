import { Router } from "express";
import { registerController } from "../controllers/auth.controller.js";
import validateBody from "../middlewares/authValidator.middleware.js";
import registerSchema from "../validator/auth.zod.js";

const router = Router();

router.post("/register", validateBody(registerSchema), registerController);

export default router;
