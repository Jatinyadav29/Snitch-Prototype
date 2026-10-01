import { Router } from "express";
import {
  createProductController,
  getAllProductsController,
  listProductController,
  sellerGetAllProductsController,
  unlistProductController,
} from "../controllers/product.controller.js";
import validateBody from "../middlewares/validator.middleware.js";
import {
  productSchema,
  unlistProductSchema,
  listProductSchema,
} from "../validator/product.zod.js";
import { authenticate, isSeller } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";
import paramsValidator from "../middlewares/paramsValidator.middleware.js";

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

router.get(
  "/seller/getAll",
  authenticate,
  isSeller,
  sellerGetAllProductsController,
);

router.patch(
  "/unlist/:id",
  authenticate,
  isSeller,
  paramsValidator(unlistProductSchema),
  unlistProductController,
);

router.patch(
  "/list/:id",
  authenticate,
  isSeller,
  paramsValidator(listProductSchema),
  listProductController,
);

export default router;
