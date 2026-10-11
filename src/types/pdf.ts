export interface PdfFileInfo {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  preview: { status: "loading" | "ready" | "unavailable"; url?: string };
}

export type PdfPhase =
  "empty" | "selected" | "validating" | "merging" | "completed" | "error";

export type PdfErrorCode =
  | "type"
  | "empty"
  | "invalid"
  | "encrypted"
  | "memory"
  | "read"
  | "minimum"
  | "worker"
  | "merge"
  | "cancelled";

export interface PdfIssue {
  id: string;
  name?: string;
  message: string;
}

export interface MergeProgress {
  stage: "copying" | "saving";
  completed: number;
  total: number;
}

export interface MergeResult {
  url: string;
  size: number;
  pageCount: number;
  fileCount: number;
}

export type PdfCommand =
  | { type: "validate"; id: string; bytes: ArrayBuffer }
  | { type: "remove"; id: string }
  | { type: "merge"; ids: string[] };

export type PdfWorkerResult =
  | { type: "validated"; pageCount: number }
  | { type: "removed" }
  | { type: "merged"; bytes: ArrayBuffer; pageCount: number };

export type PdfWorkerRequest = { requestId: number; command: PdfCommand };
export type PdfWorkerResponse =
  | { requestId: number; type: "progress"; progress: MergeProgress }
  | { requestId: number; type: "success"; result: PdfWorkerResult }
  | { requestId: number; type: "error"; code: PdfErrorCode; message: string };
