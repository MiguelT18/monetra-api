import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import UserService from "../services/user.service.ts";
import { supabaseAdmin } from "../lib/supabase.ts";
import sharp from "sharp";

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
