import { Router } from "express";
import {
  getMyInfoController,
  loginController,
  refreshTokenController,
  registerController,
} from "../controllers/auth.controller.js";
import validateBody from "../middlewares/authValidator.middleware.js";
import { loginSchema, registerSchema } from "../validator/auth.zod.js";
import authenticate from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", validateBody(registerSchema), registerController);
router.post("/login", validateBody(loginSchema), loginController);

router.post("/refresh", refreshTokenController);
router.get("/me", authenticate, getMyInfoController);

export default router;
