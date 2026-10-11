import type {
  ImagesPdfCommand,
  ImagesPdfWorkerMessage,
} from "@/types/images-to-pdf";
import { PdfError } from "./errors";

interface Pending {
  resolve: (result: { bytes: ArrayBuffer; pageCount: number }) => void;
  reject: (error: PdfError) => void;
  progress?: (completed: number, total: number) => void;
}

export class ImagesPdfWorkerClient {
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private closed = false;

  constructor() {
    if (typeof Worker === "undefined") throw new PdfError("worker");
    try {
      this.worker = new Worker(
        new URL("./images-to-pdf.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      throw new PdfError("worker");
    }
    this.worker.onmessage = ({
      data,
    }: MessageEvent<ImagesPdfWorkerMessage>) => {
      const pending = this.pending.get(data.requestId);
      if (!pending) return;
      if (data.type === "progress") {
        pending.progress?.(data.completed, data.total);
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

  request(command: ImagesPdfCommand, progress?: Pending["progress"]) {
    if (this.closed)
      return Promise.reject<{ bytes: ArrayBuffer; pageCount: number }>(
        new PdfError("worker"),
      );
    return new Promise<{ bytes: ArrayBuffer; pageCount: number }>(
      (resolve, reject) => {
        const requestId = ++this.nextId;
        this.pending.set(requestId, { resolve, reject, progress });
        try {
          this.worker.postMessage(
            { requestId, command },
            command.images.map(({ bytes }) => bytes),
          );
        } catch {
          this.destroy(new PdfError("worker"));
        }
      },
    );
  }

  destroy(error = new PdfError("cancelled")) {
    if (this.closed) return;
    this.closed = true;
    this.worker.terminate();
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
