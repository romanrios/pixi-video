import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  QUALITY_VERY_HIGH,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
} from "mediabunny";

const QUALITY_MAP = {
  "very-high": QUALITY_VERY_HIGH,
  high: QUALITY_HIGH,
  medium: QUALITY_MEDIUM,
};

/**
 * Graba la escena de Pixi de forma determinista cuadro a cuadro a una tasa de FPS fija.
 *
 * @param {object} options
 * @param {import('pixi.js').Application} options.app - Instancia de PixiJS v8
 * @param {number} options.durationSec - Duración en segundos del video
 * @param {number} options.fps - Cuadros por segundo (ej. 30 o 60)
 * @param {string} [options.quality] - Calidad ('very-high', 'high', 'medium')
 * @param {AbortSignal} [options.signal] - Señal para abortar la grabación
 * @param {function} [options.onProgress] - Callback (currentFrame, totalFrames, percentage)
 * @param {function} [options.onFrame] - Función opcional llamada en cada frame con (timeSec, frameIndex, ticker)
 * @returns {Promise<Blob>} Retorna el Blob MP4 generado
 */
export async function exportDeterministicVideo({
  app,
  durationSec = 5,
  fps = 60,
  quality = "very-high",
  signal = null,
  onProgress = () => {},
  onFrame = null,
}) {
  const canvas = app.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Asegurar dimensiones pares para H.264
  if (width % 2 !== 0 || height % 2 !== 0) {
    throw new Error(
      `Las dimensiones del canvas deben ser pares para codificar en MP4/H264 (${width}x${height}). Ajusta la resolución.`
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

  const selectedQuality = QUALITY_MAP[quality] || QUALITY_VERY_HIGH;

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
        throw new DOMException("Grabación cancelada por el usuario.", "AbortError");
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

      const percent = Math.round(((frame + 1) / totalFrames) * 100);
      onProgress(frame + 1, totalFrames, percent);

      // Ceder brevemente al event loop para mantener responsiva la interfaz
      if (frame % 4 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // 5. Finalizar la codificación
    await output.finalize();

    if (!target.buffer) {
      throw new Error("No se pudo obtener el búfer del archivo finalizado.");
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
export function downloadBlob(blob, filename = "pixi-creative-coding.mp4") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
