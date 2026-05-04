import type { Prisma } from "@prisma/client";

// User DTO

export interface UserDTO {
  username: string;
  role: UserRole;
}

export const SAFE_USER_SELECT = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
} as const;

export type SafeUser = Prisma.ProfilesGetPayload<{
  select: typeof SAFE_USER_SELECT;
}>;

// Update Profile DTO

export type UpdateProfileDTO = Prisma.ProfilesUpdateInput;

export const PROFILE_SELECT = {
  id: true,
  username: true,
  fullname: true,
  bio: true,
  avatar: true,
  role: true,
  phone: true,
} as const;

export type ProfileResponse = Prisma.ProfilesGetPayload<{
  select: typeof PROFILE_SELECT;
}>;

export const FULL_PROFILE_SELECT = {
  id: true,
  username: true,
  email: true,
  fullname: true,
  bio: true,
  avatar: true,

  gamifications: {
    select: {
      xp: true,
      level: true,
    },
  },
} as const;

export type FullProfileResponse = Prisma.ProfilesGetPayload<{
  select: typeof FULL_PROFILE_SELECT;
}>;
