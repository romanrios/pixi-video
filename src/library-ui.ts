import { fetchPresets, createPreset, updatePreset, deletePreset } from "./api";
import { getCurrentUser } from "./auth-ui";
import { showToast, showConfirmDialog } from "./toast";
import type { Preset } from "@/types/preset";

const CACHE_KEY = "pixi_presets_cache_v1";

function getCachedPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setCachedPresets(presets: Preset[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(presets));
  } catch {}
}

let allPresets: Preset[] = getCachedPresets();
let currentFilter: "all" | "mine" = "all";
let searchQuery = "";
let onSelectPresetCallback: ((preset: Preset) => void) | null = null;
let onSavePresetSuccessCallback: ((preset: { id: string; title: string; description?: string }) => void) | null = null;
let getEditorCodeCallback: (() => string) | null = null;
let getCanvasThumbnailCallback: (() => Promise<string | null> | string | null) | null = null;
let editingPresetId: string | null = null;
let openedFromLibraryModal = false;
let currentThumbnailData: string | null = null;

function updateThumbnailPreview(dataUrl: string | null): void {
  const previewImg = document.getElementById("preset-thumb-preview-img") as HTMLImageElement | null;
  const previewEmpty = document.getElementById("preset-thumb-preview-empty");
  if (previewImg && previewEmpty) {
    if (dataUrl) {
      previewImg.src = dataUrl;
      previewImg.style.display = "block";
      previewEmpty.style.display = "none";
    } else {
      previewImg.removeAttribute("src");
      previewImg.style.display = "none";
      previewEmpty.style.display = "flex";
    }
  }
}

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
            ? "You haven't saved any presets yet. Create one in the editor and save it!"
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
          <div class="preset-card-media" title="Click to load preset into editor">
            ${
              preset.thumbnailUrl
                ? `<img src="${preset.thumbnailUrl}" alt="${escapeHtml(preset.title)}" class="preset-card-thumb" loading="lazy" />`
                : `
                  <div class="preset-card-thumb-placeholder">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="1.5" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span>Preset Preview</span>
                  </div>
                `
            }
            ${badge ? `<div class="preset-card-badge-overlay">${badge}</div>` : ""}
          </div>

          <div class="preset-card-body">
            <h3 class="preset-card-title" title="${escapeHtml(preset.title)}">${escapeHtml(preset.title)}</h3>
            ${
              preset.description
                ? `<p class="preset-card-desc" title="${escapeHtml(preset.description)}">${escapeHtml(preset.description)}</p>`
                : ""
            }
          </div>

          <div class="preset-card-footer">
            <div class="card-author-info">
              ${avatar}
              <div class="card-author-text">
                <span class="card-author-name" title="${escapeHtml(preset.userName)}">${escapeHtml(preset.userName)}</span>
                <span class="card-date">${formatDate(preset.createdAt)}</span>
              </div>
            </div>

            <div class="card-actions-group">
              <button class="btn btn-primary btn-load-preset" data-id="${preset.id}" title="Load preset into editor">
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.2" fill="none">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Load</span>
              </button>

              ${
                canManage
                  ? `
                <div class="card-manage-actions">
                  <button class="btn-icon-action btn-edit-preset" data-id="${preset.id}" title="Edit Preset">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button class="btn-icon-action danger btn-delete-preset" data-id="${preset.id}" title="Delete Preset">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  presetsGrid.querySelectorAll(".btn-load-preset, .preset-card-media").forEach((el) => {
    el.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".card-manage-actions")) return;
      const card = (el as HTMLElement).closest(".preset-card") as HTMLElement;
      const id = card?.dataset.id || (el as HTMLElement).dataset.id;
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

      const confirmed = await showConfirmDialog({
        title: "Delete Preset",
        message: `Are you sure you want to delete preset "${found.title}" from the library? This action cannot be undone.`,
        confirmText: "Delete",
        isDanger: true,
      });
      if (!confirmed) return;

      // Optimistic removal from in-memory and session cache for instant feedback
      const prevPresets = [...allPresets];
      allPresets = allPresets.filter((p) => p.id !== found.id);
      setCachedPresets(allPresets);
      renderPresets();

      try {
        await deletePreset(found.id);
        showToast(`Preset "${found.title}" deleted from library`, "info");
      } catch (err: any) {
        console.error("Error deleting preset:", err);
        showToast(`Error deleting preset: ${err.message}`, "error");
        // Revert on error
        allPresets = prevPresets;
        setCachedPresets(allPresets);
        renderPresets();
      }
    });
  });
}

/**
 * Renderiza tarjetas skeleton animadas para dar feedback visual instantáneo.
 */
function renderSkeletons(): void {
  const presetsGrid = document.getElementById("presets-grid");
  const libraryCountBadge = document.getElementById("library-count-badge");
  if (!presetsGrid) return;
  if (libraryCountBadge) libraryCountBadge.textContent = "Loading...";

  presetsGrid.innerHTML = Array.from({ length: 6 })
    .map(
      () => `
      <div class="preset-card skeleton-card" aria-hidden="true">
        <div class="skeleton-media shimmer"></div>
        <div class="preset-card-body">
          <div class="skeleton-line title shimmer"></div>
          <div class="skeleton-line desc shimmer"></div>
        </div>
        <div class="preset-card-footer">
          <div class="skeleton-avatar shimmer"></div>
          <div class="skeleton-btn shimmer"></div>
        </div>
      </div>
    `
    )
    .join("");
}

/**
 * Carga los presets desde la API del backend y actualiza la caché local.
 */
export async function loadLibraryPresets(options?: { silent?: boolean }): Promise<void> {
  try {
    const presets = await fetchPresets(!options?.silent);
    allPresets = presets;
    setCachedPresets(allPresets);
    renderPresets();
  } catch (err: any) {
    console.warn("Could not load presets library from API:", err);
    if (!options?.silent) {
      showToast(`Could not refresh presets: ${err.message}`, "error");
    }
  }
}

/**
 * Abre el modal de la biblioteca de forma instantánea sin bloqueos de red.
 */
export async function openLibraryModal(): Promise<void> {
  const libraryModal = document.getElementById("library-modal") as HTMLDialogElement | null;
  if (!libraryModal) return;

  // 1. Abrir inmediatamente el diálogo (0ms de latencia percibida)
  libraryModal.showModal();

  // 2. Si ya existen presets en memoria o sesión, mostrarlos al instante y revalidar en segundo plano
  if (allPresets.length > 0) {
    renderPresets();
    loadLibraryPresets({ silent: true });
  } else {
    // Si es la primera carga absoluta, mostrar skeletons mientras viaja la petición
    renderSkeletons();
    await loadLibraryPresets();
  }
}

/**
 * Abre el modal para guardar o publicar el código actual del editor.
 */
export async function openCreatePresetModal(options?: {
  defaultTitle?: string;
  defaultDescription?: string;
  openedFromLibrary?: boolean;
}): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    showToast("You must sign in with Google to save presets.", "warning");
    return;
  }

  const code = getEditorCodeCallback ? getEditorCodeCallback() : "";
  if (!code || !code.trim()) {
    showToast("The code editor is empty.", "warning");
    return;
  }

  const presetEditorModal = document.getElementById("preset-editor-modal") as HTMLDialogElement | null;
  const presetEditorTitleHeading = document.getElementById("preset-editor-title-heading");
  const btnSubmitPresetEditor = document.getElementById("btn-submit-preset-editor");
  const presetTitleInput = document.getElementById("preset-title-input") as HTMLInputElement | null;
  const presetDescInput = document.getElementById("preset-desc-input") as HTMLTextAreaElement | null;
  const presetCodePreview = document.getElementById("preset-code-preview");

  editingPresetId = null;
  openedFromLibraryModal = Boolean(options?.openedFromLibrary);
  currentThumbnailData = null;
  updateThumbnailPreview(null);

  if (presetEditorTitleHeading) presetEditorTitleHeading.textContent = "Save as New Preset";
  if (btnSubmitPresetEditor) {
    const span = btnSubmitPresetEditor.querySelector("span");
    if (span) span.textContent = "Save Preset";
  }
  if (presetTitleInput) presetTitleInput.value = options?.defaultTitle || "";
  if (presetDescInput) presetDescInput.value = options?.defaultDescription || "";
  if (presetCodePreview) presetCodePreview.textContent = code;

  // Generar automáticamente el snapshot del canvas en vivo
  if (getCanvasThumbnailCallback) {
    try {
      currentThumbnailData = await getCanvasThumbnailCallback();
      updateThumbnailPreview(currentThumbnailData);
    } catch (err) {
      console.warn("Could not capture thumbnail snapshot:", err);
    }
  }

  if (presetEditorModal) {
    presetEditorModal.showModal();
    if (presetTitleInput) {
      setTimeout(() => presetTitleInput.focus(), 60);
    }
  }
}

/**
 * Abre el modal para editar un preset existente.
 */
async function openEditPresetModal(preset: Preset): Promise<void> {
  const presetEditorModal = document.getElementById("preset-editor-modal") as HTMLDialogElement | null;
  const presetEditorTitleHeading = document.getElementById("preset-editor-title-heading");
  const btnSubmitPresetEditor = document.getElementById("btn-submit-preset-editor");
  const presetTitleInput = document.getElementById("preset-title-input") as HTMLInputElement | null;
  const presetDescInput = document.getElementById("preset-desc-input") as HTMLTextAreaElement | null;
  const presetCodePreview = document.getElementById("preset-code-preview");

  editingPresetId = preset.id;
  openedFromLibraryModal = true;
  currentThumbnailData = preset.thumbnailUrl || null;
  updateThumbnailPreview(currentThumbnailData);

  if (presetEditorTitleHeading) presetEditorTitleHeading.textContent = `Edit Preset: ${preset.title}`;
  if (btnSubmitPresetEditor) {
    const span = btnSubmitPresetEditor.querySelector("span");
    if (span) span.textContent = "Save Changes";
  }
  if (presetTitleInput) presetTitleInput.value = preset.title;
  if (presetDescInput) presetDescInput.value = preset.description || "";
  if (presetCodePreview) presetCodePreview.textContent = preset.code;

  // Capturar frame actual si está activo en el canvas
  if (getCanvasThumbnailCallback) {
    try {
      const liveThumb = await getCanvasThumbnailCallback();
      if (liveThumb) {
        currentThumbnailData = liveThumb;
        updateThumbnailPreview(currentThumbnailData);
      }
    } catch {}
  }

  if (presetEditorModal) {
    presetEditorModal.showModal();
  }
}

let libraryUIInitialized = false;
let isSubmittingPreset = false;

/**
 * Inicialización de eventos de la biblioteca y modal de presets.
 */
export function initLibraryUI({
  onSelectPreset,
  onSavePresetSuccess,
  getEditorCode,
  getCanvasThumbnail,
}: {
  onSelectPreset?: (preset: Preset) => void;
  onSavePresetSuccess?: (preset: { id: string; title: string; description?: string }) => void;
  getEditorCode?: () => string;
  getCanvasThumbnail?: () => Promise<string | null> | string | null;
}): void {
  onSelectPresetCallback = onSelectPreset || null;
  onSavePresetSuccessCallback = onSavePresetSuccess || null;
  getEditorCodeCallback = getEditorCode || null;
  getCanvasThumbnailCallback = getCanvasThumbnail || null;

  if (libraryUIInitialized) {
    loadLibraryPresets();
    return;
  }
  libraryUIInitialized = true;

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
  btnOpenSavePreset?.addEventListener("click", () => {
    openCreatePresetModal();
  });

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
      showToast("Sign in with Google to view your saved presets.", "warning");
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
    if (isSubmittingPreset) return;

    const title = presetTitleInput?.value.trim() || "";
    const description = presetDescInput?.value.trim() || "";
    const code = editingPresetId
      ? presetCodePreview?.textContent || ""
      : getEditorCodeCallback
      ? getEditorCodeCallback()
      : "";

    if (!title) {
      showToast("Please enter a title for the preset.", "warning");
      return;
    }

    isSubmittingPreset = true;

    try {
      if (btnSubmitPresetEditor) {
        btnSubmitPresetEditor.disabled = true;
        const span = btnSubmitPresetEditor.querySelector("span");
        if (span) span.textContent = "Saving...";
      }

      // Asegurar que capturamos el snapshot actual si no se generó previamente
      let thumbnail = currentThumbnailData;
      if (!thumbnail && getCanvasThumbnailCallback) {
        try {
          thumbnail = await getCanvasThumbnailCallback();
        } catch {}
      }

      let savedPresetId = editingPresetId;
      if (editingPresetId) {
        await updatePreset(editingPresetId, { title, description, code, thumbnail });
      } else {
        const res = await createPreset({ title, description, code, thumbnail });
        savedPresetId = res.presetId || null;
      }

      if (savedPresetId) {
        onSavePresetSuccessCallback?.({
          id: savedPresetId,
          title,
          description,
        });
      }

      presetEditorModal?.close();
      showToast(editingPresetId ? "Preset updated successfully!" : "Preset published to library!", "success");
      await loadLibraryPresets();
      if (openedFromLibraryModal) {
        libraryModal?.showModal();
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Error saving preset: ${err.message}`, "error");
    } finally {
      isSubmittingPreset = false;
      if (btnSubmitPresetEditor) {
        btnSubmitPresetEditor.disabled = false;
        const span = btnSubmitPresetEditor.querySelector("span");
        if (span) span.textContent = editingPresetId ? "Save Changes" : "Save Preset";
      }
    }
  });

  // Cargar presets de fondo al inicio
  loadLibraryPresets();
}
