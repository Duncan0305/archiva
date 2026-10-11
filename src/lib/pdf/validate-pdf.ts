import { EncryptedPDFError, PDFDocument, PDFInvalidObject } from "pdf-lib";
import { PdfError, toPdfError } from "./errors";

export async function validatePdf(
  bytes: ArrayBuffer | Uint8Array,
): Promise<PDFDocument> {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!data.byteLength) throw new PdfError("empty");
  // PDF readers commonly allow a header within the first 1024 bytes.
  const header = new TextDecoder("latin1").decode(data.subarray(0, 1024));
  if (!/%PDF-\d\.\d/.test(header)) throw new PdfError("invalid");

  try {
    const document = await PDFDocument.load(data, {
      ignoreEncryption: false,
      // Encrypted object streams may look malformed until the encryption trailer
      // is reached. Let the parser detect encryption first, then reject every
      // recovered invalid object in unencrypted documents below.
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
    if (
      document.context
        .enumerateIndirectObjects()
        .some(([, object]) => object instanceof PDFInvalidObject)
    )
      throw new PdfError("invalid");
    const pages = document.getPages();
    if (!pages.length) throw new PdfError("invalid");
    for (const page of pages) {
      const { width, height } = page.getSize();
      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      )
        throw new PdfError("invalid");
    }
    return document;
  } catch (error) {
    // pdf-lib's ES5 build does not always preserve built-in Error prototypes.
    if (
      error instanceof EncryptedPDFError ||
      (error instanceof Error &&
        error.message === new EncryptedPDFError().message)
    )
      throw new PdfError("encrypted");
    throw toPdfError(error, "invalid");
  }
}
