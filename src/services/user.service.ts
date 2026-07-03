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
    banned?: string;
    offset?: number;
    limit?: number;
  }) {
    const search = params.search;
    const role = params.role;
    const banned = params.banned;
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

    if (role && role !== "ALL") {
      where.role = role as Role;
    }

    if (banned === "true") {
      where.banned = true;
    } else if (banned === "false") {
      where.banned = false;
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

    const userIds = users.map((u) => u.id);

    const productCounts = userIds.length > 0
      ? await this.prisma.products.groupBy({
          by: ["producerId", "status"],
          _count: { id: true },
          where: {
            producerId: { in: userIds },
            status: { in: ["PUBLISHED", "REJECTED"] },
          },
        })
      : [];

    const countMap = new Map<string, { published: number; rejected: number }>();
    for (const row of productCounts) {
      if (!countMap.has(row.producerId)) {
        countMap.set(row.producerId, { published: 0, rejected: 0 });
      }
      const entry = countMap.get(row.producerId)!;
      if (row.status === "PUBLISHED") entry.published += row._count.id;
      if (row.status === "REJECTED") entry.rejected += row._count.id;
    }

    const enriched = users.map((u) => {
      const counts = countMap.get(u.id) ?? { published: 0, rejected: 0 };
      return {
        ...u,
        publishedProducts: counts.published,
        rejectedProducts: counts.rejected,
      };
    });

    return { users: enriched, total };
  }

  async updateUserRole(id: string, role: Role): Promise<ProfileResponse> {
    return this.prisma.profiles.update({
      where: { id },
      data: { role },
      select: PROFILE_SELECT,
    });
  }

  async makeAdmin(id: string): Promise<ProfileResponse> {
    return this.prisma.profiles.update({
      where: { id },
      data: { role: "ADMIN" },
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

  async getPublicProfile(username: string) {
    const profile = await this.prisma.profiles.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        fullname: true,
        bio: true,
        avatar: true,
        role: true,
        createdAt: true,
        gamifications: {
          select: { xp: true, level: true },
        },
        products: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            thumbnail: true,
            category: true,
            rating: true,
            duration: true,
            createdAt: true,
          },
        },
        achievements: {
          select: {
            id: true,
            status: true,
            progress: true,
            unlockedAt: true,
            achievement: {
              select: {
                key: true,
                title: true,
                description: true,
                icon: true,
                xpReward: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            products: true,
            affiliations: true,
            reviews: true,
          },
        },
      },
    });

    if (!profile) return null;

    const achievements = profile.achievements.map((ua) => ({
      key: ua.achievement.key,
      title: ua.achievement.title,
      description: ua.achievement.description,
      icon: ua.achievement.icon,
      xpReward: ua.achievement.xpReward,
      status: ua.status.toLowerCase(),
      progress: ua.progress,
      unlockedAt: ua.unlockedAt,
    }));

    const { achievements: _, ...rest } = profile;
    return { ...rest, achievements };
  }
}

export default new UserService();
