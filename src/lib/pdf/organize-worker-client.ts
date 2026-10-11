import type {
  OrganizeCommand,
  OrganizeWorkerMessage,
  OrganizeWorkerResult,
} from "@/types/organize-pdf";
import { PdfError } from "./errors";

interface Pending {
  resolve: (result: OrganizeWorkerResult) => void;
  reject: (error: PdfError) => void;
  progress?: (completed: number, total: number) => void;
}

export class OrganizeWorkerClient {
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private closed = false;

  constructor() {
    if (typeof Worker === "undefined") throw new PdfError("worker");
    try {
      this.worker = new Worker(
        new URL("./organize.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      throw new PdfError("worker");
    }
    this.worker.onmessage = ({ data }: MessageEvent<OrganizeWorkerMessage>) => {
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

  request(command: OrganizeCommand, progress?: Pending["progress"]) {
    if (this.closed)
      return Promise.reject<OrganizeWorkerResult>(new PdfError("worker"));
    return new Promise<OrganizeWorkerResult>((resolve, reject) => {
      const requestId = ++this.nextId;
      this.pending.set(requestId, { resolve, reject, progress });
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
