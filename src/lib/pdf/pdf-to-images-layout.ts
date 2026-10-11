export const MIN_EXPORT_DPI = 36;
export const MAX_EXPORT_DPI = 600;
export const MAX_CANVAS_DIMENSION = 16_384;
export const MAX_CANVAS_PIXELS = 40_000_000;

export function dimensionsAtDpi(
  widthPoints: number,
  heightPoints: number,
  dpi: number,
) {
  const scale = dpi / 72;
  return {
    width: Math.max(1, Math.ceil(widthPoints * scale - 1e-7)),
    height: Math.max(1, Math.ceil(heightPoints * scale - 1e-7)),
  };
}

export function validateCanvasDimensions(width: number, height: number) {
  if (
    width > MAX_CANVAS_DIMENSION ||
    height > MAX_CANVAS_DIMENSION ||
    width * height > MAX_CANVAS_PIXELS
  )
    throw new Error(
      `La página produciría una imagen de ${width.toLocaleString("es")} × ${height.toLocaleString("es")} px, demasiado grande para procesarla de forma segura. Reduce la resolución.`,
    );
}

