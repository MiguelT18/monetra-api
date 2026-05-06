import { prisma as PrismaInstance } from "../lib/prisma.ts";
import { FULL_PROFILE_SELECT, PROFILE_SELECT } from "../types/user.types.ts";
import type { PrismaClient } from "@prisma/client";
import type {
  UserDTO,
  SafeUser,
  ProfileResponse,
  UpdateProfileDTO,
  FullProfileResponse,
} from "../types/user.types.ts";
import type { Role } from "../generated/prisma/enums.ts";

class UserService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async createUser(
    id: string,
    data: UserDTO,
    email: string,
  ): Promise<SafeUser> {
    return this.prisma.$transaction(async (tx) => {
      return tx.profiles.create({
        data: {
          id,
          email,
          ...data,
          gamifications: {
            create: {
              xp: 0,
              level: 1,
            },
          },
        },
      });
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

  async getFullUser(id: string): Promise<FullProfileResponse | null> {
    return this.prisma.profiles.findUnique({
      where: { id },
      select: FULL_PROFILE_SELECT,
    });
  }

  async updateRole(id: string, role: Role): Promise<ProfileResponse> {
    return this.prisma.profiles.update({
      where: { id },
      data: { role },
      select: PROFILE_SELECT,
    });
  }
}

export default new UserService();
