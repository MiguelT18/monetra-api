declare type UserRole = "PRODUCER" | "AFFILIATE" | "STUDENT";

interface JWTUserPayload {
  id: string;
  role: UserRole;
}
