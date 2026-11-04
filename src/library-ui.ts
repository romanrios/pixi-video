import { fetchPresets, createPreset, updatePreset, deletePreset } from "./api";
import { getCurrentUser } from "./auth-ui";
import type { Preset } from "@/types/preset";

let allPresets: Preset[] = [];
let currentFilter: "all" | "mine" = "all";
let searchQuery = "";
let onSelectPresetCallback: ((preset: Preset) => void) | null = null;
let getEditorCodeCallback: (() => string) | null = null;
let editingPresetId: string | null = null;

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function escapeHtml(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Filtra y renderiza los presets en la grilla.
 */
function renderPresets(): void {
  const presetsGrid = document.getElementById("presets-grid");
  const libraryCountBadge = document.getElementById("library-count-badge");
  const libraryModal = document.getElementById("library-modal") as HTMLDialogElement | null;
  if (!presetsGrid) return;

  const user = getCurrentUser();
  const query = searchQuery.toLowerCase().trim();

  let filtered = allPresets.filter((p) => {
    if (currentFilter === "mine") {
      if (!user) return false;
      if (p.userId !== user.id) return false;
    }
    if (query) {
      const matchTitle = (p.title || "").toLowerCase().includes(query);
      const matchAuthor = (p.userName || "").toLowerCase().includes(query);
      const matchDesc = (p.description || "").toLowerCase().includes(query);
      if (!matchTitle && !matchAuthor && !matchDesc) return false;
    }
    return true;
  });

  if (libraryCountBadge) {
    libraryCountBadge.textContent = `${filtered.length} preset${filtered.length === 1 ? "" : "s"}`;
  }

  if (filtered.length === 0) {
    presetsGrid.innerHTML = `
      <div class="empty-library-state">
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <p class="empty-title">No presets found</p>
        <p class="empty-desc">${
          currentFilter === "mine"
            ? "You haven't published any presets yet. Create one in the editor and share it!"
            : "No presets match your search."
        }</p>
      </div>
    `;
    return;
  }

  presetsGrid.innerHTML = filtered
    .map((preset) => {
      const isOwner = Boolean(user && user.id === preset.userId);
      const canManage = Boolean(preset.canManage || (user && user.isAdmin) || isOwner);

      const avatar = preset.userPicture
        ? `<img src="${preset.userPicture}" alt="${escapeHtml(preset.userName)}" class="card-author-avatar" referrerpolicy="no-referrer" />`
        : `<div class="card-author-placeholder">${(preset.userName || "U")[0]?.toUpperCase()}</div>`;

      const badge = isOwner
        ? `<span class="preset-tag owner-tag">Yours</span>`
        : user && user.isAdmin
        ? `<span class="preset-tag admin-tag">Admin</span>`
        : "";

      return `
        <article class="preset-card" data-id="${preset.id}">
          <div class="preset-card-header">
            <div class="preset-card-author">
              ${avatar}
              <div class="author-details">
                <span class="author-name">${escapeHtml(preset.userName)}</span>
                <span class="preset-date">${formatDate(preset.createdAt)}</span>
              </div>
            </div>
            ${badge}
          </div>

          <div class="preset-card-body">
            <h3 class="preset-card-title">${escapeHtml(preset.title)}</h3>
            <p class="preset-card-desc">${escapeHtml(preset.description || "Interactive PixiJS visual preset.")}</p>
          </div>

          <div class="preset-card-actions">
            <button class="btn btn-primary btn-load-preset" data-id="${preset.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Load Preset</span>
            </button>

            ${
              canManage
                ? `
              <div class="card-manage-actions">
                <button class="btn-icon btn-edit-preset" data-id="${preset.id}" title="Edit Preset">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="btn-icon btn-delete-preset danger" data-id="${preset.id}" title="Delete Preset">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            `
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");

  presetsGrid.querySelectorAll(".btn-load-preset").forEach((btnEl) => {
    const btn = btnEl as HTMLElement;
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const found = allPresets.find((p) => p.id === id);
      if (found && onSelectPresetCallback) {
        onSelectPresetCallback(found);
        if (libraryModal) libraryModal.close();
      }
    });
  });

  presetsGrid.querySelectorAll(".btn-edit-preset").forEach((btnEl) => {
    const btn = btnEl as HTMLElement;
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const found = allPresets.find((p) => p.id === id);
      if (found) {
        openEditPresetModal(found);
      }
    });
  });

  presetsGrid.querySelectorAll(".btn-delete-preset").forEach((btnEl) => {
    const btn = btnEl as HTMLElement;
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const found = allPresets.find((p) => p.id === id);
      if (!found) return;

      const confirmDelete = window.confirm(
        `Are you sure you want to delete preset "${found.title}" from the library? This action cannot be undone.`
      );
      if (!confirmDelete) return;

      try {
        await deletePreset(found.id);
        await loadLibraryPresets();
      } catch (err: any) {
        alert(`Error deleting preset: ${err.message}`);
      }
    });
  });
}

/**
 * Carga los presets desde la API del backend.
 */
export async function loadLibraryPresets(): Promise<void> {
  try {
    allPresets = await fetchPresets();
    renderPresets();
  } catch (err) {
    console.warn("Could not load presets library from API:", err);
  }
}

/**
 * Abre el modal de la biblioteca.
 */
export async function openLibraryModal(): Promise<void> {
  const libraryModal = document.getElementById("library-modal") as HTMLDialogElement | null;
  await loadLibraryPresets();
  if (libraryModal) {
    libraryModal.showModal();
  }
}

/**
 * Abre el modal para guardar o publicar el código actual del editor.
 */
export function openCreatePresetModal(): void {
  const user = getCurrentUser();
  if (!user) {
    alert("You must sign in with Google to publish a preset to the library.");
    return;
  }

  const code = getEditorCodeCallback ? getEditorCodeCallback() : "";
  if (!code || !code.trim()) {
    alert("The code editor is empty.");
    return;
  }

  const presetEditorModal = document.getElementById("preset-editor-modal") as HTMLDialogElement | null;
  const presetEditorTitleHeading = document.getElementById("preset-editor-title-heading");
  const btnSubmitPresetEditor = document.getElementById("btn-submit-preset-editor");
  const presetTitleInput = document.getElementById("preset-title-input") as HTMLInputElement | null;
  const presetDescInput = document.getElementById("preset-desc-input") as HTMLTextAreaElement | null;
  const presetCodePreview = document.getElementById("preset-code-preview");

  editingPresetId = null;
  if (presetEditorTitleHeading) presetEditorTitleHeading.textContent = "Publish Preset to Library";
  if (btnSubmitPresetEditor) {
    const span = btnSubmitPresetEditor.querySelector("span");
    if (span) span.textContent = "Publish to Library";
  }
  if (presetTitleInput) presetTitleInput.value = "";
  if (presetDescInput) presetDescInput.value = "";
  if (presetCodePreview) presetCodePreview.textContent = code;

  if (presetEditorModal) {
    presetEditorModal.showModal();
  }
}

/**
 * Abre el modal para editar un preset existente.
 */
function openEditPresetModal(preset: Preset): void {
  const presetEditorModal = document.getElementById("preset-editor-modal") as HTMLDialogElement | null;
  const presetEditorTitleHeading = document.getElementById("preset-editor-title-heading");
  const btnSubmitPresetEditor = document.getElementById("btn-submit-preset-editor");
  const presetTitleInput = document.getElementById("preset-title-input") as HTMLInputElement | null;
  const presetDescInput = document.getElementById("preset-desc-input") as HTMLTextAreaElement | null;
  const presetCodePreview = document.getElementById("preset-code-preview");

  editingPresetId = preset.id;
  if (presetEditorTitleHeading) presetEditorTitleHeading.textContent = `Edit Preset: ${preset.title}`;
  if (btnSubmitPresetEditor) {
    const span = btnSubmitPresetEditor.querySelector("span");
    if (span) span.textContent = "Save Changes";
  }
  if (presetTitleInput) presetTitleInput.value = preset.title;
  if (presetDescInput) presetDescInput.value = preset.description || "";
  if (presetCodePreview) presetCodePreview.textContent = preset.code;

  if (presetEditorModal) {
    presetEditorModal.showModal();
  }
}

/**
 * Inicialización de eventos de la biblioteca y modal de presets.
 */
export function initLibraryUI({
  onSelectPreset,
  getEditorCode,
}: {
  onSelectPreset?: (preset: Preset) => void;
  getEditorCode?: () => string;
}): void {
  onSelectPresetCallback = onSelectPreset || null;
  getEditorCodeCallback = getEditorCode || null;

  const libraryModal = document.getElementById("library-modal") as HTMLDialogElement | null;
  const btnCloseLibrary = document.getElementById("btn-close-library");
  const btnOpenLibrary = document.getElementById("btn-open-library");
  const btnOpenSavePreset = document.getElementById("btn-open-save-preset");
  const librarySearchInput = document.getElementById("library-search-input") as HTMLInputElement | null;
  const filterAllBtn = document.getElementById("filter-all-btn");
  const filterMineBtn = document.getElementById("filter-mine-btn");

  const presetEditorModal = document.getElementById("preset-editor-modal") as HTMLDialogElement | null;
  const btnClosePresetEditor = document.getElementById("btn-close-preset-editor");
  const btnCancelPresetEditor = document.getElementById("btn-cancel-preset-editor");
  const presetEditorForm = document.getElementById("preset-editor-form");
  const presetTitleInput = document.getElementById("preset-title-input") as HTMLInputElement | null;
  const presetDescInput = document.getElementById("preset-desc-input") as HTMLTextAreaElement | null;
  const presetCodePreview = document.getElementById("preset-code-preview");
  const btnSubmitPresetEditor = document.getElementById("btn-submit-preset-editor") as HTMLButtonElement | null;

  // Apertura y cierre de la biblioteca
  btnOpenLibrary?.addEventListener("click", openLibraryModal);
  btnCloseLibrary?.addEventListener("click", () => libraryModal?.close());

  // Apertura de modal de guardar
  btnOpenSavePreset?.addEventListener("click", openCreatePresetModal);

  // Cierre de modal de edición/creación
  btnClosePresetEditor?.addEventListener("click", () => presetEditorModal?.close());
  btnCancelPresetEditor?.addEventListener("click", () => presetEditorModal?.close());

  // Búsqueda en vivo
  librarySearchInput?.addEventListener("input", (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderPresets();
  });

  // Pestañas de filtro
  filterAllBtn?.addEventListener("click", () => {
    currentFilter = "all";
    filterAllBtn.classList.add("active");
    filterMineBtn?.classList.remove("active");
    renderPresets();
  });

  filterMineBtn?.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) {
      alert("Sign in with Google to view your published presets.");
      return;
    }
    currentFilter = "mine";
    filterMineBtn.classList.add("active");
    filterAllBtn?.classList.remove("active");
    renderPresets();
  });

  // Envío del formulario de crear / editar preset
  presetEditorForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = presetTitleInput?.value.trim() || "";
    const description = presetDescInput?.value.trim() || "";
    const code = editingPresetId
      ? presetCodePreview?.textContent || ""
      : getEditorCodeCallback
      ? getEditorCodeCallback()
      : "";

    if (!title) {
      alert("Please enter a title for the preset.");
      return;
    }

    try {
      if (btnSubmitPresetEditor) btnSubmitPresetEditor.disabled = true;

      if (editingPresetId) {
        await updatePreset(editingPresetId, { title, description, code });
      } else {
        await createPreset({ title, description, code });
      }

      presetEditorModal?.close();
      await loadLibraryPresets();
      libraryModal?.showModal();
    } catch (err: any) {
      console.error(err);
      alert(`Error saving preset: ${err.message}`);
    } finally {
      if (btnSubmitPresetEditor) btnSubmitPresetEditor.disabled = false;
    }
  });

  // Cargar presets de fondo al inicio
  loadLibraryPresets();
}
