import { PDFDocument } from "pdf-lib";
import type { MergeProgress } from "@/types/pdf";
import { PdfError, toPdfError } from "./errors";

/** Uses already validated documents, in the caller's exact order. Run in a worker. */
export async function mergePdfs(
  documents: readonly PDFDocument[],
  onProgress?: (progress: MergeProgress) => void,
) {
  if (documents.length < 2) throw new PdfError("minimum");
  try {
    const output = await PDFDocument.create();
    output.setCreator("Archiva");
    const total = documents.length;
    onProgress?.({ stage: "copying", completed: 0, total });

    for (const [index, document] of documents.entries()) {
      if (document.isEncrypted) throw new PdfError("encrypted");
      if (!document.getPageCount()) throw new PdfError("invalid");
      // One copyPages call per document preserves shared resources within it.
      const pages = await output.copyPages(document, document.getPageIndices());
      for (const page of pages) output.addPage(page);
      onProgress?.({ stage: "copying", completed: index + 1, total });
    }

    onProgress?.({ stage: "saving", completed: total, total });
    const bytes = await output.save({ addDefaultPage: false });
    return { bytes, pageCount: output.getPageCount() };
  } catch (error) {
    throw toPdfError(error, "merge");
  }
}
