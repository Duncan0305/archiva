"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultPdfName,
  formatFileSize,
  pdfDownloadName,
} from "@/lib/pdf/download";
import type { MergeResult as Result } from "@/types/pdf";

export function MergeResult({
  result,
  onReset,
}: {
  result: Result;
  onReset: () => void;
}) {
  const [name, setName] = useState(defaultPdfName);
  const heading = useRef<HTMLHeadingElement>(null);
  const downloadName = pdfDownloadName(name);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      aria-labelledby="result-title"
      className="enter rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Check className="size-6" />
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        id="result-title"
        className="w-fit rounded-sm font-display text-2xl font-semibold tracking-tight"
      >
        Un único PDF. Todo en orden.
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Hemos unido {result.fileCount} documentos en {result.pageCount}{" "}
        {result.pageCount === 1 ? "página" : "páginas"}. Tu archivo está listo.
      </p>
      <div className="mt-6 max-w-md">
        <label htmlFor="result-name" className="text-xs font-medium">
          Nombre del archivo
        </label>
        <Input
          id="result-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={180}
          className="mt-2 h-11 bg-background"
          aria-describedby="download-name"
        />
        <p
          id="download-name"
          className="mt-2 text-[11px] leading-5 text-muted-foreground [overflow-wrap:anywhere]"
        >
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
          Nueva combinación
        </Button>
      </div>
      <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
        Descarga el resultado antes de salir. Los archivos originales ya se han
        liberado de la memoria y este resultado se descarta al iniciar otra
        combinación o salir de la herramienta.
      </p>
    </section>
  );
}
