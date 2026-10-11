import { FileText, Image as ImageIcon, Layers3 } from "lucide-react";
import { formatFileSize } from "@/lib/pdf/download";
import type { CompressionSource } from "@/types/compress-pdf";

export function PdfInformation({
  source,
  previewUrl,
}: {
  source: CompressionSource;
  previewUrl: string | null;
}) {
  return (
    <section
      aria-labelledby="pdf-analysis-title"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex h-48 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white sm:w-36">
          {previewUrl ? (
            // Generated from the local PDF and revoked when the tool resets.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Vista previa de la primera página"
              className="size-full object-contain"
            />
          ) : (
            <FileText className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="pdf-analysis-title" className="text-sm font-semibold">
            Documento analizado
          </h2>
          <p className="mt-2 truncate text-sm">{source.name}</p>
          <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-[10px] text-muted-foreground">Tamaño original</dt>
              <dd className="mt-1 font-semibold">{formatFileSize(source.size)}</dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-[10px] text-muted-foreground">Páginas</dt>
              <dd className="mt-1 font-semibold">{source.pageCount}</dd>
            </div>
          </dl>
          <div className="mt-4 space-y-2 text-[11px] leading-5 text-muted-foreground">
            <p className="flex items-center gap-2">
              <ImageIcon className="size-3.5 text-primary" />
              {source.imageCount}{" "}
              {source.imageCount === 1
                ? "imagen incrustada detectada"
                : "imágenes incrustadas detectadas"}
            </p>
            <p className="flex items-center gap-2">
              <Layers3 className="size-3.5 text-primary" />
              {source.compressedStreamCount} de {source.streamCount} flujos ya
              utilizan algún filtro de compresión.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

