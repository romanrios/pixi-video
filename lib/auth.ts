import { jwtVerify, createRemoteJWKSet, SignJWT } from "jose";
import type { NextRequest } from "next/server";
import type { User, UserRole } from "@/types/auth";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_GOOGLE_SECRET || "pixi-video-session-secret-2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "romanrios1234@gmail.com")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim());
}

/**
 * Verifica el ID Token retornado por Google Identity Services usando jose y los certificados JWKS oficiales de Google.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<User> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.AUTH_GOOGLE_ID,
  });

  if (!payload || !payload.email) {
    throw new Error("Invalid Google token: does not contain user information.");
  }

  const email = String(payload.email).toLowerCase().trim();
  const role: UserRole = getAdminEmails().includes(email) ? "admin" : "user";

  return {
    id: String(payload.sub),
    email,
    name: String(payload.name || email.split("@")[0]),
    picture: payload.picture ? String(payload.picture) : "",
    role,
  };
}

/**
 * Crea un JWT de sesión firmado para el usuario (HS256).
 */
export async function createSessionToken(user: User): Promise<string> {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verifica y decodifica un JWT de sesión.
 */
export async function verifySessionToken(token: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Determina si un usuario tiene permisos de administrador.
 */
export function isUserAdmin(user: Partial<User> | null): boolean {
  if (!user || !user.email) return false;
  return getAdminEmails().includes(user.email.toLowerCase().trim()) || user.role === "admin";
}

/**
 * Obtiene el usuario autenticado a partir de un Request o cookie.
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  let token = request.cookies.get("pixi_session")?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
  }

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const role: UserRole = isUserAdmin(payload) ? "admin" : "user";
  const user: User = {
    id: String(payload.id || payload.sub),
    email: String(payload.email),
    name: String(payload.name || payload.email?.split("@")[0]),
    picture: payload.picture ? String(payload.picture) : null,
    role,
    isAdmin: isUserAdmin(payload),
  };

  return user;
}

