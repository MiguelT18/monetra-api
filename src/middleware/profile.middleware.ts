import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Role } from "@prisma/client";
import UserService from "../services/user.service.ts";
import { HttpError } from "../errors/http-error.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const profileCache = new Map<string, { profile: unknown; expiry: number }>();
const CACHE_TTL = 30_000;

function getCachedProfile(userId: string) {
  const entry = profileCache.get(userId);
  if (entry && entry.expiry > Date.now()) return entry.profile;
  profileCache.delete(userId);
  return null;
}

function setCachedProfile(userId: string, profile: unknown) {
  profileCache.set(userId, { profile, expiry: Date.now() + CACHE_TTL });
}

export const loadProfile: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      throw new HttpError(401, "No autorizado");
    }

    const cached = getCachedProfile(req.user.id);
    if (cached) {
      req.profile = cached as any;
      next();
      return;
    }

    const profile = await UserService.getFullUser(req.user.id);

    if (!profile) {
      throw new HttpError(404, "Perfil no encontrado");
    }

    setCachedProfile(req.user.id, profile);
    req.profile = profile;
    next();
  },
);

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.profile!.role)) {
      throw new HttpError(
        403,
        `Se requiere uno de estos roles: ${roles.join(", ")}`,
      );
    }

    next();
  };
}
