import type { Response, Request, NextFunction } from "express";
import { supabase } from "../lib/supabase.ts";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  req.user = data.user;

  next();
}
