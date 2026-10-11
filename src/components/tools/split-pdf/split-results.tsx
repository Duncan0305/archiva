"use client";

import { Download, FileArchive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFileSize, pdfDownloadName } from "@/lib/pdf/download";
import type { SplitResult } from "@/types/split-pdf";

interface Props {
  results: SplitResult[];
  singleName: string;
  onName: (name: string) => void;
  zipUrl: string | null;
  zipBusy: boolean;
  onZip: () => void;
  onReset: () => void;
}

export function SplitResults({
  results,
  singleName,
  onName,
  zipUrl,
  zipBusy,
  onZip,
  onReset,
}: Props) {
  return (
    <section
      aria-labelledby="split-results-title"
      className="rounded-xl border border-border bg-card p-5 sm:p-8"
    >
      <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
        <Download className="size-5" />
      </span>
      <h2
        id="split-results-title"
        className="font-display text-xl font-semibold"
      >
        {results.length === 1
          ? "Tu PDF está listo."
          : `${results.length} PDF listos para descargar.`}
      </h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        Cada resultado conserva las páginas indicadas, en el orden original.
      </p>
      {results.length === 1 ? (
        <div className="mt-6 max-w-md">
          <label
            htmlFor="split-file-name"
            className="mb-2 block text-xs font-medium"
          >
            Nombre del archivo
          </label>
          <Input
            id="split-file-name"
            value={singleName}
            onChange={(event) => onName(event.target.value)}
            maxLength={180}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {pdfDownloadName(singleName)} · {formatFileSize(results[0].size)}
          </p>
          <a
            href={results[0].url}
            download={pdfDownloadName(singleName)}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2"
          >
            <Download className="size-4" />
            Descargar PDF
          </a>
        </div>
      ) : (
        <>
          <ol className="mt-6 space-y-2" aria-label="Archivos generados">
            {results.map((result) => (
              <li
                key={result.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-4"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold [overflow-wrap:anywhere]">
                    {result.name}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {result.pages.length}{" "}
                    {result.pages.length === 1 ? "página" : "páginas"} ·{" "}
                    {formatFileSize(result.size)}
                  </p>
                </div>
                <a
                  href={result.url}
                  download={result.name}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-secondary focus-visible:outline-2"
                >
                  <Download className="size-3.5" />
                  Descargar
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            {zipUrl ? (
              <a
                href={zipUrl}
                download="archiva-pdf-divididos.zip"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2"
              >
                <FileArchive className="size-4" />
                Descargar todos en ZIP
              </a>
            ) : (
              <Button onClick={onZip} disabled={zipBusy}>
                <FileArchive className="size-4" />
                {zipBusy ? "Preparando ZIP…" : "Preparar descarga ZIP"}
              </Button>
            )}
          </div>
        </>
      )}
      <p className="mt-6 text-[11px] leading-5 text-muted-foreground">
        Descarga los resultados antes de salir. Se descartan al iniciar otra
        división.
      </p>
      <Button variant="outline" className="mt-5" onClick={onReset}>
        <RotateCcw className="size-4" />
        Dividir otro PDF
      </Button>
    </section>
  );
}
