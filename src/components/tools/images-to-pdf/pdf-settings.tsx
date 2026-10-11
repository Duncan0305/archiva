"use client";

import type {
  ImageFit,
  ImagePdfSettings,
  PageMargin,
  PageOrientation,
  PageSize,
} from "@/types/images-to-pdf";

const fields: {
  key: keyof ImagePdfSettings;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "pageSize",
    label: "Tamaño de página",
    options: [
      { value: "a4", label: "A4" },
      { value: "letter", label: "Carta" },
      { value: "a3", label: "A3" },
      { value: "image", label: "Tamaño de cada imagen" },
    ],
  },
  {
    key: "orientation",
    label: "Orientación",
    options: [
      { value: "auto", label: "Automática" },
      { value: "portrait", label: "Vertical" },
      { value: "landscape", label: "Horizontal" },
    ],
  },
  {
    key: "margin",
    label: "Márgenes",
    options: [
      { value: "none", label: "Sin márgenes" },
      { value: "small", label: "Pequeños" },
      { value: "medium", label: "Medianos" },
      { value: "large", label: "Grandes" },
    ],
  },
  {
    key: "fit",
    label: "Ajuste",
    options: [
      { value: "contain", label: "Contener · imagen completa" },
      { value: "cover", label: "Rellenar · recortar exceso" },
    ],
  },
];

export function PdfSettings({
  settings,
  disabled,
  onChange,
}: {
  settings: ImagePdfSettings;
  disabled: boolean;
  onChange: (settings: ImagePdfSettings) => void;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-labelledby="pdf-settings-title"
    >
      <h2 id="pdf-settings-title" className="text-sm font-semibold">
        Configura el PDF
      </h2>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
        Una imagen por página. La vista previa se actualiza al instante.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {fields.map((field) => (
          <label key={field.key} className="block text-xs font-medium">
            {field.label}
            <select
              value={settings[field.key]}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...settings,
                  [field.key]: event.target.value as PageSize &
                    PageOrientation &
                    PageMargin &
                    ImageFit,
                })
              }
              className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
