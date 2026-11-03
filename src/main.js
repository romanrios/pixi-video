import * as PIXI from "pixi.js";
import { EXAMPLES } from "./examples.js";
import { exportDeterministicVideo, downloadBlob } from "./recorder.js";

// Exponer PIXI globalmente para que el código del usuario pueda acceder sin imports
window.PIXI = PIXI;

let app = null;
let editor = null;

// Referencias del DOM
const canvasContainer = document.getElementById("canvas-container");
const examplesSelect = document.getElementById("examples-select");
const exportDuration = document.getElementById("export-duration");
const exportFps = document.getElementById("export-fps");
const exportRes = document.getElementById("export-res");
const btnExportVideo = document.getElementById("btn-export-video");
const btnRun = document.getElementById("btn-run");
const btnReset = document.getElementById("btn-reset");
const consoleLogs = document.getElementById("console-logs");
const fpsCounter = document.getElementById("fps-counter");
const canvasDimBadge = document.getElementById("canvas-dim-badge");

// Referencias del Modal
const exportModal = document.getElementById("export-modal");
const exportProgressBar = document.getElementById("export-progress-bar");
const exportProgressText = document.getElementById("export-progress-text");
const exportProgressPercent = document.getElementById("export-progress-percent");

function parseResolution(resStr) {
  const [w, h] = resStr.split("x").map(Number);
  return { width: w || 720, height: h || 720 };
}

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

// Inicializar la aplicación PixiJS v8
async function initPixiApp() {
  if (app) {
    try {
      app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    } catch (e) {
      console.warn("Destrucción de instancia previa:", e);
    }
  }

  const { width, height } = parseResolution(exportRes.value);
  canvasDimBadge.textContent = `${width}x${height}`;

  app = new PIXI.Application();

  // PixiJS v8: inicialización asíncrona y configuración WebGL/WebGPU
  await app.init({
    width,
    height,
    background: "#080c14",
    antialias: true,
    autoDensity: true,
    resolution: 1, // 1 para resolución nativa y precisa en exportación
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

// Ejecutar el código del usuario en Pixi
async function runUserCode() {
  clearLogs();
  logMessage("Ejecutando código PixiJS v8...", "info");

  try {
    await initPixiApp();

    const userCode = editor.getValue();
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runFn = new AsyncFunction("app", "PIXI", "console", userCode);

    const customConsole = {
      log: (...args) => logMessage(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "), "info"),
      warn: (...args) => logMessage(args.join(" "), "warn"),
      error: (...args) => logMessage(args.join(" "), "error"),
    };

    await runFn(app, PIXI, customConsole);
    logMessage("Escena generada correctamente.", "info");
  } catch (err) {
    console.error(err);
    logMessage(err.message || String(err), "error");
  }
}

// Exportación de video determinista
async function handleExportVideo() {
  btnExportVideo.disabled = true;
  exportModal.classList.remove("hidden");
  exportProgressBar.style.width = "0%";
  exportProgressPercent.textContent = "0%";
  exportProgressText.textContent = "Preparando codificador MP4 / H.264...";

  try {
    // 1. Reinicializar escena desde el inicio
    await runUserCode();

    const durationSec = parseFloat(exportDuration.value) || 5;
    const fps = parseInt(exportFps.value, 10) || 60;

    logMessage(`Iniciando grabación: ${durationSec}s a ${fps} FPS (${app.canvas.width}x${app.canvas.height})...`, "info");

    const blob = await exportDeterministicVideo({
      app,
      durationSec,
      fps,
      onProgress: (current, total, percent) => {
        exportProgressBar.style.width = `${percent}%`;
        exportProgressPercent.textContent = `${percent}%`;
        exportProgressText.textContent = `Cuadro ${current} / ${total} (${percent}%)`;
      },
    });

    logMessage(`¡Video generado con éxito! Tamaño: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`, "info");
    const filename = `pixi-${examplesSelect.value}-${app.canvas.width}x${app.canvas.height}.mp4`;
    downloadBlob(blob, filename);

    exportProgressText.textContent = "¡Descarga iniciada!";
    setTimeout(() => {
      exportModal.classList.add("hidden");
    }, 1200);
  } catch (err) {
    console.error(err);
    alert(`Error exportando video: ${err.message}`);
    logMessage(`Error en exportación: ${err.message}`, "error");
    exportModal.classList.add("hidden");
  } finally {
    btnExportVideo.disabled = false;
  }
}

// Inicializar Editor CodeMirror
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

// Event Listeners
function setupEventListeners() {
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
    }
  });

  exportRes.addEventListener("change", () => {
    runUserCode();
  });

  btnExportVideo.addEventListener("click", () => {
    handleExportVideo();
  });
}

// Inicio
async function main() {
  initEditor();
  setupEventListeners();
  await runUserCode();
}

window.addEventListener("DOMContentLoaded", main);
