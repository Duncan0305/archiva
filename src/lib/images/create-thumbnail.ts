import { decodeImage } from "./validate-image";
import type { ImageMime } from "@/types/images-to-pdf";

export async function createImageThumbnail(
  bytes: ArrayBuffer,
  mime: ImageMime,
) {
  const bitmap = await decodeImage(bytes, mime);
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    bitmap.close();
    throw new Error("Canvas unavailable");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Canvas unavailable")),
      "image/webp",
      0.82,
    ),
  );
  canvas.width = 0;
  canvas.height = 0;
  return { blob, width: originalWidth, height: originalHeight };
}
