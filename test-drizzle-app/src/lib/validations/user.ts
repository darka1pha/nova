import { z } from "zod";

import { emailSchema } from "@/lib/validations/common";

export const updateProfileSchema = z.object({
  name: z.string().min(2, { message: "validation.minLength" }),
  email: emailSchema,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
