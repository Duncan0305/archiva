"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { validatePdfFile } from "@/lib/pdf/validate-file";
import { SplitWorkerClient } from "@/lib/pdf/split-worker-client";
import { PdfToImagesSession } from "@/lib/pdf/pdf-to-images-session";
import {
  MAX_EXPORT_DPI,
  MIN_EXPORT_DPI,
} from "@/lib/pdf/pdf-to-images-layout";
import {
  PageRangeError,
  parseImagePageRanges,
} from "@/lib/pdf/parse-image-page-ranges";
import {
  effectiveDpi,
  imageDownloadName,
  supportsWebp,
} from "@/lib/images/image-formats";
import type {
  PdfImagePreview,
  PdfImageSource,
  PdfToImagesPhase,
  PdfToImagesSettings,
  RenderedPdfImage,
} from "@/types/pdf-to-images";

const initialSettings: PdfToImagesSettings = {
  format: "png",
  dpiPreset: "150",
  customDpi: 150,
  quality: 85,
  background: "white",
  backgroundColor: "#ffffff",
};

function renderingMessage(cause: unknown) {
  if (
    cause instanceof Error &&
    /demasiado grande|no puede generar imágenes WebP|no pudo codificar|formato de imagen diferente/i.test(
      cause.message,
    )
  )
    return cause.message;
  return toPdfError(cause, "render").message;
}

export function usePdfToImages() {
  const [phase, setPhase] = useState<PdfToImagesPhase>("empty");
  const [source, setSource] = useState<PdfImageSource | null>(null);
  const [sessionState, setSessionState] =
    useState<PdfToImagesSession | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [ranges, setRanges] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [settings, setSettings] =
    useState<PdfToImagesSettings>(initialSettings);
  const [baseName, setBaseNameState] = useState("archiva");
  const [previewPage, setPreviewPage] = useState(1);
  const [preview, setPreview] = useState<PdfImagePreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [webpSupported, setWebpSupported] = useState(true);
  const [results, setResults] = useState<RenderedPdfImage[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [announcement, setAnnouncement] = useState("");
  const session = useRef<PdfToImagesSession | null>(null);
  const abort = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const resultUrls = useRef<string[]>([]);
  const previewUrl = useRef<string | null>(null);
  const zipUrlRef = useRef<string | null>(null);

  useEffect(() => {
    void supportsWebp().then(setWebpSupported);
  }, []);

  function releaseResults() {
    for (const url of resultUrls.current) URL.revokeObjectURL(url);
    resultUrls.current = [];
    if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    zipUrlRef.current = null;
    setResults([]);
    setZipUrl(null);
  }

  function releasePreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  }

  function releaseAll() {
    abort.current?.abort();
    abort.current = null;
    session.current?.close();
    session.current = null;
    releaseResults();
    releasePreview();
  }

  useEffect(
    () => () => {
      generation.current++;
      abort.current?.abort();
      session.current?.close();
      for (const url of resultUrls.current) URL.revokeObjectURL(url);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    },
    [],
  );

  function reset() {
    generation.current++;
    releaseAll();
    locked.current = false;
    setPhase("empty");
    setSource(null);
    setSessionState(null);
    setSelected(new Set());
    setRanges("");
    setRangeError(null);
    setSettings(initialSettings);
    setBaseNameState("archiva");
    setPreviewPage(1);
    setError(null);
    setProgress({ completed: 0, total: 0 });
    setAnnouncement("Listo para elegir otro PDF.");
  }

  async function load(file: File) {
    if (locked.current) return;
    reset();
    locked.current = true;
    const run = generation.current;
    setPhase("loading");
    setAnnouncement(`Leyendo ${file.name}.`);
    try {
      validatePdfFile(file);
      const bytes = await file.arrayBuffer().catch((cause) => {
        throw toPdfError(cause, "read");
      });
      if (run !== generation.current) return;
      const renderBytes = bytes.slice(0);
      const validator = new SplitWorkerClient();
      let validation;
      try {
        validation = await validator.request({ type: "validate", bytes });
      } finally {
        validator.destroy();
      }
      if (run !== generation.current) return;
      if (validation.type !== "validated") throw new PdfError("worker");
      const nextSession = await PdfToImagesSession.open(renderBytes).catch(() => {
        throw new PdfError(
          "invalid",
          "El PDF es válido, pero no pudimos renderizar sus páginas. Prueba con otra copia del archivo.",
        );
      });
      if (nextSession.pageCount !== validation.pageCount) {
        nextSession.close();
        throw new PdfError("invalid");
      }
      if (run !== generation.current) {
        nextSession.close();
        return;
      }
      session.current = nextSession;
      setSessionState(nextSession);
      setSource({
        name: file.name,
        size: file.size,
        pageCount: validation.pageCount,
      });
      const all = new Set(
        Array.from({ length: validation.pageCount }, (_, index) => index + 1),
      );
      setSelected(all);
      setRanges(`1-${validation.pageCount}`);
      setPreviewPage(1);
      setPhase("ready");
      setAnnouncement(
        `${validation.pageCount} ${validation.pageCount === 1 ? "página lista" : "páginas listas"} para seleccionar.`,
      );
    } catch (cause) {
      if (run !== generation.current) return;
      releaseAll();
      setSessionState(null);
      setSource(null);
      setPhase("error");
      setError(toPdfError(cause, "read").message);
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  const selectedPages = useMemo(
    () => [...selected].sort((a, b) => a - b),
    [selected],
  );

  const settingsError = useMemo(() => {
    const dpi = effectiveDpi(settings);
    if (
      !Number.isFinite(dpi) ||
      dpi < MIN_EXPORT_DPI ||
      dpi > MAX_EXPORT_DPI
    )
      return `El DPI debe estar entre ${MIN_EXPORT_DPI} y ${MAX_EXPORT_DPI}.`;
    if (settings.quality < 1 || settings.quality > 100)
      return "La calidad debe estar entre 1 y 100.";
    if (
      settings.format !== "jpeg" &&
      settings.background === "custom" &&
      !/^#[0-9a-f]{6}$/i.test(settings.backgroundColor)
    )
      return "Escribe un color hexadecimal válido, por ejemplo #ffffff.";
    if (settings.format === "webp" && !webpSupported)
      return "Este navegador no puede generar WebP. Elige PNG o JPG.";
    if (!selectedPages.length) return "Selecciona al menos una página.";
    return null;
  }, [settings, selectedPages.length, webpSupported]);

  const activePreviewPage = selected.has(previewPage)
    ? previewPage
    : (selectedPages[0] ?? 1);

  useEffect(() => {
    if (
      !sessionState ||
      !selectedPages.length ||
      phase !== "ready" ||
      settingsError
    )
      return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPreviewBusy(true);
      void sessionState
        .renderPreview(activePreviewPage, settings, controller.signal)
        .then((rendered) => {
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(rendered.blob);
          if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
          previewUrl.current = url;
          setPreview({
            pageNumber: activePreviewPage,
            url,
            width: rendered.width,
            height: rendered.height,
            mime: rendered.mime,
          });
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setPreviewBusy(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    sessionState,
    selectedPages.length,
    activePreviewPage,
    settings,
    settingsError,
    phase,
  ]);

  function togglePage(page: number) {
    if (phase !== "ready") return;
    releasePreview();
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
    setRangeError(null);
  }

  function selectAll() {
    if (!source || phase !== "ready") return;
    releasePreview();
    setSelected(
      new Set(Array.from({ length: source.pageCount }, (_, index) => index + 1)),
    );
    setRangeError(null);
  }

  function deselectAll() {
    if (phase !== "ready") return;
    releasePreview();
    setSelected(new Set());
    setRangeError(null);
  }

  function applyRanges() {
    if (!source || phase !== "ready") return;
    try {
      const pages = parseImagePageRanges(ranges, source.pageCount);
      releasePreview();
      setSelected(new Set(pages));
      setPreviewPage(pages[0]);
      setRangeError(null);
      setAnnouncement(
        `${pages.length} ${pages.length === 1 ? "página seleccionada" : "páginas seleccionadas"} mediante rangos.`,
      );
    } catch (cause) {
      setRangeError(
        cause instanceof PageRangeError
          ? cause.message
          : "Revisa los rangos de páginas.",
      );
    }
  }

  function setBaseName(value: string) {
    setBaseNameState(value);
    if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    zipUrlRef.current = null;
    setZipUrl(null);
  }

  async function convert() {
    if (
      locked.current ||
      phase !== "ready" ||
      !source ||
      !session.current ||
      settingsError
    )
      return;
    locked.current = true;
    releaseResults();
    releasePreview();
    const run = generation.current;
    const controller = new AbortController();
    abort.current = controller;
    setPhase("processing");
    setError(null);
    setProgress({ completed: 0, total: selectedPages.length });
    setAnnouncement("Convirtiendo páginas localmente.");
    const outputs: RenderedPdfImage[] = [];
    try {
      for (let index = 0; index < selectedPages.length; index++) {
        const pageNumber = selectedPages[index];
        const rendered = await session.current.renderExport(
          pageNumber,
          settings,
          controller.signal,
        );
        if (run !== generation.current) return;
        if (controller.signal.aborted)
          throw new DOMException("Cancelled", "AbortError");
        const url = URL.createObjectURL(rendered.blob);
        resultUrls.current.push(url);
        outputs.push({
          pageNumber,
          name: imageDownloadName(
            baseName,
            pageNumber,
            source.pageCount,
            settings.format,
          ),
          blob: rendered.blob,
          url,
          width: rendered.width,
          height: rendered.height,
          mime: rendered.mime,
          size: rendered.blob.size,
        });
        setProgress({ completed: index + 1, total: selectedPages.length });
      }
      if (run !== generation.current) return;
      setResults(outputs);
      setPhase("done");
      setAnnouncement(
        `${outputs.length} ${outputs.length === 1 ? "imagen lista" : "imágenes listas"} para descargar.`,
      );
    } catch (cause) {
      for (const output of outputs) URL.revokeObjectURL(output.url);
      resultUrls.current = resultUrls.current.filter(
        (url) => !outputs.some((output) => output.url === url),
      );
      if (run === generation.current) {
        if (controller.signal.aborted) {
          setPhase("ready");
          setAnnouncement("Conversión cancelada. Puedes ajustar la configuración.");
        } else {
          setPhase("ready");
          setError(renderingMessage(cause));
        }
      }
    } finally {
      if (run === generation.current) {
        abort.current = null;
        locked.current = false;
      }
    }
  }

  function cancel() {
    if (phase !== "processing") return;
    abort.current?.abort();
  }

  async function prepareZip() {
    if (locked.current || results.length < 2 || zipUrlRef.current) return;
    locked.current = true;
    const run = generation.current;
    setPhase("zipping");
    setError(null);
    setAnnouncement("Preparando el ZIP en tu dispositivo.");
    try {
      const JSZip = (await import("jszip")).default;
      if (run !== generation.current) return;
      const zip = new JSZip();
      for (const result of results) {
        zip.file(
          imageDownloadName(
            baseName,
            result.pageNumber,
            source?.pageCount ?? result.pageNumber,
            settings.format,
          ),
          result.blob,
        );
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      if (run !== generation.current) return;
      const url = URL.createObjectURL(blob);
      zipUrlRef.current = url;
      setZipUrl(url);
      setPhase("done");
      setAnnouncement("El ZIP está listo para descargar.");
    } catch (cause) {
      if (run === generation.current) {
        setPhase("done");
        setError(toPdfError(cause, "memory").message);
      }
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  function edit() {
    releaseResults();
    setPhase("ready");
    setError(null);
    setAnnouncement("Puedes ajustar la selección o la configuración.");
  }

  return {
    phase,
    busy: phase === "loading" || phase === "processing" || phase === "zipping",
    source,
    session: sessionState,
    selected,
    selectedPages,
    togglePage,
    selectAll,
    deselectAll,
    ranges,
    setRanges,
    rangeError,
    applyRanges,
    settings,
    setSettings,
    settingsError,
    webpSupported,
    baseName,
    setBaseName,
    previewPage: activePreviewPage,
    setPreviewPage,
    preview,
    previewBusy,
    results,
    zipUrl,
    error,
    progress,
    announcement,
    load,
    convert,
    cancel,
    prepareZip,
    edit,
    reset,
  };
}
