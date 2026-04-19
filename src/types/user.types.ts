import type { Prisma } from "../generated/prisma/browser.ts";

// Data Transfer Object for creating a new user
export interface UserDTO {
  username: string;
  password: string;
  role: UserRole;
}

// SafeUser type that excludes sensitive fields like password
export type SafeUser = Prisma.ProfileGetPayload<{
  select: {
    id: true;
    username: true;
    role: true;
    createdAt: true;
  };
}>;
