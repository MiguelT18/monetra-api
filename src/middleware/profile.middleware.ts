import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Role } from "@prisma/client";
import UserService from "../services/user.service.ts";
import { HttpError } from "../errors/http-error.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const loadProfile: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      throw new HttpError(401, "No autorizado");
    }

    const profile = await UserService.getFullUser(req.user.id);

    if (!profile) {
      throw new HttpError(404, "Perfil no encontrado");
    }

    req.profile = profile;
    next();
  },
);

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.profile) {
      throw new HttpError(401, "Perfil no cargado");
    }

    if (!roles.includes(req.profile.role)) {
      throw new HttpError(
        403,
        `Se requiere uno de estos roles: ${roles.join(", ")}`,
      );
    }

    next();
  };
}
