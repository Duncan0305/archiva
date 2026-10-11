"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Scissors,
  FileUp,
  LockKeyhole,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSplitPdf } from "@/hooks/use-split-pdf";
import { formatFileSize } from "@/lib/pdf/download";
import type { SplitMode } from "@/types/split-pdf";
import { PdfPageGrid } from "./pdf-page-grid";
import { SplitResults } from "./split-results";
import { cn } from "@/lib/utils";

const modes: { id: SplitMode; title: string; detail: string }[] = [
  {
    id: "selected",
    title: "Elegir páginas",
    detail: "Extrae las que marques en la vista.",
  },
  {
    id: "ranges",
    title: "Por rangos",
    detail: "Un PDF por cada rango escrito.",
  },
  {
    id: "every",
    title: "Cada N páginas",
    detail: "Divide en bloques del mismo tamaño.",
  },
];

export function SplitPdfTool() {
  const tool = useSplitPdf();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [inputIssue, setInputIssue] = useState<string | null>(null);
  const busy = tool.phase === "loading" || tool.phase === "processing";

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

  function filesChosen(files: File[]) {
    setInputIssue(null);
    if (files.length !== 1) {
      setInputIssue("Selecciona un solo PDF para dividirlo.");
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
        aria-label="Pasos: Seleccionar PDF, elegir modo, configurar, dividir y descargar"
      >
        <span>01 Seleccionar PDF</span>
        <ArrowRight className="size-3" />
        <span>02 Elegir modo</span>
        <ArrowRight className="size-3" />
        <span>03 Configurar</span>
        <ArrowRight className="size-3" />
        <span>04 Dividir</span>
        <ArrowRight className="size-3" />
        <span>05 Descargar</span>
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

      {tool.phase === "done" ? (
        <SplitResults
          results={tool.results}
          singleName={tool.singleName}
          onName={tool.setSingleName}
          zipUrl={tool.zipUrl}
          zipBusy={tool.zipBusy}
          onZip={() => void tool.prepareZip()}
          onReset={reset}
        />
      ) : (
        <>
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            aria-label="Seleccionar un PDF para dividir"
            disabled={busy}
            onChange={(event) => {
              filesChosen(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          {!tool.source ? (
            <section
              aria-labelledby="split-upload-title"
              data-testid="split-dropzone"
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = busy ? "none" : "copy";
                  setOver(true);
                }
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => {
                if (!event.dataTransfer.types.includes("Files")) return;
                event.preventDefault();
                setOver(false);
                if (!busy) filesChosen(Array.from(event.dataTransfer.files));
              }}
              className={cn(
                "flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center",
                over && "border-primary bg-secondary",
              )}
            >
              <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
                <FileUp className="size-7" strokeWidth={1.4} />
              </span>
              <h2
                id="split-upload-title"
                className="font-display text-xl font-semibold"
              >
                Tu PDF, página por página
              </h2>
              <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                Arrastra un PDF aquí o selecciónalo. Podrás ver sus páginas
                antes de dividir.
              </p>
              <Button
                className="mt-5 min-h-11"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                <FileUp className="size-4" />
                Seleccionar PDF
              </Button>
              {busy && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Leyendo y preparando las páginas…
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
                  {tool.source.pageCount === 1 ? "página" : "páginas"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  <RotateCcw className="size-3.5" />
                  Reemplazar PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={reset}
                >
                  <X className="size-3.5" />
                  Quitar
                </Button>
              </div>
            </section>
          )}

          {busy && (
            <section
              aria-label="Progreso de división"
              className="rounded-xl border border-border bg-secondary/50 p-5"
            >
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium"
              >
                {tool.phase === "loading"
                  ? "Validando el PDF y preparando las páginas…"
                  : `Documentos generados: ${tool.progress.completed} de ${tool.progress.total}.`}
              </p>
              {tool.phase === "processing" && (
                <progress
                  className="mt-3 h-2 w-full accent-primary"
                  aria-label="Documentos generados"
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
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-5">
                <fieldset
                  disabled={busy}
                  className="rounded-xl border border-border bg-card p-4 sm:p-6"
                >
                  <legend className="sr-only">Modo de división</legend>
                  <h2 className="mb-4 text-sm font-semibold">
                    ¿Cómo quieres dividirlo?
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {modes.map((option) => (
                      <label
                        key={option.id}
                        className={cn(
                          "relative block cursor-pointer rounded-lg border p-4 transition-colors focus-within:outline-2 focus-within:outline-ring",
                          tool.mode === option.id
                            ? "border-primary bg-secondary"
                            : "border-border hover:border-primary",
                        )}
                      >
                        <input
                          type="radio"
                          name="split-mode"
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                          checked={tool.mode === option.id}
                          onChange={() => tool.setMode(option.id)}
                        />
                        <span className="block text-xs font-semibold">
                          {option.title}
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                          {option.detail}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <section
                  aria-labelledby="split-config-title"
                  className="rounded-xl border border-border bg-card p-4 sm:p-6"
                >
                  <h2 id="split-config-title" className="text-sm font-semibold">
                    Configura la división
                  </h2>
                  {tool.mode === "selected" ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">
                          {tool.selected.size}
                        </strong>{" "}
                        de {tool.source.pageCount} páginas seleccionadas
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={tool.selectAll}
                        >
                          Seleccionar todas
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || !tool.selected.size}
                          onClick={tool.deselectAll}
                        >
                          Deseleccionar todas
                        </Button>
                      </div>
                    </div>
                  ) : tool.mode === "ranges" ? (
                    <div className="mt-4">
                      <label
                        htmlFor="split-ranges"
                        className="mb-2 block text-xs font-medium"
                      >
                        Rangos de páginas
                      </label>
                      <Input
                        id="split-ranges"
                        value={tool.ranges}
                        onChange={(event) => tool.setRanges(event.target.value)}
                        disabled={busy}
                        placeholder="1-3, 4-7, 8-10"
                        aria-describedby="range-help"
                        aria-invalid={!!tool.configuration.error}
                      />
                      <p
                        id="range-help"
                        className="mt-2 text-[11px] text-muted-foreground"
                      >
                        Escribe un rango por archivo; también puedes usar una
                        sola página, por ejemplo: 2, 5-7.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <label
                        htmlFor="split-every"
                        className="mb-2 block text-xs font-medium"
                      >
                        Páginas por documento
                      </label>
                      <Input
                        id="split-every"
                        type="text"
                        inputMode="numeric"
                        value={tool.every}
                        onChange={(event) => tool.setEvery(event.target.value)}
                        disabled={busy}
                        className="max-w-32"
                        aria-invalid={!!tool.configuration.error}
                      />
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        El último archivo incluirá las páginas restantes.
                      </p>
                    </div>
                  )}
                  {tool.configuration.error && (
                    <p className="mt-4 text-xs text-destructive" role="status">
                      {tool.configuration.error}
                    </p>
                  )}
                  {tool.configuration.groups.length > 0 && (
                    <div className="mt-5 border-t border-border pt-4">
                      <p className="text-xs font-semibold">
                        Resultado previsto: {tool.configuration.groups.length}{" "}
                        {tool.configuration.groups.length === 1 ? "PDF" : "PDF"}
                      </p>
                      <ol className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-muted-foreground">
                        {tool.configuration.groups.map((group, index) => (
                          <li key={index}>
                            PDF {index + 1} · {group.label}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </section>

                <PdfPageGrid
                  count={tool.source.pageCount}
                  session={tool.preview}
                  selected={
                    tool.mode === "selected" ? tool.selected : new Set()
                  }
                  selectable={tool.mode === "selected"}
                  disabled={busy}
                  onToggle={tool.togglePage}
                />
                <Button
                  className="min-h-11 w-full lg:hidden"
                  disabled={
                    busy ||
                    !!tool.configuration.error ||
                    !tool.configuration.groups.length
                  }
                  onClick={() => void tool.process()}
                >
                  <Scissors className="size-4" />
                  Dividir PDF
                </Button>
              </div>
              <aside className="space-y-5 lg:sticky lg:top-6">
                <section className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <Scissors className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold">Tu división</h2>
                  </div>
                  <p className="mt-5 text-xs leading-6 text-muted-foreground">
                    {tool.configuration.groups.length
                      ? `${tool.configuration.groups.length} ${tool.configuration.groups.length === 1 ? "archivo PDF" : "archivos PDF"} a partir de ${tool.source.pageCount} páginas.`
                      : "Configura las páginas para empezar."}
                  </p>
                  <Button
                    className="mt-5 hidden min-h-11 w-full lg:flex"
                    disabled={
                      busy ||
                      !!tool.configuration.error ||
                      !tool.configuration.groups.length
                    }
                    onClick={() => void tool.process()}
                  >
                    <Scissors className="size-4" />
                    Dividir PDF
                  </Button>
                </section>
                <section className="p-2">
                  <LockKeyhole
                    className="mb-3 size-5 text-primary"
                    strokeWidth={1.4}
                  />
                  <h2 className="text-xs font-semibold">
                    Tus documentos se quedan contigo
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Archiva procesa tus archivos directamente en tu dispositivo.
                    Tus documentos no se suben a nuestros servidores.
                  </p>
                  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    Solo se dibujan las miniaturas que vas viendo. Los PDF
                    grandes pueden necesitar más memoria.
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
