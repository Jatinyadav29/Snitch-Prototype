import mongoose from "mongoose";
import * as z from "zod";

const cartSchema = z.object({
  products: z.array(
    z.object({
      product: z
        .string("Product id is required")
        .refine(
          (id) => mongoose.Types.ObjectId.isValid(id),
          "Invalid product ID",
        ),
      quantity: z
        .number("Quantity is required")
        .int("Quantity must be integer")
        .min(1)
        .default(1),
      size: z.enum(["XS", "S", "M", "L", "XL", "XXL"], {
        error: "Invalid Size",
      }),
    }),
  ),
});

export default cartSchema;
