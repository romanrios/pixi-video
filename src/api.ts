import type { User } from "@/types/auth";
import type { Preset, PresetCreateInput, PresetUpdateInput } from "@/types/preset";

/**
 * Cliente de API para comunicación con el backend de Pixi Studio.
 */

export async function fetchAuthConfig(): Promise<{ googleClientId: string }> {
  const res = await fetch("/api/auth/config");
  return res.json();
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function loginWithGoogleCredential(credential: string): Promise<{ success: boolean; user: User }> {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error authenticating with Google.");
  }
  return res.json();
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
  });
  return res.json();
}

export async function fetchPresets(): Promise<Preset[]> {
  const res = await fetch("/api/presets");
  if (!res.ok) {
    throw new Error("Failed to load presets.");
  }
  const data = await res.json();
  return data.presets || [];
}

export async function createPreset({ title, description, code }: PresetCreateInput): Promise<any> {
  const res = await fetch("/api/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error publishing preset.");
  }
  return res.json();
}

export async function updatePreset(id: string, { title, description, code }: PresetUpdateInput): Promise<any> {
  const res = await fetch(`/api/presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error updating preset.");
  }
  return res.json();
}

export async function deletePreset(id: string): Promise<any> {
  const res = await fetch(`/api/presets/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error deleting preset.");
  }
  return res.json();
}
