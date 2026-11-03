import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, ensureDbInitialized } from "@/lib/db.js";
import { getUserFromRequest, isUserAdmin } from "@/lib/auth.js";

/**
 * GET /api/presets
 * Obtener todos los presets comunitarios.
 */
export async function GET(request) {
  try {
    await ensureDbInitialized();

    const result = await db.execute(`
      SELECT 
        id, 
        title, 
        description, 
        code, 
        user_id, 
        user_name, 
        user_email, 
        user_picture, 
        created_at, 
        updated_at
      FROM presets
      ORDER BY datetime(created_at) DESC
    `);

    const currentUser = getUserFromRequest(request);
    const isAdmin = isUserAdmin(currentUser);

    const presets = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      code: row.code,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPicture: row.user_picture,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      canManage: Boolean(isAdmin || (currentUser && currentUser.id === row.user_id)),
      isOwner: Boolean(currentUser && currentUser.id === row.user_id),
    }));

    return NextResponse.json({ presets });
  } catch (err) {
    console.error("Error fetching presets in Next.js:", err);
    return NextResponse.json(
      { error: "Failed to load preset library." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/presets
 * Publish a new preset.
 */
export async function POST(request) {
  try {
    await ensureDbInitialized();

    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "You must sign in with Google to publish a preset." },
        { status: 401 }
      );
    }

    const { title, description, code } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Preset title is required." },
        { status: 400 }
      );
    }
    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: "Preset code is required." },
        { status: 400 }
      );
    }

    const id = `preset-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    await db.execute({
      sql: `
        INSERT INTO presets (id, title, description, code, user_id, user_name, user_email, user_picture)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        title.trim(),
        (description || "").trim(),
        code,
        currentUser.id,
        currentUser.name,
        currentUser.email,
        currentUser.picture || "",
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Preset published successfully to the library!",
        presetId: id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error publishing preset in Next.js:", err);
    return NextResponse.json(
      { error: `Error saving preset: ${err.message}` },
      { status: 500 }
    );
  }
}
