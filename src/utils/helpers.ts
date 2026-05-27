import type { ApiResponse, ErrorResponse } from "../types/response.types.ts";

export function ok<T>(message = "Success", data?: T): ApiResponse<T> {
  return { message, data };
}

export function fail(message: string): ErrorResponse {
  return { message };
}

type WithoutUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: Exclude<T[K], undefined>;
};

export function removeUndefined<T extends Record<string, unknown>>(
  obj: T,
): WithoutUndefined<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as WithoutUndefined<T>;
}
