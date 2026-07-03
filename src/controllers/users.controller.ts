import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import UserService from "../services/user.service.ts";
import { invalidateProfileCache } from "../middleware/profile.middleware.ts";
import { supabaseAdmin } from "../lib/supabase.ts";
import sharp from "sharp";
import { HttpError } from "../errors/http-error.ts";
import type { Role } from "@prisma/client";

const AVATAR_MAX_BYTES = 500_000;

export const searchUsers: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = (req.query.q as string)?.trim();

    if (!query || query.length < 1) {
      res.json(ok("Resultados de búsqueda", { users: [] }));
      return;
    }

    const users = await UserService.searchUsers(query, 10, req.user!.id);

    res.json(ok("Resultados de búsqueda", { users }));
  },
);

export const getAll: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const banned = req.query.banned as string | undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await UserService.getAllUsers({
      ...(search !== undefined ? { search } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(banned !== undefined ? { banned } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(limit !== undefined ? { limit } : {}),
    });

    res.json(ok("Listado de usuarios", result));
  },
);

export const updateRole: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { role } = req.body;

    const VALID_ROLES = ["STUDENT", "CREATOR", "AFFILIATE", "ADMIN"];

    if (!role || !VALID_ROLES.includes(role)) {
      throw new HttpError(400, "Rol inválido");
    }

    const user = await UserService.updateUserRole(id, role as Role);
    invalidateProfileCache(id);

    res.json(ok("Rol actualizado correctamente", { user }));
  },
);

export const makeAdmin: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const user = await UserService.makeAdmin(id);
    invalidateProfileCache(id);

    res.json(ok("Usuario promovido a administrador correctamente", { user }));
  },
);

export const toggleBan: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { banned } = req.body;

    if (typeof banned !== "boolean") {
      throw new HttpError(400, "El campo 'banned' debe ser booleano");
    }

    const user = await UserService.toggleBan(id, banned);

    res.json(ok(banned ? "Usuario suspendido" : "Usuario restaurado", { user }));
  },
);

export const getPublicProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const username = req.params.username as string;

    if (!username) {
      throw new HttpError(400, "Username es requerido");
    }

    const profile = await UserService.getPublicProfile(username);

    if (!profile) {
      throw new HttpError(404, "Usuario no encontrado");
    }

    res.json(ok("Perfil público", { profile }));
  },
);

export const uploadAvatar: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      res.status(400).json(ok("La imagen es requerida"));
      return;
    }

    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      res.status(400).json(ok("Formato de imagen inválido"));
      return;
    }

    const buffer = Buffer.from(match[2]!, "base64");

    if (buffer.length > AVATAR_MAX_BYTES) {
      res.status(400).json(ok("La imagen es demasiado grande"));
      return;
    }

    const webpBuffer = await sharp(buffer)
      .resize(256, 256, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const userId = req.user!.id;
    const ts = Date.now();
    const fileName = `${userId}_${ts}.webp`;

    // limpiar avatares viejos del mismo usuario
    const { data: existing } = await supabaseAdmin.storage
      .from("avatars")
      .list(undefined, { search: userId });

    if (existing && existing.length > 0) {
      const oldFiles = existing
        .filter((f) => f.name !== fileName)
        .map((f) => f.name);

      if (oldFiles.length > 0) {
        await supabaseAdmin.storage.from("avatars").remove(oldFiles);
      }
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(fileName, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error("[avatar upload error]:", uploadError);
      res.status(500).json(ok("Error al subir la imagen"));
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    await UserService.updateProfile(userId, { avatar: avatarUrl });

    res.json(ok("Avatar actualizado", { avatar: avatarUrl }));
  },
);
