"use client";

import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { EXAMPLES } from "../src/examples.js";
import { exportDeterministicVideo, downloadBlob } from "../src/recorder.js";
import { initAuth } from "../src/auth-ui.js";
import { initLibraryUI, openLibraryModal, openCreatePresetModal } from "../src/library-ui.js";

export default function Studio() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Exponer PIXI globalmente para que el código del editor pueda acceder sin imports
    window.PIXI = PIXI;

    let app = null;
    let editor = null;
    let currentWidth = 720;
    let currentHeight = 720;
    let abortController = null;

    // Referencias del DOM
    const canvasContainer = document.getElementById("canvas-container");
    const examplesSelect = document.getElementById("examples-select");
    const btnRun = document.getElementById("btn-run");
    const btnReset = document.getElementById("btn-reset");
    const btnOpenRecordModal = document.getElementById("btn-open-record-modal");
    const consoleLogs = document.getElementById("console-logs");
    const fpsCounter = document.getElementById("fps-counter");
    const canvasDimBadge = document.getElementById("canvas-dim-badge");

    // Modal de Grabación
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

    // Modal de Progreso
    const progressModal = document.getElementById("progress-modal");
    const exportProgressBar = document.getElementById("export-progress-bar");
    const exportProgressText = document.getElementById("export-progress-text");
    const exportProgressPercent = document.getElementById("export-progress-percent");
    const btnAbortExport = document.getElementById("btn-abort-export");

    function logMessage(msg, type = "info") {
      if (!consoleLogs) return;
      const item = document.createElement("div");
      item.className = `log-item ${type}`;
      const time = new Date().toLocaleTimeString();
      item.textContent = `[${time}] ${msg}`;
      consoleLogs.appendChild(item);
      consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    function clearLogs() {
      if (consoleLogs) consoleLogs.innerHTML = "";
    }

    function getSelectedResolution() {
      if (modalExportRes && modalExportRes.value === "custom") {
        let w = parseInt(customWidthInput?.value || "1080", 10) || 1080;
        let h = parseInt(customHeightInput?.value || "1080", 10) || 1080;
        if (w % 2 !== 0) w += 1;
        if (h % 2 !== 0) h += 1;
        return { width: w, height: h };
      }

      const [w, h] = (modalExportRes?.value || "1080x1080").split("x").map(Number);
      return { width: w || 720, height: h || 720 };
    }

    function updateExportSummary() {
      if (!summaryFrames || !summaryRes) return;
      const { width, height } = getSelectedResolution();
      const duration = parseFloat(modalExportDuration?.value || "5") || 5;
      const fps = parseInt(modalExportFps?.value || "60", 10) || 60;
      const totalFrames = Math.max(1, Math.round(duration * fps));

      summaryFrames.textContent = `${totalFrames} frames`;
      summaryRes.textContent = `${width} x ${height}`;

      const presetName = examplesSelect?.value || "animacion";
      const suggestedName = `pixi-${presetName}-${width}x${height}.mp4`;
      if (modalExportFilename) {
        modalExportFilename.placeholder = suggestedName;
      }
    }

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
      if (canvasDimBadge) canvasDimBadge.textContent = `${width}x${height}`;

      app = new PIXI.Application();

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
      if (canvasContainer) {
        canvasContainer.innerHTML = "";
        canvasContainer.appendChild(app.canvas);
      }

      app.ticker.add(() => {
        if (app && app.ticker && app.ticker.started && fpsCounter) {
          fpsCounter.textContent = `FPS: ${Math.round(app.ticker.FPS)}`;
        }
      });

      return app;
    }

    async function runUserCode(width = currentWidth, height = currentHeight) {
      clearLogs();
      logMessage(`Ejecutando código PixiJS v8 (${width}x${height})...`, "info");

      try {
        await initPixiApp(width, height);

        const userCode = editor ? editor.getValue() : "";
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const runFn = new AsyncFunction("app", "PIXI", "console", userCode);

        const customConsole = {
          log: (...args) =>
            logMessage(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "), "info"),
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

    async function startVideoExport() {
      const { width, height } = getSelectedResolution();
      const durationSec = parseFloat(modalExportDuration?.value || "5") || 5;
      const fps = parseInt(modalExportFps?.value || "60", 10) || 60;
      const quality = modalExportQuality?.value || "very-high";
      const customName = modalExportFilename?.value.trim() || "";
      const filename = customName || `pixi-${examplesSelect?.value || "animacion"}-${width}x${height}.mp4`;

      if (recordModal) recordModal.close();
      if (progressModal) progressModal.showModal();

      if (exportProgressBar) exportProgressBar.style.width = "0%";
      if (exportProgressPercent) exportProgressPercent.textContent = "0%";
      if (exportProgressText) exportProgressText.textContent = "Preparando codificador AVC / H.264...";

      abortController = new AbortController();

      try {
        await runUserCode(width, height);

        logMessage(`Iniciando grabación: ${durationSec}s a ${fps} FPS (${width}x${height})...`, "info");

        const blob = await exportDeterministicVideo({
          app,
          durationSec,
          fps,
          quality,
          signal: abortController.signal,
          onProgress: (current, total, percent) => {
            if (exportProgressBar) exportProgressBar.style.width = `${percent}%`;
            if (exportProgressPercent) exportProgressPercent.textContent = `${percent}%`;
            if (exportProgressText) exportProgressText.textContent = `Cuadro ${current} / ${total} (${percent}%)`;
          },
        });

        logMessage(`¡Video generado con éxito! Tamaño: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`, "info");
        downloadBlob(blob, filename.endsWith(".mp4") ? filename : `${filename}.mp4`);

        if (exportProgressText) exportProgressText.textContent = "¡Descarga iniciada con éxito!";
        setTimeout(() => {
          if (progressModal) progressModal.close();
        }, 1200);
      } catch (err) {
        if (err.name === "AbortError") {
          logMessage("Grabación cancelada por el usuario.", "warn");
        } else {
          console.error(err);
          alert(`Error exportando video: ${err.message}`);
          logMessage(`Error en exportación: ${err.message}`, "error");
        }
        if (progressModal) progressModal.close();
      } finally {
        abortController = null;
      }
    }

    function initEditor() {
      const textarea = document.getElementById("code-editor");
      if (!textarea || !window.CodeMirror) return;

      editor = window.CodeMirror.fromTextArea(textarea, {
        mode: "javascript",
        theme: "dracula",
        lineNumbers: true,
        tabSize: 2,
        autoCloseBrackets: true,
        matchBrackets: true,
      });

      editor.setValue(EXAMPLES["flow-field"] || "");

      editor.setOption("extraKeys", {
        "Ctrl-Enter": () => runUserCode(),
        "Cmd-Enter": () => runUserCode(),
      });
    }

    function setupEventListeners() {
      btnRun?.addEventListener("click", () => runUserCode());

      btnReset?.addEventListener("click", () => {
        const selected = examplesSelect?.value;
        if (selected && EXAMPLES[selected] && editor) {
          editor.setValue(EXAMPLES[selected]);
          runUserCode();
        }
      });

      examplesSelect?.addEventListener("change", (e) => {
        const selected = e.target.value;
        if (selected && EXAMPLES[selected] && editor) {
          editor.setValue(EXAMPLES[selected]);
          runUserCode();
          updateExportSummary();
        }
      });

      btnOpenRecordModal?.addEventListener("click", () => {
        updateExportSummary();
        recordModal?.showModal();
      });

      btnCloseRecordModal?.addEventListener("click", () => recordModal?.close());
      btnCancelRecord?.addEventListener("click", () => recordModal?.close());

      btnAbortExport?.addEventListener("click", () => {
        if (abortController) {
          if (exportProgressText) exportProgressText.textContent = "Cancelando grabación...";
          abortController.abort();
        }
      });

      recordForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        startVideoExport();
      });

      modalExportRes?.addEventListener("change", () => {
        if (modalExportRes.value === "custom") {
          customResRow?.classList.remove("hidden");
        } else {
          customResRow?.classList.add("hidden");
        }
        updateExportSummary();
      });

      customWidthInput?.addEventListener("input", updateExportSummary);
      customHeightInput?.addEventListener("input", updateExportSummary);

      modalExportDuration?.addEventListener("input", () => {
        const val = parseFloat(modalExportDuration.value);
        durationPills?.querySelectorAll(".pill").forEach((pill) => {
          pill.classList.toggle("active", parseFloat(pill.dataset.val || "0") === val);
        });
        updateExportSummary();
      });

      modalExportFps?.addEventListener("change", updateExportSummary);

      durationPills?.addEventListener("click", (e) => {
        const pill = e.target.closest(".pill");
        if (!pill) return;
        durationPills.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        if (modalExportDuration) modalExportDuration.value = pill.dataset.val;
        updateExportSummary();
      });

      // Light-dismiss fallback
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

    setupEventListeners();
    updateExportSummary();
    initAuth();
    initLibraryUI({
      onSelectPreset: (preset) => {
        if (editor) {
          editor.setValue(preset.code);
          runUserCode();
          logMessage(`Preset "${preset.title}" cargado desde la biblioteca.`, "info");
        }
      },
      getEditorCode: () => (editor ? editor.getValue() : ""),
    });

    const checkCodeMirror = () => {
      if (window.CodeMirror) {
        initEditor();
        runUserCode();
      } else {
        setTimeout(checkCodeMirror, 50);
      }
    };

    checkCodeMirror();

    return () => {
      if (app) {
        try {
          app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  return (
    <div id="app" ref={containerRef}>
      {/* Barra superior limpia */}
      <header className="navbar">
        <div className="brand">
          <img src="/pixijs-logo.svg" alt="PixiJS Logo" className="brand-logo" />
          <div className="brand-text">
            <h1>Pixi Video</h1>
          </div>
          <span className="brand-subtitle">Pixi.js playground + mp4 recorder</span>
        </div>

        <div className="controls">
          <div className="control-group">
            <label htmlFor="examples-select">Preset:</label>
            <select id="examples-select" defaultValue="flow-field">
              <option value="flow-field">Campo de Flujo (Generativo)</option>
              <option value="sacred-geometry">Geometría Sagrada & Mandalas</option>
              <option value="cyber-grid">Túnel Synthwave 3D</option>
              <option value="audio-waves">Ondas Armónicas</option>
            </select>
          </div>

          <button
            id="btn-open-library"
            className="btn btn-secondary"
            title="Explorar biblioteca comunitaria de presets"
            onClick={openLibraryModal}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span>Biblioteca</span>
          </button>

          <button
            id="btn-open-save-preset"
            className="btn btn-secondary"
            title="Publicar el código actual en la biblioteca"
            onClick={openCreatePresetModal}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Publicar</span>
          </button>

          <button id="btn-run" className="btn btn-primary" title="Ctrl + Enter para ejecutar código">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Ejecutar</span>
          </button>

          <button id="btn-reset" className="btn btn-secondary" title="Restablecer código del preset actual">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Reset</span>
          </button>

          <div className="control-divider"></div>

          <button id="btn-open-record-modal" className="btn btn-record" title="Configurar y exportar animación a MP4">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Grabar MP4</span>
          </button>

          <div className="control-divider"></div>

          <div id="user-profile-area" className="user-profile-area">
            <div id="google-btn-wrapper" className="google-btn-wrapper">
              <div id="google-btn-slot"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="playground-body">
        <section className="editor-pane">
          <div className="pane-header">
            <span>Editor de Código JS (PixiJS v8)</span>
            <span className="hint"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> para ejecutar</span>
          </div>
          <div className="editor-wrapper">
            <textarea id="code-editor"></textarea>
          </div>
          <div id="console-output" className="console-box">
            <div className="console-header">Salida / Consola:</div>
            <div id="console-logs" className="console-logs"></div>
          </div>
        </section>

        <section className="preview-pane">
          <div className="pane-header">
            <span>Vista Previa & Canvas</span>
            <div className="status-tags">
              <span id="canvas-dim-badge" className="dim-badge" title="Resolución activa de la escena">720x720</span>
              <span id="fps-counter" className="fps-badge" title="Tasa de refresco en vivo">FPS: --</span>
            </div>
          </div>
          <div id="canvas-container" className="canvas-container"></div>
        </section>
      </main>

      {/* Modal Intermedio de Configuración de Grabación MP4 */}
      <dialog id="record-modal" className="modal-dialog" closedby="any" aria-labelledby="record-modal-title">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </div>
            <div>
              <h2 id="record-modal-title">Configuración de Grabación MP4</h2>
              <p className="modal-subtitle">Render determinista cuadro a cuadro sin pérdida de frames</p>
            </div>
          </div>
          <button type="button" id="btn-close-record-modal" className="modal-close-btn" aria-label="Cerrar modal">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="record-form" className="modal-form" method="dialog">
          <div className="form-field">
            <div className="field-header">
              <label htmlFor="modal-export-res">Resolución & Relación de Aspecto</label>
              <span className="field-hint">Preset optimizado</span>
            </div>
            <select id="modal-export-res" className="form-select" defaultValue="1080x1080">
              <option value="1080x1080">1080 x 1080 — 1:1 Cuadrado (Instagram Post / Feed HD)</option>
              <option value="1080x1920">1080 x 1920 — 9:16 Vertical (Reels / TikTok / Shorts)</option>
              <option value="1920x1080">1920 x 1080 — 16:9 Horizontal (YouTube Full HD)</option>
              <option value="1280x720">1280 x 720 — 16:9 Horizontal (HD estándar)</option>
              <option value="720x720">720 x 720 — 1:1 Cuadrado (Preview rápido)</option>
              <option value="custom">Personalizado (Ingresar dimensiones manuales)...</option>
            </select>
          </div>

          <div id="custom-res-row" className="form-row hidden">
            <div className="form-field">
              <label htmlFor="custom-width">Ancho (px)</label>
              <input type="number" id="custom-width" className="form-input" defaultValue="1080" min="128" max="3840" step="2" />
            </div>
            <div className="form-field">
              <label htmlFor="custom-height">Alto (px)</label>
              <input type="number" id="custom-height" className="form-input" defaultValue="1080" min="128" max="3840" step="2" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <div className="field-header">
                <label htmlFor="modal-export-duration">Duración</label>
              </div>
              <div className="input-with-unit">
                <input type="number" id="modal-export-duration" className="form-input" defaultValue="5" min="1" max="60" step="0.5" />
                <span className="unit-suffix">seg</span>
              </div>
              <div className="quick-pills" id="duration-pills">
                <button type="button" className="pill" data-val="3">3s</button>
                <button type="button" className="pill active" data-val="5">5s</button>
                <button type="button" className="pill" data-val="10">10s</button>
                <button type="button" className="pill" data-val="15">15s</button>
              </div>
            </div>

            <div className="form-field">
              <div className="field-header">
                <label htmlFor="modal-export-fps">Tasa de Cuadros (FPS)</label>
              </div>
              <select id="modal-export-fps" className="form-select" defaultValue="60">
                <option value="60">60 FPS (Ultra Fluido / Recomendado)</option>
                <option value="30">30 FPS (Estándar / Rápido)</option>
                <option value="24">24 FPS (Cinematográfico)</option>
              </select>
              <span className="field-help">60 FPS asegura animaciones suaves y continuas.</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="modal-export-quality">Calidad del Encoder</label>
              <select id="modal-export-quality" className="form-select" defaultValue="very-high">
                <option value="very-high">Máxima Calidad (Sin compresión visible)</option>
                <option value="high">Alta (Equilibrada)</option>
                <option value="medium">Media (Archivo más liviano)</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="modal-export-filename">Nombre de Archivo</label>
              <input type="text" id="modal-export-filename" className="form-input" placeholder="animacion.mp4" spellCheck="false" />
            </div>
          </div>

          <div className="export-summary-card">
            <div className="summary-item">
              <span className="summary-label">Fotogramas</span>
              <strong id="summary-frames" className="summary-value">300 frames</strong>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">Resolución</span>
              <strong id="summary-res" className="summary-value">1080 x 1080</strong>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">Formato & Códec</span>
              <strong className="summary-value">MP4 (H.264 / AVC)</strong>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" id="btn-cancel-record" className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" id="btn-confirm-record" className="btn btn-record">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              <span>Iniciar Grabación</span>
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal de Progreso de Renderizado Determinista */}
      <dialog id="progress-modal" className="modal-dialog progress-dialog" aria-labelledby="progress-modal-title">
        <div className="progress-card">
          <div className="recording-badge-row">
            <span className="recording-dot"></span>
            <span className="recording-label">RENDERIZANDO VIDEO MP4</span>
          </div>
          <h3 id="progress-modal-title">Exportación en Proceso</h3>
          <p className="modal-desc">
            Renderizando cuadro a cuadro de forma determinista para garantizar 0% pérdida de frames y máxima fluidez.
          </p>

          <div className="progress-container">
            <div id="export-progress-bar" className="progress-bar" style={{ width: "0%" }}></div>
          </div>

          <div className="progress-details">
            <span id="export-progress-text">Inicializando codificador AVC/H.264...</span>
            <span id="export-progress-percent">0%</span>
          </div>

          <div className="progress-actions">
            <button type="button" id="btn-abort-export" className="btn btn-secondary btn-sm">
              Cancelar Grabación
            </button>
          </div>
        </div>
      </dialog>

      {/* Modal de la Biblioteca Comunitaria de Presets */}
      <dialog id="library-modal" className="modal-dialog library-dialog" closedby="any" aria-labelledby="library-modal-title">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge library-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div>
              <h2 id="library-modal-title">Biblioteca Comunitaria</h2>
              <p className="modal-subtitle">Explora presets compartidos por la comunidad o carga tus creaciones</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-library"
            className="modal-close-btn"
            aria-label="Cerrar modal"
            onClick={() => document.getElementById("library-modal")?.close()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="library-toolbar">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="library-search-input" className="search-input" placeholder="Buscar preset por título, autor o descripción..." />
          </div>

          <div className="library-filters">
            <div className="filter-pills">
              <button type="button" id="filter-all-btn" className="pill active">Todos</button>
              <button type="button" id="filter-mine-btn" className="pill">Mis Presets</button>
            </div>
            <span id="library-count-badge" className="library-counter">Cargando...</span>
          </div>
        </div>

        <div className="library-content-scroll">
          <div id="presets-grid" className="presets-grid">
            {/* Tarjetas de presets inyectadas dinámicamente */}
          </div>
        </div>
      </dialog>

      {/* Modal para Publicar / Editar Preset */}
      <dialog id="preset-editor-modal" className="modal-dialog preset-editor-dialog" closedby="any" aria-labelledby="preset-editor-title-heading">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge save-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            </div>
            <div>
              <h2 id="preset-editor-title-heading">Publicar Preset en la Biblioteca</h2>
              <p className="modal-subtitle">Comparte tu código Pixi.js v8 con la comunidad</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-preset-editor"
            className="modal-close-btn"
            aria-label="Cerrar modal"
            onClick={() => document.getElementById("preset-editor-modal")?.close()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="preset-editor-form" className="modal-form" method="dialog">
          <div className="form-field">
            <label htmlFor="preset-title-input">Título del Preset *</label>
            <input type="text" id="preset-title-input" className="form-input" placeholder="Ej. Galaxia Espiral con Partículas" required maxLength={80} />
          </div>

          <div className="form-field">
            <label htmlFor="preset-desc-input">Descripción (Opcional)</label>
            <textarea id="preset-desc-input" className="form-textarea" rows={2} placeholder="Describe brevemente el efecto visual, interacción o técnica usada..."></textarea>
          </div>

          <div className="form-field">
            <label>Código a guardar</label>
            <div className="code-preview-box">
              <pre><code id="preset-code-preview"></code></pre>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              id="btn-cancel-preset-editor"
              className="btn btn-secondary"
              onClick={() => document.getElementById("preset-editor-modal")?.close()}
            >
              Cancelar
            </button>
            <button type="submit" id="btn-submit-preset-editor" className="btn btn-primary">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Publicar en la Biblioteca</span>
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

