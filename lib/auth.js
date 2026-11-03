import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);
const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_GOOGLE_SECRET || "pixi-video-session-secret-2026";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "romanrios1234@gmail.com")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim());
}

/**
 * Verifica el ID Token retornado por Google Identity Services.
 */
export async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.AUTH_GOOGLE_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token: does not contain user information.");
  }

  const email = payload.email.toLowerCase().trim();
  const role = getAdminEmails().includes(email) ? "admin" : "user";

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture || "",
    role,
  };
}

/**
 * Crea un JWT de sesión firmado para el usuario.
 */
export function createSessionToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Verifica y decodifica un JWT de sesión.
 */
export function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Determina si un usuario tiene permisos de administrador.
 */
export function isUserAdmin(user) {
  if (!user || !user.email) return false;
  return getAdminEmails().includes(user.email.toLowerCase().trim()) || user.role === "admin";
}

/**
 * Obtiene el usuario autenticado a partir de un Request o cookie.
 */
export function getUserFromRequest(request) {
  let token = request.cookies.get("pixi_session")?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
  }

  if (!token) return null;

  const user = verifySessionToken(token);
  if (user) {
    user.role = isUserAdmin(user) ? "admin" : "user";
    user.isAdmin = isUserAdmin(user);
  }
  return user;
}

