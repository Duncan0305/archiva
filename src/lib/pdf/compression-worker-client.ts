import type {
  CompressionCommand,
  CompressionStage,
  CompressionWorkerMessage,
  CompressionWorkerResult,
} from "@/types/compress-pdf";
import { PdfError } from "./errors";

interface Pending {
  resolve: (result: CompressionWorkerResult) => void;
  reject: (error: PdfError) => void;
  stage?: (stage: CompressionStage) => void;
}

export class CompressionWorkerClient {
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private closed = false;

  constructor() {
    if (typeof Worker === "undefined") throw new PdfError("worker");
    try {
      this.worker = new Worker(
        new URL("./compression.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      throw new PdfError("worker");
    }
    this.worker.onmessage = ({ data }: MessageEvent<CompressionWorkerMessage>) => {
      const pending = this.pending.get(data.requestId);
      if (!pending) return;
      if (data.type === "stage") {
        pending.stage?.(data.stage);
        return;
      }
      this.pending.delete(data.requestId);
      if (data.type === "error")
        pending.reject(new PdfError(data.code, data.message));
      else pending.resolve(data.result);
    };
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.destroy(new PdfError("worker"));
    };
    this.worker.onmessageerror = () => this.destroy(new PdfError("worker"));
  }

  request(command: CompressionCommand, stage?: Pending["stage"]) {
    if (this.closed)
      return Promise.reject<CompressionWorkerResult>(new PdfError("worker"));
    return new Promise<CompressionWorkerResult>((resolve, reject) => {
      const requestId = ++this.nextId;
      this.pending.set(requestId, { resolve, reject, stage });
      try {
        this.worker.postMessage(
          { requestId, command },
          command.type === "validate" ? [command.bytes] : [],
        );
      } catch {
        this.destroy(new PdfError("worker"));
      }
    });
  }

  destroy(error = new PdfError("cancelled")) {
    if (this.closed) return;
    this.closed = true;
    this.worker.terminate();
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}

