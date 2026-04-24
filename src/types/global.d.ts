declare type UserRole = "PRODUCER" | "AFFILIATE" | "STUDENT";

declare type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface JWTUserPayload {
  id: string;
  role: UserRole;
}
