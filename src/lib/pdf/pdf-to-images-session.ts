import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import type { PdfToImagesSettings } from "@/types/pdf-to-images";
import {
  effectiveBackground,
  effectiveDpi,
  imageFormatMeta,
} from "@/lib/images/image-formats";
import {
  dimensionsAtDpi,
  validateCanvasDimensions,
} from "./pdf-to-images-layout";

export interface RenderedPageBlob {
  blob: Blob;
  width: number;
  height: number;
  mime: string;
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob)
          reject(new Error("El navegador no pudo codificar la imagen."));
        else if (blob.type !== mime)
          reject(
            new Error(
              mime === "image/webp"
                ? "Este navegador no puede generar imágenes WebP. Elige PNG o JPG."
                : "El navegador generó un formato de imagen diferente al solicitado.",
            ),
          );
        else resolve(blob);
      },
      mime,
      quality,
    );
  });
}

export class PdfToImagesSession {
  private closed = false;
  private tail: Promise<unknown> = Promise.resolve();
  private cancelRender: (() => void) | null = null;

  private constructor(
    private readonly loading: PDFDocumentLoadingTask,
    private readonly document: PDFDocumentProxy,
  ) {}

  static async open(bytes: ArrayBuffer) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const loading = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    try {
      const document = await loading.promise;
      return new PdfToImagesSession(loading, document);
    } catch (error) {
      await loading.destroy();
      throw error;
    }
  }

  get pageCount() {
    return this.document.numPages;
  }

  async render(pageNumber: number, signal: AbortSignal) {
    return (await this.renderThumbnail(pageNumber, signal)).blob;
  }

  renderThumbnail(pageNumber: number, signal: AbortSignal) {
    return this.enqueue(() =>
      this.renderPage(pageNumber, signal, {
        dpi: 72,
        mime: "image/png",
        quality: undefined,
        background: "#ffffff",
        maxDimension: 360,
      }),
    );
  }

  renderPreview(
    pageNumber: number,
    settings: PdfToImagesSettings,
    signal: AbortSignal,
  ) {
    const meta = imageFormatMeta[settings.format];
    const background = effectiveBackground(settings);
    return this.enqueue(() =>
      this.renderPage(pageNumber, signal, {
        dpi: effectiveDpi(settings),
        mime: meta.mime,
        quality: settings.format === "png" ? undefined : settings.quality / 100,
        background:
          background === "transparent"
            ? null
            : background === "custom"
              ? settings.backgroundColor
              : "#ffffff",
        maxDimension: 760,
      }),
    );
  }

  renderExport(
    pageNumber: number,
    settings: PdfToImagesSettings,
    signal: AbortSignal,
  ) {
    const meta = imageFormatMeta[settings.format];
    const background = effectiveBackground(settings);
    return this.enqueue(() =>
      this.renderPage(pageNumber, signal, {
        dpi: effectiveDpi(settings),
        mime: meta.mime,
        quality: settings.format === "png" ? undefined : settings.quality / 100,
        background:
          background === "transparent"
            ? null
            : background === "custom"
              ? settings.backgroundColor
              : "#ffffff",
      }),
    );
  }

  private enqueue(task: () => Promise<RenderedPageBlob>) {
    const queued = this.tail.then(task);
    this.tail = queued.catch(() => undefined);
    return queued;
  }

  private async renderPage(
    pageNumber: number,
    signal: AbortSignal,
    options: {
      dpi: number;
      mime: string;
      quality?: number;
      background: string | null;
      maxDimension?: number;
    },
  ): Promise<RenderedPageBlob> {
    if (this.closed || signal.aborted)
      throw new DOMException("Cancelled", "AbortError");
    const page = await this.document.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const expected = dimensionsAtDpi(base.width, base.height, options.dpi);
    if (!options.maxDimension)
      validateCanvasDimensions(expected.width, expected.height);
    const exportScale = options.dpi / 72;
    const scale = options.maxDimension
      ? Math.min(
          exportScale,
          options.maxDimension / Math.max(base.width, base.height),
        )
      : exportScale;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = options.maxDimension
      ? Math.max(1, Math.ceil(viewport.width - 1e-7))
      : expected.width;
    canvas.height = options.maxDimension
      ? Math.max(1, Math.ceil(viewport.height - 1e-7))
      : expected.height;
    const context = canvas.getContext("2d", {
      alpha: options.background === null,
    });
    if (!context) throw new Error("Canvas unavailable");
    if (options.background) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
      background: options.background ?? "rgba(0, 0, 0, 0)",
    });
    const cancel = () => renderTask.cancel();
    this.cancelRender = cancel;
    signal.addEventListener("abort", cancel, { once: true });
    try {
      await renderTask.promise;
      if (this.closed || signal.aborted)
        throw new DOMException("Cancelled", "AbortError");
      const blob = await canvasBlob(
        canvas,
        options.mime,
        options.quality,
      );
      if (this.closed || signal.aborted)
        throw new DOMException("Cancelled", "AbortError");
      return {
        blob,
        width: options.maxDimension ? expected.width : canvas.width,
        height: options.maxDimension ? expected.height : canvas.height,
        mime: blob.type,
      };
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

