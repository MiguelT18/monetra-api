import userService from "../services/user.service.ts";
import { ok } from "../utils/helpers.ts";
import type { Request, Response } from "express";
import { supabase } from "../lib/supabase.ts";
import { env } from "../config/env.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { updateProfileSchema } from "../schemas/user.schema.ts";
import { removeUndefined } from "../utils/helpers.ts";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password, role = "STUDENT" } = req.body;

  if (!email || !password || !username) {
    throw new Error("Missing required fields");
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data?.user) {
    throw new Error(error?.message || "Failed to create user");
  }

  const user = await userService.createUser(data.user.id, {
    username,
    role,
  });

  res.status(201).json(ok("User registered successfully", { user }));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new Error("Missing required fields");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user || !data.session) {
    throw new Error("Invalid email or password");
  }

  const user = await userService.getUserById(data.user.id);

  if (!user) {
    throw new Error("User not found");
  }

  const { access_token, refresh_token } = data.session;

  res.cookie("access_token", access_token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });

  res.cookie("refresh_token", refresh_token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json(ok("Login successful", { user }));
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = updateProfileSchema.parse(req.body);
    const data = removeUndefined(parsed);

    const user = await userService.updateProfile(req.user!.id, data);

    res.json(ok("User updated successfully", { user }));
  },
);

export const refreshSession = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new Error("Invalid refresh token");
    }

    const { access_token, refresh_token } = data.session;

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Session refreshed" });
  },
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const accessToken = req.cookies?.access_token;

  if (accessToken) {
    await supabase.auth.signOut();
  }

  res.clearCookie("access_token");
  res.clearCookie("refresh_token");

  res.json(ok("Logged out"));
});
