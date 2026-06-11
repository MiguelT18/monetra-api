export interface ApiResponse<T = unknown> {
  message: string;
  data: T | undefined;
}

export interface ErrorResponse {
  message: string;
}
