"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FileText, LoaderCircle } from "lucide-react";
import {
  fitDocxPreview,
  printablePdfName,
  renderDocx,
} from "@/lib/docx/render-docx";

export interface DocxPreviewHandle {
  print(name: string): Promise<void>;
}

export const DocxPreview = forwardRef<
  DocxPreviewHandle,
  {
    bytes: ArrayBuffer;
    loading: boolean;
    onReady: (pages: number) => void;
    onError: (error: unknown) => void;
    onPrintStart: () => void;
    onPrintEnd: () => void;
  }
>(function DocxPreview(
  { bytes, loading, onReady, onError, onPrintStart, onPrintEnd },
  ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const target = container.current;
    if (!target) return;
    let active = true;
    setRendered(false);
    target.replaceChildren();
    void renderDocx(bytes, target)
      .then((pages) => {
        if (!active) return;
        fitDocxPreview(target);
        setRendered(true);
        onReady(pages);
      })
      .catch((error) => {
        if (active) onError(error);
      });
    const observer = new ResizeObserver(() => {
      if (active) fitDocxPreview(target);
    });
    observer.observe(target);
    return () => {
      active = false;
      observer.disconnect();
      target.replaceChildren();
    };
  }, [bytes, onError, onReady]);

  useImperativeHandle(
    ref,
    () => ({
      async print(name) {
        if (!container.current || !rendered) return;
        onPrintStart();
        const root = document.createElement("div");
        root.id = "word-print-root";
        root.setAttribute("aria-hidden", "true");
        const clone = container.current.cloneNode(true) as HTMLElement;
        clone.removeAttribute("aria-busy");
        clone
          .querySelector<HTMLElement>(".archiva-docx-wrapper")
          ?.style.removeProperty("zoom");
        root.appendChild(clone);
        document.body.appendChild(root);
        document.body.classList.add("printing-word-document");
        const previousTitle = document.title;
        document.title = printablePdfName(name).replace(/\.pdf$/i, "");
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        try {
          window.print();
        } finally {
          document.title = previousTitle;
          document.body.classList.remove("printing-word-document");
          root.remove();
          onPrintEnd();
        }
      },
    }),
    [onPrintEnd, onPrintStart, rendered],
  );

  return (
    <section
      aria-labelledby="docx-preview-title"
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h2 id="docx-preview-title" className="text-sm font-semibold">
            Vista previa del documento
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground">Representación HTML</span>
      </div>
      <div
        tabIndex={0}
        aria-label="Documento Word previsualizado; desplázate para revisar sus páginas"
        className="relative max-h-[720px] min-h-[420px] overflow-auto bg-muted/55 p-2 sm:p-4"
      >
        {(loading || !rendered) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 text-center">
            <LoaderCircle className="size-6 animate-spin text-primary" />
            <p className="mt-3 text-xs font-medium">Preparando la vista previa…</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              El motor se carga solo en este dispositivo.
            </p>
          </div>
        )}
        <div
          ref={container}
          data-testid="docx-preview-content"
          aria-busy={loading || !rendered}
          className="docx-preview-content min-w-0"
        />
      </div>
      <p className="border-t border-border px-4 py-3 text-[11px] leading-5 text-muted-foreground sm:px-5">
        La vista previa puede presentar diferencias respecto al documento original,
        especialmente en fuentes, saltos automáticos, campos y objetos complejos.
      </p>
    </section>
  );
});
