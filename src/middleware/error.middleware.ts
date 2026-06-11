import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors/http-error.ts";

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

  /* PRISMA ERRORS */
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
      code: err.code,
    });
  }

  /* CUSTOM HTTP ERROR */
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  /* GENERIC ERROR */
  if (err instanceof Error) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }

  /* UNKNOWN */
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
}
