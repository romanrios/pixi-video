import { v2 as cloudinary } from "cloudinary";

function getCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloud_name || !api_key || !api_secret) {
    return null;
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return cloudinary;
}

/**
 * Extrae el public_id de una URL de Cloudinary (ej: pixi-video-presets/thumb_preset-123_456).
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const folderIndex = url.indexOf("pixi-video-presets/");
    if (folderIndex !== -1) {
      const fromFolder = url.substring(folderIndex);
      const clean = fromFolder.split("?")[0].split("#")[0];
      const lastDot = clean.lastIndexOf(".");
      return decodeURIComponent(lastDot !== -1 ? clean.substring(0, lastDot) : clean);
    }
    const uploadIdx = url.indexOf("/upload/");
    if (uploadIdx !== -1) {
      const pathAfterUpload = url.substring(uploadIdx + "/upload/".length);
      const parts = pathAfterUpload.split("/");
      const cleanParts = parts.filter(
        (p) => !p.startsWith("v") || isNaN(Number(p.substring(1)))
      );
      const fullPath = cleanParts.join("/");
      const clean = fullPath.split("?")[0].split("#")[0];
      const lastDot = clean.lastIndexOf(".");
      return decodeURIComponent(lastDot !== -1 ? clean.substring(0, lastDot) : clean);
    }
  } catch (err) {
    console.warn("[Cloudinary] Error al extraer public_id de la URL:", err);
  }
  return null;
}

/**
 * Sube una imagen en formato base64 a Cloudinary con optimizaciones de peso y formato.
 * Retorna la URL segura (secure_url) o null si falla.
 */
export async function uploadThumbnailToCloudinary(
  dataUrl: string,
  presetId?: string
): Promise<string | null> {
  if (!dataUrl) return null;

  // Si ya es una URL remota de Cloudinary o similar, conservarla
  if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
    return dataUrl;
  }

  if (!dataUrl.startsWith("data:image/")) {
    console.warn("[Cloudinary] Formato de imagen no válido para subir thumbnail.");
    return null;
  }

  const client = getCloudinary();
  if (!client) {
    console.warn(
      "[Cloudinary] Credenciales incompletas en variables de entorno (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)."
    );
    return null;
  }

  try {
    // Generar un public_id con marca de tiempo para evitar problemas de caché en el CDN
    const uniquePublicId = presetId ? `thumb_${presetId}_${Date.now()}` : undefined;

    const uploadRes = await client.uploader.upload(dataUrl, {
      folder: "pixi-video-presets",
      public_id: uniquePublicId,
      overwrite: true,
      invalidate: true,
      transformation: [
        {
          width: 640,
          height: 360,
          crop: "limit",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    });

    return uploadRes.secure_url;
  } catch (err: any) {
    console.error("[Cloudinary] Error al subir thumbnail:", err?.message || err);
    return null;
  }
}

/**
 * Elimina el thumbnail correspondiente de Cloudinary cuando un preset es borrado o reemplazado.
 * Acepta una URL completa de Cloudinary, un public_id o un presetId.
 */
export async function deleteThumbnailFromCloudinary(
  urlOrPublicIdOrPresetId: string | null | undefined
): Promise<void> {
  if (!urlOrPublicIdOrPresetId) return;

  const client = getCloudinary();
  if (!client) return;

  let publicId: string | null = null;
  if (
    urlOrPublicIdOrPresetId.startsWith("http://") ||
    urlOrPublicIdOrPresetId.startsWith("https://")
  ) {
    publicId = extractPublicIdFromUrl(urlOrPublicIdOrPresetId);
  } else if (urlOrPublicIdOrPresetId.startsWith("pixi-video-presets/")) {
    publicId = urlOrPublicIdOrPresetId;
  } else if (urlOrPublicIdOrPresetId.startsWith("thumb_")) {
    publicId = `pixi-video-presets/${urlOrPublicIdOrPresetId}`;
  } else {
    publicId = `pixi-video-presets/thumb_${urlOrPublicIdOrPresetId}`;
  }

  if (!publicId) return;

  try {
    await client.uploader.destroy(publicId, { invalidate: true });
  } catch (err: any) {
    console.warn(
      `[Cloudinary] No se pudo eliminar el thumbnail ${publicId}:`,
      err?.message || err
    );
  }
}
