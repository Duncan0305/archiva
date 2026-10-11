import type { PdfErrorCode } from "@/types/pdf";

const messages: Record<PdfErrorCode, string> = {
  type: "Selecciona un archivo PDF. Este formato no es compatible.",
  empty: "El archivo está vacío. Selecciona un PDF con contenido.",
  invalid:
    "No pudimos leer este PDF. Puede estar dañado o tener una estructura incompatible.",
  encrypted:
    "Este PDF está protegido o cifrado. Utiliza una copia sin protección que tengas autorización para usar.",
  memory:
    "El navegador no tiene memoria suficiente para estos documentos. Prueba con archivos más pequeños o menos documentos.",
  read: "No pudimos leer el archivo de tu dispositivo. Comprueba que siga disponible y vuelve a seleccionarlo.",
  minimum: "Añade al menos dos documentos PDF válidos para unirlos.",
  worker:
    "El procesamiento local se interrumpió. Vuelve a seleccionar los documentos; si son grandes, prueba con menos archivos.",
  merge:
    "No pudimos combinar estos documentos. Alguno puede contener elementos incompatibles. Prueba con otra selección.",
  split:
    "No pudimos dividir este documento. Puede contener elementos incompatibles. Prueba con otro PDF.",
  organize:
    "No pudimos organizar este documento. Vuelve a seleccionarlo e inténtalo de nuevo.",
  images:
    "No pudimos crear el PDF con estas imágenes. Prueba con archivos más pequeños o vuelve a seleccionarlos.",
  render:
    "No pudimos convertir las páginas en imágenes. Reduce la resolución o prueba con otra copia del PDF.",
  compress:
    "No pudimos optimizar este PDF de forma segura. Puede contener elementos incompatibles con el motor local.",
  cancelled: "La operación se ha cancelado.",
};

export class PdfError extends Error {
  constructor(
    public readonly code: PdfErrorCode,
    message = messages[code],
  ) {
    super(message);
    this.name = "PdfError";
  }
}

// Never surface raw parser exceptions: they may include document internals.
export function toPdfError(error: unknown, fallback: PdfErrorCode): PdfError {
  if (error instanceof PdfError) return error;
  if (
    error instanceof Error &&
    /out of memory|allocation failed|array buffer allocation|invalid (typed array|array buffer) length/i.test(
      error.message,
    )
  )
    return new PdfError("memory");
  return new PdfError(fallback);
}
