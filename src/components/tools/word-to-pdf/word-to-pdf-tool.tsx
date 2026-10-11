"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileInput,
  Info,
  LockKeyhole,
  Printer,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWordToPdf } from "@/hooks/use-word-to-pdf";
import { printablePdfName } from "@/lib/docx/render-docx";
import { formatFileSize } from "@/lib/pdf/download";
import { cn } from "@/lib/utils";
import { DocxPreview, type DocxPreviewHandle } from "./docx-preview";

export function WordToPdfTool() {
  const tool = useWordToPdf();
  const input = useRef<HTMLInputElement>(null);
  const preview = useRef<DocxPreviewHandle>(null);
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
        aria-label="Pasos: cargar Word, previsualizar, abrir impresión y guardar PDF"
      >
        <span>01 Cargar Word</span>
        <ArrowRight className="size-3" />
        <span>02 Previsualizar</span>
        <ArrowRight className="size-3" />
        <span>03 Abrir impresión</span>
        <ArrowRight className="size-3" />
        <span>04 Guardar como PDF</span>
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
            <p className="font-medium">No pudimos abrir el documento</p>
            <p>{tool.error}</p>
          </div>
        </div>
      )}

      <input
        ref={input}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        aria-label="Seleccionar documento DOCX"
        disabled={tool.busy}
        onChange={(event) => {
          choose(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      {!tool.source ? (
        <section
          data-testid="docx-dropzone"
          aria-labelledby="word-upload-title"
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
            "flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center transition-colors",
            over && "border-primary bg-secondary",
          )}
        >
          <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <FileInput className="size-7" strokeWidth={1.4} />
          </span>
          <h2 id="word-upload-title" className="font-display text-xl font-semibold">
            Tu Word, listo para imprimir como PDF
          </h2>
          <p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">
            Archiva interpreta el DOCX en tu navegador y prepara una vista con
            texto seleccionable para el diálogo de impresión.
          </p>
          <Button
            className="mt-5 min-h-11"
            disabled={tool.busy}
            onClick={() => input.current?.click()}
          >
            <FileInput className="size-4" />
            Seleccionar DOCX
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            DOCX sin contraseña · Máximo 50 MB · El formato .doc no es compatible
          </p>
          {tool.phase === "validating" && (
            <p className="mt-4 text-xs font-medium text-primary">
              Validando la estructura del documento…
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{tool.source.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatFileSize(tool.source.size)} · DOCX validado localmente
                {tool.renderedPages
                  ? ` · ${tool.renderedPages} ${tool.renderedPages === 1 ? "página aproximada" : "páginas aproximadas"}`
                  : ""}
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
                Quitar DOCX
              </Button>
            </div>
          </section>

          {tool.source.warnings.length > 0 && (
            <section
              aria-labelledby="word-warnings-title"
              className="rounded-xl border border-border bg-secondary/55 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2">
                <Info className="size-4 text-primary" />
                <h2 id="word-warnings-title" className="text-xs font-semibold">
                  Compatibilidad detectada
                </h2>
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-5 text-muted-foreground">
                {tool.source.warnings.map((warning) => (
                  <li key={warning.code} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <DocxPreview
              ref={preview}
              bytes={tool.bytes!}
              loading={tool.phase === "rendering"}
              onReady={tool.previewReady}
              onError={tool.previewFailed}
              onPrintStart={tool.printing}
              onPrintEnd={tool.printFinished}
            />

            <aside className="space-y-5 lg:sticky lg:top-6">
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Printer className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Preparar PDF</h2>
                </div>
                <div className="mt-5">
                  <label htmlFor="word-pdf-name" className="text-xs font-medium">
                    Nombre sugerido
                  </label>
                  <Input
                    id="word-pdf-name"
                    value={tool.name}
                    maxLength={160}
                    className="mt-2 h-11 bg-background"
                    onChange={(event) => tool.setName(event.target.value)}
                  />
                  <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                    El navegador puede proponer {printablePdfName(tool.name)}. Puedes
                    cambiarlo en el diálogo de impresión.
                  </p>
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
                    <Type className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Se conservan el tamaño y la orientación interpretados del DOCX.
                    No se ofrecen ajustes que puedan recortar el contenido.
                  </p>
                </div>
                <Button
                  className="mt-5 min-h-11 w-full"
                  disabled={tool.phase !== "ready"}
                  onClick={() => void preview.current?.print(tool.name)}
                >
                  <Printer className="size-4" />
                  Guardar como PDF mediante impresión
                </Button>
                <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
                  En el diálogo, elige <strong>Guardar como PDF</strong>. Archiva no
                  puede confirmar si completas o cancelas ese guardado.
                </p>
              </section>

              {tool.printCompleted && (
                <section
                  role="status"
                  className="enter rounded-xl border border-primary/25 bg-secondary p-4"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <h2 className="text-xs font-semibold">
                        Diálogo de impresión cerrado
                      </h2>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        Si elegiste Guardar como PDF, el archivo quedó en la ubicación
                        que seleccionaste.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="p-2">
                <LockKeyhole className="mb-3 size-5 text-primary" strokeWidth={1.4} />
                <h2 className="text-xs font-semibold">Documento privado</h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  El DOCX se abre en memoria. No se envía, no se guarda y no se
                  cargan recursos externos del documento.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Macros y contenido activo bloqueados
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
