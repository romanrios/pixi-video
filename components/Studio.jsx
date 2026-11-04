"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import { EXAMPLES } from "../src/examples.js";
import { exportDeterministicVideo, downloadBlob } from "../src/recorder.js";
import { initAuth } from "../src/auth-ui.js";
import { initLibraryUI, openLibraryModal, openCreatePresetModal } from "../src/library-ui.js";

export default function Studio() {
  const containerRef = useRef(null);
  const optionsRef = useRef(null);
  const viewDropdownRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewSubmenuOpen, setViewSubmenuOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState("split");

  const changeViewMode = useCallback((mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("pixi_studio_view_mode", mode);
    } catch {}
    setTimeout(() => {
      editorInstanceRef.current?.refresh();
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }, []);

  const openAboutModal = () => {
    const modal = document.getElementById("about-modal");
    modal?.showModal();
  };

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("pixi_studio_view_mode");
      if (savedMode === "code" || savedMode === "preview" || savedMode === "split") {
        setViewMode(savedMode);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setOptionsOpen(false);
        setViewSubmenuOpen(false);
      }
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target)) {
        setViewDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOptionsOpen(false);
        setViewSubmenuOpen(false);
        setViewDropdownOpen(false);
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.key === "1") {
          e.preventDefault();
          changeViewMode("split");
          setOptionsOpen(false);
          setViewSubmenuOpen(false);
          setViewDropdownOpen(false);
        } else if (e.key === "2") {
          e.preventDefault();
          changeViewMode("code");
          setOptionsOpen(false);
          setViewSubmenuOpen(false);
          setViewDropdownOpen(false);
        } else if (e.key === "3") {
          e.preventDefault();
          changeViewMode("preview");
          setOptionsOpen(false);
          setViewSubmenuOpen(false);
          setViewDropdownOpen(false);
        }
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [changeViewMode]);

  useEffect(() => {
    // Exponer PIXI globalmente para que el código del editor pueda acceder sin imports
    window.PIXI = PIXI;

    let app = null;
    let editor = null;
    let currentWidth = 720;
    let currentHeight = 720;
    let previousResValue = "720x720";
    let currentPresetTitle = "Basic Shapes";
    let abortController = null;

    // Referencias del DOM
    const canvasContainer = document.getElementById("canvas-container");
    const resSelect = document.getElementById("preview-res-select");
    const btnRun = document.getElementById("btn-run");
    const btnOpenRecordModal = document.getElementById("btn-open-record-modal");
    const consoleLogs = document.getElementById("console-logs");
    const fpsCounter = document.getElementById("fps-counter");

    // Modal de Grabación
    const recordModal = document.getElementById("record-modal");
    const btnCloseRecordModal = document.getElementById("btn-close-record-modal");
    const btnCancelRecord = document.getElementById("btn-cancel-record");
    const recordForm = document.getElementById("record-form");
    const modalExportDuration = document.getElementById("modal-export-duration");
    const durationPills = document.getElementById("duration-pills");
    const modalExportFps = document.getElementById("modal-export-fps");
    const modalExportQuality = document.getElementById("modal-export-quality");
    const modalExportFilename = document.getElementById("modal-export-filename");
    const summaryFrames = document.getElementById("summary-frames");
    const summaryRes = document.getElementById("summary-res");

    // Modal de Resolución Personalizada
    const customResModal = document.getElementById("custom-res-modal");
    const customResForm = document.getElementById("custom-res-form");
    const customWidthInput = document.getElementById("custom-width-input");
    const customHeightInput = document.getElementById("custom-height-input");
    const btnCloseCustomRes = document.getElementById("btn-close-custom-res");
    const btnCancelCustomRes = document.getElementById("btn-cancel-custom-res");

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
      return { width: currentWidth, height: currentHeight };
    }

    function updateExportSummary() {
      if (!summaryFrames || !summaryRes) return;
      const { width, height } = getSelectedResolution();
      const duration = parseFloat(modalExportDuration?.value || "5") || 5;
      const fps = parseInt(modalExportFps?.value || "60", 10) || 60;
      const totalFrames = Math.max(1, Math.round(duration * fps));

      summaryFrames.textContent = `${totalFrames} frames`;
      summaryRes.textContent = `${width} x ${height}`;

      const presetSlug = (currentPresetTitle || "animation")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const suggestedName = `pixi-${presetSlug}-${width}x${height}.mp4`;
      if (modalExportFilename) {
        modalExportFilename.placeholder = suggestedName;
      }
    }

    async function initPixiApp(width = currentWidth, height = currentHeight) {
      if (app) {
        try {
          app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
        } catch (e) {
          console.warn("Instance cleanup error:", e);
        }
      }

      currentWidth = width;
      currentHeight = height;

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
      logMessage(`Running PixiJS v8 code (${width}x${height})...`, "info");

      try {
        await initPixiApp(width, height);

        const userCode = editor ? editor.getValue() : "";
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
        const runFn = new AsyncFunction("app", "PIXI", "console", userCode);

        const customConsole = {
          log: (...args) =>
            logMessage(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "), "info"),
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

    async function startVideoExport() {
      const { width, height } = getSelectedResolution();
      const durationSec = parseFloat(modalExportDuration?.value || "5") || 5;
      const fps = parseInt(modalExportFps?.value || "60", 10) || 60;
      const quality = modalExportQuality?.value || "very-high";
      const customName = modalExportFilename?.value.trim() || "";
      const presetSlug = (currentPresetTitle || "animation")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const filename = customName || `pixi-${presetSlug}-${width}x${height}.mp4`;

      if (recordModal) recordModal.close();
      if (progressModal) progressModal.showModal();

      if (exportProgressBar) exportProgressBar.style.width = "0%";
      if (exportProgressPercent) exportProgressPercent.textContent = "0%";
      if (exportProgressText) exportProgressText.textContent = "Preparing AVC / H.264 encoder...";

      abortController = new AbortController();

      try {
        await runUserCode(width, height);

        logMessage(`Starting recording: ${durationSec}s at ${fps} FPS (${width}x${height})...`, "info");

        const blob = await exportDeterministicVideo({
          app,
          durationSec,
          fps,
          quality,
          signal: abortController.signal,
          onProgress: (current, total, percent) => {
            if (exportProgressBar) exportProgressBar.style.width = `${percent}%`;
            if (exportProgressPercent) exportProgressPercent.textContent = `${percent}%`;
            if (exportProgressText) exportProgressText.textContent = `Frame ${current} / ${total} (${percent}%)`;
          },
        });

        logMessage(`Video generated successfully! Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`, "info");
        downloadBlob(blob, filename.endsWith(".mp4") ? filename : `${filename}.mp4`);

        if (exportProgressText) exportProgressText.textContent = "Download started successfully!";
        setTimeout(() => {
          if (progressModal) progressModal.close();
        }, 1200);
      } catch (err) {
        if (err.name === "AbortError") {
          logMessage("Recording cancelled by user.", "warn");
        } else {
          console.error(err);
          alert(`Error exporting video: ${err.message}`);
          logMessage(`Export error: ${err.message}`, "error");
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
      editorInstanceRef.current = editor;

      editor.setValue(EXAMPLES["basic-shapes"] || EXAMPLES["flow-field"] || "");

      editor.setOption("extraKeys", {
        "Ctrl-Enter": () => runUserCode(),
        "Cmd-Enter": () => runUserCode(),
        "Alt-1": () => changeViewMode("split"),
        "Alt-2": () => changeViewMode("code"),
        "Alt-3": () => changeViewMode("preview"),
      });
    }

    function setupEventListeners() {
      btnRun?.addEventListener("click", () => runUserCode());

      btnOpenRecordModal?.addEventListener("click", () => {
        updateExportSummary();
        recordModal?.showModal();
      });

      btnCloseRecordModal?.addEventListener("click", () => recordModal?.close());
      btnCancelRecord?.addEventListener("click", () => recordModal?.close());

      btnAbortExport?.addEventListener("click", () => {
        if (abortController) {
          if (exportProgressText) exportProgressText.textContent = "Cancelling recording...";
          abortController.abort();
        }
      });

      recordForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        startVideoExport();
      });

      // Selector de resolución en la barra del preview
      resSelect?.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "custom") {
          if (customWidthInput) customWidthInput.value = currentWidth;
          if (customHeightInput) customHeightInput.value = currentHeight;
          customResModal?.showModal();
        } else {
          previousResValue = val;
          const [w, h] = val.split("x").map(Number);
          if (w && h) {
            currentWidth = w;
            currentHeight = h;
            runUserCode(w, h);
            updateExportSummary();
          }
        }
      });

      // Modal de resolución personalizada
      customResForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        let w = parseInt(customWidthInput?.value || "720", 10) || 720;
        let h = parseInt(customHeightInput?.value || "720", 10) || 720;

        // Asegurar dimensiones pares para H.264
        if (w % 2 !== 0) w += 1;
        if (h % 2 !== 0) h += 1;

        currentWidth = w;
        currentHeight = h;
        previousResValue = "custom";

        const customOpt = resSelect?.querySelector('option[value="custom"]');
        if (customOpt) {
          customOpt.textContent = `Custom (${w}x${h})`;
        }
        if (resSelect) resSelect.value = "custom";

        customResModal?.close();
        runUserCode(w, h);
        updateExportSummary();
      });

      btnCloseCustomRes?.addEventListener("click", () => customResModal?.close());
      btnCancelCustomRes?.addEventListener("click", () => customResModal?.close());

      customResModal?.addEventListener("close", () => {
        if (resSelect && previousResValue !== "custom") {
          resSelect.value = previousResValue;
        }
      });

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

    function setupSplitters() {
      const playgroundBody = document.getElementById("playground-body");
      const editorPane = document.getElementById("editor-pane");
      const gutterCol = document.getElementById("gutter-horizontal");
      const gutterRow = document.getElementById("gutter-vertical");
      const consoleBox = document.getElementById("console-output");

      // 1. Horizontal Splitter (Code Editor vs. Preview Pane)
      if (gutterCol && playgroundBody && editorPane) {
        const savedWidth = localStorage.getItem("pixi_studio_editor_width");
        if (savedWidth) {
          const parsed = parseFloat(savedWidth);
          if (!isNaN(parsed) && parsed >= 260) {
            editorPane.style.width = `${parsed}px`;
          }
        }

        let isDraggingCol = false;

        gutterCol.addEventListener("pointerdown", (e) => {
          isDraggingCol = true;
          gutterCol.setPointerCapture(e.pointerId);
          gutterCol.classList.add("dragging");
          document.body.classList.add("is-resizing-col");
          e.preventDefault();
        });

        gutterCol.addEventListener("pointermove", (e) => {
          if (!isDraggingCol) return;
          const rect = playgroundBody.getBoundingClientRect();
          const minW = 260;
          const maxW = rect.width - 260;
          const newW = Math.max(minW, Math.min(maxW, e.clientX - rect.left));
          editorPane.style.width = `${newW}px`;
          if (editor) editor.refresh();
        });

        const stopDragCol = (e) => {
          if (!isDraggingCol) return;
          isDraggingCol = false;
          try {
            gutterCol.releasePointerCapture(e.pointerId);
          } catch {}
          gutterCol.classList.remove("dragging");
          document.body.classList.remove("is-resizing-col");
          if (editor) editor.refresh();
          if (editorPane.offsetWidth >= 260) {
            localStorage.setItem("pixi_studio_editor_width", String(editorPane.offsetWidth));
          }
        };

        gutterCol.addEventListener("pointerup", stopDragCol);
        gutterCol.addEventListener("pointercancel", stopDragCol);

        gutterCol.addEventListener("dblclick", () => {
          editorPane.style.width = "50%";
          localStorage.removeItem("pixi_studio_editor_width");
          if (editor) editor.refresh();
        });
      }

      // 2. Vertical Splitter (Code Editor vs. Console Output)
      if (gutterRow && editorPane && consoleBox) {
        const savedHeight = localStorage.getItem("pixi_studio_console_height");
        if (savedHeight) {
          const parsed = parseFloat(savedHeight);
          if (!isNaN(parsed) && parsed >= 32) {
            consoleBox.style.height = `${parsed}px`;
          }
        }

        let isDraggingRow = false;

        gutterRow.addEventListener("pointerdown", (e) => {
          isDraggingRow = true;
          gutterRow.setPointerCapture(e.pointerId);
          gutterRow.classList.add("dragging");
          document.body.classList.add("is-resizing-row");
          e.preventDefault();
        });

        gutterRow.addEventListener("pointermove", (e) => {
          if (!isDraggingRow) return;
          const rect = editorPane.getBoundingClientRect();
          const minH = 32;
          const maxH = rect.height - 100;
          const newH = Math.max(minH, Math.min(maxH, rect.bottom - e.clientY));
          consoleBox.style.height = `${newH}px`;
          if (editor) editor.refresh();
        });

        const stopDragRow = (e) => {
          if (!isDraggingRow) return;
          isDraggingRow = false;
          try {
            gutterRow.releasePointerCapture(e.pointerId);
          } catch {}
          gutterRow.classList.remove("dragging");
          document.body.classList.remove("is-resizing-row");
          if (editor) editor.refresh();
          if (consoleBox.offsetHeight >= 32) {
            localStorage.setItem("pixi_studio_console_height", String(consoleBox.offsetHeight));
          }
        };

        gutterRow.addEventListener("pointerup", stopDragRow);
        gutterRow.addEventListener("pointercancel", stopDragRow);

        gutterRow.addEventListener("dblclick", () => {
          consoleBox.style.height = "130px";
          localStorage.removeItem("pixi_studio_console_height");
          if (editor) editor.refresh();
        });
      }
    }

    setupEventListeners();
    setupSplitters();
    updateExportSummary();
    initAuth();
    initLibraryUI({
      onSelectPreset: (preset) => {
        if (editor) {
          currentPresetTitle = preset.title;
          editor.setValue(preset.code);
          runUserCode();
          updateExportSummary();
          const badge = document.getElementById("active-preset-badge");
          if (badge) {
            badge.textContent = preset.title;
          }
          logMessage(`Preset "${preset.title}" loaded from library.`, "info");
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

    const onWindowResize = () => {
      const playgroundBody = document.getElementById("playground-body");
      const editorPane = document.getElementById("editor-pane");
      if (
        playgroundBody &&
        editorPane &&
        !playgroundBody.classList.contains("view-code") &&
        !playgroundBody.classList.contains("view-preview")
      ) {
        const maxW = playgroundBody.offsetWidth - 260;
        if (editorPane.offsetWidth > maxW && maxW >= 260) {
          editorPane.style.width = `${maxW}px`;
        }
      }
      if (editor) editor.refresh();
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      document.body.classList.remove("is-resizing-col", "is-resizing-row");
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
          <button
            type="button"
            className="brand-button"
            onClick={openAboutModal}
            title="About Pixi Video"
            aria-label="About Pixi Video"
          >
            <img src="/favicon.svg" alt="Pixi Logo" className="brand-logo" />
            <div className="brand-text">
              <h1>Pixi Video</h1>
            </div>
          </button>

          <div className="options-dropdown-container" ref={optionsRef}>
            <button
              id="btn-options-dropdown"
              type="button"
              className={`btn btn-options ${optionsOpen ? "active" : ""}`}
              onClick={() => setOptionsOpen((prev) => !prev)}
              aria-expanded={optionsOpen}
              aria-haspopup="menu"
              title="Options Menu"
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Options</span>
              <svg className={`chevron-icon ${optionsOpen ? "rotated" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <div className={`options-menu ${optionsOpen ? "open" : ""}`} role="menu" aria-orientation="vertical">
              <button
                type="button"
                id="btn-open-library"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setOptionsOpen(false);
                  openLibraryModal();
                }}
              >
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span>Library</span>
              </button>

              <button
                type="button"
                id="btn-open-save-preset"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setOptionsOpen(false);
                  openCreatePresetModal();
                }}
              >
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Publish</span>
              </button>

              <div className="menu-divider" role="separator"></div>

              <div
                className="submenu-wrapper"
                onMouseEnter={() => setViewSubmenuOpen(true)}
                onMouseLeave={() => setViewSubmenuOpen(false)}
              >
                <button
                  type="button"
                  className={`menu-item menu-item-has-submenu ${viewSubmenuOpen ? "open" : ""}`}
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={viewSubmenuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewSubmenuOpen((prev) => !prev);
                  }}
                >
                  {viewMode === "code" && (
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                  )}
                  {viewMode === "split" && (
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="12" y1="3" x2="12" y2="21"></line>
                    </svg>
                  )}
                  {viewMode === "preview" && (
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                  <span>View</span>
                  <span className="submenu-tag">{viewMode === "code" ? "Code" : viewMode === "preview" ? "Preview" : "Split"}</span>
                  <svg className={`chevron-icon chevron-sub ${viewSubmenuOpen ? "rotated" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>

                <div className={`options-submenu ${viewSubmenuOpen ? "open" : ""}`} role="menu">
                  <button
                    type="button"
                    className={`menu-item ${viewMode === "split" ? "selected" : ""}`}
                    role="menuitem"
                    onClick={() => {
                      changeViewMode("split");
                      setOptionsOpen(false);
                      setViewSubmenuOpen(false);
                    }}
                  >
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="12" y1="3" x2="12" y2="21"></line>
                    </svg>
                    <span>Split View</span>
                    <span className="menu-shortcut">Alt+1</span>
                  </button>

                  <button
                    type="button"
                    className={`menu-item ${viewMode === "code" ? "selected" : ""}`}
                    role="menuitem"
                    onClick={() => {
                      changeViewMode("code");
                      setOptionsOpen(false);
                      setViewSubmenuOpen(false);
                    }}
                  >
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    <span>Code Only</span>
                    <span className="menu-shortcut">Alt+2</span>
                  </button>

                  <button
                    type="button"
                    className={`menu-item ${viewMode === "preview" ? "selected" : ""}`}
                    role="menuitem"
                    onClick={() => {
                      changeViewMode("preview");
                      setOptionsOpen(false);
                      setViewSubmenuOpen(false);
                    }}
                  >
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>Preview Only</span>
                    <span className="menu-shortcut">Alt+3</span>
                  </button>
                </div>
              </div>

              <div className="menu-divider" role="separator"></div>

              <button
                type="button"
                id="btn-open-about"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setOptionsOpen(false);
                  openAboutModal();
                }}
              >
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>About</span>
              </button>
            </div>
          </div>
        </div>

        <div className="controls">
          <div className="view-dropdown-container" ref={viewDropdownRef}>
            <button
              id="btn-view-dropdown"
              type="button"
              className={`btn btn-view ${viewDropdownOpen ? "active" : ""}`}
              onClick={() => setViewDropdownOpen((prev) => !prev)}
              aria-expanded={viewDropdownOpen}
              aria-haspopup="menu"
              title="Change view layout (Alt+1, Alt+2, Alt+3)"
            >
              {viewMode === "code" && (
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              )}
              {viewMode === "split" && (
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>
              )}
              {viewMode === "preview" && (
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
              <span>
                <span className="view-label-prefix">View: </span>
                {viewMode === "code" ? "Code" : viewMode === "preview" ? "Preview" : "Split"}
              </span>
              <svg className={`chevron-icon ${viewDropdownOpen ? "rotated" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <div className={`options-menu view-menu-right ${viewDropdownOpen ? "open" : ""}`} role="menu" aria-orientation="vertical">
              <button
                type="button"
                className={`menu-item ${viewMode === "split" ? "selected" : ""}`}
                role="menuitem"
                onClick={() => {
                  changeViewMode("split");
                  setViewDropdownOpen(false);
                }}
              >
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="12" y1="3" x2="12" y2="21"></line>
                </svg>
                <span>Split View</span>
                <span className="menu-shortcut">Alt+1</span>
              </button>

              <button
                type="button"
                className={`menu-item ${viewMode === "code" ? "selected" : ""}`}
                role="menuitem"
                onClick={() => {
                  changeViewMode("code");
                  setViewDropdownOpen(false);
                }}
              >
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Code Only</span>
                <span className="menu-shortcut">Alt+2</span>
              </button>

              <button
                type="button"
                className={`menu-item ${viewMode === "preview" ? "selected" : ""}`}
                role="menuitem"
                onClick={() => {
                  changeViewMode("preview");
                  setViewDropdownOpen(false);
                }}
              >
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Preview Only</span>
                <span className="menu-shortcut">Alt+3</span>
              </button>
            </div>
          </div>

          <div className="control-divider"></div>

          <button id="btn-open-record-modal" className="btn btn-record" title="Configure and export animation to MP4">
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Record MP4</span>
          </button>

          <div className="control-divider"></div>

          <div id="user-profile-area" className="user-profile-area">
            <div id="google-btn-wrapper" className="google-btn-wrapper">
              <div id="google-btn-slot"></div>
            </div>
          </div>
        </div>
      </header>

      <main className={`playground-body view-${viewMode}`} id="playground-body">
        <section className="editor-pane" id="editor-pane">
          <div className="pane-header">
            <div className="pane-header-title">
              <span>JS Code Editor (PixiJS v8)</span>
              <span id="active-preset-badge" className="active-preset-badge">
                Basic Shapes
              </span>
            </div>
            <button
              id="btn-run"
              className="btn btn-primary btn-sm"
              title="Run code on canvas (Ctrl + Enter)"
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Run (Ctrl+Enter)</span>
            </button>
          </div>
          <div className="editor-wrapper">
            <textarea id="code-editor"></textarea>
          </div>
          <div
            id="gutter-vertical"
            className="gutter-row"
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize console (Double-click to reset)"
          ></div>
          <div id="console-output" className="console-box">
            <div className="console-header">Console Output:</div>
            <div id="console-logs" className="console-logs"></div>
          </div>
        </section>

        <div
          id="gutter-horizontal"
          className="gutter-col"
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize panels (Double-click to reset)"
        ></div>

        <section className="preview-pane" id="preview-pane">
          <div className="pane-header">
            <span>Preview & Canvas</span>
            <div className="status-tags">
              <select
                id="preview-res-select"
                className="res-select-badge"
                defaultValue="720x720"
                title="Change scene resolution"
              >
                <option value="720x720">720x720 (1:1)</option>
                <option value="1080x1080">1080x1080 (1:1)</option>
                <option value="1920x1080">1920x1080 (16:9)</option>
                <option value="1080x1920">1080x1920 (9:16)</option>
                <option value="1280x720">1280x720 (16:9)</option>
                <option value="custom">Custom...</option>
              </select>
              <span id="fps-counter" className="fps-badge" title="Live refresh rate">FPS: --</span>
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
              <h2 id="record-modal-title">MP4 Recording Settings</h2>
              <p className="modal-subtitle">Frame-by-frame deterministic render with zero frame drops</p>
            </div>
          </div>
          <button type="button" id="btn-close-record-modal" className="modal-close-btn" aria-label="Close modal">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="record-form" className="modal-form" method="dialog">
          <div className="form-row">
            <div className="form-field">
              <div className="field-header">
                <label htmlFor="modal-export-duration">Duration</label>
              </div>
              <div className="input-with-unit">
                <input type="number" id="modal-export-duration" className="form-input" defaultValue="5" min="1" max="60" step="0.5" />
                <span className="unit-suffix">sec</span>
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
                <label htmlFor="modal-export-fps">Frame Rate (FPS)</label>
              </div>
              <select id="modal-export-fps" className="form-select" defaultValue="60">
                <option value="60">60 FPS (Ultra Smooth / Recommended)</option>
                <option value="30">30 FPS (Standard / Fast)</option>
                <option value="24">24 FPS (Cinematic)</option>
              </select>
              <span className="field-help">60 FPS ensures smooth, continuous animations.</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="modal-export-quality">Encoder Quality</label>
              <select id="modal-export-quality" className="form-select" defaultValue="very-high">
                <option value="very-high">Very High Quality (Visually lossless)</option>
                <option value="high">High (Balanced)</option>
                <option value="medium">Medium (Smaller file size)</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="modal-export-filename">File Name</label>
              <input type="text" id="modal-export-filename" className="form-input" placeholder="animation.mp4" spellCheck="false" />
            </div>
          </div>

          <div className="export-summary-card">
            <div className="summary-item">
              <span className="summary-label">Frames</span>
              <strong id="summary-frames" className="summary-value">300 frames</strong>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">Resolution</span>
              <strong id="summary-res" className="summary-value">720 x 720</strong>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">Format & Codec</span>
              <strong className="summary-value">MP4 (H.264 / AVC)</strong>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" id="btn-cancel-record" className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" id="btn-confirm-record" className="btn btn-record">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              <span>Start Recording</span>
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal de Resolución Personalizada */}
      <dialog id="custom-res-modal" className="modal-dialog" closedby="any" aria-labelledby="custom-res-title">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div>
              <h2 id="custom-res-title">Custom Resolution</h2>
              <p className="modal-subtitle">Enter dimensions in pixels (even numbers required for MP4)</p>
            </div>
          </div>
          <button type="button" id="btn-close-custom-res" className="modal-close-btn" aria-label="Close modal">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="custom-res-form" className="modal-form" method="dialog">
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="custom-width-input">Width (px)</label>
              <input
                type="number"
                id="custom-width-input"
                className="form-input"
                defaultValue="720"
                min="128"
                max="3840"
                step="2"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="custom-height-input">Height (px)</label>
              <input
                type="number"
                id="custom-height-input"
                className="form-input"
                defaultValue="720"
                min="128"
                max="3840"
                step="2"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" id="btn-cancel-custom-res" className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" id="btn-apply-custom-res" className="btn btn-primary">
              Apply Resolution
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal de Progreso de Renderizado Determinista */}
      <dialog id="progress-modal" className="modal-dialog progress-dialog" aria-labelledby="progress-modal-title">
        <div className="progress-card">
          <div className="recording-badge-row">
            <span className="recording-dot"></span>
            <span className="recording-label">RENDERING MP4 VIDEO</span>
          </div>
          <h3 id="progress-modal-title">Export in Progress</h3>
          <p className="modal-desc">
            Rendering frame by frame deterministically to ensure 0% frame drop and maximum smoothness.
          </p>

          <div className="progress-container">
            <div id="export-progress-bar" className="progress-bar" style={{ width: "0%" }}></div>
          </div>

          <div className="progress-details">
            <span id="export-progress-text">Initializing AVC/H.264 encoder...</span>
            <span id="export-progress-percent">0%</span>
          </div>

          <div className="progress-actions">
            <button type="button" id="btn-abort-export" className="btn btn-secondary btn-sm">
              Cancel Recording
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
              <h2 id="library-modal-title">Community Library</h2>
              <p className="modal-subtitle">Explore community presets or load your creations</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-library"
            className="modal-close-btn"
            aria-label="Close modal"
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
            <input type="text" id="library-search-input" className="search-input" placeholder="Search presets by title, author, or description..." />
          </div>

          <div className="library-filters">
            <div className="filter-pills">
              <button type="button" id="filter-all-btn" className="pill active">All</button>
              <button type="button" id="filter-mine-btn" className="pill">My Presets</button>
            </div>
            <span id="library-count-badge" className="library-counter">Loading...</span>
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
              <h2 id="preset-editor-title-heading">Publish Preset to Library</h2>
              <p className="modal-subtitle">Share your PixiJS v8 code with the community</p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-preset-editor"
            className="modal-close-btn"
            aria-label="Close modal"
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
            <label htmlFor="preset-title-input">Preset Title *</label>
            <input type="text" id="preset-title-input" className="form-input" placeholder="e.g. Spiral Galaxy with Particles" required maxLength={80} />
          </div>

          <div className="form-field">
            <label htmlFor="preset-desc-input">Description (Optional)</label>
            <textarea id="preset-desc-input" className="form-textarea" rows={2} placeholder="Briefly describe the visual effect, interaction, or technique used..."></textarea>
          </div>

          <div className="form-field">
            <label>Code to save</label>
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
              Cancel
            </button>
            <button type="submit" id="btn-submit-preset-editor" className="btn btn-primary">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Publish to Library</span>
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal About */}
      <dialog id="about-modal" className="modal-dialog about-dialog" closedby="any" aria-labelledby="about-modal-title">
        <div className="about-modal-body">
          <button
            type="button"
            id="btn-close-about-modal"
            className="modal-close-btn"
            aria-label="Close modal"
            onClick={() => document.getElementById("about-modal")?.close()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="about-hero">
            <div className="about-logo-wrapper">
              <img src="/pixijs-logo.svg" alt="PixiJS Logo" className="about-logo" />
            </div>
            <h2 id="about-modal-title" className="about-title">Pixi Video</h2>
            <p className="about-subtitle">PixiJS v8 creative coding playground and deterministic MP4 recorder</p>
          </div>

          <div className="about-divider"></div>

          <div className="about-details-table">
            <div className="about-row">
              <span className="about-label">Author</span>
              <span className="about-value author-name">Román Ríos</span>
            </div>
            <div className="about-row">
              <span className="about-label">Website</span>
              <a
                href="https://romanrios.com.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="about-value about-link"
              >
                romanrios.com.ar
                <svg className="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
            <div className="about-row">
              <span className="about-label">Source Code</span>
              <a
                href="https://github.com/romanrios/pixi-video"
                target="_blank"
                rel="noopener noreferrer"
                className="about-value about-link"
              >
                github.com/romanrios/pixi-video
                <svg className="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
            <div className="about-row">
              <span className="about-label">License</span>
              <span className="about-value">MIT</span>
            </div>
            <div className="about-row">
              <span className="about-label">Technologies</span>
              <span className="about-value about-techs">Pixi.js v8, Next.js, WebCodecs, Mediabunny, mp4-muxer, Turso</span>
            </div>
          </div>

          <div className="about-divider"></div>

          <div className="about-footer">
            <span>&copy; 2026 Román Ríos</span>
          </div>
        </div>
      </dialog>
    </div>
  );
}

