/** Render only the first page, with a fixed pixel budget for a small thumbnail. */
export async function renderPdfCover(
  bytes: ArrayBuffer,
  signal: AbortSignal,
): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
  // Cancellation destroys the document task and releases its transferred bytes.
  const abort = () => {
    void loadingTask.destroy();
  };
  signal.addEventListener("abort", abort, { once: true });
  let canvas: HTMLCanvasElement | null = null;
  try {
    const document = await loadingTask.promise;
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    const page = await document.getPage(1);
    const original = page.getViewport({ scale: 1 });
    const scale = Math.min(600 / original.width, 800 / original.height, 2);
    const viewport = page.getViewport({ scale });
    canvas = window.document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const task = page.render({ canvas, canvasContext: context, viewport });
    const cancelRender = () => task.cancel();
    signal.addEventListener("abort", cancelRender, { once: true });
    try {
      await task.promise;
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas!.toBlob(
          (image) =>
            image ? resolve(image) : reject(new Error("Canvas unavailable")),
          "image/png",
        ),
      );
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      return blob;
    } finally {
      signal.removeEventListener("abort", cancelRender);
      page.cleanup();
    }
  } finally {
    signal.removeEventListener("abort", abort);
    await loadingTask.destroy();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
