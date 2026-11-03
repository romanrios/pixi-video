import * as PIXI from "pixi.js";
import { EXAMPLES } from "./examples.js";
import { exportDeterministicVideo, downloadBlob } from "./recorder.js";
import { initAuth } from "./auth-ui.js";
import { initLibraryUI } from "./library-ui.js";

// Exponer PIXI globalmente para que el código del editor pueda acceder sin imports
window.PIXI = PIXI;

let app = null;
let editor = null;
let currentWidth = 720;
let currentHeight = 720;
let abortController = null;

// Elementos de la interfaz principal
const canvasContainer = document.getElementById("canvas-container");
const examplesSelect = document.getElementById("examples-select");
const btnRun = document.getElementById("btn-run");
const btnReset = document.getElementById("btn-reset");
const btnOpenRecordModal = document.getElementById("btn-open-record-modal");
const consoleLogs = document.getElementById("console-logs");
const fpsCounter = document.getElementById("fps-counter");
const canvasDimBadge = document.getElementById("canvas-dim-badge");

// Elementos del Modal de Configuración
const recordModal = document.getElementById("record-modal");
const btnCloseRecordModal = document.getElementById("btn-close-record-modal");
const btnCancelRecord = document.getElementById("btn-cancel-record");
const recordForm = document.getElementById("record-form");
const modalExportRes = document.getElementById("modal-export-res");
const customResRow = document.getElementById("custom-res-row");
const customWidthInput = document.getElementById("custom-width");
const customHeightInput = document.getElementById("custom-height");
const modalExportDuration = document.getElementById("modal-export-duration");
const durationPills = document.getElementById("duration-pills");
const modalExportFps = document.getElementById("modal-export-fps");
const modalExportQuality = document.getElementById("modal-export-quality");
const modalExportFilename = document.getElementById("modal-export-filename");
const summaryFrames = document.getElementById("summary-frames");
const summaryRes = document.getElementById("summary-res");

// Elementos del Modal de Progreso
const progressModal = document.getElementById("progress-modal");
const exportProgressBar = document.getElementById("export-progress-bar");
const exportProgressText = document.getElementById("export-progress-text");
const exportProgressPercent = document.getElementById("export-progress-percent");
const btnAbortExport = document.getElementById("btn-abort-export");

// Logging en la consola interna
function logMessage(msg, type = "info") {
  const item = document.createElement("div");
  item.className = `log-item ${type}`;
  const time = new Date().toLocaleTimeString();
  item.textContent = `[${time}] ${msg}`;
  consoleLogs.appendChild(item);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function clearLogs() {
  consoleLogs.innerHTML = "";
}

/**
 * Obtiene la resolución seleccionada en el modal (preset o custom).
 */
function getSelectedResolution() {
  if (modalExportRes.value === "custom") {
    let w = parseInt(customWidthInput.value, 10) || 1080;
    let h = parseInt(customHeightInput.value, 10) || 1080;
    // Asegurar números pares para compatibilidad H.264
    if (w % 2 !== 0) w += 1;
    if (h % 2 !== 0) h += 1;
    return { width: w, height: h };
  }

  const [w, h] = modalExportRes.value.split("x").map(Number);
  return { width: w || 720, height: h || 720 };
}

/**
 * Actualiza el resumen dinámico de exportación y el nombre de archivo sugerido.
 */
function updateExportSummary() {
  const { width, height } = getSelectedResolution();
  const duration = parseFloat(modalExportDuration.value) || 5;
  const fps = parseInt(modalExportFps.value, 10) || 60;
  const totalFrames = Math.max(1, Math.round(duration * fps));

  summaryFrames.textContent = `${totalFrames} frames`;
  summaryRes.textContent = `${width} x ${height}`;

  const presetName = examplesSelect.value || "animacion";
  const suggestedName = `pixi-${presetName}-${width}x${height}.mp4`;
  modalExportFilename.placeholder = suggestedName;
}

/**
 * Inicializar la aplicación PixiJS v8 con dimensiones dadas.
 */
async function initPixiApp(width = currentWidth, height = currentHeight) {
  if (app) {
    try {
      app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    } catch (e) {
      console.warn("Destrucción de instancia previa:", e);
    }
  }

  currentWidth = width;
  currentHeight = height;
  canvasDimBadge.textContent = `${width}x${height}`;

  app = new PIXI.Application();

  // PixiJS v8: inicialización asíncrona
  await app.init({
    width,
    height,
    background: "#080c14",
    antialias: true,
    autoDensity: true,
    resolution: 1,
    preference: "webgl",
  });

  window.app = app;
  canvasContainer.innerHTML = "";
  canvasContainer.appendChild(app.canvas);

  // Monitor de FPS
  app.ticker.add(() => {
    if (app && app.ticker && app.ticker.started) {
      fpsCounter.textContent = `FPS: ${Math.round(app.ticker.FPS)}`;
    }
  });

  return app;
}

/**
 * Ejecutar el código del usuario en Pixi
 */
async function runUserCode(width = currentWidth, height = currentHeight) {
  clearLogs();
  logMessage(`Running PixiJS v8 code (${width}x${height})...`, "info");

  try {
    await initPixiApp(width, height);

    const userCode = editor.getValue();
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runFn = new AsyncFunction("app", "PIXI", "console", userCode);

    const customConsole = {
      log: (...args) => logMessage(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "), "info"),
      warn: (...args) => logMessage(args.join(" "), "warn"),
      error: (...args) => logMessage(args.join(" "), "error"),
    };

    await runFn(app, PIXI, customConsole);
    logMessage("Scene generated successfully.", "info");
  } catch (err) {
    console.error(err);
    logMessage(err.message || String(err), "error");
  }
}

/**
 * Iniciar la exportación de video con los parámetros confirmados en el modal.
 */
async function startVideoExport() {
  const { width, height } = getSelectedResolution();
  const durationSec = parseFloat(modalExportDuration.value) || 5;
  const fps = parseInt(modalExportFps.value, 10) || 60;
  const quality = modalExportQuality.value || "very-high";
  const customName = modalExportFilename.value.trim();
  const filename = customName || `pixi-${examplesSelect.value}-${width}x${height}.mp4`;

  // Cerrar modal de configuración y abrir modal de progreso
  recordModal.close();
  progressModal.showModal();

  exportProgressBar.style.width = "0%";
  exportProgressPercent.textContent = "0%";
  exportProgressText.textContent = "Initializing AVC / H.264 encoder...";

  abortController = new AbortController();

  try {
    // 1. Reiniciar la escena con las dimensiones de exportación
    await runUserCode(width, height);

    logMessage(`Starting recording: ${durationSec}s at ${fps} FPS (${width}x${height})...`, "info");

    const blob = await exportDeterministicVideo({
      app,
      durationSec,
      fps,
      quality,
      signal: abortController.signal,
      onProgress: (current, total, percent) => {
        exportProgressBar.style.width = `${percent}%`;
        exportProgressPercent.textContent = `${percent}%`;
        exportProgressText.textContent = `Frame ${current} / ${total} (${percent}%)`;
      },
    });

    logMessage(`Video generated successfully! Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`, "info");
    downloadBlob(blob, filename.endsWith(".mp4") ? filename : `${filename}.mp4`);

    exportProgressText.textContent = "Download started successfully!";
    setTimeout(() => {
      progressModal.close();
    }, 1200);
  } catch (err) {
    if (err.name === "AbortError") {
      logMessage("Recording cancelled by user.", "warn");
    } else {
      console.error(err);
      alert(`Export error: ${err.message}`);
      logMessage(`Export error: ${err.message}`, "error");
    }
    progressModal.close();
  } finally {
    abortController = null;
  }
}

/**
 * Inicializar el editor CodeMirror
 */
function initEditor() {
  const textarea = document.getElementById("code-editor");
  editor = CodeMirror.fromTextArea(textarea, {
    mode: "javascript",
    theme: "dracula",
    lineNumbers: true,
    tabSize: 2,
    autoCloseBrackets: true,
    matchBrackets: true,
  });

  editor.setValue(EXAMPLES["flow-field"]);

  editor.setOption("extraKeys", {
    "Ctrl-Enter": () => runUserCode(),
    "Cmd-Enter": () => runUserCode(),
  });
}

/**
 * Configurar eventos de la interfaz y del modal
 */
function setupEventListeners() {
  // Botones de ejecución y reset
  btnRun.addEventListener("click", () => runUserCode());

  btnReset.addEventListener("click", () => {
    const selected = examplesSelect.value;
    if (EXAMPLES[selected]) {
      editor.setValue(EXAMPLES[selected]);
      runUserCode();
    }
  });

  examplesSelect.addEventListener("change", (e) => {
    const selected = e.target.value;
    if (EXAMPLES[selected]) {
      editor.setValue(EXAMPLES[selected]);
      runUserCode();
      updateExportSummary();
    }
  });

  // Abrir modal de configuración de grabación
  btnOpenRecordModal.addEventListener("click", () => {
    updateExportSummary();
    recordModal.showModal();
  });

  // Cerrar modal de configuración
  btnCloseRecordModal.addEventListener("click", () => recordModal.close());
  btnCancelRecord.addEventListener("click", () => recordModal.close());

  // Cancel active export
  btnAbortExport.addEventListener("click", () => {
    if (abortController) {
      exportProgressText.textContent = "Cancelling recording...";
      abortController.abort();
    }
  });

  // Formulario del modal -> confirmar e iniciar grabación
  recordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    startVideoExport();
  });

  // Cambios en opciones de resolución
  modalExportRes.addEventListener("change", () => {
    if (modalExportRes.value === "custom") {
      customResRow.classList.remove("hidden");
    } else {
      customResRow.classList.add("hidden");
    }
    updateExportSummary();
  });

  customWidthInput.addEventListener("input", updateExportSummary);
  customHeightInput.addEventListener("input", updateExportSummary);
  modalExportDuration.addEventListener("input", () => {
    const val = parseFloat(modalExportDuration.value);
    // Sincronizar pills activas
    durationPills.querySelectorAll(".pill").forEach((pill) => {
      pill.classList.toggle("active", parseFloat(pill.dataset.val) === val);
    });
    updateExportSummary();
  });
  modalExportFps.addEventListener("change", updateExportSummary);

  // Botones rápidos (pills) de duración
  durationPills.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    durationPills.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    modalExportDuration.value = pill.dataset.val;
    updateExportSummary();
  });

  // Fallback de light-dismiss para navegadores sin closedby nativo
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener("pointerdown", (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener("pointerup", (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }
}

// Inicialización de la aplicación
async function main() {
  initEditor();
  setupEventListeners();
  updateExportSummary();
  initAuth();
  initLibraryUI({
    onSelectPreset: (preset) => {
      editor.setValue(preset.code);
      runUserCode();
      logMessage(`Preset "${preset.title}" loaded from library.`, "info");
    },
    getEditorCode: () => (editor ? editor.getValue() : ""),
  });
  await runUserCode();
}

window.addEventListener("DOMContentLoaded", main);
