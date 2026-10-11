"use client";

import { Check, Download, FileArchive, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFileSize } from "@/lib/pdf/download";
import {
  imageDownloadBase,
  imageDownloadName,
} from "@/lib/images/image-formats";
import type {
  ImageExportFormat,
  RenderedPdfImage,
} from "@/types/pdf-to-images";

export function ExportResults({
  results,
  baseName,
  pageCount,
  format,
  zipUrl,
  zipping,
  disabled,
  onBaseName,
  onZip,
  onEdit,
  onReset,
}: {
  results: RenderedPdfImage[];
  baseName: string;
  pageCount: number;
  format: ImageExportFormat;
  zipUrl: string | null;
  zipping: boolean;
  disabled: boolean;
  onBaseName: (value: string) => void;
  onZip: () => void;
  onEdit: () => void;
  onReset: () => void;
}) {
  return (
    <section
      className="enter rounded-2xl border border-border bg-card p-5 sm:p-7"
      aria-labelledby="pdf-images-result-title"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Check className="size-6" />
      </div>
      <h2
        id="pdf-images-result-title"
        className="mt-5 font-display text-2xl font-semibold tracking-tight"
      >
        {results.length === 1 ? "Tu imagen está lista." : "Tus imágenes están listas."}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Generamos {results.length} {results.length === 1 ? "imagen" : "imágenes"}{" "}
        localmente, respetando las páginas y la configuración elegidas.
      </p>

      <div className="mt-6 max-w-md">
        <label htmlFor="image-base-name" className="text-xs font-medium">
          Nombre base
        </label>
        <Input
          id="image-base-name"
          value={baseName}
          disabled={disabled}
          maxLength={120}
          className="mt-2 h-11 bg-background"
          onChange={(event) => onBaseName(event.target.value)}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Ejemplo: {imageDownloadName(baseName, results[0].pageNumber, pageCount, format)}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <article
            key={result.pageNumber}
            className="min-w-0 rounded-xl border border-border bg-background/60 p-3"
          >
            {/* Result URLs are generated locally and revoked when discarded. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.url}
              alt={`Resultado de la página ${result.pageNumber}`}
              className="aspect-[4/3] w-full rounded-md border border-border bg-white object-contain"
            />
            <p className="mt-3 truncate text-xs font-semibold">
              Página {result.pageNumber}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {result.width.toLocaleString("es")} × {result.height.toLocaleString("es")} px ·{" "}
              {formatFileSize(result.size)}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <a
                href={result.url}
                download={imageDownloadName(
                  baseName,
                  result.pageNumber,
                  pageCount,
                  format,
                )}
              >
                <Download className="size-3.5" />
                Descargar
              </a>
            </Button>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {results.length > 1 &&
          (zipUrl ? (
            <Button asChild className="min-h-11">
              <a href={zipUrl} download={`${imageDownloadBase(baseName)}-imagenes.zip`}>
                <Download className="size-4" />
                Descargar ZIP
              </a>
            </Button>
          ) : (
            <Button className="min-h-11" disabled={disabled} onClick={onZip}>
              <FileArchive className="size-4" />
              {zipping ? "Preparando ZIP…" : "Preparar ZIP"}
            </Button>
          ))}
        <Button variant="outline" className="min-h-11" disabled={disabled} onClick={onEdit}>
          <Pencil className="size-4" />
          Ajustar conversión
        </Button>
        <Button variant="ghost" className="min-h-11" disabled={disabled} onClick={onReset}>
          <RotateCcw className="size-4" />
          Otro PDF
        </Button>
      </div>
      <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
        Descarga los resultados antes de salir. Se eliminan de la memoria al
        reiniciar o cerrar la herramienta.
      </p>
    </section>
  );
}
