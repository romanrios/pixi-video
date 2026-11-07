import { createClient, type Client } from "@libsql/client";

const globalForDb = globalThis as unknown as {
  tursoClient?: Client;
};

export const db: Client =
  globalForDb.tursoClient ||
  createClient({
    url: process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.tursoClient = db;
}

let isInitialized = false;

export async function ensureDbInitialized() {
  if (isInitialized) return;

  try {
    // 1. Tabla de usuarios
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        picture TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabla de presets comunitarios (totalmente dinámicos)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        code TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_picture TEXT,
        thumbnail_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Migración para bases de datos existentes: agregar columna thumbnail_url si no existe
    try {
      await db.execute("ALTER TABLE presets ADD COLUMN thumbnail_url TEXT;");
    } catch {
      // Ignorar si la columna ya existe
    }

    // 3. Usuario administrador inicial
    const adminEmail = (process.env.ADMIN_EMAILS || "romanrios1234@gmail.com").toLowerCase().trim();
    const checkAdmin = await db.execute({
      sql: "SELECT id FROM users WHERE LOWER(email) = ?",
      args: [adminEmail],
    });

    if (checkAdmin.rows.length === 0) {
      await db.execute({
        sql: `
          INSERT INTO users (id, email, name, picture, role)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          "admin-seed-id",
          adminEmail,
          "Roman Rios (Admin)",
          "https://raw.githubusercontent.com/pixijs/pixijs/main/bundles/pixi.js/public/assets/logo.svg",
          "admin",
        ],
      });
    } else {
      await db.execute({
        sql: "UPDATE users SET role = 'admin' WHERE LOWER(email) = ?",
        args: [adminEmail],
      });
    }

    isInitialized = true;
  } catch (err) {
    console.error("Error al inicializar base de datos Turso en Next.js:", err);
  }
}
