export type VideoQuality = "very-high" | "high" | "medium";

export interface ExportVideoOptions {
  app: any;
  durationSec?: number;
  fps?: number;
  quality?: VideoQuality;
  signal?: AbortSignal | null;
  onProgress?: (current: number, total: number, percent: number) => void;
  onFrame?: ((timeSec: number, frameIndex: number, ticker: any) => void) | null;
}

