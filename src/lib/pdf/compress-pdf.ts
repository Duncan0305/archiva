import { PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import type {
  CompressionAnalysis,
  CompressionLevel,
} from "@/types/compress-pdf";
import { compressionPreset } from "./compression-presets";
import { PdfError } from "./errors";
import { validatePdf } from "./validate-pdf";

export interface QpdfFileSystem {
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string): Uint8Array;
  unlink(path: string): void;
}

export interface QpdfEngine {
  callMain(args: string[]): number;
  FS: QpdfFileSystem;
}

function hasFilter(stream: PDFRawStream) {
  const filter = stream.dict.get(PDFName.of("Filter"));
  return filter instanceof PDFName || filter instanceof PDFArray;
}

function isImage(stream: PDFRawStream) {
  const subtype = stream.dict.get(PDFName.of("Subtype"));
  return subtype instanceof PDFName && subtype.asString() === "/Image";
}

export function analyzePdf(document: PDFDocument): CompressionAnalysis {
  let imageCount = 0;
  let streamCount = 0;
  let compressedStreamCount = 0;
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    streamCount++;
    if (hasFilter(object)) compressedStreamCount++;
    if (isImage(object)) imageCount++;
  }
  return {
    pageCount: document.getPageCount(),
    imageCount,
    streamCount,
    compressedStreamCount,
  };
}

export async function compressPdf(
  engine: QpdfEngine,
  source: Uint8Array,
  level: CompressionLevel,
) {
  const suffix = crypto.randomUUID();
  const inputPath = `/input-${suffix}.pdf`;
  const outputPath = `/output-${suffix}.pdf`;
  try {
    engine.FS.writeFile(inputPath, source);
    const status = engine.callMain([
      inputPath,
      ...compressionPreset(level).args,
      outputPath,
    ]);
    if (status !== 0) throw new PdfError("compress");
    const output = engine.FS.readFile(outputPath);
    return new Uint8Array(output).slice().buffer;
  } catch (cause) {
    if (cause instanceof PdfError) throw cause;
    throw new PdfError("compress");
  } finally {
    try {
      engine.FS.unlink(inputPath);
    } catch {}
    try {
      engine.FS.unlink(outputPath);
    } catch {}
  }
}

export async function validateCompressedPdf(
  bytes: ArrayBuffer,
  expectedPages: number,
) {
  const document = await validatePdf(bytes);
  if (document.getPageCount() !== expectedPages) throw new PdfError("compress");
  return document;
}
