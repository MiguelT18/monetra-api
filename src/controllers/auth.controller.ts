import type { Request, Response } from "express";
// import { prisma } from "../lib/prisma.js";

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Insertar el nuevo usuario en la base de datos usando Prisma
  console.log(req);
  res.send("Register a new user");
}
