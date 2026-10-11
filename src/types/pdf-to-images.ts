export type ImageExportFormat = "jpeg" | "png" | "webp";
export type DpiPreset = "96" | "150" | "300" | "custom";
export type ImageBackground = "white" | "custom" | "transparent";

export interface PdfToImagesSettings {
  format: ImageExportFormat;
  dpiPreset: DpiPreset;
  customDpi: number;
  quality: number;
  background: ImageBackground;
  backgroundColor: string;
}

export interface PdfImageSource {
  name: string;
  size: number;
  pageCount: number;
}

export interface RenderedPdfImage {
  pageNumber: number;
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  mime: string;
  size: number;
}

export interface PdfImagePreview {
  pageNumber: number;
  url: string;
  width: number;
  height: number;
  mime: string;
}

export type PdfToImagesPhase =
  | "empty"
  | "loading"
  | "ready"
  | "processing"
  | "zipping"
  | "done"
  | "error";

