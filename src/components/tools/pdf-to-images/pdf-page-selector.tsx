"use client";

import { CheckCheck, ListX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfPageThumbnail } from "@/components/tools/split-pdf/pdf-page-thumbnail";
import type { PageThumbnailSession } from "@/components/tools/split-pdf/pdf-page-thumbnail";

export function PdfPageSelector({
  count,
  session,
  selected,
  ranges,
  rangeError,
  disabled,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onRanges,
  onApplyRanges,
}: {
  count: number;
  session: PageThumbnailSession;
  selected: ReadonlySet<number>;
  ranges: string;
  rangeError: string | null;
  disabled: boolean;
  onToggle: (page: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRanges: (value: string) => void;
  onApplyRanges: () => void;
}) {
  return (
    <section
      aria-labelledby="image-pages-title"
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 id="image-pages-title" className="text-sm font-semibold">
            Elige las páginas
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Toca una miniatura o aplica un rango. La exportación conservará el
            orden original.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
          {selected.size} de {count} seleccionadas
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || selected.size === count}
          onClick={onSelectAll}
        >
          <CheckCheck className="size-3.5" />
          Seleccionar todas
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || selected.size === 0}
          onClick={onDeselectAll}
        >
          <ListX className="size-3.5" />
          Deseleccionar todas
        </Button>
      </div>

      <form
        className="mt-5 rounded-lg border border-border bg-background/60 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          onApplyRanges();
        }}
      >
        <label htmlFor="pdf-image-ranges" className="text-xs font-medium">
          Selección por rangos
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="pdf-image-ranges"
            value={ranges}
            disabled={disabled}
            aria-invalid={!!rangeError}
            aria-describedby="pdf-image-ranges-help"
            placeholder="1-3, 6, 9-12"
            onChange={(event) => onRanges(event.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={disabled}>
            Aplicar rango
          </Button>
        </div>
        <p
          id="pdf-image-ranges-help"
          className={`mt-2 text-[11px] ${rangeError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {rangeError ?? "Ejemplo: 1-3, 6, 9-12. Las páginas repetidas se usan una sola vez."}
        </p>
      </form>

      <div
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        aria-label="Páginas del PDF"
      >
        {Array.from({ length: count }, (_, index) => {
          const number = index + 1;
          return (
            <PdfPageThumbnail
              key={number}
              number={number}
              session={session}
              selectable
              selected={selected.has(number)}
              disabled={disabled}
              onToggle={() => onToggle(number)}
            />
          );
        })}
      </div>
    </section>
  );
}

