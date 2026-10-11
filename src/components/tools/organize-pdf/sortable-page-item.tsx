"use client";

import { useEffect, useRef, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  Check,
  FileText,
  RotateCcw,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PagePreviewSession } from "@/lib/pdf/page-preview-session";
import type { OrganizedPage } from "@/types/organize-pdf";
import { cn } from "@/lib/utils";

interface Props {
  page: OrganizedPage;
  position: number;
  total: number;
  session: PagePreviewSession;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRotate: (amount: number) => void;
  onRemove: () => void;
  onMove: (offset: number) => void;
}

export function SortablePageItem({
  page,
  position,
  total,
  session,
  selected,
  disabled,
  onToggle,
  onRotate,
  onRemove,
  onMove,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
    disabled,
  });

  useEffect(() => {
    if (!viewport.current) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "420px" },
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let imageUrl: string | null = null;
    void session
      .render(page.originalIndex + 1, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        imageUrl = URL.createObjectURL(blob);
        setUrl(imageUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [visible, session, page.originalIndex]);

  return (
    <article
      ref={setNodeRef}
      data-page-id={page.id}
      data-original-page={page.originalIndex + 1}
      data-position={position}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative min-w-0 touch-manipulation rounded-xl border bg-card p-2 transition-[border-color,box-shadow,opacity]",
        selected ? "border-primary ring-1 ring-primary/25" : "border-border",
        isDragging &&
          "z-20 scale-[1.025] cursor-grabbing border-primary opacity-90 shadow-xl",
      )}
    >
      <div
        ref={viewport}
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Página original ${page.originalIndex + 1}, posición ${position} de ${total}. Arrastra para reordenar.`}
        aria-pressed={selected}
        onClick={onToggle}
        className="relative flex aspect-[3/4] w-full cursor-grab select-none items-center justify-center overflow-hidden rounded-lg border border-border bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
      >
        {url ? (
          <span
            role="img"
            aria-label={`Vista de la página original ${page.originalIndex + 1}`}
            className="size-full bg-contain bg-center bg-no-repeat transition-transform duration-200 motion-reduce:transition-none"
            style={{
              backgroundImage: `url("${url}")`,
              transform: `rotate(${page.rotationDelta}deg) scale(${Math.abs(page.rotationDelta) % 180 === 90 ? 0.74 : 1})`,
            }}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-center text-[10px] text-slate-600">
            <FileText className="size-5" />
            {failed
              ? "Vista no disponible"
              : visible
                ? "Cargando página"
                : "Vista pendiente"}
          </span>
        )}
        <span className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm">
          {position}
        </span>
        {selected && (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span
          className="min-w-0 truncate pl-1 text-[10px] text-muted-foreground"
          title={`Página original ${page.originalIndex + 1}`}
        >
          Original {page.originalIndex + 1}
          {page.rotationDelta
            ? ` · ${((page.rotationDelta % 360) + 360) % 360}°`
            : ""}
        </span>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            disabled={disabled || position === 1}
            onClick={(event) => {
              event.stopPropagation();
              onMove(-1);
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
            aria-label={`Mover página original ${page.originalIndex + 1} una posición atrás`}
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled || position === total}
            onClick={(event) => {
              event.stopPropagation();
              onMove(1);
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
            aria-label={`Mover página original ${page.originalIndex + 1} una posición adelante`}
          >
            <ChevronRight className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onRotate(-90);
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
            aria-label={`Girar página original ${page.originalIndex + 1} a la izquierda`}
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onRotate(90);
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
            aria-label={`Girar página original ${page.originalIndex + 1} a la derecha`}
          >
            <RotateCw className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
            aria-label={`Eliminar página original ${page.originalIndex + 1}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
