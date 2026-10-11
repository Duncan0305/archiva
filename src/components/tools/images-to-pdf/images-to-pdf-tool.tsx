"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  FileImage,
  FilePlus2,
  Images,
  LockKeyhole,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImagesToPdf } from "@/hooks/use-images-to-pdf";
import { cn } from "@/lib/utils";
import { SortableImageGrid } from "./sortable-image-grid";
import { PdfSettings } from "./pdf-settings";
import { PdfLayoutPreview } from "./pdf-layout-preview";
import { ConversionResult } from "./conversion-result";

export function ImagesToPdfTool() {
  const tool = useImagesToPdf();
  const input = useRef<HTMLInputElement>(null);
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
    void tool.addFiles(files);
  }

  return (
    <div className="space-y-5">
      <div
        className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground"
        aria-label="Pasos: seleccionar imágenes, organizar, configurar, convertir y descargar"
      >
        <span>01 Seleccionar imágenes</span>
        <ArrowRight className="size-3" />
        <span>02 Organizar</span>
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
      {!!tool.issues.length && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-card p-4 text-xs leading-6 text-destructive"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 size-4 shrink-0" />
            <div>
              <p className="font-medium">Revisa estas imágenes</p>
              <ul className="mt-1 list-disc pl-4">
                {tool.issues.map((issue) => (
                  <li key={issue.id}>
                    {issue.name ? `${issue.name}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tool.phase === "done" && tool.result ? (
        <ConversionResult
          result={tool.result}
          name={tool.name}
          onName={tool.setName}
          onReset={tool.reset}
        />
      ) : (
        <>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            aria-label="Seleccionar imágenes para convertir"
            disabled={tool.busy}
            onChange={(event) => {
              choose(Array.from(event.currentTarget.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          {!tool.images.length ? (
            <section
              data-testid="images-dropzone"
              aria-labelledby="images-upload-title"
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
                <Images className="size-7" strokeWidth={1.4} />
              </span>
              <h2
                id="images-upload-title"
                className="font-display text-xl font-semibold"
              >
                De tus imágenes, un solo PDF
              </h2>
              <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                Arrastra JPG, PNG o WebP aquí. Puedes usar una imagen o varias.
              </p>
              <Button
                className="mt-5 min-h-11"
                disabled={tool.busy}
                onClick={() => input.current?.click()}
              >
                <FilePlus2 className="size-4" />
                Seleccionar imágenes
              </Button>
              {tool.busy && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Validando y preparando miniaturas…
                </p>
              )}
            </section>
          ) : (
            <section
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
              aria-label="Selección de imágenes"
            >
              <div>
                <p className="text-xs font-semibold">
                  {tool.images.length}{" "}
                  {tool.images.length === 1
                    ? "imagen seleccionada"
                    : "imágenes seleccionadas"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  JPG, PNG y WebP · una página por imagen
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tool.busy}
                  onClick={() => input.current?.click()}
                >
                  <FilePlus2 className="size-3.5" />
                  Añadir imágenes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={tool.busy}
                  onClick={tool.clear}
                >
                  <Trash2 className="size-3.5" />
                  Vaciar selección
                </Button>
              </div>
            </section>
          )}

          {tool.busy && (
            <section
              aria-label="Progreso de conversión"
              className="rounded-xl border border-border bg-secondary/50 p-5"
            >
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium"
              >
                {tool.phase === "loading"
                  ? `Imágenes revisadas: ${tool.progress.completed} de ${tool.progress.total}.`
                  : `Páginas generadas: ${tool.progress.completed} de ${tool.progress.total}.`}
              </p>
              <progress
                className="mt-3 h-2 w-full accent-primary"
                aria-label={
                  tool.phase === "loading"
                    ? "Imágenes revisadas"
                    : "Páginas generadas"
                }
                value={tool.progress.completed}
                max={tool.progress.total || 1}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={tool.reset}
              >
                <X className="size-3.5" />
                Cancelar y vaciar
              </Button>
            </section>
          )}

          {!!tool.images.length && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-5">
                <SortableImageGrid
                  images={tool.images}
                  disabled={tool.busy}
                  onReorder={tool.reorder}
                  onMove={tool.move}
                  onRotate={tool.rotate}
                  onRemove={tool.remove}
                />
              </div>
              <aside className="space-y-5 lg:sticky lg:top-6">
                <PdfSettings
                  settings={tool.settings}
                  disabled={tool.busy}
                  onChange={tool.setSettings}
                />
                <PdfLayoutPreview
                  images={tool.images}
                  settings={tool.settings}
                />
                <Button
                  className="min-h-11 w-full"
                  disabled={tool.busy}
                  onClick={() => void tool.generate()}
                >
                  <FileImage className="size-4" />
                  Crear PDF
                </Button>
                <section className="p-2">
                  <LockKeyhole
                    className="mb-3 size-5 text-primary"
                    strokeWidth={1.4}
                  />
                  <h2 className="text-xs font-semibold">
                    Conversión privada y local
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Tus imágenes y el PDF se procesan en este dispositivo. No se
                    envían a servidores.
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
