import * as z from "zod";

const productSchema = z.object({
  title: z
    .string("Title is required")
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .regex(
      /^[A-Za-z ]+$/,
      "Title must contain only English letters and spaces",
    ),

  discription: z
    .string("Discription is required")
    .trim()
    .min(20, "Discription must be at least 20 characters")
    .max(500, "Discription must be under 500 characters"),

  //   images: z
  //     .array(z.string())
  //     .max(5, "A product can have 5 images at most")
  //     .optional(),

  price: z.object({
    amount: z.number("Amount is required").min(0, "Amount cannot be negative"),
    currency: z
      .enum(["INR", "USD"], {
        error: "Invalid currency",
      })
      .optional(),
  }),

  sizes: z.array(
    z.object({
      size: z.enum(["XS", "S", "M", "L", "XL", "XXL"], {
        error: "Invalid size",
      }),
      stock: z.number().min(0, "Stock cannot be negative").optional(),
    }),
  ),
});

export default productSchema;
