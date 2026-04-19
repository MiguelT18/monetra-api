import userService from "../services/user.service.ts";
import { fail, ok } from "../utils/helpers.ts";
import type { Request, Response } from "express";
import type { ApiResponse, ErrorResponse } from "../types/response.types.ts";
import type { SafeUser } from "../types/user.types.ts";
import { supabase } from "../lib/supabase.ts";
import { env } from "../config/env.ts";

export async function register(
  req: Request,
  res: Response<ApiResponse<{ user: SafeUser }> | ErrorResponse>,
) {
  try {
    const { email, username, password, role = "STUDENT" } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json(fail("Missing required fields"));
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data?.user) {
      console.error("[SUPABASE ERROR]: ", error);
      return res.status(500).json(fail("Failed to create user in Supabase"));
    }

    const user = await userService.createUser(data.user.id, {
      username,
      password,
      role,
    });

    return res.status(201).json(ok("User registered successfully", { user }));
  } catch (error) {
    console.error("[ERROR]: ", error);
    return res.status(500).json(fail("Internal Server Error"));
  }
}

export async function login(
  req: Request,
  res: Response<ApiResponse<{ user: SafeUser }> | ErrorResponse>,
) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(fail("Missing required fields"));
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user || !data.session) {
      return res.status(401).json(fail("Invalid email or password"));
    }

    const user = await userService.getUserById(data.user.id);

    if (!user) {
      return res.status(404).json(fail("User not found"));
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

    return res.status(200).json(ok("Login successful", { user }));
  } catch (error) {
    console.error("[ERROR]: ", error);
    return res.status(500).json(fail("Internal Server Error"));
  }
}

export async function refreshSession(req: Request, res: Response) {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: "Missing refresh token" });
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return res.status(401).json({ message: "Invalid refresh token" });
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

  return res.json({ message: "Session refreshed" });
}

// TODO: optimize endpoint
export function logout(_: Request, res: Response) {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");

  return res.json({ message: "Logged out" });
}
