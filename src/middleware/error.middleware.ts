import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors/http-error.ts";
import { env } from "../config/env.ts";

const isDev = env.NODE_ENV === "development";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);

  /* ZOD VALIDATION */
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  /* PRISMA KNOWN REQUEST ERRORS (e.g. unique constraint, not found) */
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Resource already exists",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Database error",
    });
  }

  /* PRISMA VALIDATION / UNKNOWN REQUEST ERRORS (leak schema internals) */
  if (err instanceof Prisma.PrismaClientValidationError || err instanceof Prisma.PrismaClientUnknownRequestError) {
    return res.status(500).json({
      success: false,
      message: isDev ? err.message : "Internal Server Error",
    });
  }

  /* CUSTOM HTTP ERROR */
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  /* GENERIC ERROR — never expose raw message */
  if (err instanceof Error) {
    console.error("[error] Unhandled error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }

  /* UNKNOWN */
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
}
