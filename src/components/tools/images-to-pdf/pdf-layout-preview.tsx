"use client";

import { calculatePageLayout } from "@/lib/pdf/images-to-pdf";
import type { ImagePdfSettings, SelectedImage } from "@/types/images-to-pdf";

export function PdfLayoutPreview({
  images,
  settings,
}: {
  images: SelectedImage[];
  settings: ImagePdfSettings;
}) {
  const visible = images.slice(0, 3);
  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-labelledby="layout-preview-title"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="layout-preview-title" className="text-sm font-semibold">
          Vista previa
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {images.length} páginas
        </span>
      </div>
      <div className="mt-4 flex items-end justify-center gap-2 overflow-hidden rounded-lg bg-muted/60 p-4">
        {visible.map((image, index) => {
          const layout = calculatePageLayout(image, settings);
          const marginX = (layout.margin / layout.pageWidth) * 100;
          const marginY = (layout.margin / layout.pageHeight) * 100;
          return (
            <div key={image.id} className="min-w-0 flex-1 text-center">
              <div
                className="relative mx-auto max-h-44 w-full overflow-hidden border border-border bg-white shadow-sm"
                style={{
                  aspectRatio: `${layout.pageWidth}/${layout.pageHeight}`,
                }}
                aria-label={`Página ${index + 1}: ${image.name}`}
              >
                <span
                  className="absolute overflow-hidden"
                  style={{
                    inset: `${marginY}% ${marginX}%`,
                  }}
                >
                  <span
                    role="img"
                    aria-label={`Distribución de ${image.name}`}
                    className="block size-full bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url("${image.previewUrl}")`,
                      backgroundSize:
                        settings.fit === "contain" ? "contain" : "cover",
                      transform: `rotate(${image.rotation}deg) scale(${Math.abs(image.rotation) % 180 === 90 ? 0.74 : 1})`,
                    }}
                  />
                </span>
              </div>
              <span className="mt-1 block text-[9px] text-muted-foreground">
                {index + 1}
              </span>
            </div>
          );
        })}
      </div>
      {images.length > 3 && (
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          y {images.length - 3} páginas más con la misma configuración
        </p>
      )}
    </section>
  );
}
