"use client";

import { Check, Download, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFileSize, pdfDownloadName } from "@/lib/pdf/download";
import { compressionPreset } from "@/lib/pdf/compression-presets";
import type { CompressionResult } from "@/types/compress-pdf";

export function CompressionResultView({
  result,
  name,
  onName,
  onRetry,
  onReset,
}: {
  result: CompressionResult;
  name: string;
  onName: (name: string) => void;
  onRetry: () => void;
  onReset: () => void;
}) {
  const downloadName = pdfDownloadName(name);
  return (
    <section
      className="enter rounded-2xl border border-border bg-card p-5 sm:p-8"
      aria-labelledby="compression-result-title"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Check className="size-6" />
      </div>
      <h2
        id="compression-result-title"
        className="mt-5 font-display text-2xl font-semibold tracking-tight"
      >
        Tu PDF ocupa menos.
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Optimización {compressionPreset(result.level).name.toLowerCase()} validada
        con {result.pageCount} {result.pageCount === 1 ? "página" : "páginas"}.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-secondary p-4">
          <p className="text-[10px] text-muted-foreground">Original</p>
          <p className="mt-1 text-base font-semibold">
            {formatFileSize(result.originalSize)}
          </p>
        </div>
        <div className="rounded-xl bg-secondary p-4">
          <p className="text-[10px] text-muted-foreground">Optimizado</p>
          <p className="mt-1 text-base font-semibold">
            {formatFileSize(result.compressedSize)}
          </p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-[10px] text-muted-foreground">Ahorro real</p>
          <p className="mt-1 text-base font-semibold text-primary">
            {result.savedPercent.toLocaleString("es", {
              maximumFractionDigits: 1,
            })}
            %
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {formatFileSize(result.savedBytes)} menos
          </p>
        </div>
      </div>

      {result.previewUrl && (
        <div className="mt-6 flex max-h-72 justify-center overflow-hidden rounded-xl border border-border bg-white p-3">
          {/* Generated locally from the validated result. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.previewUrl}
            alt="Vista previa del PDF optimizado"
            className="max-h-64 max-w-full object-contain"
          />
        </div>
      )}

      <div className="mt-6 max-w-md">
        <label htmlFor="compressed-pdf-name" className="text-xs font-medium">
          Nombre del archivo
        </label>
        <Input
          id="compressed-pdf-name"
          value={name}
          maxLength={180}
          className="mt-2 h-11 bg-background"
          onChange={(event) => onName(event.target.value)}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Se descargará como {downloadName}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="min-h-11">
          <a href={result.url} download={downloadName}>
            <Download className="size-4" />
            Descargar PDF
          </a>
        </Button>
        <Button variant="outline" className="min-h-11" onClick={onRetry}>
          <SlidersHorizontal className="size-4" />
          Probar otro nivel
        </Button>
        <Button variant="ghost" className="min-h-11" onClick={onReset}>
          <RotateCcw className="size-4" />
          Comprimir otro PDF
        </Button>
      </div>
    </section>
  );
}
