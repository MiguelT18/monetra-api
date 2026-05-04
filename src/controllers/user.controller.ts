import UserService from "../services/user.service.ts";
import { fail, ok } from "../utils/helpers.ts";
import type { Request, Response, RequestHandler } from "express";
import { supabase } from "../lib/supabase.ts";
import { env } from "../config/env.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { updateProfileSchema } from "../schemas/user.schema.ts";
import { removeUndefined } from "../utils/helpers.ts";
import { HttpError } from "../errors/http-error.ts";

export const register: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, username, password, role = "STUDENT" } = req.body;

    if (!email || !password || !username) {
      throw new HttpError(400, "Missing required fields");
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data?.user) {
      throw new HttpError(400, error?.message || "Failed to create user");
    }

    const user = await UserService.createUser(
      data.user.id,
      {
        username,
        role,
      },
      email,
    );

    res.status(201).json(ok("Usuario registrado correctamente", { user }));
  },
);

export const login: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new HttpError(400, "Missing required fields");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data.session) {
      throw new HttpError(400, "Invalid email or password");
    }

    const user = await UserService.getFullUser(data.user.id);

    if (!user) {
      throw new HttpError(400, "User not found");
    }

    const { access_token, refresh_token } = data.session;

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json(ok("Iniciaste sesión!", { user }));
  },
);

export const updateProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = updateProfileSchema.parse(req.body);
    const data = removeUndefined(parsed);

    const user = await UserService.updateProfile(req.user!.id, data);

    res.json(ok("Actualizaste tu perfil correctamente!", { user }));
  },
);

export const getUserProfile: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(fail("Sin autorización"));
    }

    const user = await UserService.getFullUser(userId);

    if (!user) {
      return res.status(404).json(fail("Usuario no encontrado"));
    }

    return res.json(ok("Perfil del usuario obtenido", user));
  },
);

export const refreshSession: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new HttpError(400, "Missing refresh token");
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new HttpError(400, "Invalid refresh token");
    }

    const { access_token, refresh_token } = data.session;

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Sesión refrescada" });
  },
);

export const logout: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const accessToken = req.cookies?.access_token;

    if (accessToken) {
      await supabase.auth.signOut();
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.json(ok("Cerraste sesión"));
  },
);
