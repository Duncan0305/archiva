import { PDFDocument } from "pdf-lib";
import type {
  ImageFit,
  ImagePdfSettings,
  PageLayout,
  WorkerImage,
} from "@/types/images-to-pdf";

const pageSizes = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  a3: [841.89, 1190.55],
} as const;

export const marginPoints = {
  none: 0,
  small: 18,
  medium: 36,
  large: 54,
} as const;

export function calculatePageLayout(
  image: Pick<WorkerImage, "width" | "height" | "rotation">,
  settings: ImagePdfSettings,
): PageLayout {
  const quarterTurn = Math.abs(image.rotation) % 180 === 90;
  const imageWidth = quarterTurn ? image.height : image.width;
  const imageHeight = quarterTurn ? image.width : image.height;
  const margin = marginPoints[settings.margin];
  let pageWidth: number;
  let pageHeight: number;

  if (settings.pageSize === "image") {
    // CSS pixels conventionally represent 1/96 inch; PDF points use 1/72 inch.
    pageWidth = imageWidth * 0.75 + margin * 2;
    pageHeight = imageHeight * 0.75 + margin * 2;
  } else {
    [pageWidth, pageHeight] = pageSizes[settings.pageSize];
  }

  const shouldLandscape =
    settings.orientation === "landscape" ||
    (settings.orientation === "auto" && imageWidth > imageHeight);
  const shouldPortrait = settings.orientation === "portrait";
  if (
    (shouldLandscape && pageHeight > pageWidth) ||
    (shouldPortrait && pageWidth > pageHeight)
  )
    [pageWidth, pageHeight] = [pageHeight, pageWidth];

  const availableWidth = Math.max(1, pageWidth - margin * 2);
  const availableHeight = Math.max(1, pageHeight - margin * 2);
  const scale =
    settings.fit === "contain"
      ? Math.min(availableWidth / imageWidth, availableHeight / imageHeight)
      : Math.max(availableWidth / imageWidth, availableHeight / imageHeight);
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const drawWidth = settings.fit === "cover" ? availableWidth : scaledWidth;
  const drawHeight = settings.fit === "cover" ? availableHeight : scaledHeight;
  return {
    pageWidth,
    pageHeight,
    margin,
    imageWidth,
    imageHeight,
    drawWidth,
    drawHeight,
    x: margin + (availableWidth - drawWidth) / 2,
    y: margin + (availableHeight - drawHeight) / 2,
  };
}

async function normalizeImage(
  image: WorkerImage,
  fit: ImageFit,
  targetAspect: number,
): Promise<{ bytes: Uint8Array; type: "image/jpeg" | "image/png" }> {
  if (typeof OffscreenCanvas === "undefined")
    throw new Error("Offscreen canvas unavailable");
  const bitmap = await createImageBitmap(
    new Blob([image.bytes], { type: image.mime }),
  );
  const angle = ((image.rotation % 360) + 360) % 360;
  const rotatedWidth = angle % 180 === 90 ? bitmap.height : bitmap.width;
  const rotatedHeight = angle % 180 === 90 ? bitmap.width : bitmap.height;
  const rotated = new OffscreenCanvas(rotatedWidth, rotatedHeight);
  const context = rotated.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas unavailable");
  }
  context.translate(rotatedWidth / 2, rotatedHeight / 2);
  context.rotate((angle * Math.PI) / 180);
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  let output = rotated;
  if (fit === "cover") {
    const sourceAspect = rotatedWidth / rotatedHeight;
    const cropWidth =
      sourceAspect > targetAspect
        ? Math.max(1, Math.round(rotatedHeight * targetAspect))
        : rotatedWidth;
    const cropHeight =
      sourceAspect > targetAspect
        ? rotatedHeight
        : Math.max(1, Math.round(rotatedWidth / targetAspect));
    output = new OffscreenCanvas(cropWidth, cropHeight);
    const crop = output.getContext("2d");
    if (!crop) throw new Error("Canvas unavailable");
    crop.drawImage(
      rotated,
      (rotatedWidth - cropWidth) / 2,
      (rotatedHeight - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );
    rotated.width = 1;
    rotated.height = 1;
  }
  const type: "image/jpeg" | "image/png" =
    image.mime === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await output.convertToBlob({ type, quality: 0.95 });
  output.width = 1;
  output.height = 1;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type };
}

export async function imagesToPdf(
  images: readonly WorkerImage[],
  settings: ImagePdfSettings,
  onProgress: (completed: number, total: number) => void = () => undefined,
) {
  if (!images.length) throw new Error("No images");
  const document = await PDFDocument.create();
  document.setCreator("Archiva");

  for (const [index, image] of images.entries()) {
    const layout = calculatePageLayout(image, settings);
    const needsNormalization =
      image.mime === "image/webp" ||
      ((image.rotation % 360) + 360) % 360 !== 0 ||
      settings.fit === "cover";
    let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(image.bytes);
    let type: "image/jpeg" | "image/png" =
      image.mime === "image/jpeg" ? "image/jpeg" : "image/png";
    if (needsNormalization) {
      const normalized = await normalizeImage(
        image,
        settings.fit,
        layout.drawWidth / layout.drawHeight,
      );
      bytes = normalized.bytes;
      type = normalized.type;
    }
    const embedded =
      type === "image/jpeg"
        ? await document.embedJpg(bytes)
        : await document.embedPng(bytes);
    const page = document.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(embedded, {
      x: layout.x,
      y: layout.y,
      width: layout.drawWidth,
      height: layout.drawHeight,
    });
    onProgress(index + 1, images.length);
  }
  const output = await document.save({ addDefaultPage: false });
  return { bytes: output.buffer as ArrayBuffer, pageCount: images.length };
}
