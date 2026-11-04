import type { User } from "@/types/auth";
import type { Preset, PresetCreateInput, PresetUpdateInput } from "@/types/preset";

/**
 * Cliente de API para comunicación con el backend de Pixi Studio.
 */

/**
 * Parsea de forma segura una respuesta que puede ser JSON, texto o vacía.
 */
async function parseResponse<T = any>(res: Response, fallbackError = "Request failed"): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg =
      data?.error || (text && text.length < 300 ? text : `Server error (HTTP ${res.status}: ${res.statusText})`);
    throw new Error(errorMsg || fallbackError);
  }

  return (data !== null ? data : {}) as T;
}

export async function fetchAuthConfig(): Promise<{ googleClientId: string }> {
  try {
    const res = await fetch("/api/auth/config");
    return await parseResponse(res, "Could not load auth configuration.");
  } catch {
    return { googleClientId: "" };
  }
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    const data = await parseResponse(res);
    return data.user || null;
  } catch {
    return null;
  }
}

export async function loginWithGoogleCredential(credential: string): Promise<{ success: boolean; user: User }> {
  if (!credential) {
    throw new Error("No credential was provided by Google. Please check Authorized JavaScript origins.");
  }
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return await parseResponse(res, "Error authenticating with Google.");
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
  });
  return await parseResponse(res, "Error logging out.");
}

export async function fetchPresets(): Promise<Preset[]> {
  const res = await fetch("/api/presets");
  const data = await parseResponse(res, "Failed to load presets.");
  return data.presets || [];
}

export async function createPreset({ title, description, code }: PresetCreateInput): Promise<any> {
  const res = await fetch("/api/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, code }),
  });
  return await parseResponse(res, "Error publishing preset.");
}

export async function updatePreset(id: string, { title, description, code }: PresetUpdateInput): Promise<any> {
  const res = await fetch(`/api/presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, code }),
  });
  return await parseResponse(res, "Error updating preset.");
}

export async function deletePreset(id: string): Promise<any> {
  const res = await fetch(`/api/presets/${id}`, {
    method: "DELETE",
  });
  return await parseResponse(res, "Error deleting preset.");
}
