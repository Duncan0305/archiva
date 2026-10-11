"use client";

import { Gauge, Image as ImageIcon } from "lucide-react";
import { compressionPresets } from "@/lib/pdf/compression-presets";
import type {
  CompressionLevel,
  CompressionSource,
} from "@/types/compress-pdf";
import { cn } from "@/lib/utils";

export function CompressionSettings({
  source,
  level,
  disabled,
  onLevel,
}: {
  source: CompressionSource;
  level: CompressionLevel;
  disabled: boolean;
  onLevel: (level: CompressionLevel) => void;
}) {
  return (
    <section
      aria-labelledby="compression-settings-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-primary" />
        <h2 id="compression-settings-title" className="text-sm font-semibold">
          Nivel de compresión
        </h2>
      </div>
      <fieldset className="mt-5 space-y-2">
        <legend className="sr-only">Elegir nivel de compresión</legend>
        {compressionPresets.map((preset) => {
          const unavailable = preset.requiresImages && source.imageCount === 0;
          return (
            <label
              key={preset.level}
              className={cn(
                "block rounded-lg border p-3.5 transition-colors",
                level === preset.level
                  ? "border-primary bg-secondary"
                  : "border-border bg-background/50",
                unavailable
                  ? "cursor-not-allowed opacity-55"
                  : "cursor-pointer hover:border-primary/60",
              )}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="compression-level"
                  value={preset.level}
                  checked={level === preset.level}
                  disabled={disabled || unavailable}
                  onChange={() => onLevel(preset.level)}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <span className="block text-xs font-semibold">{preset.name}</span>
                  <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                    {preset.description}
                  </span>
                  <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
                    {preset.effect}
                  </span>
                </span>
              </span>
              {unavailable && (
                <span className="mt-2 flex items-center gap-1.5 pl-6 text-[10px] text-muted-foreground">
                  <ImageIcon className="size-3" />
                  No se detectaron imágenes que este nivel pueda optimizar.
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
        La reducción depende de la estructura del PDF. Archiva mostrará el
        tamaño real y no ofrecerá un archivo si resulta igual o más pesado.
      </p>
    </section>
  );
}

