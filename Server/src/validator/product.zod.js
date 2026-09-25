import * as z from "zod";

const productSchema = z.object({
  title: z
    .string("Title is required")
    .trim()
    .minLength(3, "Title must be at least 3 characters")
    .maxLength(100, "Title must be under 100 characters")
    .regex(
      /^[A-Za-z ]+$/,
      "Title must contain only English letters and spaces",
    ),

  discription: z
    .string("Discription is required")
    .trim()
    .minLength(20, "Discription must be at least 20 characters")
    .maxLength(500, "Discription must be under 500 characters"),

  price: z.object({
    amount: z.float32("Amount is required").min(0, "Amount cannot be negative"),
    currency: z.enum(["INR", "USD"], { error: "Invalid currency" }),
  }),

  sizes: z.object({
    size: z.enum(["XS", "S", "M", "L", "XL", "XXL"], { error: "Invalid Size" }),
    stock: z.number().min(0, "Stock cannot be negative"),
  }),
});
