import { NextResponse, type NextRequest } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";
import { getUserFromRequest, isUserAdmin } from "@/lib/auth";
import { uploadThumbnailToCloudinary, deleteThumbnailFromCloudinary } from "@/lib/cloudinary";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/presets/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureDbInitialized();
    const { id } = await context.params;

    const result = await db.execute({
      sql: "SELECT * FROM presets WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Preset not found." }, { status: 404 });
    }

    const row: any = result.rows[0];
    const currentUser = await getUserFromRequest(request);
    const isAdmin = isUserAdmin(currentUser);

    return NextResponse.json({
      preset: {
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
      },
    });
  } catch (err: any) {
    console.error("Error fetching preset:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PUT /api/presets/[id]
 * Only allowed for the preset creator or a global admin.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await ensureDbInitialized();
    const { id } = await context.params;

    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "You must sign in to edit a preset." },
        { status: 401 }
      );
    }

    const check = await db.execute({
      sql: "SELECT * FROM presets WHERE id = ?",
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "The preset to edit does not exist." }, { status: 404 });
    }

    const preset: any = check.rows[0];
    const isAdmin = isUserAdmin(currentUser);

    if (!isAdmin && preset.user_id !== currentUser.id) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to edit this preset. Only the creator or an admin can modify it.",
        },
        { status: 403 }
      );
    }

    const { title, description, code, thumbnail } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    let thumbnailUrl = preset.thumbnail_url ? String(preset.thumbnail_url) : null;
    if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("data:image/")) {
      try {
        const uploaded = await uploadThumbnailToCloudinary(thumbnail, id);
        if (uploaded) {
          // Si ya existía un thumbnail anterior y es diferente, eliminarlo de Cloudinary para no dejar archivos basura
          if (preset.thumbnail_url && preset.thumbnail_url !== uploaded) {
            await deleteThumbnailFromCloudinary(preset.thumbnail_url);
          }
          thumbnailUrl = uploaded;
        }
      } catch (cErr) {
        console.warn("[Cloudinary] Non-fatal error updating thumbnail:", cErr);
      }
    }

    await db.execute({
      sql: `
        UPDATE presets
        SET title = ?, description = ?, code = ?, thumbnail_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [title.trim(), (description || "").trim(), code, thumbnailUrl, id],
    });

    return NextResponse.json({
      success: true,
      message: "Preset updated successfully.",
    });
  } catch (err: any) {
    console.error("Error updating preset in Next.js:", err);
    return NextResponse.json(
      { error: `Error updating preset: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/presets/[id]
 * Only allowed for the preset creator or a global admin.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await ensureDbInitialized();
    const { id } = await context.params;

    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "You must sign in to delete a preset." },
        { status: 401 }
      );
    }

    const check = await db.execute({
      sql: "SELECT * FROM presets WHERE id = ?",
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "The preset to delete does not exist." }, { status: 404 });
    }

    const preset: any = check.rows[0];
    const isAdmin = isUserAdmin(currentUser);

    if (!isAdmin && preset.user_id !== currentUser.id) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to delete this preset. Only the creator or an admin can delete it.",
        },
        { status: 403 }
      );
    }

    // Eliminar el thumbnail en Cloudinary evitando archivos basura
    try {
      if (preset.thumbnail_url) {
        await deleteThumbnailFromCloudinary(preset.thumbnail_url);
      }
      await deleteThumbnailFromCloudinary(id);
    } catch (cErr) {
      console.warn("[Cloudinary] Non-fatal error deleting thumbnail:", cErr);
    }

    await db.execute({
      sql: "DELETE FROM presets WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Preset deleted from the library.",
    });
  } catch (err: any) {
    console.error("Error deleting preset in Next.js:", err);
    return NextResponse.json(
      { error: `Error deleting preset: ${err.message}` },
      { status: 500 }
    );
  }
}
