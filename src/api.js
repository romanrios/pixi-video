/**
 * Cliente de API para comunicación con el backend de Pixi Studio.
 */

export async function fetchAuthConfig() {
  const res = await fetch("/api/auth/config");
  return res.json();
}

export async function fetchCurrentUser() {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function loginWithGoogleCredential(credential) {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al autenticar con Google.");
  }
  return res.json();
}

export async function logoutUser() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
  });
  return res.json();
}

export async function fetchPresets() {
  const res = await fetch("/api/presets");
  if (!res.ok) {
    throw new Error("No se pudieron cargar los presets.");
  }
  const data = await res.json();
  return data.presets || [];
}

export async function createPreset({ title, description, code }) {
  const res = await fetch("/api/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al publicar preset.");
  }
  return res.json();
}

export async function updatePreset(id, { title, description, code }) {
  const res = await fetch(`/api/presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al actualizar preset.");
  }
  return res.json();
}

export async function deletePreset(id) {
  const res = await fetch(`/api/presets/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al eliminar preset.");
  }
  return res.json();
}

