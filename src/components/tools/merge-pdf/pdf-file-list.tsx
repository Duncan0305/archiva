"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileText,
  GripVertical,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PdfFileInfo } from "@/types/pdf";
import { formatFileSize } from "@/lib/pdf/download";
import { cn } from "@/lib/utils";

interface Props {
  files: PdfFileInfo[];
  disabled: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, index: number) => void;
}

export function PdfFileList({ files, disabled, onRemove, onMove }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = files.find((file) => file.id === expanded);

  useEffect(() => {
    if (!selected) return;
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, [selected]);
  return (
    <section
      aria-labelledby="files-title"
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="mb-4">
        <h2 id="files-title" className="text-sm font-semibold">
          El orden lo decides tú
        </h2>
        <p
          id="order-help"
          className="mt-1.5 text-xs leading-5 text-muted-foreground"
        >
          Usa las flechas para ordenar. En escritorio también puedes arrastrar
          desde el asa.
        </p>
      </div>
      <ol
        aria-label="Documentos seleccionados"
        aria-describedby="order-help"
        className="space-y-2"
      >
        {files.map((file, index) => (
          <li
            key={file.id}
            data-file-id={file.id}
            onDragOver={(event) => {
              if (
                !disabled &&
                dragging &&
                !event.dataTransfer.types.includes("Files")
              ) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setTarget(file.id);
              }
            }}
            onDrop={(event) => {
              if (!disabled && dragging) {
                event.preventDefault();
                onMove(dragging, index);
              }
              setDragging(null);
              setTarget(null);
            }}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3 transition-colors",
              target === file.id &&
                dragging !== file.id &&
                "border-primary bg-secondary",
              dragging === file.id && "opacity-60",
            )}
          >
            <button
              type="button"
              draggable={!disabled}
              disabled={disabled}
              aria-label={`Mover ${file.name}`}
              aria-describedby="order-help"
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                  event.preventDefault();
                  onMove(file.id, index + (event.key === "ArrowUp" ? -1 : 1));
                }
              }}
              onDragStart={(event) => {
                if (disabled) {
                  event.preventDefault();
                  return;
                }
                setDragging(file.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(
                  "application/x-archiva-pdf",
                  file.id,
                );
              }}
              onDragEnd={() => {
                setDragging(null);
                setTarget(null);
              }}
              className="hidden size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground disabled:opacity-40 sm:flex"
            >
              <GripVertical className="size-4" />
            </button>
            <span
              className="w-5 shrink-0 text-center text-xs font-medium text-muted-foreground tabular-nums"
              aria-label={`Posición ${index + 1}`}
            >
              {index + 1}
            </span>
            <button
              type="button"
              disabled={disabled || file.preview.status !== "ready"}
              aria-label={`Ampliar portada de ${file.name}`}
              onClick={() => setExpanded(file.id)}
              className="relative flex h-[112px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white shadow-sm disabled:cursor-default"
            >
              {file.preview.status === "ready" && file.preview.url ? (
                <div
                  role="img"
                  aria-label={`Primera página de ${file.name}`}
                  className="size-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${file.preview.url}")` }}
                />
              ) : (
                <div className="flex flex-col items-center gap-1 px-1 text-center text-[9px] leading-3 text-muted-foreground">
                  <FileText
                    className="size-5 text-primary"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>
                    {file.preview.status === "loading"
                      ? "Cargando"
                      : "Sin vista previa"}
                  </span>
                </div>
              )}
              {file.preview.status === "ready" && (
                <Maximize2
                  className="absolute right-1 bottom-1 size-4 rounded bg-white/90 p-0.5 text-primary"
                  aria-hidden="true"
                />
              )}
            </button>
            <div className="min-w-0 flex-1 basis-24">
              <p className="text-xs leading-5 font-medium [overflow-wrap:anywhere]">
                {file.name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatFileSize(file.size)} · {file.pageCount}{" "}
                {file.pageCount === 1 ? "página" : "páginas"}
              </p>
            </div>
            <div className="ml-auto flex basis-full items-center justify-end gap-0.5 min-[480px]:basis-auto">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                disabled={disabled || index === 0}
                aria-label={`Subir ${file.name}`}
                onClick={() => onMove(file.id, index - 1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                disabled={disabled || index === files.length - 1}
                aria-label={`Bajar ${file.name}`}
                onClick={() => onMove(file.id, index + 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 text-muted-foreground"
                disabled={disabled}
                aria-label={`Eliminar ${file.name}`}
                onClick={() => onRemove(file.id)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <dialog
        ref={dialog}
        onClose={() => setExpanded(null)}
        aria-label={
          selected ? `Portada de ${selected.name}` : "Portada del PDF"
        }
        className="m-auto max-h-[92dvh] w-[min(92vw,680px)] overflow-auto rounded-xl border border-border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/70 sm:p-7"
      >
        {selected?.preview.url && (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold [overflow-wrap:anywhere]">
                  {selected.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Primera página · {selected.pageCount}{" "}
                  {selected.pageCount === 1 ? "página" : "páginas"} en total
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Cerrar vista previa"
                onClick={() => dialog.current?.close()}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div
              role="img"
              aria-label={`Primera página ampliada de ${selected.name}`}
              className="mx-auto aspect-[3/4] max-h-[70dvh] w-full bg-white bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${selected.preview.url}")` }}
            />
          </>
        )}
      </dialog>
    </section>
  );
}
