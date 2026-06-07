import { Prisma } from "@prisma/client";

import prisma from "../config/prisma";

class UserServices {
  static async getUserByEmail(email: string) {
    return await prisma.users.findUnique({
      where: {
        email
      }
    });
  }

  static async getUserByEmailOrUsername(email: string, username: string) {
    return await prisma.users.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });
  }
  static async createUser(user: Prisma.UsersCreateInput) {
    return await prisma.users.create({
      data: user,
      omit: {
        password_hash: true
      }
    });
  }
}

export default UserServices;
