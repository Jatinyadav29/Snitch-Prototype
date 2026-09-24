import * as z from "zod";

const registerSchema = z.object({
  email: z
    .string("Email is required")
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid Email address")),

  name: z
    .string("Name is required")
    .trim()
    .refine((value) => value.trim().length > 0, {
      error: "Name cannot be empty or only spaces",
      abort: true,
    })
    .min(3, "Please enter your full name"),

  password: z
    .string("Password is required")
    .trim()
    .refine((value) => value.trim().length > 0, {
      error: "Password cannot be empty or only spaces",
      abort: true,
    })
    .min(8, "Password must be at least 8 characters"),
});

export default registerSchema;
