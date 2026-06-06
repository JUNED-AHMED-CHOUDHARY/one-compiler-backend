import { z } from "zod";

export const signUpBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z
    .string()
    .min(2)
    .refine((value) => value.trim() === value, "Name cannot start or end with spaces")
});

export type SignUpBody = z.infer<typeof signUpBodySchema>;
