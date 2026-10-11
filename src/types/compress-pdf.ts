import type { PdfErrorCode } from "./pdf";

export type CompressionLevel = "soft" | "balanced" | "high";
export type CompressionPhase =
  | "empty"
  | "loading"
  | "ready"
  | "processing"
  | "validating"
  | "done"
  | "no-reduction"
  | "error";

export interface CompressionAnalysis {
  pageCount: number;
  imageCount: number;
  streamCount: number;
  compressedStreamCount: number;
}

export interface CompressionSource extends CompressionAnalysis {
  name: string;
  size: number;
}

export interface CompressionResult {
  url: string;
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  pageCount: number;
  level: CompressionLevel;
  previewUrl: string | null;
}

export interface CompressionAttempt {
  originalSize: number;
  attemptedSize: number;
  difference: number;
  level: CompressionLevel;
}

export type CompressionCommand =
  | { type: "validate"; bytes: ArrayBuffer }
  | { type: "compress"; level: CompressionLevel };

export type CompressionWorkerResult =
  | { type: "validated"; analysis: CompressionAnalysis }
  | {
      type: "compressed";
      bytes: ArrayBuffer;
      pageCount: number;
      level: CompressionLevel;
    };

export type CompressionStage = "optimizing" | "validating";

export type CompressionWorkerMessage =
  | {
      requestId: number;
      type: "success";
      result: CompressionWorkerResult;
    }
  | { requestId: number; type: "stage"; stage: CompressionStage }
  | {
      requestId: number;
      type: "error";
      code: PdfErrorCode;
      message: string;
    };
