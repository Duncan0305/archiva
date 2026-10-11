"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PageGroup, SplitMode, SplitResult } from "@/types/split-pdf";
import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { validatePdfFile } from "@/lib/pdf/validate-file";
import { PagePreviewSession } from "@/lib/pdf/page-preview-session";
import {
  PageRangeError,
  groupsEveryN,
  parsePageRanges,
  selectedGroup,
} from "@/lib/pdf/parse-page-ranges";
import { SplitWorkerClient } from "@/lib/pdf/split-worker-client";

type Phase = "empty" | "loading" | "ready" | "processing" | "done" | "error";
interface Source {
  name: string;
  size: number;
  pageCount: number;
}

export function useSplitPdf() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [source, setSource] = useState<Source | null>(null);
  const [previewSession, setPreviewSession] =
    useState<PagePreviewSession | null>(null);
  const [mode, setMode] = useState<SplitMode>("selected");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [ranges, setRanges] = useState("");
  const [every, setEvery] = useState("1");
  const [results, setResults] = useState<SplitResult[]>([]);
  const [singleName, setSingleName] = useState("archiva-paginas-extraidas.pdf");
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [announcement, setAnnouncement] = useState("");
  const worker = useRef<SplitWorkerClient | null>(null);
  const preview = useRef<PagePreviewSession | null>(null);
  const resultUrls = useRef<string[]>([]);
  const zipUrlRef = useRef<string | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);

  function release() {
    worker.current?.destroy();
    worker.current = null;
    preview.current?.close();
    preview.current = null;
    for (const url of resultUrls.current) URL.revokeObjectURL(url);
    resultUrls.current = [];
    if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    zipUrlRef.current = null;
  }

  useEffect(
    () => () => {
      generation.current++;
      worker.current?.destroy();
      preview.current?.close();
      for (const url of resultUrls.current) URL.revokeObjectURL(url);
      if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    },
    [],
  );

  function reset() {
    generation.current++;
    release();
    locked.current = false;
    setPhase("empty");
    setSource(null);
    setPreviewSession(null);
    setMode("selected");
    setSelected(new Set());
    setRanges("");
    setEvery("1");
    setResults([]);
    setZipUrl(null);
    setZipBusy(false);
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
      const previewBytes = bytes.slice(0);
      const client = new SplitWorkerClient();
      worker.current = client;
      const validation = await client.request({ type: "validate", bytes });
      if (run !== generation.current) return;
      if (validation.type !== "validated") throw new PdfError("worker");
      let session: PagePreviewSession;
      try {
        session = await PagePreviewSession.open(previewBytes);
      } catch {
        throw new PdfError(
          "invalid",
          "El PDF es válido, pero no pudimos mostrar sus páginas. Prueba con otra copia del archivo.",
        );
      }
      if (run !== generation.current) {
        session.close();
        return;
      }
      preview.current = session;
      setPreviewSession(session);
      setSource({
        name: file.name,
        size: file.size,
        pageCount: validation.pageCount,
      });
      setRanges(`1-${validation.pageCount}`);
      setPhase("ready");
      setAnnouncement(`${validation.pageCount} páginas listas para revisar.`);
    } catch (cause) {
      if (run !== generation.current) return;
      release();
      setPhase("error");
      setError(toPdfError(cause, "read").message);
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  const configuration = useMemo((): {
    groups: PageGroup[];
    error: string | null;
  } => {
    if (!source) return { groups: [], error: null };
    try {
      if (mode === "selected")
        return {
          groups: selectedGroup(selected),
          error: selected.size
            ? null
            : "Selecciona al menos una página en las miniaturas.",
        };
      if (mode === "ranges")
        return {
          groups: parsePageRanges(ranges, source.pageCount),
          error: null,
        };
      return { groups: groupsEveryN(every, source.pageCount), error: null };
    } catch (cause) {
      return {
        groups: [],
        error:
          cause instanceof PageRangeError
            ? cause.message
            : "Revisa la configuración de páginas.",
      };
    }
  }, [source, mode, selected, ranges, every]);

  function togglePage(page: number) {
    if (phase !== "ready" || mode !== "selected") return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  }

  async function process() {
    if (
      locked.current ||
      phase !== "ready" ||
      !source ||
      configuration.error ||
      !configuration.groups.length
    )
      return;
    locked.current = true;
    const run = generation.current;
    const groups = configuration.groups;
    setPhase("processing");
    setError(null);
    setProgress({ completed: 0, total: groups.length });
    setAnnouncement("Dividiendo el PDF en tu dispositivo.");
    try {
      if (!worker.current) throw new PdfError("worker");
      const response = await worker.current.request(
        { type: "split", groups: groups.map(({ pages }) => pages) },
        (completed, total) => {
          if (run === generation.current) setProgress({ completed, total });
        },
      );
      if (run !== generation.current) return;
      if (response.type !== "split") throw new PdfError("worker");
      const outputs = response.outputs.map((output, index) => {
        const blob = new Blob([output.bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        resultUrls.current.push(url);
        const name =
          groups.length === 1
            ? mode === "selected"
              ? "archiva-paginas-extraidas.pdf"
              : "archiva-documento-dividido.pdf"
            : mode === "ranges"
              ? `archiva-rango-${String(index + 1).padStart(2, "0")}.pdf`
              : `archiva-parte-${String(index + 1).padStart(2, "0")}.pdf`;
        return {
          id: crypto.randomUUID(),
          name,
          pages: output.pages,
          size: blob.size,
          url,
          blob,
        };
      });
      setSingleName(outputs[0].name);
      worker.current.destroy();
      worker.current = null;
      preview.current?.close();
      preview.current = null;
      setPreviewSession(null);
      setResults(outputs);
      setPhase("done");
      setAnnouncement(
        `${outputs.length} ${outputs.length === 1 ? "PDF listo" : "PDF listos"} para descargar.`,
      );
    } catch (cause) {
      if (run === generation.current) {
        const safe = toPdfError(cause, "split");
        release();
        setSource(null);
        setPreviewSession(null);
        setResults([]);
        setError(safe.message);
        setPhase("error");
      }
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  async function prepareZip() {
    if (locked.current || results.length < 2 || zipUrlRef.current) return;
    locked.current = true;
    const run = generation.current;
    setZipBusy(true);
    setError(null);
    try {
      const JSZip = (await import("jszip")).default;
      if (run !== generation.current) return;
      const zip = new JSZip();
      for (const result of results) zip.file(result.name, result.blob);
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
      });
      if (run !== generation.current) return;
      const url = URL.createObjectURL(blob);
      zipUrlRef.current = url;
      setZipUrl(url);
      setAnnouncement("El ZIP está listo para descargar.");
    } catch (cause) {
      if (run === generation.current)
        setError(toPdfError(cause, "memory").message);
    } finally {
      if (run === generation.current) {
        locked.current = false;
        setZipBusy(false);
      }
    }
  }

  return {
    phase,
    source,
    mode,
    setMode,
    selected,
    togglePage,
    selectAll: () =>
      source &&
      setSelected(
        new Set(Array.from({ length: source.pageCount }, (_, i) => i + 1)),
      ),
    deselectAll: () => setSelected(new Set()),
    ranges,
    setRanges,
    every,
    setEvery,
    configuration,
    results,
    singleName,
    setSingleName,
    zipUrl,
    zipBusy,
    error,
    progress,
    announcement,
    preview: previewSession,
    load,
    process,
    prepareZip,
    reset,
  };
}
