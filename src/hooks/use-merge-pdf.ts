"use client";

import { useEffect, useRef, useState } from "react";
import type {
  MergeProgress,
  MergeResult,
  PdfFileInfo,
  PdfIssue,
  PdfPhase,
} from "@/types/pdf";
import { PdfWorkerClient } from "@/lib/pdf/worker-client";
import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { validatePdfFile } from "@/lib/pdf/validate-file";
import { renderPdfCover } from "@/lib/pdf/render-cover";

interface MergeState {
  phase: PdfPhase;
  files: PdfFileInfo[];
  issues: PdfIssue[];
  validation: { completed: number; total: number };
  progress: MergeProgress | null;
  result: MergeResult | null;
  announcement: string;
}

const initialState: MergeState = {
  phase: "empty",
  files: [],
  issues: [],
  validation: { completed: 0, total: 0 },
  progress: null,
  result: null,
  announcement: "",
};

export function useMergePdf() {
  const [state, setState] = useState<MergeState>(initialState);
  const worker = useRef<PdfWorkerClient | null>(null);
  const resultUrl = useRef<string | null>(null);
  const previewUrls = useRef(new Map<string, string>());
  const previewController = useRef<AbortController | null>(null);
  const generation = useRef(0);
  // Synchronous lock also covers two events occurring before React renders.
  const locked = useRef(false);

  useEffect(
    () => () => {
      generation.current++;
      previewController.current?.abort();
      worker.current?.destroy();
      worker.current = null;
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
      resultUrl.current = null;
      for (const url of previewUrls.current.values()) URL.revokeObjectURL(url);
      previewUrls.current.clear();
    },
    [],
  );

  function releaseWorker() {
    worker.current?.destroy();
    worker.current = null;
  }

  function releasePreviews() {
    previewController.current?.abort();
    previewController.current = null;
    for (const url of previewUrls.current.values()) URL.revokeObjectURL(url);
    previewUrls.current.clear();
  }

  function reset() {
    generation.current++;
    releaseWorker();
    releasePreviews();
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
    locked.current = false;
    setState({
      ...initialState,
      announcement: "Listo para una nueva combinación.",
    });
  }

  function fail(error: unknown) {
    const safe = toPdfError(error, "merge");
    const fatal = safe.code === "worker" || safe.code === "memory";
    if (fatal) {
      releaseWorker();
      releasePreviews();
    }
    setState((previous) => ({
      ...previous,
      phase: "error",
      files: fatal ? [] : previous.files,
      issues: [{ id: crypto.randomUUID(), message: safe.message }],
      progress: null,
    }));
  }

  async function addFiles(files: File[]) {
    if (locked.current || state.result || !files.length) return;
    locked.current = true;
    const run = generation.current;
    const controller = new AbortController();
    previewController.current = controller;
    setState((previous) => ({
      ...previous,
      phase: "validating",
      issues: [],
      validation: { completed: 0, total: files.length },
      announcement: "Validando los documentos seleccionados.",
    }));
    const issues: PdfIssue[] = [];
    let interrupted = false;

    for (const [index, file] of files.entries()) {
      if (run !== generation.current) return;
      const id = crypto.randomUUID();
      try {
        validatePdfFile(file);
        worker.current ??= new PdfWorkerClient();
        const bytes = await file.arrayBuffer().catch((error) => {
          throw toPdfError(error, "read");
        });
        if (run !== generation.current) return;
        // Validation transfers its buffer to the merge worker. This copy is
        // short-lived and feeds the first-page renderer without a second read.
        const coverBytes = bytes.slice(0);
        const result = await worker.current.request({
          type: "validate",
          id,
          bytes,
        });
        if (run !== generation.current) return;
        if (result.type !== "validated") throw new PdfError("worker");
        const info: PdfFileInfo = {
          id,
          name: file.name,
          size: file.size,
          pageCount: result.pageCount,
          preview: { status: "loading" },
        };
        setState((previous) => ({
          ...previous,
          files: [...previous.files, info],
        }));
        try {
          const image = await renderPdfCover(coverBytes, controller.signal);
          if (run !== generation.current) return;
          const url = URL.createObjectURL(image);
          previewUrls.current.set(id, url);
          setState((previous) => ({
            ...previous,
            files: previous.files.map((item) =>
              item.id === id
                ? { ...item, preview: { status: "ready", url } }
                : item,
            ),
          }));
        } catch {
          if (run !== generation.current) return;
          setState((previous) => ({
            ...previous,
            files: previous.files.map((item) =>
              item.id === id
                ? { ...item, preview: { status: "unavailable" } }
                : item,
            ),
          }));
        }
      } catch (error) {
        if (run !== generation.current) return;
        const safe = toPdfError(error, "read");
        issues.push({ id, name: file.name, message: safe.message });
        if (safe.code === "worker" || safe.code === "memory") {
          releaseWorker();
          releasePreviews();
          interrupted = true;
          break;
        }
      }
      setState((previous) => ({
        ...previous,
        validation: { completed: index + 1, total: files.length },
      }));
    }
    if (run !== generation.current) return;
    if (previewController.current === controller)
      previewController.current = null;
    locked.current = false;
    setState((previous) => ({
      ...previous,
      files: interrupted ? [] : previous.files,
      issues,
      phase: issues.length ? "error" : "selected",
      announcement: issues.length
        ? "Revisión terminada. Algunos archivos no se pudieron añadir."
        : "Documentos validados. Ya puedes organizarlos.",
    }));
    // File references and transferred input buffers go out of scope here.
  }

  function removeFile(id: string) {
    if (locked.current || state.result) return;
    const file = state.files.find((item) => item.id === id);
    const preview = previewUrls.current.get(id);
    if (preview) URL.revokeObjectURL(preview);
    previewUrls.current.delete(id);
    const run = generation.current;
    void worker.current?.request({ type: "remove", id }).catch((error) => {
      if (run === generation.current) fail(error);
    });
    setState((previous) => {
      const files = previous.files.filter((item) => item.id !== id);
      return {
        ...previous,
        files,
        phase: files.length ? "selected" : "empty",
        announcement: `${file?.name ?? "Documento"} eliminado de la selección.`,
      };
    });
  }

  function moveFile(id: string, targetIndex: number) {
    if (locked.current || state.result) return;
    setState((previous) => {
      const from = previous.files.findIndex((file) => file.id === id);
      if (
        from < 0 ||
        targetIndex < 0 ||
        targetIndex >= previous.files.length ||
        from === targetIndex
      )
        return previous;
      const files = [...previous.files];
      const [file] = files.splice(from, 1);
      files.splice(targetIndex, 0, file);
      return {
        ...previous,
        files,
        announcement: `${file.name}, posición ${targetIndex + 1} de ${files.length}.`,
      };
    });
  }

  async function merge() {
    if (locked.current || state.result) return;
    if (state.files.length < 2) {
      fail(new PdfError("minimum"));
      return;
    }
    locked.current = true;
    const run = generation.current;
    const ordered = state.files.map(({ id }) => id);
    setState((previous) => ({
      ...previous,
      phase: "merging",
      issues: [],
      progress: { stage: "copying", completed: 0, total: ordered.length },
      announcement: "Combinando tus documentos en el orden indicado.",
    }));
    try {
      if (!worker.current) throw new PdfError("worker");
      const result = await worker.current.request(
        { type: "merge", ids: ordered },
        (progress) => {
          if (run === generation.current)
            setState((previous) => ({ ...previous, progress }));
        },
      );
      if (run !== generation.current) return;
      if (result.type !== "merged") throw new PdfError("worker");
      let blob: Blob;
      try {
        blob = new Blob([result.bytes], { type: "application/pdf" });
        resultUrl.current = URL.createObjectURL(blob);
      } catch (error) {
        // The worker has already released the originals. Require a fresh
        // selection if the browser cannot allocate a downloadable result.
        throw toPdfError(error, "worker");
      }
      releaseWorker();
      releasePreviews();
      setState((previous) => ({
        ...previous,
        phase: "completed",
        progress: null,
        result: {
          url: resultUrl.current!,
          size: blob.size,
          pageCount: result.pageCount,
          fileCount: ordered.length,
        },
        announcement: "Tu PDF está listo para descargar.",
      }));
    } catch (error) {
      if (run === generation.current) fail(error);
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  return {
    ...state,
    busy: state.phase === "validating" || state.phase === "merging",
    addFiles,
    removeFile,
    moveFile,
    merge,
    reset,
  };
}
