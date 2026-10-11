import type { PDFDocument } from "pdf-lib";
import type {
  OrganizeCommand,
  OrganizeWorkerMessage,
} from "@/types/organize-pdf";
import { validatePdf } from "./validate-pdf";
import { organizePdf } from "./organize-pdf";
import { toPdfError } from "./errors";

console.warn = () => undefined;
let source: PDFDocument | null = null;
const send = (message: OrganizeWorkerMessage, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

self.onmessage = async ({
  data,
}: MessageEvent<{ requestId: number; command: OrganizeCommand }>) => {
  const { requestId, command } = data;
  try {
    if (command.type === "validate") {
      source = await validatePdf(command.bytes);
      send({
        requestId,
        type: "success",
        result: { type: "validated", pageCount: source.getPageCount() },
      });
      return;
    }
    if (!source) throw new Error("Missing source PDF");
    const result = await organizePdf(
      source,
      command.pages,
      (completed, total) =>
        send({ requestId, type: "progress", completed, total }),
    );
    source = null;
    send(
      { requestId, type: "success", result: { type: "organized", ...result } },
      [result.bytes],
    );
  } catch (error) {
    const safe = toPdfError(
      error,
      command.type === "validate" ? "invalid" : "organize",
    );
    send({ requestId, type: "error", code: safe.code, message: safe.message });
  }
};
