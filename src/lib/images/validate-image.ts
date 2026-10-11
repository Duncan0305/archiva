import type { ImageMime } from "@/types/images-to-pdf";

export class ImageError extends Error {
  constructor(
    public readonly code: "type" | "empty" | "invalid" | "memory" | "read",
    message?: string,
  ) {
    super(
      message ??
        {
          type: "Selecciona una imagen JPG, PNG o WebP.",
          empty: "La imagen está vacía. Selecciona otro archivo.",
          invalid:
            "No pudimos leer esta imagen. Puede estar dañada o tener un formato incompatible.",
          memory:
            "El navegador no tiene memoria suficiente para esta imagen. Prueba con una de menor resolución.",
          read: "No pudimos leer la imagen de tu dispositivo. Comprueba que siga disponible.",
        }[code],
    );
    this.name = "ImageError";
  }
}

export function detectImageMime(bytes: Uint8Array): ImageMime {
  if (!bytes.byteLength) throw new ImageError("empty");
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    new TextDecoder("ascii").decode(bytes.subarray(0, 4)) === "RIFF" &&
    new TextDecoder("ascii").decode(bytes.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  throw new ImageError("type");
}

export function toImageError(error: unknown, fallback: ImageError["code"]) {
  if (error instanceof ImageError) return error;
  if (
    error instanceof Error &&
    /out of memory|allocation failed|array buffer allocation|invalid (typed array|array buffer) length/i.test(
      error.message,
    )
  )
    return new ImageError("memory");
  return new ImageError(fallback);
}

export async function decodeImage(bytes: ArrayBuffer, mime: ImageMime) {
  try {
    const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
    if (!bitmap.width || !bitmap.height) {
      bitmap.close();
      throw new ImageError("invalid");
    }
    return bitmap;
  } catch (error) {
    throw toImageError(error, "invalid");
  }
}
