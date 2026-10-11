"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { formatFileSize } from "@/lib/pdf/download";
import type { SelectedImage } from "@/types/images-to-pdf";
import { cn } from "@/lib/utils";

export function SortableImageItem({
  image,
  position,
  total,
  disabled,
  onRotate,
  onRemove,
  onMove,
}: {
  image: SelectedImage;
  position: number;
  total: number;
  disabled: boolean;
  onRotate: (amount: number) => void;
  onRemove: () => void;
  onMove: (offset: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled });
  const normalizedRotation = ((image.rotation % 360) + 360) % 360;
  return (
    <article
      ref={setNodeRef}
      data-image-name={image.name}
      data-image-position={position}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative min-w-0 rounded-xl border border-border bg-card p-2 transition-[border-color,box-shadow,opacity]",
        isDragging &&
          "z-20 scale-[1.025] cursor-grabbing border-primary opacity-90 shadow-xl",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${image.name}, posición ${position} de ${total}. Arrastra para reordenar.`}
        className="relative flex aspect-[4/3] w-full cursor-grab touch-manipulation select-none items-center justify-center overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
      >
        <span
          role="img"
          aria-label={`Vista de ${image.name}`}
          className="size-full bg-contain bg-center bg-no-repeat transition-transform duration-200 motion-reduce:transition-none"
          style={{
            backgroundImage: `url("${image.previewUrl}")`,
            transform: `rotate(${image.rotation}deg) scale(${Math.abs(image.rotation) % 180 === 90 ? 0.72 : 1})`,
          }}
        />
        <span className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold shadow-sm">
          {position}
        </span>
      </div>
      <div className="mt-2 min-w-0 px-1">
        <p className="truncate text-[11px] font-medium" title={image.name}>
          {image.name}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {image.width} × {image.height} px · {formatFileSize(image.size)}
          {normalizedRotation ? ` · ${normalizedRotation}°` : ""}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-end border-t border-border pt-1">
        <button
          type="button"
          disabled={disabled || position === 1}
          onClick={() => onMove(-1)}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
          aria-label={`Mover ${image.name} una posición atrás`}
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled || position === total}
          onClick={() => onMove(1)}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
          aria-label={`Mover ${image.name} una posición adelante`}
        >
          <ChevronRight className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRotate(-90)}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
          aria-label={`Girar ${image.name} a la izquierda`}
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRotate(90)}
          className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
          aria-label={`Girar ${image.name} a la derecha`}
        >
          <RotateCw className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
          aria-label={`Eliminar ${image.name}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
