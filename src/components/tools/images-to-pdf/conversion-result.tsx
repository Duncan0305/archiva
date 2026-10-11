"use client";

import { useEffect, useRef } from "react";
import { Check, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFileSize, pdfDownloadName } from "@/lib/pdf/download";
import type { ImagesPdfResult } from "@/types/images-to-pdf";

export function ConversionResult({
  result,
  name,
  onName,
  onReset,
}: {
  result: ImagesPdfResult;
  name: string;
  onName: (name: string) => void;
  onReset: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  const downloadName = pdfDownloadName(name);
  return (
    <section
      className="enter rounded-2xl border border-border bg-card p-6 sm:p-8"
      aria-labelledby="images-result-title"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Check className="size-6" />
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        id="images-result-title"
        className="w-fit rounded-sm font-display text-2xl font-semibold tracking-tight"
      >
        Tus imágenes ya son un PDF.
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Generamos {result.pageCount}{" "}
        {result.pageCount === 1 ? "página" : "páginas"} en el orden y con la
        distribución elegidos.
      </p>
      <div className="mt-6 max-w-md">
        <label htmlFor="images-result-name" className="text-xs font-medium">
          Nombre del archivo
        </label>
        <Input
          id="images-result-name"
          value={name}
          onChange={(event) => onName(event.target.value)}
          maxLength={180}
          className="mt-2 h-11 bg-background"
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Se descargará como {downloadName} · {formatFileSize(result.size)}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="min-h-11">
          <a href={result.url} download={downloadName}>
            <Download className="size-4" />
            Descargar PDF
          </a>
        </Button>
        <Button variant="outline" className="min-h-11" onClick={onReset}>
          <RotateCcw className="size-4" />
          Crear otro PDF
        </Button>
      </div>
      <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
        Descarga el archivo antes de salir. El resultado se descarta al
        reiniciar o cerrar la herramienta.
      </p>
    </section>
  );
}
