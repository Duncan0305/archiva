"use client";

import { PdfPageThumbnail } from "./pdf-page-thumbnail";
import { PagePreviewSession } from "@/lib/pdf/page-preview-session";

interface Props {
  count: number;
  session: PagePreviewSession;
  selected: ReadonlySet<number>;
  selectable: boolean;
  disabled: boolean;
  onToggle: (number: number) => void;
}

export function PdfPageGrid({
  count,
  session,
  selected,
  selectable,
  disabled,
  onToggle,
}: Props) {
  return (
    <section
      aria-labelledby="pages-title"
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="pages-title" className="text-sm font-semibold">
            Las páginas de tu documento
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {selectable
              ? "Toca las páginas que quieras extraer. La selección sigue el orden original."
              : "Consulta las páginas para identificar el contenido antes de dividir."}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "página" : "páginas"}
        </span>
      </div>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        aria-label="Vista de todas las páginas"
      >
        {Array.from({ length: count }, (_, index) => (
          <PdfPageThumbnail
            key={index + 1}
            number={index + 1}
            session={session}
            selectable={selectable}
            selected={selected.has(index + 1)}
            disabled={disabled}
            onToggle={() => onToggle(index + 1)}
          />
        ))}
      </div>
    </section>
  );
}
