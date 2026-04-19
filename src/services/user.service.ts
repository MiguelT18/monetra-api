import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { UserDTO, SafeUser } from "../types/user.types.ts";
import type { PrismaClient } from "@prisma/client";

const SAFE_USER_SELECT = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
};

class UserService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async createUser(id: string, data: UserDTO): Promise<SafeUser> {
    return this.prisma.profiles.create({
      data: {
        id,
        username: data.username,
        role: data.role,
      },
      select: SAFE_USER_SELECT,
    });
  }

  async getUserById(id: string): Promise<SafeUser | null> {
    return this.prisma.profiles.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
  }
}

export default new UserService();
