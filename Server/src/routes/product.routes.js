import { Router } from "express";
import { createProductController } from "../controllers/product.controller.js";

const router = Router();

router.post("/create", createProductController);

export default router;
