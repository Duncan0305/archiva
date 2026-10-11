"use client";

import { Eye, LoaderCircle } from "lucide-react";
import type { PdfImagePreview } from "@/types/pdf-to-images";
import { imageFormatMeta } from "@/lib/images/image-formats";
import type { PdfToImagesSettings } from "@/types/pdf-to-images";

export function ImagePreview({
  preview,
  busy,
  selectedPages,
  page,
  settings,
  disabled,
  onPage,
}: {
  preview: PdfImagePreview | null;
  busy: boolean;
  selectedPages: number[];
  page: number;
  settings: PdfToImagesSettings;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <section
      aria-labelledby="image-preview-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2">
        <Eye className="size-4 text-primary" />
        <h2 id="image-preview-title" className="text-sm font-semibold">
          Vista previa
        </h2>
      </div>
      {selectedPages.length > 1 && (
        <div className="mt-4">
          <label htmlFor="preview-page" className="text-[11px] text-muted-foreground">
            Página de muestra
          </label>
          <select
            id="preview-page"
            value={page}
            disabled={disabled}
            onChange={(event) => onPage(Number(event.target.value))}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
          >
            {selectedPages.map((number) => (
              <option key={number} value={number}>
                Página {number}
              </option>
            ))}
          </select>
        </div>
      )}
      <div
        className="mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-lg border border-border bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%),linear-gradient(-45deg,var(--muted)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--muted)_75%),linear-gradient(-45deg,transparent_75%,var(--muted)_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] p-3"
      >
        {busy ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            Actualizando muestra…
          </span>
        ) : preview ? (
          // The URL belongs to a locally generated Blob, never a remote resource.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt={`Vista previa de la página ${preview.pageNumber}`}
            className="max-h-72 max-w-full object-contain shadow-sm"
          />
        ) : (
          <p className="text-xs text-muted-foreground">Selecciona una página.</p>
        )}
      </div>
      {preview && (
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          Resultado esperado: {preview.width.toLocaleString("es")} ×{" "}
          {preview.height.toLocaleString("es")} px ·{" "}
          {imageFormatMeta[settings.format].label}. La muestra está reducida; la
          descarga usará la resolución completa.
        </p>
      )}
    </section>
  );
}

