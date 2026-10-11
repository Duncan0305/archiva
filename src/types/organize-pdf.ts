import type { PdfErrorCode } from "./pdf";

export interface OrganizedPage {
  id: string;
  originalIndex: number;
  rotationDelta: number;
}

export interface OrganizeSnapshot {
  pages: OrganizedPage[];
}

export type OrganizeCommand =
  | { type: "validate"; bytes: ArrayBuffer }
  | { type: "organize"; pages: OrganizedPage[] };

export type OrganizeWorkerResult =
  | { type: "validated"; pageCount: number }
  | { type: "organized"; bytes: ArrayBuffer; pageCount: number };

export type OrganizeWorkerMessage =
  | { requestId: number; type: "progress"; completed: number; total: number }
  | { requestId: number; type: "success"; result: OrganizeWorkerResult }
  | { requestId: number; type: "error"; message: string; code: PdfErrorCode };

export interface OrganizeResult {
  url: string;
  size: number;
  pageCount: number;
}
