import type { PdfErrorCode } from "./pdf";

export type SplitMode = "selected" | "ranges" | "every";

export interface PageGroup {
  pages: number[];
  label: string;
}

export interface SplitOutput {
  pages: number[];
  bytes: ArrayBuffer;
}

export type SplitCommand =
  | { type: "validate"; bytes: ArrayBuffer }
  | { type: "split"; groups: number[][] };

export type SplitWorkerResult =
  | { type: "validated"; pageCount: number }
  | { type: "split"; outputs: SplitOutput[] };

export type SplitWorkerMessage =
  | { requestId: number; type: "progress"; completed: number; total: number }
  | { requestId: number; type: "success"; result: SplitWorkerResult }
  | { requestId: number; type: "error"; message: string; code: PdfErrorCode };

export interface SplitResult {
  id: string;
  name: string;
  pages: number[];
  size: number;
  url: string;
  blob: Blob;
}
