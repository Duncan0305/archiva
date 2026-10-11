"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  FileImage,
  FileUp,
  LockKeyhole,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePdfToImages } from "@/hooks/use-pdf-to-images";
import { formatFileSize } from "@/lib/pdf/download";
import { cn } from "@/lib/utils";
import { PdfPageSelector } from "./pdf-page-selector";
import { ImageExportSettings } from "./image-export-settings";
import { ImagePreview } from "./image-preview";
import { ExportResults } from "./export-results";

export function PdfToImagesTool() {
  const tool = usePdfToImages();
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
        aria-label="Pasos: cargar PDF, seleccionar páginas, configurar, convertir y descargar"
      >
        <span>01 Cargar PDF</span>
        <ArrowRight className="size-3" />
        <span>02 Seleccionar páginas</span>
        <ArrowRight className="size-3" />
        <span>03 Configurar</span>
        <ArrowRight className="size-3" />
        <span>04 Convertir</span>
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
          <div className="flex-1">
            <p className="font-medium">No pudimos completar la operación</p>
            <p>{tool.error}</p>
          </div>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label="Seleccionar PDF para convertir en imágenes"
        disabled={tool.busy}
        onChange={(event) => {
          choose(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      {!tool.source && tool.phase !== "done" && (
        <section
          data-testid="pdf-images-dropzone"
          aria-labelledby="pdf-images-upload-title"
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
            <FileImage className="size-7" strokeWidth={1.4} />
          </span>
          <h2
            id="pdf-images-upload-title"
            className="font-display text-xl font-semibold"
          >
            Cada página, una imagen
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
            Arrastra un PDF o selecciónalo desde tu dispositivo. Solo se procesa
            aquí, en tu navegador.
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
              Validando el documento y preparando sus páginas…
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Un PDF sin contraseña por operación.
            </p>
          )}
        </section>
      )}

      {(tool.phase === "done" || tool.phase === "zipping") &&
      tool.source &&
      tool.results.length > 0 ? (
        <ExportResults
          results={tool.results}
          baseName={tool.baseName}
          pageCount={tool.source.pageCount}
          format={tool.settings.format}
          zipUrl={tool.zipUrl}
          zipping={tool.phase === "zipping"}
          disabled={tool.busy}
          onBaseName={tool.setBaseName}
          onZip={() => void tool.prepareZip()}
          onEdit={tool.edit}
          onReset={tool.reset}
        />
      ) : tool.source && tool.session ? (
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

          {tool.phase === "processing" && (
            <section
              aria-label="Progreso de conversión"
              className="rounded-xl border border-border bg-secondary/50 p-5"
            >
              <p role="status" aria-live="polite" className="text-sm font-medium">
                Convirtiendo página {Math.min(tool.progress.completed + 1, tool.progress.total)} de{" "}
                {tool.progress.total}
              </p>
              <progress
                className="mt-3 h-2 w-full accent-primary"
                aria-label="Páginas convertidas"
                value={tool.progress.completed}
                max={tool.progress.total || 1}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {tool.progress.completed} de {tool.progress.total} completadas
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={tool.cancel}>
                <X className="size-3.5" />
                Cancelar conversión
              </Button>
            </section>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <PdfPageSelector
                count={tool.source.pageCount}
                session={tool.session}
                selected={tool.selected}
                ranges={tool.ranges}
                rangeError={tool.rangeError}
                disabled={tool.busy}
                onToggle={tool.togglePage}
                onSelectAll={tool.selectAll}
                onDeselectAll={tool.deselectAll}
                onRanges={tool.setRanges}
                onApplyRanges={tool.applyRanges}
              />
            </div>
            <aside className="space-y-5 lg:sticky lg:top-6">
              <ImageExportSettings
                settings={tool.settings}
                disabled={tool.busy}
                webpSupported={tool.webpSupported}
                error={tool.settingsError}
                onChange={tool.setSettings}
              />
              <ImagePreview
                preview={tool.preview}
                busy={tool.previewBusy}
                selectedPages={tool.selectedPages}
                page={tool.previewPage}
                settings={tool.settings}
                disabled={tool.busy}
                onPage={tool.setPreviewPage}
              />
              <Button
                className="min-h-11 w-full"
                disabled={tool.busy || !!tool.settingsError}
                onClick={() => void tool.convert()}
              >
                <FileImage className="size-4" />
                Convertir {tool.selected.size || ""}{" "}
                {tool.selected.size === 1 ? "página" : "páginas"}
              </Button>
              <section className="p-2">
                <LockKeyhole
                  className="mb-3 size-5 text-primary"
                  strokeWidth={1.4}
                />
                <h2 className="text-xs font-semibold">Conversión privada y local</h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  El PDF y las imágenes se procesan en este dispositivo. No se
                  envían a servidores ni se almacenan al cerrar la herramienta.
                </p>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
