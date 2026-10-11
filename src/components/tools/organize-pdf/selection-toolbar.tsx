"use client";

import { RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SelectionToolbar({
  count,
  disabled,
  onLeft,
  onRight,
  onDelete,
  onClear,
}: {
  count: number;
  disabled: boolean;
  onLeft: () => void;
  onRight: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (!count) return null;
  return (
    <div
      className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-background/95 p-3 shadow-lg backdrop-blur"
      aria-label="Acciones para páginas seleccionadas"
    >
      <p className="mr-auto px-1 text-xs font-semibold">
        {count} {count === 1 ? "página seleccionada" : "páginas seleccionadas"}
      </p>
      <Button variant="outline" size="sm" disabled={disabled} onClick={onLeft}>
        <RotateCcw className="size-3.5" />
        Girar izquierda
      </Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={onRight}>
        <RotateCw className="size-3.5" />
        Girar derecha
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onDelete}
        className="text-destructive"
      >
        <Trash2 className="size-3.5" />
        Eliminar
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onClear}
        aria-label="Deseleccionar todas"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
