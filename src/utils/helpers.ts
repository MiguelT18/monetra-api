import type { ApiResponse, ErrorResponse } from "../types/response.types.ts";

export function ok<T>(message = "Success", data?: T): ApiResponse<T> {
  return { message, data };
}

export function fail(message: string): ErrorResponse {
  return { message };
}

export function removeUndefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  );
}
