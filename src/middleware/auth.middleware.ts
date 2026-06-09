import type { Response, Request, NextFunction } from "express";
import { supabase } from "../lib/supabase.ts";
import { env } from "../config/env.ts";
import { prisma as PrismaInstance } from "../lib/prisma.ts";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies?.access_token;

  const refreshToken =
    (req.headers["x-refresh-token"] as string | undefined) ??
    req.cookies?.refresh_token;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  let { data, error } = await supabase.auth.getUser(token);

  if ((error || !data?.user) && refreshToken) {
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

    if (!refreshError && refreshData?.session) {
      const isProduction = env.NODE_ENV === "production";
      res.cookie("access_token", refreshData.session.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
      });
      res.cookie("refresh_token", refreshData.session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      const result = await supabase.auth.getUser(
        refreshData.session.access_token,
      );
      data = result.data;
      error = result.error;
    }
  }

  if (error || !data?.user) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  req.user = data.user;

  const profile = await PrismaInstance.profiles.findUnique({
    where: { id: data.user.id },
    select: { id: true, banned: true },
  });

  if (profile?.banned) {
    res.status(403).json({ message: "Tu cuenta ha sido suspendida" });
    return;
  }

  next();
}
