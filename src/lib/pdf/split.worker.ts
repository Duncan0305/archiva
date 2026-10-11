import type { PDFDocument } from "pdf-lib";
import type { SplitCommand, SplitWorkerMessage } from "@/types/split-pdf";
import { validatePdf } from "./validate-pdf";
import { splitPdf } from "./split-pdf";
import { toPdfError } from "./errors";

console.warn = () => undefined;
let source: PDFDocument | null = null;
const send = (message: SplitWorkerMessage, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

self.onmessage = async ({
  data,
}: MessageEvent<{ requestId: number; command: SplitCommand }>) => {
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
    const outputs = await splitPdf(source, command.groups, (completed, total) =>
      send({ requestId, type: "progress", completed, total }),
    );
    source = null;
    send(
      { requestId, type: "success", result: { type: "split", outputs } },
      outputs.map(({ bytes }) => bytes),
    );
  } catch (error) {
    const safe = toPdfError(
      error,
      command.type === "validate" ? "invalid" : "split",
    );
    send({ requestId, type: "error", code: safe.code, message: safe.message });
  }
};
