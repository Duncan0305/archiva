export type WordPhase =
  | "empty"
  | "validating"
  | "rendering"
  | "ready"
  | "printing"
  | "error";

export type DocxWarningCode =
  | "font-substitution"
  | "complex-layout"
  | "tracked-changes"
  | "external-links";

export interface DocxWarning {
  code: DocxWarningCode;
  message: string;
}

export interface DocxAnalysis {
  name: string;
  size: number;
  title: string | null;
  author: string | null;
  imageCount: number;
  tableCount: number;
  sectionCount: number;
  hasHeaders: boolean;
  hasFooters: boolean;
  hasLandscapeSections: boolean;
  requestedFonts: string[];
  warnings: DocxWarning[];
}

export interface WordToolState {
  phase: WordPhase;
  source: DocxAnalysis | null;
  bytes: ArrayBuffer | null;
  renderedPages: number | null;
  error: string | null;
  announcement: string;
  printCompleted: boolean;
}
