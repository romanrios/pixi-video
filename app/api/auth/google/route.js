import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db.js";
import { verifyGoogleIdToken, createSessionToken } from "@/lib/auth.js";

export async function POST(request) {
  try {
    await ensureDbInitialized();
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json(
        { error: "Missing Google authentication credential." },
        { status: 400 }
      );
    }

    const googleUser = await verifyGoogleIdToken(credential);
    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // 1. Buscar si ya existe un usuario con este correo electrónico
    const existing = await db.execute({
      sql: "SELECT * FROM users WHERE LOWER(email) = ?",
      args: [normalizedEmail],
    });

    let activeUser = null;

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      // Actualizar datos del perfil manteniendo el ID existente (preservando integridad referencial)
      await db.execute({
        sql: "UPDATE users SET name = ?, picture = ?, role = ? WHERE id = ?",
        args: [googleUser.name, googleUser.picture, googleUser.role, existingUser.id],
      });

      activeUser = {
        id: String(existingUser.id),
        email: String(existingUser.email),
        name: googleUser.name,
        picture: googleUser.picture,
        role: googleUser.role,
        isAdmin: googleUser.role === "admin",
      };
    } else {
      // Usuario nuevo
      await db.execute({
        sql: `
          INSERT INTO users (id, email, name, picture, role)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          googleUser.id,
          googleUser.email,
          googleUser.name,
          googleUser.picture,
          googleUser.role,
        ],
      });

      activeUser = {
        id: String(googleUser.id),
        email: String(googleUser.email),
        name: googleUser.name,
        picture: googleUser.picture,
        role: googleUser.role,
        isAdmin: googleUser.role === "admin",
      };
    }

    const sessionToken = await createSessionToken(activeUser);

    const response = NextResponse.json({
      success: true,
      user: activeUser,
    });

    response.cookies.set("pixi_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Error authenticating with Google in Next.js:", err);
    return NextResponse.json(
      { error: `Authentication error: ${err.message}` },
      { status: 401 }
    );
  }
}
