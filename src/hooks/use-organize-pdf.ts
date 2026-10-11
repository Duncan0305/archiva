"use client";

import { useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useOrganizeHistory } from "./use-organize-history";
import { validatePdfFile } from "@/lib/pdf/validate-file";
import { PdfError, toPdfError } from "@/lib/pdf/errors";
import { PagePreviewSession } from "@/lib/pdf/page-preview-session";
import { OrganizeWorkerClient } from "@/lib/pdf/organize-worker-client";
import type { OrganizeResult, OrganizedPage } from "@/types/organize-pdf";

type Phase = "empty" | "loading" | "ready" | "processing" | "done" | "error";
interface SourceInfo {
  name: string;
  size: number;
  pageCount: number;
}

export function useOrganizePdf() {
  const history = useOrganizeHistory();
  const [phase, setPhase] = useState<Phase>("empty");
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [previewSession, setPreviewSession] =
    useState<PagePreviewSession | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<OrganizeResult | null>(null);
  const [name, setName] = useState("archiva-documento-organizado.pdf");
  const worker = useRef<OrganizeWorkerClient | null>(null);
  const preview = useRef<PagePreviewSession | null>(null);
  const resultUrl = useRef<string | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);

  function release() {
    worker.current?.destroy();
    worker.current = null;
    preview.current?.close();
    preview.current = null;
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
  }

  useEffect(
    () => () => {
      generation.current++;
      release();
    },
    [],
  );

  function reset() {
    generation.current++;
    release();
    locked.current = false;
    history.initialize([]);
    setPhase("empty");
    setSource(null);
    setPreviewSession(null);
    setSelected(new Set());
    setError(null);
    setProgress({ completed: 0, total: 0 });
    setResult(null);
    setName("archiva-documento-organizado.pdf");
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
      const client = new OrganizeWorkerClient();
      worker.current = client;
      const validation = await client.request({ type: "validate", bytes });
      if (run !== generation.current) return;
      if (validation.type !== "validated") throw new PdfError("worker");
      const session = await PagePreviewSession.open(previewBytes).catch(() => {
        throw new PdfError(
          "invalid",
          "El PDF es válido, pero no pudimos mostrar sus páginas. Prueba con otra copia.",
        );
      });
      if (run !== generation.current) {
        session.close();
        return;
      }
      const pages: OrganizedPage[] = Array.from(
        { length: validation.pageCount },
        (_, originalIndex) => ({
          id: crypto.randomUUID(),
          originalIndex,
          rotationDelta: 0,
        }),
      );
      preview.current = session;
      setPreviewSession(session);
      setSource({
        name: file.name,
        size: file.size,
        pageCount: validation.pageCount,
      });
      history.initialize(pages);
      setPhase("ready");
      setAnnouncement(`${validation.pageCount} páginas listas para organizar.`);
    } catch (cause) {
      if (run !== generation.current) return;
      release();
      setPhase("error");
      setError(toPdfError(cause, "read").message);
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  function toggle(id: string) {
    if (phase !== "ready") return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reorder(activeId: string, overId: string) {
    if (phase !== "ready" || activeId === overId) return;
    const from = history.pages.findIndex(({ id }) => id === activeId);
    const to = history.pages.findIndex(({ id }) => id === overId);
    if (from < 0 || to < 0) return;
    history.commit(arrayMove(history.pages, from, to));
    setAnnouncement(
      `Página movida a la posición ${to + 1} de ${history.pages.length}.`,
    );
  }

  function move(id: string, offset: number) {
    const from = history.pages.findIndex((page) => page.id === id);
    const to = Math.max(0, Math.min(history.pages.length - 1, from + offset));
    if (from < 0 || from === to) return;
    history.commit(arrayMove(history.pages, from, to));
    setAnnouncement(`Página movida a la posición ${to + 1}.`);
  }

  function rotate(ids: ReadonlySet<string>, amount: number) {
    if (!ids.size) return;
    history.commit((pages) =>
      pages.map((page) =>
        ids.has(page.id)
          ? { ...page, rotationDelta: (page.rotationDelta + amount) % 360 }
          : page,
      ),
    );
    setAnnouncement(
      `${ids.size} ${ids.size === 1 ? "página girada" : "páginas giradas"}.`,
    );
  }

  function remove(ids: ReadonlySet<string>) {
    if (!ids.size) return;
    if (ids.size >= history.pages.length) {
      setError("El documento debe conservar al menos una página.");
      return;
    }
    history.commit((pages) => pages.filter((page) => !ids.has(page.id)));
    setSelected((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setError(null);
    setAnnouncement(
      `${ids.size} ${ids.size === 1 ? "página eliminada" : "páginas eliminadas"}.`,
    );
  }

  function undo() {
    history.undo();
    setSelected(new Set());
    setError(null);
    setAnnouncement("Cambio deshecho.");
  }
  function redo() {
    history.redo();
    setSelected(new Set());
    setError(null);
    setAnnouncement("Cambio rehecho.");
  }
  function restore() {
    history.restore();
    setSelected(new Set());
    setError(null);
    setAnnouncement("Orden y rotaciones originales restaurados.");
  }

  async function exportPdf() {
    if (locked.current || phase !== "ready" || !history.pages.length) return;
    locked.current = true;
    const run = generation.current;
    setPhase("processing");
    setError(null);
    setProgress({ completed: 0, total: history.pages.length });
    setAnnouncement("Creando el PDF organizado en tu dispositivo.");
    try {
      if (!worker.current) throw new PdfError("worker");
      const response = await worker.current.request(
        { type: "organize", pages: history.pages },
        (completed, total) => {
          if (run === generation.current) setProgress({ completed, total });
        },
      );
      if (run !== generation.current) return;
      if (response.type !== "organized") throw new PdfError("worker");
      const blob = new Blob([response.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      worker.current.destroy();
      worker.current = null;
      preview.current?.close();
      preview.current = null;
      setPreviewSession(null);
      setResult({ url, size: blob.size, pageCount: response.pageCount });
      setPhase("done");
      setAnnouncement("Tu PDF organizado está listo para descargar.");
    } catch (cause) {
      if (run === generation.current) {
        release();
        setSource(null);
        setPreviewSession(null);
        setPhase("error");
        setError(toPdfError(cause, "organize").message);
      }
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  return {
    phase,
    source,
    preview: previewSession,
    pages: history.pages,
    selected,
    error,
    announcement,
    progress,
    result,
    name,
    setName,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    changed: history.changed,
    busy: phase === "loading" || phase === "processing",
    load,
    reset,
    toggle,
    reorder,
    move,
    selectAll: () => setSelected(new Set(history.pages.map(({ id }) => id))),
    deselectAll: () => setSelected(new Set()),
    rotate,
    remove,
    undo,
    redo,
    restore,
    exportPdf,
  };
}
