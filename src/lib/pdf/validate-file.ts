import { PdfError } from "./errors";

// Cheap metadata check only; every accepted file must also pass validatePdf in the worker.
export function validatePdfFile(file: Pick<File, "name" | "type" | "size">) {
  if (
    !/\.pdf$/i.test(file.name) &&
    !["application/pdf", "application/x-pdf"].includes(file.type.toLowerCase())
  )
    throw new PdfError("type");
  if (file.size === 0) throw new PdfError("empty");
}
