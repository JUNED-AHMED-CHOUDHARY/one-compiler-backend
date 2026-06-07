import { type Users } from "@prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    user: Omit<Users, "password_hash">;
  }
}
