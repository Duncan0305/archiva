import type {
  ImageBackground,
  ImageExportFormat,
  PdfToImagesSettings,
} from "@/types/pdf-to-images";

export const imageFormatMeta: Record<
  ImageExportFormat,
  { label: string; extension: string; mime: string }
> = {
  jpeg: { label: "JPG", extension: "jpg", mime: "image/jpeg" },
  png: { label: "PNG", extension: "png", mime: "image/png" },
  webp: { label: "WebP", extension: "webp", mime: "image/webp" },
};

export function effectiveDpi(settings: PdfToImagesSettings) {
  return settings.dpiPreset === "custom"
    ? settings.customDpi
    : Number(settings.dpiPreset);
}

export function effectiveBackground(
  settings: PdfToImagesSettings,
): ImageBackground {
  return settings.format === "jpeg" ? "white" : settings.background;
}

export function imageDownloadBase(value: string) {
  const cleaned = value
    .trim()
    .replace(/\.(?:jpe?g|png|webp|zip)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  const safe = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned)
    ? `archiva-${cleaned}`
    : cleaned;
  return safe || "archiva";
}

export function imageDownloadName(
  base: string,
  pageNumber: number,
  pageCount: number,
  format: ImageExportFormat,
) {
  const digits = Math.max(2, String(pageCount).length);
  return `${imageDownloadBase(base)}-pagina-${String(pageNumber).padStart(digits, "0")}.${imageFormatMeta[format].extension}`;
}

export async function supportsWebp() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.8),
    );
    return blob?.type === "image/webp";
  } finally {
    canvas.width = canvas.height = 0;
  }
}

