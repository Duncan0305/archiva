import type { PdfErrorCode } from "./pdf";

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export type PageSize = "a4" | "letter" | "a3" | "image";
export type PageOrientation = "auto" | "portrait" | "landscape";
export type PageMargin = "none" | "small" | "medium" | "large";
export type ImageFit = "contain" | "cover";

export interface ImagePdfSettings {
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: PageMargin;
  fit: ImageFit;
}

export interface SelectedImage {
  id: string;
  name: string;
  size: number;
  width: number;
  height: number;
  mime: ImageMime;
  rotation: number;
  previewUrl: string;
  fingerprint: string;
  bytes: ArrayBuffer;
}

export interface WorkerImage {
  id: string;
  mime: ImageMime;
  width: number;
  height: number;
  rotation: number;
  bytes: ArrayBuffer;
}

export interface PageLayout {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  imageWidth: number;
  imageHeight: number;
  drawWidth: number;
  drawHeight: number;
  x: number;
  y: number;
}

export type ImagesPdfCommand = {
  type: "generate";
  images: WorkerImage[];
  settings: ImagePdfSettings;
};

export type ImagesPdfWorkerMessage =
  | { requestId: number; type: "progress"; completed: number; total: number }
  | {
      requestId: number;
      type: "success";
      result: { bytes: ArrayBuffer; pageCount: number };
    }
  | { requestId: number; type: "error"; code: PdfErrorCode; message: string };

export interface ImagesPdfResult {
  url: string;
  size: number;
  pageCount: number;
}

export interface ImageIssue {
  id: string;
  name?: string;
  message: string;
}
