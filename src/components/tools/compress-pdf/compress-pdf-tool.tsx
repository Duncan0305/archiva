"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  FileDown,
  FileUp,
  Info,
  LockKeyhole,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompressPdf } from "@/hooks/use-compress-pdf";
import { formatFileSize } from "@/lib/pdf/download";
import { cn } from "@/lib/utils";
import { CompressionSettings } from "./compression-settings";
import { PdfInformation } from "./pdf-information";
import { CompressionResultView } from "./compression-result";

export function CompressPdfTool() {
  const tool = useCompressPdf();
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [over, setOver] = useState(false);

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
    if (files[0]) void tool.load(files[0]);
  }

  return (
    <div className="space-y-5">
      <div
        className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground"
        aria-label="Pasos: seleccionar PDF, elegir compresión, comprimir, comparar y descargar"
      >
        <span>01 Seleccionar PDF</span>
        <ArrowRight className="size-3" />
        <span>02 Elegir compresión</span>
        <ArrowRight className="size-3" />
        <span>03 Comprimir</span>
        <ArrowRight className="size-3" />
        <span>04 Comparar</span>
        <ArrowRight className="size-3" />
        <span>05 Descargar</span>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {tool.announcement}
      </p>

      {tool.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-card p-4 text-xs leading-6 text-destructive"
        >
          <AlertCircle className="mt-1 size-4 shrink-0" />
          <div>
            <p className="font-medium">No pudimos completar la optimización</p>
            <p>{tool.error}</p>
          </div>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label="Seleccionar PDF para comprimir"
        disabled={tool.busy}
        onChange={(event) => {
          choose(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      {!tool.source && tool.phase !== "done" ? (
        <section
          data-testid="compress-dropzone"
          aria-labelledby="compress-upload-title"
          onDragEnter={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            if (!tool.busy) {
              dragDepth.current++;
              setOver(true);
            }
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = tool.busy ? "none" : "copy";
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setOver(false);
          }}
          onDrop={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            dragDepth.current = 0;
            setOver(false);
            if (!tool.busy) choose(Array.from(event.dataTransfer.files));
          }}
          className={cn(
            "flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center transition-colors",
            over && "border-primary bg-secondary",
          )}
        >
          <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <FileDown className="size-7" strokeWidth={1.4} />
          </span>
          <h2
            id="compress-upload-title"
            className="font-display text-xl font-semibold"
          >
            Menos peso, el mismo documento
          </h2>
          <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">
            Archiva optimiza la estructura y los flujos compatibles sin convertir
            todas las páginas en imágenes.
          </p>
          <Button
            className="mt-5 min-h-11"
            disabled={tool.busy}
            onClick={() => input.current?.click()}
          >
            <FileUp className="size-4" />
            Seleccionar PDF
          </Button>
          {tool.phase === "loading" ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Validando y analizando el documento…
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Un PDF sin contraseña por operación.
            </p>
          )}
        </section>
      ) : tool.phase === "done" && tool.result ? (
        <CompressionResultView
          result={tool.result}
          name={tool.name}
          onName={tool.setName}
          onRetry={tool.retry}
          onReset={tool.reset}
        />
      ) : tool.source ? (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{tool.source.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatFileSize(tool.source.size)} · {tool.source.pageCount}{" "}
                {tool.source.pageCount === 1 ? "página" : "páginas"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={tool.busy}
                onClick={() => input.current?.click()}
              >
                <RefreshCw className="size-3.5" />
                Reemplazar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={tool.busy}
                onClick={tool.reset}
              >
                <Trash2 className="size-3.5" />
                Quitar PDF
              </Button>
            </div>
          </section>

          {(tool.phase === "processing" || tool.phase === "validating") && (
            <section
              aria-label="Progreso de compresión"
              className="rounded-xl border border-border bg-secondary/50 p-5"
            >
              <p role="status" aria-live="polite" className="text-sm font-medium">
                {tool.phase === "processing"
                  ? "Comprimiendo el PDF localmente…"
                  : "Validando el documento optimizado…"}
              </p>
              <progress
                className="mt-3 h-2 w-full accent-primary"
                aria-label="Compresión en curso"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                QPDF no informa un porcentaje fiable para esta operación; el
                indicador permanecerá indeterminado.
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={tool.cancel}>
                <X className="size-3.5" />
                Cancelar y vaciar
              </Button>
            </section>
          )}

          {tool.phase === "no-reduction" && tool.attempt && (
            <section
              role="status"
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">
                    Este PDF ya parece estar optimizado
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    El intento produjo {formatFileSize(tool.attempt.attemptedSize)},
                    frente a {formatFileSize(tool.attempt.originalSize)} del
                    original. Conserva el archivo original como la mejor opción.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={tool.retry}
                  >
                    Probar otro nivel
                  </Button>
                </div>
              </div>
            </section>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <PdfInformation
                source={tool.source}
                previewUrl={tool.sourcePreview}
              />
            </div>
            <aside className="space-y-5 lg:sticky lg:top-6">
              <CompressionSettings
                source={tool.source}
                level={tool.level}
                disabled={tool.busy}
                onLevel={(level) => {
                  if (tool.phase === "no-reduction") tool.retry();
                  tool.setLevel(level);
                }}
              />
              <Button
                className="min-h-11 w-full"
                disabled={tool.busy || tool.phase !== "ready"}
                onClick={() => void tool.compress()}
              >
                <FileDown className="size-4" />
                Comprimir PDF
              </Button>
              <section className="p-2">
                <LockKeyhole
                  className="mb-3 size-5 text-primary"
                  strokeWidth={1.4}
                />
                <h2 className="text-xs font-semibold">Optimización privada</h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  El PDF y QPDF se ejecutan en este dispositivo. No hay subidas,
                  cuentas ni servicios externos de compresión.
                </p>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
