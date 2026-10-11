"use client";

import { useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { createImageThumbnail } from "@/lib/images/create-thumbnail";
import {
  detectImageMime,
  ImageError,
  toImageError,
} from "@/lib/images/validate-image";
import { ImagesPdfWorkerClient } from "@/lib/pdf/images-to-pdf-worker-client";
import { PdfError } from "@/lib/pdf/errors";
import type {
  ImageIssue,
  ImagePdfSettings,
  ImagesPdfResult,
  SelectedImage,
} from "@/types/images-to-pdf";

type Phase = "empty" | "loading" | "ready" | "processing" | "done" | "error";
const initialSettings: ImagePdfSettings = {
  pageSize: "a4",
  orientation: "auto",
  margin: "small",
  fit: "contain",
};

export function useImagesToPdf() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [issues, setIssues] = useState<ImageIssue[]>([]);
  const [settings, setSettings] = useState(initialSettings);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<ImagesPdfResult | null>(null);
  const [name, setName] = useState("archiva-imagenes.pdf");
  const [announcement, setAnnouncement] = useState("");
  const urls = useRef(new Map<string, string>());
  const worker = useRef<ImagesPdfWorkerClient | null>(null);
  const resultUrl = useRef<string | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);

  function releaseImages() {
    for (const url of urls.current.values()) URL.revokeObjectURL(url);
    urls.current.clear();
  }

  function release() {
    worker.current?.destroy();
    worker.current = null;
    releaseImages();
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
  }

  useEffect(
    () => () => {
      generation.current++;
      worker.current?.destroy();
      worker.current = null;
      for (const url of urls.current.values()) URL.revokeObjectURL(url);
      urls.current.clear();
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
      resultUrl.current = null;
    },
    [],
  );

  function reset() {
    generation.current++;
    release();
    locked.current = false;
    setPhase("empty");
    setImages([]);
    setIssues([]);
    setSettings(initialSettings);
    setProgress({ completed: 0, total: 0 });
    setResult(null);
    setName("archiva-imagenes.pdf");
    setAnnouncement("Listo para seleccionar nuevas imágenes.");
  }

  async function addFiles(files: File[]) {
    if (
      locked.current ||
      phase === "processing" ||
      phase === "done" ||
      !files.length
    )
      return;
    locked.current = true;
    const run = generation.current;
    const existing = new Set(images.map(({ fingerprint }) => fingerprint));
    const additions: SelectedImage[] = [];
    const nextIssues: ImageIssue[] = [];
    setPhase("loading");
    setIssues([]);
    setProgress({ completed: 0, total: files.length });
    setAnnouncement("Validando las imágenes seleccionadas.");

    for (const [index, file] of files.entries()) {
      if (run !== generation.current) return;
      const id = crypto.randomUUID();
      try {
        const fingerprint = `${file.name}\u0000${file.size}\u0000${file.type}`;
        if (existing.has(fingerprint)) {
          nextIssues.push({
            id,
            name: file.name,
            message: "Esta imagen ya está en la selección.",
          });
        } else {
          const bytes = await file.arrayBuffer().catch((error) => {
            throw toImageError(error, "read");
          });
          if (run !== generation.current) return;
          const mime = detectImageMime(new Uint8Array(bytes));
          const thumbnail = await createImageThumbnail(bytes, mime);
          if (run !== generation.current) return;
          const previewUrl = URL.createObjectURL(thumbnail.blob);
          urls.current.set(id, previewUrl);
          existing.add(fingerprint);
          additions.push({
            id,
            name: file.name,
            size: file.size,
            width: thumbnail.width,
            height: thumbnail.height,
            mime,
            rotation: 0,
            previewUrl,
            fingerprint,
            bytes,
          });
        }
      } catch (error) {
        const safe = toImageError(error, "invalid");
        nextIssues.push({ id, name: file.name, message: safe.message });
        if (safe.code === "memory") break;
      }
      setProgress({ completed: index + 1, total: files.length });
    }
    if (run !== generation.current) return;
    locked.current = false;
    if (additions.length) worker.current ??= new ImagesPdfWorkerClient();
    setImages((previous) => [...previous, ...additions]);
    setIssues(nextIssues);
    setPhase(nextIssues.length ? "error" : "ready");
    setAnnouncement(
      additions.length
        ? `${additions.length} ${additions.length === 1 ? "imagen añadida" : "imágenes añadidas"}.`
        : "No se añadieron imágenes.",
    );
  }

  function remove(id: string) {
    if (locked.current) return;
    const item = images.find((image) => image.id === id);
    const url = urls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(id);
    if (images.length === 1) {
      worker.current?.destroy();
      worker.current = null;
    }
    setImages((previous) => {
      const next = previous.filter((image) => image.id !== id);
      setPhase(next.length ? "ready" : "empty");
      return next;
    });
    setIssues([]);
    setAnnouncement(`${item?.name ?? "Imagen"} eliminada.`);
  }

  function clear() {
    if (locked.current) return;
    worker.current?.destroy();
    worker.current = null;
    releaseImages();
    setImages([]);
    setIssues([]);
    setPhase("empty");
    setAnnouncement("Selección vaciada.");
  }

  function reorder(activeId: string, overId: string) {
    if (locked.current || activeId === overId) return;
    setImages((previous) => {
      const from = previous.findIndex(({ id }) => id === activeId);
      const to = previous.findIndex(({ id }) => id === overId);
      if (from < 0 || to < 0) return previous;
      const next = arrayMove(previous, from, to);
      setAnnouncement(
        `Imagen movida a la posición ${to + 1} de ${next.length}.`,
      );
      return next;
    });
  }

  function move(id: string, offset: number) {
    if (locked.current) return;
    setImages((previous) => {
      const from = previous.findIndex((image) => image.id === id);
      const to = Math.max(0, Math.min(previous.length - 1, from + offset));
      if (from < 0 || from === to) return previous;
      setAnnouncement(`Imagen movida a la posición ${to + 1}.`);
      return arrayMove(previous, from, to);
    });
  }

  function rotate(id: string, amount: number) {
    if (locked.current) return;
    setImages((previous) =>
      previous.map((image) =>
        image.id === id
          ? { ...image, rotation: (image.rotation + amount) % 360 }
          : image,
      ),
    );
    setAnnouncement("Imagen girada.");
  }

  async function generate() {
    if (locked.current || !images.length) return;
    locked.current = true;
    const run = generation.current;
    setPhase("processing");
    setIssues([]);
    setProgress({ completed: 0, total: images.length });
    setAnnouncement("Creando el PDF localmente.");
    try {
      const client = worker.current ?? new ImagesPdfWorkerClient();
      worker.current = client;
      const response = await client.request(
        {
          type: "generate",
          settings,
          images: images.map(
            ({ id, mime, width, height, rotation, bytes }) => ({
              id,
              mime,
              width,
              height,
              rotation,
              bytes,
            }),
          ),
        },
        (completed, total) => {
          if (run === generation.current) setProgress({ completed, total });
        },
      );
      if (run !== generation.current) return;
      const blob = new Blob([response.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      client.destroy();
      worker.current = null;
      releaseImages();
      setImages([]);
      setResult({ url, size: blob.size, pageCount: response.pageCount });
      setPhase("done");
      setAnnouncement("Tu PDF está listo para descargar.");
    } catch (error) {
      if (run === generation.current) {
        const message =
          error instanceof ImageError || error instanceof PdfError
            ? error.message
            : "No pudimos crear el PDF con estas imágenes. Vuelve a seleccionarlas e inténtalo de nuevo.";
        worker.current?.destroy();
        worker.current = null;
        releaseImages();
        setImages([]);
        setPhase("error");
        setIssues([{ id: crypto.randomUUID(), message }]);
      }
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  return {
    phase,
    images,
    issues,
    settings,
    setSettings,
    progress,
    result,
    name,
    setName,
    announcement,
    busy: phase === "loading" || phase === "processing",
    addFiles,
    remove,
    clear,
    reorder,
    move,
    rotate,
    generate,
    reset,
  };
}
