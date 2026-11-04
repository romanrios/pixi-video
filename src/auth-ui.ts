/// <reference path="../types/global.d.ts" />
import { fetchAuthConfig, fetchCurrentUser, loginWithGoogleCredential, logoutUser } from "./api";
import type { User } from "@/types/auth";

let currentUser: User | null = null;
const listeners: Array<(user: User | null) => void> = [];

export function getCurrentUser(): User | null {
  return currentUser;
}

export function onAuthChange(fn: (user: User | null) => void): void {
  listeners.push(fn);
  fn(currentUser);
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(currentUser);
    } catch (e) {
      console.error("Error in auth listener:", e);
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
      ? `<span class="user-role-badge admin" title="System Administrator">ADMIN</span>`
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
        <button id="btn-logout" class="btn-logout" title="Sign out">
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
        if (window.google?.accounts?.id) {
          window.google.accounts.id.disableAutoSelect();
        }
        currentUser = null;
        renderNavbarAuth();
        notifyListeners();
      } catch (err) {
        console.error("Error signing out:", err);
      }
    });
  } else {
    container.innerHTML = `
      <div id="google-btn-wrapper" class="google-btn-wrapper">
        <div id="google-btn-desktop" class="google-btn-desktop"></div>
        <div id="google-btn-mobile" class="google-btn-mobile"></div>
      </div>
    `;
    setupGoogleButton();
  }
}

let resizeListenerAttached = false;

/**
 * Espera a que el script de Google Identity Services esté disponible y monta el botón.
 */
function setupGoogleButton() {
  if (currentUser) return;
  const desktopSlot = document.getElementById("google-btn-desktop");
  const mobileSlot = document.getElementById("google-btn-mobile");
  if (!desktopSlot && !mobileSlot) return;

  if (window.google?.accounts?.id && window.__googleClientId) {
    try {
      if (desktopSlot && !desktopSlot.hasChildNodes()) {
        window.google.accounts.id.renderButton(desktopSlot, {
          type: "standard",
          theme: "filled_blue",
          size: "medium",
          shape: "pill",
          text: "signin_with",
          locale: "en",
        });
      }

      if (mobileSlot && !mobileSlot.hasChildNodes()) {
        window.google.accounts.id.renderButton(mobileSlot, {
          type: "icon",
          theme: "filled_blue",
          size: "medium",
          shape: "circle",
        });
      }

      if (!resizeListenerAttached && typeof window !== "undefined") {
        resizeListenerAttached = true;
        window.matchMedia("(max-width: 640px)").addEventListener("change", () => {
          setupGoogleButton();
        });
      }
    } catch (e) {
      console.warn("Could not render Google button:", e);
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
    console.error("Error signing in with Google:", err);
    alert(`Google authentication error: ${err.message}`);
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
    console.warn("Notice during auth load:", err);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

