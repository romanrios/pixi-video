import { createClient } from "@libsql/client";
import { PRESETS_DATA } from "./presets-data.js";

const globalForDb = globalThis;

export const db =
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

    // 2. Tabla de presets comunitarios
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

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

    // 4. Sembrar presets iniciales si la tabla está vacía
    const checkPresets = await db.execute("SELECT COUNT(*) as count FROM presets");
    const count = Number(checkPresets.rows[0]?.count || 0);

    if (count === 0) {
      for (const seed of PRESETS_DATA) {
        await db.execute({
          sql: `
            INSERT INTO presets (id, title, description, code, user_id, user_name, user_email, user_picture)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            seed.id,
            seed.title,
            seed.description,
            seed.code,
            "admin-seed-id",
            "Pixi Studio",
            adminEmail,
            "https://raw.githubusercontent.com/pixijs/pixijs/main/bundles/pixi.js/public/assets/logo.svg",
          ],
        });
      }
    }

    isInitialized = true;
  } catch (err) {
    console.error("Error al inicializar base de datos Turso en Next.js:", err);
  }
}

