import { prisma as PrismaInstance } from "../lib/prisma.ts";
import { FULL_PROFILE_SELECT, PROFILE_SELECT, USER_SEARCH_SELECT } from "../types/user.types.ts";
import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  UserDTO,
  SafeUser,
  ProfileResponse,
  UpdateProfileDTO,
  FullProfileResponse,
} from "../types/user.types.ts";
import type { Role } from "@prisma/client";

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

  async searchUsers(query: string, limit = 10, excludeId?: string) {
    return this.prisma.profiles.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { fullname: { contains: query, mode: "insensitive" } },
        ],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: USER_SEARCH_SELECT,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async getAllUsers(params: {
    search?: string;
    role?: string;
    offset?: number;
    limit?: number;
  }) {
    const search = params.search;
    const role = params.role;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    const where: Prisma.ProfilesWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { fullname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role as Role;
    }

    const [users, total] = await Promise.all([
      this.prisma.profiles.findMany({
        where,
        select: FULL_PROFILE_SELECT,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.profiles.count({ where }),
    ]);

    return { users, total };
  }

  async updateUserRole(id: string, role: Role): Promise<ProfileResponse> {
    return this.prisma.profiles.update({
      where: { id },
      data: { role },
      select: PROFILE_SELECT,
    });
  }

  async toggleBan(id: string, banned: boolean) {
    return this.prisma.profiles.update({
      where: { id },
      data: { banned },
      select: { id: true, banned: true },
    });
  }
}

export default new UserService();
