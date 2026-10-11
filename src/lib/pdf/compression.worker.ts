import type { PDFDocument } from "pdf-lib";
import type {
  CompressionCommand,
  CompressionWorkerMessage,
} from "@/types/compress-pdf";
import {
  analyzePdf,
  compressPdf,
  type QpdfEngine,
  validateCompressedPdf,
} from "./compress-pdf";
import { toPdfError } from "./errors";
import { validatePdf } from "./validate-pdf";

console.warn = () => undefined;
let sourceBytes: Uint8Array | null = null;
let sourceDocument: PDFDocument | null = null;
let enginePromise: Promise<QpdfEngine> | null = null;

const send = (message: CompressionWorkerMessage, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

async function engine() {
  if (!enginePromise) {
    enginePromise = import("@neslinesli93/qpdf-wasm")
      .then(({ default: createQpdf }) =>
        createQpdf({
          locateFile: () =>
            new URL("/wasm/qpdf.wasm", self.location.origin).toString(),
        }),
      )
      .then((instance) => instance as unknown as QpdfEngine);
  }
  return enginePromise;
}

self.onmessage = async ({
  data,
}: MessageEvent<{ requestId: number; command: CompressionCommand }>) => {
  const { requestId, command } = data;
  try {
    if (command.type === "validate") {
      sourceBytes = new Uint8Array(command.bytes);
      sourceDocument = await validatePdf(sourceBytes);
      send({
        requestId,
        type: "success",
        result: { type: "validated", analysis: analyzePdf(sourceDocument) },
      });
      return;
    }
    if (!sourceBytes || !sourceDocument) throw new Error("Missing source PDF");
    send({ requestId, type: "stage", stage: "optimizing" });
    const bytes = await compressPdf(await engine(), sourceBytes, command.level);
    send({ requestId, type: "stage", stage: "validating" });
    await validateCompressedPdf(bytes, sourceDocument.getPageCount());
    send(
      {
        requestId,
        type: "success",
        result: {
          type: "compressed",
          bytes,
          pageCount: sourceDocument.getPageCount(),
          level: command.level,
        },
      },
      [bytes],
    );
  } catch (cause) {
    const safe = toPdfError(
      cause,
      command.type === "validate" ? "invalid" : "compress",
    );
    send({ requestId, type: "error", code: safe.code, message: safe.message });
  }
};

