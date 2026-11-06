/**
 * Toast notifications and confirmation dialogs for Pixi Studio.
 * Replaces intrusive browser alerts and confirm prompts with smooth, modern UI.
 */

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ToastType = "success" | "error" | "info" | "warning";

/**
 * Muestra una notificación tipo Toast elegante en pantalla con auto-dismiss.
 */
export function showToast(
  message: string,
  type: ToastType = "info",
  durationMs = 3800
): void {
  if (typeof document === "undefined") return;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");

  let iconSvg = "";
  if (type === "success") {
    iconSvg = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    `;
  } else if (type === "error") {
    iconSvg = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  } else if (type === "warning") {
    iconSvg = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
  } else {
    iconSvg = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }

  toast.innerHTML = `
    <div class="toast-icon-wrap">${iconSvg}</div>
    <div class="toast-body">
      <span class="toast-message">${escapeHtml(message)}</span>
    </div>
    <button type="button" class="toast-close-btn" aria-label="Close notification">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  let isDismissed = false;
  const dismiss = () => {
    if (isDismissed) return;
    isDismissed = true;
    toast.classList.add("toast-leaving");
    setTimeout(() => {
      try {
        toast.remove();
      } catch {}
    }, 240);
  };

  toast.querySelector(".toast-close-btn")?.addEventListener("click", dismiss);

  let timeoutId = setTimeout(dismiss, durationMs);
  toast.addEventListener("mouseenter", () => clearTimeout(timeoutId));
  toast.addEventListener("mouseleave", () => {
    timeoutId = setTimeout(dismiss, 1600);
  });

  container.appendChild(toast);
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

/**
 * Despliega un diálogo modal de confirmación nativo y devuelve una Promesa con la elección del usuario.
 */
export function showConfirmDialog({
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
}: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }

    const dialog = document.getElementById("confirm-modal") as HTMLDialogElement | null;
    const titleEl = document.getElementById("confirm-modal-title");
    const msgEl = document.getElementById("confirm-modal-message");
    const actionBtn = document.getElementById("btn-action-confirm") as HTMLButtonElement | null;
    const cancelBtn = document.getElementById("btn-cancel-confirm") as HTMLButtonElement | null;
    const iconWrapper = document.getElementById("confirm-modal-icon");

    if (!dialog || !actionBtn || !cancelBtn) {
      // Fallback a window.confirm solo si el DOM no está disponible
      resolve(window.confirm(message));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    actionBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    if (isDanger) {
      actionBtn.className = "btn btn-danger";
      if (iconWrapper) {
        iconWrapper.className = "confirm-modal-icon danger";
      }
    } else {
      actionBtn.className = "btn btn-primary";
      if (iconWrapper) {
        iconWrapper.className = "confirm-modal-icon info";
      }
    }

    let settled = false;
    const cleanup = () => {
      dialog.removeEventListener("close", onClose);
      actionBtn.removeEventListener("click", onAction);
      cancelBtn.removeEventListener("click", onCancel);
    };

    const onClose = () => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(false);
      }
    };

    const onAction = () => {
      if (!settled) {
        settled = true;
        cleanup();
        dialog.close();
        resolve(true);
      }
    };

    const onCancel = () => {
      if (!settled) {
        settled = true;
        cleanup();
        dialog.close();
        resolve(false);
      }
    };

    dialog.addEventListener("close", onClose);
    actionBtn.addEventListener("click", onAction);
    cancelBtn.addEventListener("click", onCancel);

    dialog.showModal();
  });
}

