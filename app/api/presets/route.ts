import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db, ensureDbInitialized } from "@/lib/db";
import { getUserFromRequest, isUserAdmin } from "@/lib/auth";
import { uploadThumbnailToCloudinary } from "@/lib/cloudinary";
import type { Preset } from "@/types/preset";

/**
 * GET /api/presets
 * Obtener todos los presets comunitarios.
 */
export async function GET(request: NextRequest) {
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
        thumbnail_url,
        created_at, 
        updated_at
      FROM presets
      ORDER BY datetime(created_at) DESC
    `);

    const currentUser = await getUserFromRequest(request);
    const isAdmin = isUserAdmin(currentUser);

    const presets: Preset[] = result.rows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title),
      description: row.description ? String(row.description) : "",
      code: String(row.code),
      userId: String(row.user_id),
      userName: String(row.user_name),
      userEmail: String(row.user_email),
      userPicture: row.user_picture ? String(row.user_picture) : null,
      thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      canManage: Boolean(isAdmin || (currentUser && currentUser.id === String(row.user_id))),
      isOwner: Boolean(currentUser && currentUser.id === String(row.user_id)),
    }));

    return NextResponse.json({ presets });
  } catch (err: any) {
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
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();

    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "You must sign in with Google to publish a preset." },
        { status: 401 }
      );
    }

    const { title, description, code, thumbnail } = await request.json();

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

    // Subir thumbnail a Cloudinary si se proporcionó una captura en base64
    let thumbnailUrl: string | null = null;
    if (thumbnail && typeof thumbnail === "string") {
      try {
        thumbnailUrl = await uploadThumbnailToCloudinary(thumbnail, id);
      } catch (cErr) {
        console.warn("[Cloudinary] Non-fatal error uploading thumbnail:", cErr);
      }
    }

    await db.execute({
      sql: `
        INSERT INTO presets (id, title, description, code, user_id, user_name, user_email, user_picture, thumbnail_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        thumbnailUrl,
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
  } catch (err: any) {
    console.error("Error publishing preset in Next.js:", err);
    return NextResponse.json(
      { error: `Error saving preset: ${err.message}` },
      { status: 500 }
    );
  }
}
