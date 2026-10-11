"use client";

import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import type {
  DpiPreset,
  ImageBackground,
  ImageExportFormat,
  PdfToImagesSettings,
} from "@/types/pdf-to-images";
import { effectiveDpi } from "@/lib/images/image-formats";

const selectClass =
  "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

export function ImageExportSettings({
  settings,
  disabled,
  webpSupported,
  error,
  onChange,
}: {
  settings: PdfToImagesSettings;
  disabled: boolean;
  webpSupported: boolean;
  error: string | null;
  onChange: (settings: PdfToImagesSettings) => void;
}) {
  const dpi = effectiveDpi(settings);
  const lossy = settings.format !== "png";
  return (
    <section
      aria-labelledby="export-settings-title"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-4 text-primary" />
        <h2 id="export-settings-title" className="text-sm font-semibold">
          Configuración
        </h2>
      </div>

      <label htmlFor="image-format" className="mt-5 block text-xs font-medium">
        Formato
      </label>
      <select
        id="image-format"
        className={selectClass}
        value={settings.format}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            ...settings,
            format: event.target.value as ImageExportFormat,
            background:
              event.target.value === "jpeg" ? "white" : settings.background,
          })
        }
      >
        <option value="jpeg">JPG · compacto</option>
        <option value="png">PNG · sin pérdida</option>
        <option value="webp" disabled={!webpSupported}>
          WebP · eficiente{webpSupported ? "" : " (no compatible)"}
        </option>
      </select>
      {!webpSupported && (
        <p className="mt-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
          Este navegador no genera WebP real. Puedes usar PNG o JPG.
        </p>
      )}

      <label htmlFor="image-dpi" className="mt-5 block text-xs font-medium">
        Resolución
      </label>
      <select
        id="image-dpi"
        className={selectClass}
        value={settings.dpiPreset}
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...settings, dpiPreset: event.target.value as DpiPreset })
        }
      >
        <option value="96">Estándar · 96 DPI</option>
        <option value="150">Alta · 150 DPI</option>
        <option value="300">Muy alta · 300 DPI</option>
        <option value="custom">Personalizada</option>
      </select>
      {settings.dpiPreset === "custom" && (
        <div className="mt-3">
          <label htmlFor="custom-dpi" className="text-[11px] text-muted-foreground">
            DPI personalizados · entre 36 y 600
          </label>
          <Input
            id="custom-dpi"
            type="number"
            min={36}
            max={600}
            value={settings.customDpi}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...settings, customDpi: Number(event.target.value) })
            }
            className="mt-1"
          />
        </div>
      )}
      {dpi >= 300 && (
        <p className="mt-3 flex gap-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Esta resolución puede crear imágenes grandes y usar más memoria.
        </p>
      )}

      {lossy ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="image-quality" className="text-xs font-medium">
              Calidad
            </label>
            <span className="text-xs tabular-nums">{settings.quality} %</span>
          </div>
          <input
            id="image-quality"
            type="range"
            min={1}
            max={100}
            value={settings.quality}
            disabled={disabled}
            className="mt-3 w-full accent-primary"
            onChange={(event) =>
              onChange({ ...settings, quality: Number(event.target.value) })
            }
          />
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            Una calidad mayor conserva más detalle y genera archivos más pesados.
          </p>
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-secondary p-3 text-[11px] leading-5 text-muted-foreground">
          PNG se exporta sin pérdida. La resolución controla sus dimensiones.
        </p>
      )}

      <label htmlFor="image-background" className="mt-5 block text-xs font-medium">
        Fondo
      </label>
      <select
        id="image-background"
        className={selectClass}
        value={settings.format === "jpeg" ? "white" : settings.background}
        disabled={disabled || settings.format === "jpeg"}
        onChange={(event) =>
          onChange({
            ...settings,
            background: event.target.value as ImageBackground,
          })
        }
      >
        <option value="white">Blanco</option>
        <option value="custom">Personalizado</option>
        <option value="transparent">Transparente</option>
      </select>
      {settings.format === "jpeg" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          JPG no admite transparencia y utiliza fondo blanco.
        </p>
      )}
      {settings.format !== "jpeg" && settings.background === "custom" && (
        <div className="mt-3 flex items-center gap-3">
          <input
            aria-label="Color de fondo"
            type="color"
            value={settings.backgroundColor}
            disabled={disabled}
            className="h-10 w-14 rounded-md border border-input bg-background p-1"
            onChange={(event) =>
              onChange({ ...settings, backgroundColor: event.target.value })
            }
          />
          <Input
            aria-label="Código del color de fondo"
            value={settings.backgroundColor}
            disabled={disabled}
            pattern="#[0-9a-fA-F]{6}"
            onChange={(event) =>
              onChange({ ...settings, backgroundColor: event.target.value })
            }
          />
        </div>
      )}
      {settings.format !== "jpeg" && settings.background === "transparent" && (
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          Se conserva la transparencia disponible; un fondo blanco dibujado en el
          PDF seguirá siendo blanco.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-xs leading-5 text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

