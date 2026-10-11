"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { SelectedImage } from "@/types/images-to-pdf";
import { SortableImageItem } from "./sortable-image-item";

export function SortableImageGrid({
  images,
  disabled,
  onReorder,
  onMove,
  onRotate,
  onRemove,
}: {
  images: SelectedImage[];
  disabled: boolean;
  onReorder: (active: string, over: string) => void;
  onMove: (id: string, offset: number) => void;
  onRotate: (id: string, amount: number) => void;
  onRemove: (id: string) => void;
}) {
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
    if (event.over && event.active.id !== event.over.id)
      onReorder(String(event.active.id), String(event.over.id));
  }
  return (
    <section
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
      aria-labelledby="image-grid-title"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="image-grid-title" className="text-sm font-semibold">
            Orden de las imágenes
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Arrastra una miniatura directamente. Cada imagen ocupará una página.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {images.length} {images.length === 1 ? "imagen" : "imágenes"}
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={finish}
        autoScroll={{ threshold: { x: 0.15, y: 0.15 }, acceleration: 10 }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pulsa espacio para tomar una imagen, usa las flechas para moverla, espacio para soltarla o Escape para cancelar.",
          },
        }}
      >
        <SortableContext
          items={images.map(({ id }) => id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
            aria-label="Imágenes organizables"
          >
            {images.map((image, index) => (
              <SortableImageItem
                key={image.id}
                image={image}
                position={index + 1}
                total={images.length}
                disabled={disabled}
                onMove={(offset) => onMove(image.id, offset)}
                onRotate={(amount) => onRotate(image.id, amount)}
                onRemove={() => onRemove(image.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
