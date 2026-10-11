"use client";

import { useEffect, useRef } from "react";
import {
  AlertCircle,
  Combine,
  Files,
  LockKeyhole,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMergePdf } from "@/hooks/use-merge-pdf";
import { formatFileSize } from "@/lib/pdf/download";
import { PdfDropzone } from "./pdf-dropzone";
import { PdfFileList } from "./pdf-file-list";
import { MergeResult } from "./merge-result";

export function MergePdfTool() {
  const tool = useMergePdf();
  const workspace = useRef<HTMLDivElement>(null);
  const totalPages = tool.files.reduce((sum, file) => sum + file.pageCount, 0);
  const totalSize = tool.files.reduce((sum, file) => sum + file.size, 0);

  // A file dropped outside the dropzone must not navigate away from the selection.
  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);
    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
    };
  }, []);

  function reset() {
    tool.reset();
    workspace.current?.focus({ preventScroll: true });
  }

  const progressLabel =
    tool.phase === "validating"
      ? `Validando documentos: ${tool.validation.completed} de ${tool.validation.total} revisados.`
      : tool.progress?.stage === "saving"
        ? "Generando el PDF final…"
        : `Combinando documentos: ${tool.progress?.completed ?? 0} de ${tool.progress?.total ?? 0} copiados.`;

  return (
    <div
      ref={workspace}
      tabIndex={-1}
      className="rounded-xl"
      aria-label="Espacio de trabajo para unir PDF"
    >
      <div
        className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground"
        aria-label="Pasos: Seleccionar, organizar, unir y descargar"
      >
        <span>01 Seleccionar</span>
        <ArrowRight className="size-3" />
        <span>02 Organizar</span>
        <ArrowRight className="size-3" />
        <span>03 Unir</span>
        <ArrowRight className="size-3" />
        <span>04 Descargar</span>
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {tool.announcement}
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          {tool.issues.length > 0 && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-card p-5"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {tool.files.length
                  ? "Algunos documentos necesitan atención"
                  : "No se pudo completar la operación"}
              </div>
              <ul className="space-y-2">
                {tool.issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="text-xs leading-6 [overflow-wrap:anywhere]"
                  >
                    {issue.name && (
                      <span className="font-semibold">{issue.name}: </span>
                    )}
                    {issue.message}
                  </li>
                ))}
              </ul>
              {tool.files.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Los PDF válidos siguen en la lista. Puedes continuar con ellos
                  o añadir otros.
                </p>
              )}
            </div>
          )}
          {tool.result ? (
            <MergeResult result={tool.result} onReset={reset} />
          ) : (
            <>
              <PdfDropzone
                disabled={tool.busy}
                hasFiles={tool.files.length > 0}
                onFiles={tool.addFiles}
              />
              {tool.busy && (
                <section
                  className="rounded-xl border border-border bg-secondary/50 p-5"
                  aria-label="Progreso de procesamiento"
                >
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-sm font-medium"
                  >
                    {progressLabel}
                  </p>
                  {tool.progress?.stage !== "saving" && (
                    <progress
                      className="mt-3 h-2 w-full accent-primary"
                      aria-label={
                        tool.phase === "validating"
                          ? "Documentos revisados"
                          : "Documentos combinados"
                      }
                      value={
                        tool.phase === "validating"
                          ? tool.validation.completed
                          : (tool.progress?.completed ?? 0)
                      }
                      max={
                        tool.phase === "validating"
                          ? tool.validation.total
                          : (tool.progress?.total ?? 1)
                      }
                    />
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Los archivos permanecen en tu dispositivo.
                    </p>
                    <Button variant="ghost" size="sm" onClick={reset}>
                      <X className="size-3.5" />
                      Cancelar y vaciar
                    </Button>
                  </div>
                </section>
              )}
              {tool.files.length > 0 && (
                <PdfFileList
                  files={tool.files}
                  disabled={tool.busy}
                  onRemove={tool.removeFile}
                  onMove={tool.moveFile}
                />
              )}
            </>
          )}
        </div>
        <aside className="space-y-5">
          {!tool.result && (
            <section
              aria-labelledby="merge-summary-title"
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-2">
                <Files className="size-4 text-primary" />
                <h2 id="merge-summary-title" className="text-sm font-semibold">
                  Tu próximo documento
                </h2>
              </div>
              <dl className="mt-5 space-y-3 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Documentos</dt>
                  <dd className="font-medium tabular-nums">
                    {tool.files.length}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Páginas</dt>
                  <dd className="font-medium tabular-nums">{totalPages}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tamaño de entrada</dt>
                  <dd className="font-medium">{formatFileSize(totalSize)}</dd>
                </div>
              </dl>
              <div className="my-5 border-t border-border" />
              <p
                id="merge-help"
                className="text-xs leading-6 text-muted-foreground"
              >
                {tool.files.length < 2
                  ? "Añade al menos dos PDF válidos para empezar."
                  : "Las páginas se unirán exactamente en el orden de la lista."}
              </p>
              <Button
                className="mt-4 min-h-11 w-full"
                disabled={tool.busy || tool.files.length < 2}
                aria-describedby="merge-help"
                onClick={() => void tool.merge()}
              >
                <Combine className="size-4" />
                {tool.phase === "merging" ? "Uniendo PDF…" : "Unir PDF"}
              </Button>
              {tool.files.length > 0 && !tool.busy && (
                <Button
                  variant="ghost"
                  className="mt-2 w-full text-xs text-muted-foreground"
                  onClick={reset}
                >
                  Vaciar selección
                </Button>
              )}
            </section>
          )}
          <section className="p-2" aria-labelledby="local-privacy-title">
            <LockKeyhole
              className="mb-3 size-5 text-primary"
              strokeWidth={1.4}
            />
            <h2 id="local-privacy-title" className="text-xs font-semibold">
              Tus documentos se quedan contigo
            </h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Archiva procesa tus archivos directamente en tu dispositivo. Tus
              documentos no se suben a nuestros servidores.
            </p>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              Los documentos grandes pueden necesitar mucha memoria. Si tu
              navegador no puede procesarlos, prueba con menos archivos.
            </p>
          </section>
          <details className="rounded-lg border border-border p-4 text-xs">
            <summary className="cursor-pointer leading-5 font-medium">
              ¿Qué conserva el PDF final?
            </summary>
            <p className="mt-3 leading-6 text-muted-foreground">
              Se copian las páginas con su contenido, tamaño y orientación. Las
              firmas digitales dejan de ser válidas al crear un documento nuevo.
              Los marcadores, adjuntos y formularios interactivos pueden no
              conservarse. Comprueba el resultado antes de compartirlo.
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}
