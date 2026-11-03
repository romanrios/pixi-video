import { fetchAuthConfig, fetchCurrentUser, loginWithGoogleCredential, logoutUser } from "./api.js";

let currentUser = null;
const listeners = [];

export function getCurrentUser() {
  return currentUser;
}

export function onAuthChange(fn) {
  listeners.push(fn);
  fn(currentUser);
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(currentUser);
    } catch (e) {
      console.error("Error en listener de autenticación:", e);
    }
  });
}

/**
 * Actualiza los elementos del DOM de la barra de navegación según el estado de sesión.
 */
function renderNavbarAuth() {
  const container = document.getElementById("user-profile-area");
  if (!container) return;

  if (currentUser) {
    const adminBadge = currentUser.isAdmin
      ? `<span class="user-role-badge admin" title="Administrador del sistema">ADMIN</span>`
      : "";

    const avatar = currentUser.picture
      ? `<img src="${currentUser.picture}" alt="${currentUser.name}" class="user-avatar" referrerpolicy="no-referrer" />`
      : `<div class="user-avatar-placeholder">${currentUser.name[0]?.toUpperCase() || "U"}</div>`;

    container.innerHTML = `
      <div class="user-card-pill">
        ${avatar}
        <div class="user-info-text">
          <span class="user-display-name">${escapeHtml(currentUser.name)}</span>
          ${adminBadge}
        </div>
        <button id="btn-logout" class="btn-logout" title="Cerrar sesión">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    document.getElementById("btn-logout")?.addEventListener("click", async () => {
      try {
        await logoutUser();
        currentUser = null;
        renderNavbarAuth();
        notifyListeners();
      } catch (err) {
        console.error("Error cerrando sesión:", err);
      }
    });
  } else {
    container.innerHTML = `
      <div id="google-btn-wrapper" class="google-btn-wrapper">
        <div id="google-btn-slot"></div>
      </div>
    `;
    setupGoogleButton();
  }
}

/**
 * Espera a que el script de Google Identity Services esté disponible y monta el botón.
 */
function setupGoogleButton() {
  const slot = document.getElementById("google-btn-slot");
  if (!slot || currentUser) return;

  if (window.google?.accounts?.id && window.__googleClientId) {
    try {
      window.google.accounts.id.renderButton(slot, {
        theme: "filled_blue",
        size: "medium",
        shape: "pill",
        text: "signin_with",
        locale: "es",
      });
    } catch (e) {
      console.warn("No se pudo renderizar el botón de Google:", e);
    }
  } else {
    // Si el script de Google aún no cargó, reintentar en un momento
    setTimeout(setupGoogleButton, 200);
  }
}

/**
 * Callback ejecutado al recibir credenciales desde Google GIS.
 */
async function handleGoogleCredentialResponse(response) {
  try {
    const data = await loginWithGoogleCredential(response.credential);
    currentUser = data.user;
    renderNavbarAuth();
    notifyListeners();
  } catch (err) {
    console.error("Error al iniciar sesión con Google:", err);
    alert(`Error de autenticación con Google: ${err.message}`);
  }
}

/**
 * Inicialización del módulo de autenticación.
 */
export async function initAuth() {
  try {
    // 1. Obtener usuario existente en cookies
    currentUser = await fetchCurrentUser();

    // 2. Obtener Client ID para Google Identity Services
    const config = await fetchAuthConfig();
    window.__googleClientId = config.googleClientId;

    if (config.googleClientId) {
      const checkGoogleScript = () => {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
          });
          setupGoogleButton();
        } else {
          setTimeout(checkGoogleScript, 100);
        }
      };
      checkGoogleScript();
    }

    renderNavbarAuth();
    notifyListeners();
  } catch (err) {
    console.warn("Aviso durante la carga de autenticación:", err);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

