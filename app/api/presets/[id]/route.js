import { NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db.js";
import { getUserFromRequest, isUserAdmin } from "@/lib/auth.js";

/**
 * GET /api/presets/[id]
 */
export async function GET(request, context) {
  try {
    await ensureDbInitialized();
    const params = await context.params;
    const { id } = params;

    const result = await db.execute({
      sql: "SELECT * FROM presets WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Preset no encontrado." }, { status: 404 });
    }

    const row = result.rows[0];
    const currentUser = getUserFromRequest(request);
    const isAdmin = isUserAdmin(currentUser);

    return NextResponse.json({
      preset: {
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
      },
    });
  } catch (err) {
    console.error("Error al obtener preset:", err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

/**
 * PUT /api/presets/[id]
 * Solo permitido para el creador del preset o el administrador global.
 */
export async function PUT(request, context) {
  try {
    await ensureDbInitialized();
    const params = await context.params;
    const { id } = params;

    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para editar un preset." },
        { status: 401 }
      );
    }

    const check = await db.execute({
      sql: "SELECT * FROM presets WHERE id = ?",
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "El preset a editar no existe." }, { status: 404 });
    }

    const preset = check.rows[0];
    const isAdmin = isUserAdmin(currentUser);

    if (!isAdmin && preset.user_id !== currentUser.id) {
      return NextResponse.json(
        {
          error:
            "No tienes permiso para editar este preset. Solo el creador o el admin pueden modificarlo.",
        },
        { status: 403 }
      );
    }

    const { title, description, code } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
    }
    if (!code || !code.trim()) {
      return NextResponse.json({ error: "El código es obligatorio." }, { status: 400 });
    }

    await db.execute({
      sql: `
        UPDATE presets
        SET title = ?, description = ?, code = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [title.trim(), (description || "").trim(), code, id],
    });

    return NextResponse.json({
      success: true,
      message: "Preset actualizado correctamente.",
    });
  } catch (err) {
    console.error("Error al actualizar preset en Next.js:", err);
    return NextResponse.json(
      { error: `Error al actualizar: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/presets/[id]
 * Solo permitido para el creador del preset o el administrador global.
 */
export async function DELETE(request, context) {
  try {
    await ensureDbInitialized();
    const params = await context.params;
    const { id } = params;

    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para eliminar un preset." },
        { status: 401 }
      );
    }

    const check = await db.execute({
      sql: "SELECT * FROM presets WHERE id = ?",
      args: [id],
    });

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "El preset a eliminar no existe." }, { status: 404 });
    }

    const preset = check.rows[0];
    const isAdmin = isUserAdmin(currentUser);

    if (!isAdmin && preset.user_id !== currentUser.id) {
      return NextResponse.json(
        {
          error:
            "No tienes permiso para eliminar este preset. Solo el creador o el admin pueden borrarlo.",
        },
        { status: 403 }
      );
    }

    await db.execute({
      sql: "DELETE FROM presets WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Preset eliminado de la biblioteca.",
    });
  } catch (err) {
    console.error("Error al eliminar preset en Next.js:", err);
    return NextResponse.json(
      { error: `Error al eliminar: ${err.message}` },
      { status: 500 }
    );
  }
}
