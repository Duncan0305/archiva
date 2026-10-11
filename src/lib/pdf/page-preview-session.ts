import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

export class PagePreviewSession {
  private closed = false;
  private tail: Promise<unknown> = Promise.resolve();
  private cancelRender: (() => void) | null = null;

  private constructor(
    private readonly loading: PDFDocumentLoadingTask,
    private readonly document: PDFDocumentProxy,
  ) {}

  static async open(bytes: ArrayBuffer): Promise<PagePreviewSession> {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const loading = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    try {
      return new PagePreviewSession(loading, await loading.promise);
    } catch (error) {
      await loading.destroy();
      throw error;
    }
  }

  render(pageNumber: number, signal: AbortSignal): Promise<Blob> {
    const task = this.tail.then(() => this.renderOne(pageNumber, signal));
    this.tail = task.catch(() => undefined);
    return task;
  }

  private async renderOne(
    pageNumber: number,
    signal: AbortSignal,
  ): Promise<Blob> {
    if (this.closed || signal.aborted)
      throw new DOMException("Cancelled", "AbortError");
    const page = await this.document.getPage(pageNumber);
    if (this.closed || signal.aborted)
      throw new DOMException("Cancelled", "AbortError");
    const original = page.getViewport({ scale: 1 });
    const scale = Math.min(280 / original.width, 360 / original.height, 1.5);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const task = page.render({ canvas, canvasContext: context, viewport });
    const cancel = () => task.cancel();
    this.cancelRender = cancel;
    signal.addEventListener("abort", cancel, { once: true });
    try {
      await task.promise;
      if (this.closed || signal.aborted)
        throw new DOMException("Cancelled", "AbortError");
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (image) =>
            image ? resolve(image) : reject(new Error("Canvas unavailable")),
          "image/png",
        ),
      );
      if (this.closed || signal.aborted)
        throw new DOMException("Cancelled", "AbortError");
      return blob;
    } finally {
      signal.removeEventListener("abort", cancel);
      this.cancelRender = null;
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.cancelRender?.();
    void this.loading.destroy();
  }
}
