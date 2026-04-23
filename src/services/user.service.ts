import { prisma as PrismaInstance } from "../lib/prisma.ts";
import { SAFE_USER_SELECT, PROFILE_SELECT } from "../types/user.types.ts";
import type { PrismaClient } from "@prisma/client";
import type {
  UserDTO,
  SafeUser,
  ProfileResponse,
  UpdateProfileDTO,
} from "../types/user.types.ts";

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

  async updateProfile(
    id: string,
    data: UpdateProfileDTO,
  ): Promise<ProfileResponse> {
    return this.prisma.profiles.update({
      where: { id },
      data,
      select: PROFILE_SELECT,
    });
  }

  async getUserById(id: string): Promise<ProfileResponse | null> {
    return this.prisma.profiles.findUnique({
      where: { id },
      select: PROFILE_SELECT,
    });
  }
}

export default new UserService();
