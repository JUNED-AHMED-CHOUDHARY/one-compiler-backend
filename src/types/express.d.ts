import { Problems, type Users } from "@prisma/client";

export type UserInRequest = Omit<Users, "password_hash">;

declare module "express-serve-static-core" {
  interface Request {
    user: UserInRequest;
    problem?: Problems;
    /** Coerced query from zodValidateQuery (page/limit as numbers). */
    validatedQuery?: unknown;
  }
}
