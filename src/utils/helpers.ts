import type { ApiResponse, ErrorResponse } from "../types/response.types.ts";

export function ok<T>(message = "Success", data?: T): ApiResponse<T> {
  return { message, data };
}

export function fail(message: string): ErrorResponse {
  return { message };
}
