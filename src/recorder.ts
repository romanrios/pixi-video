import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  Quality,
} from "mediabunny";
import type { ExportVideoOptions, VideoQuality } from "@/types/recorder";

const QUALITY_MAP: Record<VideoQuality, Quality> = {
  "very-high": new Quality("very-high"),
  high: new Quality("high"),
  medium: new Quality("medium"),
};

/**
 * Graba la escena de Pixi de forma determinista cuadro a cuadro a una tasa de FPS fija.
 */
export async function exportDeterministicVideo({
  app,
  durationSec = 5,
  fps = 60,
  quality = "very-high",
  signal = null,
  onProgress = () => {},
  onFrame = null,
}: ExportVideoOptions): Promise<Blob> {
  const canvas = app.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Ensure even dimensions for H.264
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error(
      `Canvas dimensions must be even numbers for MP4/H.264 encoding (${width}x${height}). Please adjust resolution.`
    );
  }

  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  const frameDurationSec = 1 / fps;

  // 1. Pausar el Ticker de Pixi para tener control cuadro a cuadro exacto
  const wasRunning = app.ticker.started;
  if (wasRunning) {
    app.ticker.stop();
  }

  // 2. Configurar el destino y formato de salida
  const target = new BufferTarget();
  const format = new Mp4OutputFormat();

  const output = new Output({
    target,
    format,
  });

  const selectedQuality = QUALITY_MAP[quality] || QUALITY_MAP["very-high"];

  // 3. Crear CanvasSource usando WebCodecs H.264 / AVC
  const canvasSource = new CanvasSource(canvas, {
    codec: "avc",
    quality: selectedQuality,
  });

  output.addVideoTrack(canvasSource, {
    frameRate: fps,
  });

  await output.start();

  try {
    // 4. Renderizado determinista cuadro a cuadro
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal && signal.aborted) {
        throw new DOMException("Recording cancelled by user.", "AbortError");
      }

      const currentTimeSec = frame * frameDurationSec;

      // Si el usuario proveyó un gancho de animación manual para tiempo determinista
      if (typeof onFrame === "function") {
        onFrame(currentTimeSec, frame, app.ticker);
      } else {
        // Avance sintético del ticker de PixiJS v8
        app.ticker.update(currentTimeSec * 1000);
      }

      // Forzar dibujo en el canvas
      app.render();

      // Capturar frame exacto y enviar al encoder
      await canvasSource.add(currentTimeSec, frameDurationSec);

      const current = frame + 1;
      const percent = Math.min(100, Math.round((current / totalFrames) * 100));
      onProgress(current, totalFrames, percent);
    }

    // 5. Finalizar la pista de video y el empaquetado del archivo MP4
    await canvasSource.close();
    if (typeof (output as any).finalize === "function") {
      await (output as any).finalize();
    } else if (typeof (output as any).end === "function") {
      await (output as any).end();
    }

    if (!target.buffer) {
      throw new Error("Failed to retrieve final file buffer.");
    }

    const blob = new Blob([target.buffer], { type: "video/mp4" });
    return blob;
  } finally {
    // Restaurar el ticker si estaba corriendo
    if (wasRunning) {
      app.ticker.start();
    }
  }
}

/**
 * Descarga automática del archivo Blob en el navegador.
 */
export function downloadBlob(blob: Blob, filename = "pixi-creative-coding.mp4"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
