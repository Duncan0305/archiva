import type {
  MergeProgress,
  PdfCommand,
  PdfWorkerRequest,
  PdfWorkerResponse,
  PdfWorkerResult,
} from "@/types/pdf";
import { PdfError } from "./errors";

interface PendingRequest {
  resolve: (result: PdfWorkerResult) => void;
  reject: (error: PdfError) => void;
  onProgress?: (progress: MergeProgress) => void;
}

/** Created on selection, so neither the engine nor a worker loads in the catalog. */
export class PdfWorkerClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 0;
  private closed = false;

  constructor() {
    if (typeof Worker === "undefined")
      throw new PdfError(
        "worker",
        "Tu navegador no admite el procesamiento local necesario. Prueba con una versión actual de Chrome, Firefox, Safari o Edge.",
      );
    try {
      this.worker = new Worker(new URL("./pdf.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      throw new PdfError("worker");
    }
    this.worker.onmessage = ({ data }: MessageEvent<PdfWorkerResponse>) => {
      const request = this.pending.get(data.requestId);
      if (!request) return;
      if (data.type === "progress") {
        request.onProgress?.(data.progress);
        return;
      }
      this.pending.delete(data.requestId);
      if (data.type === "error")
        request.reject(new PdfError(data.code, data.message));
      else request.resolve(data.result);
    };
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.destroy(new PdfError("worker"));
    };
    this.worker.onmessageerror = () => this.destroy(new PdfError("worker"));
  }

  request(
    command: PdfCommand,
    onProgress?: PendingRequest["onProgress"],
  ): Promise<PdfWorkerResult> {
    if (this.closed) return Promise.reject(new PdfError("worker"));
    const requestId = ++this.nextRequestId;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, onProgress });
      const message: PdfWorkerRequest = { requestId, command };
      try {
        this.worker.postMessage(
          message,
          command.type === "validate" ? [command.bytes] : [],
        );
      } catch {
        this.destroy(new PdfError("worker"));
      }
    });
  }

  destroy(error = new PdfError("cancelled")) {
    this.closed = true;
    this.worker.terminate();
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}
