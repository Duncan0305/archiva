"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CompressionAttempt,
  CompressionLevel,
  CompressionPhase,
  CompressionResult,
  CompressionSource,
} from "@/types/compress-pdf";
import { CompressionWorkerClient } from "@/lib/pdf/compression-worker-client";
import { validatePdfFile } from "@/lib/pdf/validate-file";
import { renderPdfCover } from "@/lib/pdf/render-cover";
import { PdfError, toPdfError } from "@/lib/pdf/errors";

export function useCompressPdf() {
  const [phase, setPhase] = useState<CompressionPhase>("empty");
  const [source, setSource] = useState<CompressionSource | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("balanced");
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [attempt, setAttempt] = useState<CompressionAttempt | null>(null);
  const [name, setName] = useState("archiva-pdf-comprimido.pdf");
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const worker = useRef<CompressionWorkerClient | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const previewUrl = useRef<string | null>(null);
  const resultUrl = useRef<string | null>(null);
  const resultPreviewUrl = useRef<string | null>(null);

  function releaseUrls() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    if (resultPreviewUrl.current) URL.revokeObjectURL(resultPreviewUrl.current);
    previewUrl.current = null;
    resultUrl.current = null;
    resultPreviewUrl.current = null;
  }

  function release() {
    worker.current?.destroy();
    worker.current = null;
    releaseUrls();
  }

  useEffect(
    () => () => {
      generation.current++;
      worker.current?.destroy();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
      if (resultPreviewUrl.current)
        URL.revokeObjectURL(resultPreviewUrl.current);
    },
    [],
  );

  function reset() {
    generation.current++;
    release();
    locked.current = false;
    setPhase("empty");
    setSource(null);
    setLevel("balanced");
    setSourcePreview(null);
    setResult(null);
    setAttempt(null);
    setName("archiva-pdf-comprimido.pdf");
    setError(null);
    setAnnouncement("Listo para elegir otro PDF.");
  }

  async function load(file: File) {
    if (locked.current) return;
    reset();
    locked.current = true;
    const run = generation.current;
    const previewAbort = new AbortController();
    setPhase("loading");
    setAnnouncement(`Validando y analizando ${file.name}.`);
    try {
      validatePdfFile(file);
      const bytes = await file.arrayBuffer().catch((cause) => {
        throw toPdfError(cause, "read");
      });
      if (run !== generation.current) return;
      const previewBytes = bytes.slice(0);
      const client = new CompressionWorkerClient();
      worker.current = client;
      const response = await client.request({ type: "validate", bytes });
      if (run !== generation.current) return;
      if (response.type !== "validated") throw new PdfError("worker");
      let coverUrl: string | null = null;
      try {
        const cover = await renderPdfCover(previewBytes, previewAbort.signal);
        if (run !== generation.current) return;
        coverUrl = URL.createObjectURL(cover);
        previewUrl.current = coverUrl;
      } catch {
        coverUrl = null;
      }
      if (run !== generation.current) return;
      setSource({
        name: file.name,
        size: file.size,
        ...response.analysis,
      });
      setSourcePreview(coverUrl);
      setLevel("balanced");
      setPhase("ready");
      setAnnouncement(
        `${response.analysis.pageCount} ${response.analysis.pageCount === 1 ? "página analizada" : "páginas analizadas"}.`,
      );
    } catch (cause) {
      if (run !== generation.current) return;
      release();
      setSource(null);
      setSourcePreview(null);
      setPhase("error");
      setError(toPdfError(cause, "read").message);
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  function releaseResult() {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    if (resultPreviewUrl.current) URL.revokeObjectURL(resultPreviewUrl.current);
    resultUrl.current = null;
    resultPreviewUrl.current = null;
    setResult(null);
    setAttempt(null);
  }

  async function compress() {
    if (locked.current || phase !== "ready" || !source || !worker.current)
      return;
    if (level === "high" && source.imageCount === 0) return;
    locked.current = true;
    const run = generation.current;
    releaseResult();
    setPhase("processing");
    setError(null);
    setAnnouncement("Optimizando la estructura del PDF en tu dispositivo.");
    try {
      const response = await worker.current.request(
        { type: "compress", level },
        (stage) => {
          if (run !== generation.current) return;
          if (stage === "validating") {
            setPhase("validating");
            setAnnouncement("Validando el PDF optimizado.");
          }
        },
      );
      if (run !== generation.current) return;
      if (response.type !== "compressed") throw new PdfError("worker");
      const attemptedSize = response.bytes.byteLength;
      if (attemptedSize >= source.size) {
        setAttempt({
          originalSize: source.size,
          attemptedSize,
          difference: attemptedSize - source.size,
          level,
        });
        setPhase("no-reduction");
        setAnnouncement("El documento no obtuvo una reducción real.");
        return;
      }
      const previewBytes = response.bytes.slice(0);
      const blob = new Blob([response.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      let coverUrl: string | null = null;
      const controller = new AbortController();
      try {
        const cover = await renderPdfCover(previewBytes, controller.signal);
        if (run !== generation.current) return;
        coverUrl = URL.createObjectURL(cover);
        resultPreviewUrl.current = coverUrl;
      } catch {
        URL.revokeObjectURL(url);
        resultUrl.current = null;
        throw new PdfError("compress");
      }
      const savedBytes = source.size - blob.size;
      setResult({
        url,
        blob,
        originalSize: source.size,
        compressedSize: blob.size,
        savedBytes,
        savedPercent: (savedBytes / source.size) * 100,
        pageCount: response.pageCount,
        level,
        previewUrl: coverUrl,
      });
      setPhase("done");
      setAnnouncement("PDF optimizado y validado, listo para descargar.");
    } catch (cause) {
      if (run === generation.current) {
        const safe = toPdfError(cause, "compress");
        setError(safe.message);
        setPhase("ready");
      }
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  function retry() {
    releaseResult();
    setError(null);
    setPhase("ready");
    setAnnouncement("Puedes probar otro nivel de compresión.");
  }

  function cancel() {
    if (phase !== "processing" && phase !== "validating") return;
    reset();
  }

  return {
    phase,
    busy:
      phase === "loading" || phase === "processing" || phase === "validating",
    source,
    sourcePreview,
    level,
    setLevel,
    result,
    attempt,
    name,
    setName,
    error,
    announcement,
    load,
    compress,
    retry,
    cancel,
    reset,
  };
}
