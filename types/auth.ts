export type UserRole = "admin" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  role: UserRole;
  createdAt?: string;
  isAdmin?: boolean;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  picture?: string;
}

export interface GoogleJwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

