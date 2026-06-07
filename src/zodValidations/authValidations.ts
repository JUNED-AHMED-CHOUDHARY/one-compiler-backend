import { z } from "zod";

import { MAXIMUM_PASSWORD_LENGTH, MINIMUM_NAME_LENGTH, MINIMUM_PASSWORD_LENGTH } from "./variablesUsedInValidations";

export const signUpBodySchema = z
  .object({
    email: z.email(),
    password: z.string().min(MINIMUM_PASSWORD_LENGTH).max(MAXIMUM_PASSWORD_LENGTH),
    confirmPassword: z.string().min(MINIMUM_PASSWORD_LENGTH).max(MAXIMUM_PASSWORD_LENGTH),
    userName: z.string().min(MINIMUM_NAME_LENGTH),
    name: z
      .string()
      .min(MINIMUM_NAME_LENGTH)
      .refine((value) => value.trim() === value, "Name cannot start or end with spaces")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and confirm password do not match",
    path: ["confirmPassword"]
  });

export type SignUpBody = z.infer<typeof signUpBodySchema>;

export const loginBodySchema = z.object({
  emailOrUserName: z.string().min(MINIMUM_NAME_LENGTH),
  password: z.string().min(MINIMUM_PASSWORD_LENGTH).max(MAXIMUM_PASSWORD_LENGTH)
});

export type LoginBody = z.infer<typeof loginBodySchema>;
