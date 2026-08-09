import { z } from "zod";

// Base building blocks reused across feature-specific schemas.
export const emailSchema = z.string().min(1, { message: "validation.required" }).email({
  message: "validation.invalidEmail",
});

export const passwordSchema = z
  .string()
  .min(8, { message: "validation.minLength" })
  .max(72, { message: "validation.maxLength" });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
