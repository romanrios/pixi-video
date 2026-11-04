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
    const uploadRes = await client.uploader.upload(dataUrl, {
      folder: "pixi-video-presets",
      public_id: presetId ? `thumb_${presetId}` : undefined,
      overwrite: true,
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
 * Elimina el thumbnail correspondiente de Cloudinary cuando un preset es borrado.
 */
export async function deleteThumbnailFromCloudinary(presetId: string): Promise<void> {
  const client = getCloudinary();
  if (!client || !presetId) return;

  try {
    await client.uploader.destroy(`pixi-video-presets/thumb_${presetId}`);
  } catch (err: any) {
    console.warn(`[Cloudinary] No se pudo eliminar el thumbnail de ${presetId}:`, err?.message || err);
  }
}

