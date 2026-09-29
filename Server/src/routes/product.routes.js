import { Router } from "express";
import {
  createProductController,
  getAllProductsController,
} from "../controllers/product.controller.js";
import validateBody from "../middlewares/validator.middleware.js";
import productSchema from "../validator/product.zod.js";
import { authenticate, isSeller } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";

const router = Router();

router.post(
  "/create",
  authenticate,
  isSeller,
  upload.array("images"),

  (req, res, next) => {
    req.body.price = JSON.parse(req.body.price);
    req.body.sizes = JSON.parse(req.body.sizes);

    next();
  },

  validateBody(productSchema),
  createProductController,
);

router.get("/getAll", authenticate, getAllProductsController);

export default router;
