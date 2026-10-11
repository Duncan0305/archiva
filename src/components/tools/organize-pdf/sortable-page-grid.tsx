"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { OrganizedPage } from "@/types/organize-pdf";
import { PagePreviewSession } from "@/lib/pdf/page-preview-session";
import { SortablePageItem } from "./sortable-page-item";

interface Props {
  pages: OrganizedPage[];
  session: PagePreviewSession;
  selected: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (id: string) => void;
  onReorder: (active: string, over: string) => void;
  onMove: (id: string, offset: number) => void;
  onRotate: (ids: ReadonlySet<string>, amount: number) => void;
  onRemove: (ids: ReadonlySet<string>) => void;
}

export function SortablePageGrid({
  pages,
  session,
  selected,
  disabled,
  onToggle,
  onReorder,
  onMove,
  onRotate,
  onRemove,
}: Props) {
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function finish(event: DragEndEvent) {
    setActive(null);
    if (event.over && event.active.id !== event.over.id)
      onReorder(String(event.active.id), String(event.over.id));
  }

  return (
    <section
      aria-labelledby="organize-pages-title"
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="organize-pages-title" className="text-sm font-semibold">
            Organiza las páginas
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            Arrastra directamente una miniatura. Un clic corto la selecciona
            para editar varias a la vez.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {pages.length} {pages.length === 1 ? "página" : "páginas"}
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event: DragStartEvent) =>
          setActive(String(event.active.id))
        }
        onDragCancel={() => setActive(null)}
        onDragEnd={finish}
        autoScroll={{ threshold: { x: 0.15, y: 0.15 }, acceleration: 10 }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pulsa espacio para tomar una página, usa las flechas para moverla, espacio para soltarla o Escape para cancelar.",
          },
        }}
      >
        <SortableContext
          items={pages.map(({ id }) => id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
            aria-label="Páginas organizables"
          >
            {pages.map((page, index) => (
              <SortablePageItem
                key={page.id}
                page={page}
                position={index + 1}
                total={pages.length}
                session={session}
                selected={selected.has(page.id)}
                disabled={disabled}
                onToggle={() => onToggle(page.id)}
                onMove={(offset) => onMove(page.id, offset)}
                onRotate={(amount) => onRotate(new Set([page.id]), amount)}
                onRemove={() => onRemove(new Set([page.id]))}
              />
            ))}
          </div>
        </SortableContext>
        <p className="sr-only" aria-live="assertive">
          {active ? "Página en movimiento. Pulsa Escape para cancelar." : ""}
        </p>
      </DndContext>
    </section>
  );
}
