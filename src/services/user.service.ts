import { prisma as PrismaInstance } from "../lib/prisma.ts";
import { PROFILE_SELECT } from "../types/user.types.ts";
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
    const user = await this.prisma.profiles.create({
      data: {
        id,
        ...data,
      },
    });

    await this.prisma.gamifications.create({
      data: {
        userId: user.id,
        xp: 0,
        level: 1,
      },
    });

    return user;
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
