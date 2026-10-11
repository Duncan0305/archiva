"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  FileUp,
  History,
  LayoutGrid,
  LockKeyhole,
  Redo2,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/pdf/download";
import { useOrganizePdf } from "@/hooks/use-organize-pdf";
import { cn } from "@/lib/utils";
import { SortablePageGrid } from "./sortable-page-grid";
import { SelectionToolbar } from "./selection-toolbar";
import { OrganizeResult } from "./organize-result";

export function OrganizePdfTool() {
  const tool = useOrganizePdf();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [inputIssue, setInputIssue] = useState<string | null>(null);

  useEffect(() => {
    const prevent = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  function choose(files: File[]) {
    setInputIssue(null);
    if (files.length !== 1) {
      setInputIssue("Selecciona un solo PDF para organizarlo.");
      return;
    }
    void tool.load(files[0]);
  }

  function reset() {
    setInputIssue(null);
    tool.reset();
  }

  return (
    <div className="space-y-5">
      <div
        className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground"
        aria-label="Pasos: cargar PDF, organizar páginas, editar y descargar"
      >
        <span>01 Cargar PDF</span>
        <ArrowRight className="size-3" />
        <span>02 Arrastrar y organizar</span>
        <ArrowRight className="size-3" />
        <span>03 Editar páginas</span>
        <ArrowRight className="size-3" />
        <span>04 Descargar</span>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {tool.announcement}
      </p>
      {(tool.error || inputIssue) && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-card p-4 text-xs leading-6 text-destructive"
        >
          <AlertCircle className="mt-1 size-4 shrink-0" />
          {tool.error || inputIssue}
        </div>
      )}

      {tool.phase === "done" && tool.result ? (
        <OrganizeResult
          result={tool.result}
          name={tool.name}
          onName={tool.setName}
          onReset={reset}
        />
      ) : (
        <>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            aria-label="Seleccionar un PDF para organizar"
            disabled={tool.busy}
            onChange={(event) => {
              choose(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          {!tool.source ? (
            <section
              aria-labelledby="organize-upload-title"
              data-testid="organize-dropzone"
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = tool.busy ? "none" : "copy";
                  setOver(true);
                }
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => {
                if (!event.dataTransfer.types.includes("Files")) return;
                event.preventDefault();
                setOver(false);
                if (!tool.busy) choose(Array.from(event.dataTransfer.files));
              }}
              className={cn(
                "flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center",
                over && "border-primary bg-secondary",
              )}
            >
              <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
                <LayoutGrid className="size-7" strokeWidth={1.4} />
              </span>
              <h2
                id="organize-upload-title"
                className="font-display text-xl font-semibold"
              >
                Cada página, en su lugar
              </h2>
              <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                Arrastra un PDF aquí o selecciónalo para ordenar, girar y quitar
                páginas.
              </p>
              <Button
                className="mt-5 min-h-11"
                disabled={tool.busy}
                onClick={() => input.current?.click()}
              >
                <FileUp className="size-4" />
                Seleccionar PDF
              </Button>
              {tool.busy && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Validando el PDF y preparando sus páginas…
                </p>
              )}
            </section>
          ) : (
            <section
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
              aria-label="Documento de origen"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold [overflow-wrap:anywhere]">
                  {tool.source.name}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatFileSize(tool.source.size)} · {tool.source.pageCount}{" "}
                  {tool.source.pageCount === 1
                    ? "página original"
                    : "páginas originales"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tool.busy}
                  onClick={() => input.current?.click()}
                >
                  <RotateCcw className="size-3.5" />
                  Reemplazar PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={tool.busy}
                  onClick={reset}
                >
                  <X className="size-3.5" />
                  Quitar
                </Button>
              </div>
            </section>
          )}

          {tool.busy && (
            <section
              aria-label="Progreso de organización"
              className="rounded-xl border border-border bg-secondary/50 p-5"
            >
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium"
              >
                {tool.phase === "loading"
                  ? "Validando el PDF y preparando las páginas…"
                  : `Páginas preparadas: ${tool.progress.completed} de ${tool.progress.total}.`}
              </p>
              {tool.phase === "processing" && (
                <progress
                  className="mt-3 h-2 w-full accent-primary"
                  aria-label="Páginas preparadas"
                  value={tool.progress.completed}
                  max={tool.progress.total}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={reset}
              >
                <X className="size-3.5" />
                Cancelar y vaciar
              </Button>
            </section>
          )}

          {tool.source && tool.preview && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-4">
                <section
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3"
                  aria-label="Historial y selección"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={tool.busy || !tool.canUndo}
                    onClick={tool.undo}
                  >
                    <Undo2 className="size-3.5" />
                    Deshacer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={tool.busy || !tool.canRedo}
                    onClick={tool.redo}
                  >
                    <Redo2 className="size-3.5" />
                    Rehacer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={tool.busy || !tool.changed}
                    onClick={tool.restore}
                  >
                    <History className="size-3.5" />
                    Restablecer original
                  </Button>
                  <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      tool.busy || tool.selected.size === tool.pages.length
                    }
                    onClick={tool.selectAll}
                  >
                    Seleccionar todas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={tool.busy || !tool.selected.size}
                    onClick={tool.deselectAll}
                  >
                    Deseleccionar
                  </Button>
                </section>
                <SelectionToolbar
                  count={tool.selected.size}
                  disabled={tool.busy}
                  onLeft={() => tool.rotate(tool.selected, -90)}
                  onRight={() => tool.rotate(tool.selected, 90)}
                  onDelete={() => tool.remove(tool.selected)}
                  onClear={tool.deselectAll}
                />
                <SortablePageGrid
                  pages={tool.pages}
                  session={tool.preview}
                  selected={tool.selected}
                  disabled={tool.busy}
                  onToggle={tool.toggle}
                  onReorder={tool.reorder}
                  onMove={tool.move}
                  onRotate={tool.rotate}
                  onRemove={tool.remove}
                />
                <Button
                  className="min-h-11 w-full lg:hidden"
                  disabled={tool.busy || !tool.pages.length}
                  onClick={() => void tool.exportPdf()}
                >
                  <LayoutGrid className="size-4" />
                  Crear PDF organizado
                </Button>
              </div>
              <aside className="space-y-5 lg:sticky lg:top-6">
                <section className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold">Tu organización</h2>
                  </div>
                  <p className="mt-5 text-xs leading-6 text-muted-foreground">
                    {tool.pages.length}{" "}
                    {tool.pages.length === 1
                      ? "página conservada"
                      : "páginas conservadas"}
                    .{" "}
                    {tool.changed
                      ? "Hay cambios listos para aplicar."
                      : "El documento mantiene su orden original."}
                  </p>
                  <Button
                    className="mt-5 hidden min-h-11 w-full lg:flex"
                    disabled={tool.busy || !tool.pages.length}
                    onClick={() => void tool.exportPdf()}
                  >
                    <LayoutGrid className="size-4" />
                    Crear PDF organizado
                  </Button>
                </section>
                <section className="p-2">
                  <LockKeyhole
                    className="mb-3 size-5 text-primary"
                    strokeWidth={1.4}
                  />
                  <h2 className="text-xs font-semibold">
                    El documento no sale de tu dispositivo
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    El orden, las rotaciones y el resultado se procesan
                    localmente en tu navegador.
                  </p>
                  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    Las miniaturas se cargan a medida que recorres el documento
                    para reducir el uso de memoria.
                  </p>
                </section>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
