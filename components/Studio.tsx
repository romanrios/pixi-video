"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import Editor from "@monaco-editor/react";
import { EXAMPLES } from "../src/examples";
import { exportDeterministicVideo, downloadBlob } from "../src/recorder";
import type { VideoQuality } from "@/types/recorder";
import { initAuth } from "../src/auth-ui";
import { initLibraryUI, openLibraryModal, openCreatePresetModal } from "../src/library-ui";
import { configureMonaco, transpileTypeScript } from "../src/monaco-pixi";

export default function Studio() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const runUserCodeRef = useRef<(() => Promise<void>) | null>(null);

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewSubmenuOpen, setViewSubmenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState("split");

  const changeViewMode = useCallback((mode: string) => {
    let targetMode = mode;
    if (typeof window !== "undefined" && window.innerWidth < 768 && targetMode === "split") {
      targetMode = "preview";
    }
    setViewMode(targetMode);
    try {
      localStorage.setItem("pixi_studio_view_mode", targetMode);
    } catch { }
    setTimeout(() => {
      editorInstanceRef.current?.layout();
      window.dispatchEvent(new Event("resize"));
    }, 50);
  }, []);

  const handleEditorIconClick = useCallback(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (viewMode === "split") {
      changeViewMode("preview");
    } else if (!isMobile) {
      changeViewMode("split");
    } else {
      changeViewMode("preview");
    }
  }, [viewMode, changeViewMode]);

  const handlePreviewIconClick = useCallback(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (viewMode === "split") {
      changeViewMode("code");
    } else if (!isMobile) {
      changeViewMode("split");
    } else {
      changeViewMode("code");
    }
  }, [viewMode, changeViewMode]);

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      editorInstanceRef.current = editor;
      monacoRef.current = monaco;

      configureMonaco(monaco);

      // Atajo de ejecución: Ctrl/Cmd + Enter
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runUserCodeRef.current?.();
      });

      // Atajo de comentar / descomentar: Ctrl/Cmd + }
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight, () => {
        editor.trigger("keyboard", "editor.action.commentLine", {});
      });

      // Atajos de cambio de vista: Alt+1, Alt+2, Alt+3
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit1, () => changeViewMode("split"));
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit2, () => changeViewMode("code"));
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit3, () => changeViewMode("preview"));

      // Ejecutar la escena inicial cuando el editor esté listo
      setTimeout(() => {
        runUserCodeRef.current?.();
      }, 50);
    },
    [changeViewMode]
  );

  const openAboutModal = () => {
    const modal = document.getElementById("about-modal") as HTMLDialogElement | null;
    modal?.showModal();
  };

  useEffect(() => {
    try {
      const isMobile = window.innerWidth < 768;
      const savedMode = localStorage.getItem("pixi_studio_view_mode");
      if (isMobile) {
        if (savedMode === "code" || savedMode === "preview") {
          setViewMode(savedMode);
        } else {
          setViewMode("preview");
        }
      } else {
        if (savedMode === "code" || savedMode === "preview" || savedMode === "split") {
          setViewMode(savedMode);
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    const handleWindowResize = () => {
      if (window.innerWidth < 768 && viewMode === "split") {
        changeViewMode("preview");
      }
    };
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [viewMode, changeViewMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
        setViewSubmenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOptionsOpen(false);
        setViewSubmenuOpen(false);
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.key === "1") {
          e.preventDefault();
          changeViewMode("split");
          setOptionsOpen(false);
          setViewSubmenuOpen(false);
        } else if (e.key === "2") {
          e.preventDefault();
          changeViewMode("code");
          setOptionsOpen(false);
          setViewSubmenuOpen(false);
        } else if (e.key === "3") {
          e.preventDefault();
          changeViewMode("preview");
          setOptionsOpen(false);
          setViewSubmenuOpen(false);
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
    const recordModal = document.getElementById("record-modal") as HTMLDialogElement | null;
    const btnCloseRecordModal = document.getElementById("btn-close-record-modal");
    const btnCancelRecord = document.getElementById("btn-cancel-record");
    const recordForm = document.getElementById("record-form") as HTMLFormElement | null;
    const modalExportDuration = document.getElementById("modal-export-duration") as HTMLSelectElement | null;
    const durationPills = document.getElementById("duration-pills");
    const modalExportFps = document.getElementById("modal-export-fps") as HTMLSelectElement | null;
    const modalExportQuality = document.getElementById("modal-export-quality") as HTMLSelectElement | null;
    const modalExportFilename = document.getElementById("modal-export-filename") as HTMLInputElement | null;
    const summaryFrames = document.getElementById("summary-frames");
    const summaryRes = document.getElementById("summary-res");

    // Modal de Resolución Personalizada
    const customResModal = document.getElementById("custom-res-modal") as HTMLDialogElement | null;
    const customResForm = document.getElementById("custom-res-form") as HTMLFormElement | null;
    const customWidthInput = document.getElementById("custom-width-input") as HTMLInputElement | null;
    const customHeightInput = document.getElementById("custom-height-input") as HTMLInputElement | null;
    const btnCloseCustomRes = document.getElementById("btn-close-custom-res");
    const btnCancelCustomRes = document.getElementById("btn-cancel-custom-res");

    // Modal de Progreso
    const progressModal = document.getElementById("progress-modal") as HTMLDialogElement | null;
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

    function updateResolutionUI(w: number, h: number) {
      if (!resSelect) return;
      const val = `${w}x${h}`;
      const opt = resSelect.querySelector(`option[value="${val}"]`);
      if (opt) {
        (resSelect as HTMLSelectElement).value = val;
        previousResValue = val;
      } else {
        const customOpt = resSelect.querySelector('option[value="custom"]');
        if (customOpt) {
          customOpt.textContent = `Custom (${w}x${h})`;
        }
        (resSelect as HTMLSelectElement).value = "custom";
        previousResValue = "custom";
      }
      updateExportSummary();
    }

    function applyCanvasStyles(canvas: HTMLCanvasElement, w: number, h: number) {
      canvas.style.aspectRatio = `${w} / ${h}`;
      canvas.style.maxWidth = "100%";
      canvas.style.maxHeight = "100%";
      canvas.style.width = "auto";
      canvas.style.height = "auto";
      canvas.style.objectFit = "contain";
      canvas.style.display = "block";
      canvas.style.position = "relative";
      canvas.style.top = "auto";
      canvas.style.left = "auto";
      canvas.style.margin = "auto";
      if (canvasContainer) {
        canvasContainer.style.setProperty("--scene-aspect", `${w} / ${h}`);
      }
    }

    function transformPixiImports(code: string) {
      // 1. Named imports with optional aliases: import { Application, Assets as MyAssets } from 'pixi.js'
      let transformed = code.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"](?:@?pixi(?:\.js)?(?:\/[^'"]*)?)['"];?/g,
        (match, imports) => {
          const formatted = imports.replace(/\b([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)\b/g, "$1: $2").trim();
          return `const { ${formatted} } = PIXI;`;
        }
      );

      // 2. Namespace imports: import * as PIXI from 'pixi.js'
      transformed = transformed.replace(
        /import\s*\*\s*as\s+([A-Za-z0-9_$]+)\s+from\s*['"](?:@?pixi(?:\.js)?(?:\/[^'"]*)?)['"];?/g,
        (match, id) => (id === "PIXI" ? "/* import * as PIXI */" : `const ${id} = PIXI;`)
      );

      // 3. Default imports: import PIXI from 'pixi.js'
      transformed = transformed.replace(
        /import\s+([A-Za-z0-9_$]+)\s+from\s*['"](?:@?pixi(?:\.js)?(?:\/[^'"]*)?)['"];?/g,
        (match, id) => (id === "PIXI" ? "/* import PIXI */" : `const ${id} = PIXI;`)
      );

      // 4. Side-effect only imports: import 'pixi.js'
      transformed = transformed.replace(
        /import\s*['"](?:@?pixi(?:\.js)?(?:\/[^'"]*)?)['"];?/g,
        "/* import pixi.js */"
      );

      // 5. Ensure top-level async IIFE is awaited if present
      transformed = transformed.replace(
        /(^|[\r\n;])\s*(?<!await\s*)(?<!return\s*)\(\s*async\s*(\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g,
        "$1\nawait (async $2 =>"
      );
      transformed = transformed.replace(
        /(^|[\r\n;])\s*(?<!await\s*)(?<!return\s*)\(\s*async\s+function/g,
        "$1\nawait (async function"
      );

      return transformed;
    }

    async function runUserCode(width = currentWidth, height = currentHeight, forceStudioResolution = false) {
      clearLogs();
      logMessage(`Running PixiJS v8 code (${width}x${height})...`, "info");

      // 0. Remove any rogue canvas elements attached directly under <body>
      document.body.querySelectorAll(":scope > canvas").forEach((c) => c.remove());

      // 1. Clean up previous application instance and GPU pools
      if (app) {
        try {
          app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
        } catch (e) {
          console.warn("Instance cleanup error:", e);
        }
        app = null;
        window.app = null;
      }

      try {
        PIXI.TexturePool?.clear();
        PIXI.Assets?.reset();
      } catch { }

      currentWidth = width;
      currentHeight = height;

      const rawCode = editorInstanceRef.current ? editorInstanceRef.current.getValue() : "";
      const createsOwnApp = /new\s+(?:PIXI\.)?Application\b/.test(rawCode);

      // 2. Initialize default application ONLY if user code does not instantiate its own Application
      let defaultApp: any = null;
      if (!createsOwnApp) {
        defaultApp = new PIXI.Application();
        await defaultApp.init({
          width,
          height,
          background: "#080c14",
          antialias: true,
          autoDensity: true,
          resolution: 1,
          preference: "webgl",
        });

        app = defaultApp;
        window.app = defaultApp;
        if (canvasContainer) {
          canvasContainer.innerHTML = "";
          canvasContainer.appendChild(defaultApp.canvas);
          applyCanvasStyles(defaultApp.canvas, width, height);
        }
      }

      // 3. Setup Interception for official examples (new Application(), app.init(), document.body.appendChild)
      let userCreatedApp: any = null;
      const RealApplication = PIXI.Application;

      class InterceptedApplication extends RealApplication {
        _initPromise: Promise<any> | null = null;
        constructor(...args: any[]) {
          super(...args);
          userCreatedApp = this;
          this._initPromise = null;
        }

        async init(options: any = {}) {
          const opts = { ...options };

          // Handle resizeTo: window (from official presets) or map to active studio resolution
          const hadResizeTo = Boolean(opts.resizeTo);
          if (hadResizeTo) {
            delete opts.resizeTo;
          }

          if (forceStudioResolution || hadResizeTo || (!opts.width && !opts.height)) {
            opts.width = width;
            opts.height = height;
          } else {
            // Scene specifies explicit width/height
            if (!opts.width) opts.width = width;
            if (!opts.height) opts.height = height;
            // Ensure even dimensions for video export
            if (opts.width % 2 !== 0) opts.width += 1;
            if (opts.height % 2 !== 0) opts.height += 1;
            currentWidth = opts.width;
            currentHeight = opts.height;
            updateResolutionUI(opts.width, opts.height);
          }

          opts.autoDensity = true;
          opts.resolution = 1;

          // If defaultApp was created earlier, destroy it to release GPU resources
          if (defaultApp && defaultApp !== this) {
            try {
              defaultApp.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
              defaultApp = null;
            } catch { }
          }

          const initPromise = (async () => {
            const res = await super.init(opts);
            const activeWidth = opts.width || width;
            const activeHeight = opts.height || height;

            if (canvasContainer && this.canvas) {
              canvasContainer.innerHTML = "";
              canvasContainer.appendChild(this.canvas);
              applyCanvasStyles(this.canvas, activeWidth, activeHeight);
            }

            // Hook renderer.resize to keep aspect ratio and canvasContainer in sync
            if (this.renderer) {
              const origResize = this.renderer.resize.bind(this.renderer);
              this.renderer.resize = (newW: number, newH: number, res?: number) => {
                origResize(newW, newH, res);
                if (this.canvas) {
                  applyCanvasStyles(this.canvas, newW, newH);
                }
              };
            }

            app = this;
            window.app = this;
            return res;
          })();

          this._initPromise = initPromise;
          return initPromise;
        }

        get resizeTo() {
          return virtualWindow;
        }

        set resizeTo(_val: any) {
          // Protected: studio resolution selector controls dimensions
        }

        resize() {
          if (this.renderer && currentWidth && currentHeight) {
            this.renderer.resize(currentWidth, currentHeight);
          }
        }
      }

      // Virtual document that strictly directs canvas insertions to canvasContainer
      const virtualDocument = new Proxy(document, {
        get(target, prop, receiver) {
          if (prop === "body") {
            return new Proxy(document.body, {
              get(bTarget, bProp, bReceiver) {
                if (bProp === "appendChild") {
                  return (child: Node) => {
                    if (
                      child instanceof HTMLCanvasElement ||
                      (child as any)?.tagName === "CANVAS" ||
                      (child as any)?.nodeName === "CANVAS"
                    ) {
                      if (canvasContainer) {
                        if (!canvasContainer.contains(child)) {
                          canvasContainer.innerHTML = "";
                          canvasContainer.appendChild(child);
                        }
                        applyCanvasStyles(child as HTMLCanvasElement, currentWidth, currentHeight);
                      }
                      return child;
                    }
                    return bTarget.appendChild(child);
                  };
                }
                return Reflect.get(bTarget, bProp, bReceiver);
              },
            });
          }
          if (prop === "getElementById") {
            return (id: string) => {
              if (id === "canvas-container" || id === "app") {
                return canvasContainer;
              }
              return target.getElementById(id);
            };
          }
          if (prop === "querySelector") {
            return (selector: string) => {
              if (selector === "#canvas-container" || selector === "#app") {
                return canvasContainer;
              }
              if (selector === "body") {
                return virtualDocument.body;
              }
              return target.querySelector(selector);
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      });

      // Safe virtual window that mirrors scene resolution
      const resizeListeners = new Set<() => void>();
      const virtualWindow = new Proxy(window, {
        get(target, prop, receiver) {
          if (prop === "document") return virtualDocument;
          if (prop === "innerWidth") return currentWidth;
          if (prop === "innerHeight") return currentHeight;
          if (prop === "outerWidth") return currentWidth;
          if (prop === "outerHeight") return currentHeight;
          if (prop === "Application") return InterceptedApplication;
          if (prop === "addEventListener") {
            return (type: string, listener: any, options: any) => {
              if (type === "resize" && typeof listener === "function") {
                resizeListeners.add(listener);
                return;
              }
              return window.addEventListener(type, listener, options);
            };
          }
          if (prop === "removeEventListener") {
            return (type: string, listener: any, options: any) => {
              if (type === "resize") {
                resizeListeners.delete(listener);
                return;
              }
              return window.removeEventListener(type, listener, options);
            };
          }
          if (prop === "PIXI") return pixiScope;
          if (prop in PIXI && !(prop in target)) {
            return (pixiScope as any)[prop];
          }
          return Reflect.get(target, prop, receiver);
        },
      });

      // Safe PIXI scope that supplies InterceptedApplication without mutating the sealed module
      const pixiScope: Record<string, any> = {
        ...PIXI,
        Application: InterceptedApplication,
        [Symbol.toStringTag]: "PIXI",
      };

      window.PIXI = pixiScope;
      window.Application = InterceptedApplication;
      window.Assets = PIXI.Assets;
      window.Container = PIXI.Container;
      window.Sprite = PIXI.Sprite;
      window.Graphics = PIXI.Graphics;
      window.Text = PIXI.Text;
      window.TextStyle = PIXI.TextStyle;
      window.Color = PIXI.Color;
      window.Point = PIXI.Point;
      window.Rectangle = PIXI.Rectangle;
      window.Circle = PIXI.Circle;
      window.Matrix = PIXI.Matrix;
      window.Ticker = PIXI.Ticker;

      try {
        const jsCode = await transpileTypeScript(monacoRef.current, editorInstanceRef.current, rawCode);
        const transformedCode = transformPixiImports(jsCode);

        const customConsole = {
          log: (...args: any[]) =>
            logMessage(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "), "info"),
          warn: (...args: any[]) => logMessage(args.join(" "), "warn"),
          error: (...args: any[]) => logMessage(args.join(" "), "error"),
        };

        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
        // Pass virtual document & window so document.body.appendChild routes directly to canvasContainer
        const runFn = new AsyncFunction(
          "PIXI",
          "console",
          "window",
          "document",
          "innerWidth",
          "innerHeight",
          transformedCode
        );

        await runFn(pixiScope, customConsole, virtualWindow, virtualDocument, currentWidth, currentHeight);

        if (userCreatedApp) {
          if (userCreatedApp._initPromise) {
            await userCreatedApp._initPromise;
          }
          app = userCreatedApp;
          window.app = userCreatedApp;
        }

        // Attach FPS counter to the active app
        if (app && app.ticker && fpsCounter) {
          app.ticker.add(() => {
            if (app?.ticker?.started && fpsCounter) {
              fpsCounter.textContent = `FPS: ${Math.round(app.ticker.FPS)}`;
            }
          });
        }

        logMessage("Scene generated successfully.", "info");
      } catch (err: any) {
        console.error(err);
        logMessage(err.message || String(err), "error");
      } finally {
        window.PIXI = PIXI;
        window.Application = RealApplication;
      }
    }

    async function startVideoExport() {
      const { width, height } = getSelectedResolution();
      const durationSec = parseFloat(modalExportDuration?.value || "5") || 5;
      const fps = parseInt(modalExportFps?.value || "60", 10) || 60;
      const quality = (modalExportQuality?.value || "very-high") as VideoQuality;
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
        await runUserCode(width, height, true);

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

    function setupEventListeners() {
      btnRun?.addEventListener("click", () => {
        runUserCode();
        if (window.innerWidth < 768) {
          changeViewMode("preview");
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
        const val = (e.target as HTMLSelectElement).value;
        if (val === "custom") {
          if (customWidthInput) customWidthInput.value = String(currentWidth);
          if (customHeightInput) customHeightInput.value = String(currentHeight);
          customResModal?.showModal();
        } else {
          previousResValue = val;
          const [w, h] = val.split("x").map(Number);
          if (w && h) {
            currentWidth = w;
            currentHeight = h;
            runUserCode(w, h, true);
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
        if (resSelect) (resSelect as HTMLSelectElement).value = "custom";

        customResModal?.close();
        runUserCode(w, h, true);
        updateExportSummary();
      });

      btnCloseCustomRes?.addEventListener("click", () => customResModal?.close());
      btnCancelCustomRes?.addEventListener("click", () => customResModal?.close());

      customResModal?.addEventListener("close", () => {
        if (resSelect && previousResValue !== "custom") {
          (resSelect as HTMLSelectElement).value = previousResValue;
        }
      });

      modalExportDuration?.addEventListener("input", () => {
        const val = parseFloat(modalExportDuration.value);
        durationPills?.querySelectorAll(".pill").forEach((pillEl) => {
          const pill = pillEl as HTMLElement;
          pill.classList.toggle("active", parseFloat(pill.dataset.val || "0") === val);
        });
        updateExportSummary();
      });

      modalExportFps?.addEventListener("change", updateExportSummary);

      durationPills?.addEventListener("click", (e) => {
        const target = e.target as HTMLElement | null;
        const pill = target?.closest(".pill") as HTMLElement | null;
        if (!pill) return;
        durationPills.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        if (modalExportDuration && pill.dataset.val) modalExportDuration.value = pill.dataset.val;
        updateExportSummary();
      });

      // Light-dismiss fallback
      if (!("closedBy" in HTMLDialogElement.prototype)) {
        const outside = (e: PointerEvent, dialog: HTMLDialogElement) => {
          const r = dialog.getBoundingClientRect();
          return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        };
        for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[closedby="any"]')) {
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
          editorInstanceRef.current?.layout();
        });

        const stopDragCol = (e: PointerEvent) => {
          if (!isDraggingCol) return;
          isDraggingCol = false;
          try {
            gutterCol.releasePointerCapture(e.pointerId);
          } catch { }
          gutterCol.classList.remove("dragging");
          document.body.classList.remove("is-resizing-col");
          editorInstanceRef.current?.layout();
          if (editorPane.offsetWidth >= 260) {
            localStorage.setItem("pixi_studio_editor_width", String(editorPane.offsetWidth));
          }
        };

        gutterCol.addEventListener("pointerup", stopDragCol);
        gutterCol.addEventListener("pointercancel", stopDragCol);

        gutterCol.addEventListener("dblclick", () => {
          editorPane.style.width = "50%";
          localStorage.removeItem("pixi_studio_editor_width");
          editorInstanceRef.current?.layout();
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
        let startY = 0;
        let startHeight = 0;

        gutterRow.addEventListener("pointerdown", (e) => {
          if (window.innerWidth < 768) {
            // Deshabilitar drag en mobile para evitar que la consola aumente hacia abajo
            return;
          }
          isDraggingRow = true;
          startY = e.clientY;
          startHeight = consoleBox.offsetHeight;
          gutterRow.setPointerCapture(e.pointerId);
          gutterRow.classList.add("dragging");
          document.body.classList.add("is-resizing-row");
          e.preventDefault();
        });

        gutterRow.addEventListener("pointermove", (e) => {
          if (!isDraggingRow) return;
          if (window.innerWidth < 768) return;
          const rect = editorPane.getBoundingClientRect();
          const deltaY = startY - e.clientY;
          const minH = 32;
          const maxH = Math.max(minH, rect.height - 100);
          const newH = Math.max(minH, Math.min(maxH, startHeight + deltaY));
          consoleBox.style.height = `${newH}px`;
          editorInstanceRef.current?.layout();
        });

        const stopDragRow = (e: PointerEvent) => {
          if (!isDraggingRow) return;
          isDraggingRow = false;
          try {
            gutterRow.releasePointerCapture(e.pointerId);
          } catch { }
          gutterRow.classList.remove("dragging");
          document.body.classList.remove("is-resizing-row");
          editorInstanceRef.current?.layout();
          if (consoleBox.offsetHeight >= 32) {
            localStorage.setItem("pixi_studio_console_height", String(consoleBox.offsetHeight));
          }
        };

        gutterRow.addEventListener("pointerup", stopDragRow);
        gutterRow.addEventListener("pointercancel", stopDragRow);

        gutterRow.addEventListener("dblclick", () => {
          if (window.innerWidth < 768) return;
          consoleBox.style.height = "130px";
          localStorage.removeItem("pixi_studio_console_height");
          editorInstanceRef.current?.layout();
        });
      }
    }

    async function captureSceneThumbnail(): Promise<string | null> {
      try {
        const activeApp = app || (window as any).app;
        if (!activeApp) return null;

        // Force synchronous render to ensure buffer has the latest scene graphics
        if (activeApp.renderer && activeApp.stage) {
          try {
            activeApp.renderer.render(activeApp.stage);
          } catch {}
        }

        let sourceCanvas: HTMLCanvasElement | null = null;

        // PixiJS v8 ExtractSystem
        if (activeApp.renderer?.extract) {
          try {
            sourceCanvas = (activeApp.renderer.extract as any).canvas(activeApp.stage);
          } catch (err) {
            console.warn("Pixi extract.canvas failed, falling back to canvas:", err);
          }
        }

        if (!sourceCanvas && activeApp.canvas) {
          sourceCanvas = activeApp.canvas as HTMLCanvasElement;
        }

        if (!sourceCanvas && canvasContainer) {
          sourceCanvas = canvasContainer.querySelector("canvas") || null;
        }

        if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
          return null;
        }

        // Scaled down to lightweight thumbnail resolution (max 480px)
        const maxDim = 480;
        let w = sourceCanvas.width;
        let h = sourceCanvas.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = Math.max(w, 2);
        thumbCanvas.height = Math.max(h, 2);
        const ctx = thumbCanvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(sourceCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        return thumbCanvas.toDataURL("image/webp", 0.75);
      } catch (err) {
        console.error("Error capturing scene thumbnail:", err);
        return null;
      }
    }

    setupEventListeners();
    setupSplitters();
    updateExportSummary();
    initAuth();
    initLibraryUI({
      onSelectPreset: (preset) => {
        const activeEditor = editorInstanceRef.current;
        if (activeEditor) {
          currentPresetTitle = preset.title;
          activeEditor.setValue(preset.code);
          runUserCode();
          updateExportSummary();
          const badge = document.getElementById("active-preset-badge");
          if (badge) {
            badge.textContent = preset.title;
          }
          logMessage(`Preset "${preset.title}" loaded from library.`, "info");
          if (window.innerWidth < 768) {
            changeViewMode("preview");
          }
        }
      },
      getEditorCode: () => (editorInstanceRef.current ? editorInstanceRef.current.getValue() : ""),
      getCanvasThumbnail: captureSceneThumbnail,
    });

    runUserCodeRef.current = runUserCode;

    // Si Monaco ya está montado, ejecuta la escena
    if (editorInstanceRef.current) {
      runUserCode();
    }

    const onWindowResize = () => {
      const playgroundBody = document.getElementById("playground-body");
      const editorPane = document.getElementById("editor-pane");
      if (
        window.innerWidth > 768 &&
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
      editorInstanceRef.current?.layout();
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
                    className={`menu-item view-option-split ${viewMode === "split" ? "selected" : ""}`}
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
                    <span>Split</span>
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
                    <span>Code</span>
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
                    <span>Preview</span>
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
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>About</span>
              </button>
            </div>
          </div>
        </div>

        <div className="controls">
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
              <div id="google-btn-desktop" className="google-btn-desktop"></div>
              <div id="google-btn-mobile" className="google-btn-mobile"></div>
            </div>
          </div>
        </div>
      </header>

      <main className={`playground-body view-${viewMode}`} id="playground-body">
        <section className="editor-pane" id="editor-pane">
          <div className="pane-header">
            <div className="pane-header-title">
              <button
                type="button"
                className="pane-title-icon"
                onClick={handleEditorIconClick}
                title={
                  viewMode === "split"
                    ? "Switch to Preview (Alt+3)"
                    : "Restore Split view (Alt+1)"
                }
                aria-label={viewMode === "split" ? "Switch to Preview" : "Restore Split view"}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </button>
              <span id="active-preset-badge" className="active-preset-badge">
                Basic Shapes
              </span>
            </div>
            <div className="pane-header-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm mobile-view-toggle"
                onClick={() => changeViewMode("preview")}
                title="Switch to Preview"
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Preview</span>
              </button>
              <button
                id="btn-run"
                className="btn btn-primary btn-sm btn-run-editor"
                title="Run code on canvas (Ctrl + Enter)"
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Run</span>
              </button>
            </div>
          </div>
          <div className="editor-wrapper">
            <Editor
              height="100%"
              path="scene.ts"
              defaultLanguage="typescript"
              language="typescript"
              theme="vs-dark"
              defaultValue={EXAMPLES["basic-shapes"] || EXAMPLES["flow-field"] || ""}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 13.5,
                fontFamily: "'Fira Code', Menlo, Monaco, Consolas, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                roundedSelection: true,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "off",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                contextmenu: true,
                formatOnPaste: true,
                formatOnType: true,
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true,
                },
              }}
            />
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
            <div className="pane-header-title">
              <button
                type="button"
                className="btn btn-secondary btn-sm mobile-view-toggle"
                onClick={() => changeViewMode("code")}
                title="Switch to Code"
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Code</span>
              </button>
              <button
                type="button"
                className="pane-title-icon"
                onClick={handlePreviewIconClick}
                title={
                  viewMode === "split"
                    ? "Switch to Code (Alt+2)"
                    : "Restore Split view (Alt+1)"
                }
                aria-label={viewMode === "split" ? "Switch to Code" : "Restore Split view"}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
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
            onClick={() => (document.getElementById("library-modal") as HTMLDialogElement)?.close()}
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
            onClick={() => (document.getElementById("preset-editor-modal") as HTMLDialogElement)?.close()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="preset-editor-form" className="modal-form" method="dialog">
          <div className="form-field">
            <label>Auto-Generated Snapshot</label>
            <div id="preset-thumb-preview-container" className="preset-thumb-preview-container">
              <img
                id="preset-thumb-preview-img"
                alt="Preset Thumbnail Preview"
                className="preset-thumb-preview-img"
                style={{ display: "none" }}
              />
              <div id="preset-thumb-preview-empty" className="preset-thumb-preview-empty">
                <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Snapshot captured automatically from canvas</span>
              </div>
            </div>
          </div>

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
              onClick={() => (document.getElementById("preset-editor-modal") as HTMLDialogElement)?.close()}
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
            onClick={() => (document.getElementById("about-modal") as HTMLDialogElement)?.close()}
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

