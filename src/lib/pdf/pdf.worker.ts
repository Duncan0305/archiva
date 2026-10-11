import type { PDFDocument } from "pdf-lib";
import type { PdfWorkerRequest, PdfWorkerResponse } from "@/types/pdf";
import { validatePdf } from "./validate-pdf";
import { mergePdfs } from "./merge-pdf";
import { PdfError, toPdfError } from "./errors";

// Only this worker holds parsed documents. No storage or network APIs are used.
// Keep third-party parser diagnostics out of the console. Errors are reported
// exclusively through the fixed, user-facing messages in errors.ts.
console.warn = () => undefined;
const documents = new Map<string, PDFDocument>();
const send = (message: PdfWorkerResponse, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

self.onmessage = async ({ data }: MessageEvent<PdfWorkerRequest>) => {
  const { requestId, command } = data;
  try {
    if (command.type === "validate") {
      const document = await validatePdf(command.bytes);
      documents.set(command.id, document);
      send({
        requestId,
        type: "success",
        result: { type: "validated", pageCount: document.getPageCount() },
      });
    } else if (command.type === "remove") {
      documents.delete(command.id);
      send({ requestId, type: "success", result: { type: "removed" } });
    } else {
      const ordered = command.ids.map((id) => {
        const document = documents.get(id);
        if (!document) throw new PdfError("worker");
        return document;
      });
      const result = await mergePdfs(ordered, (progress) =>
        send({ requestId, type: "progress", progress }),
      );
      // save() returns a fresh Uint8Array backed by a transferable ArrayBuffer.
      const bytes = result.bytes.buffer as ArrayBuffer;
      documents.clear();
      send(
        {
          requestId,
          type: "success",
          result: { type: "merged", bytes, pageCount: result.pageCount },
        },
        [bytes],
      );
    }
  } catch (error) {
    const safe = toPdfError(
      error,
      command.type === "validate" ? "invalid" : "merge",
    );
    send({ requestId, type: "error", code: safe.code, message: safe.message });
  }
};
