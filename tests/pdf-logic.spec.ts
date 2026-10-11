import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { validatePdf } from "../src/lib/pdf/validate-pdf";
import { validatePdfFile } from "../src/lib/pdf/validate-file";
import { mergePdfs } from "../src/lib/pdf/merge-pdf";
import { PdfError, toPdfError } from "../src/lib/pdf/errors";
import { pdfDownloadName } from "../src/lib/pdf/download";
import { inspectPdf, makePdf } from "./helpers/pdf-fixtures";
import type { MergeProgress } from "../src/types/pdf";

test("unión real de dos PDF: contenido, tamaño, recorte y rotación", async () => {
  const a = await makePdf(
    "A",
    [
      [300, 400],
      [842, 595],
    ],
    90,
  );
  const b = await makePdf("B", [[600, 600]]);
  const progress: MergeProgress[] = [];
  const result = await mergePdfs(
    [await validatePdf(a), await validatePdf(b)],
    (event) => progress.push(event),
  );
  expect(result.pageCount).toBe(3);
  expect(await inspectPdf(result.bytes)).toEqual([
    ...(await inspectPdf(a)),
    ...(await inspectPdf(b)),
  ]);
  expect(progress).toEqual([
    { stage: "copying", completed: 0, total: 2 },
    { stage: "copying", completed: 1, total: 2 },
    { stage: "copying", completed: 2, total: 2 },
    { stage: "saving", completed: 2, total: 2 },
  ]);
});

test("tres PDF respetan el orden solicitado sin alterar los originales", async () => {
  const originals = await Promise.all([
    makePdf("A"),
    makePdf("B", [[400, 200]]),
    makePdf("C", [[250, 350]]),
  ]);
  const documents = await Promise.all(originals.map(validatePdf));
  const result = await mergePdfs([documents[2], documents[0], documents[1]]);
  expect(await inspectPdf(result.bytes)).toEqual([
    ...(await inspectPdf(originals[2])),
    ...(await inspectPdf(originals[0])),
    ...(await inspectPdf(originals[1])),
  ]);
  expect(documents.map((document) => document.getPageCount())).toEqual([
    1, 1, 1,
  ]);
});

test("validación de metadatos y contenido real independiente de extensión y MIME", async () => {
  expect(() =>
    validatePdfFile({ name: "nota.txt", type: "text/plain", size: 4 }),
  ).toThrow("Selecciona un archivo PDF");
  expect(() =>
    validatePdfFile({ name: "vacio.pdf", type: "application/pdf", size: 0 }),
  ).toThrow("vacío");
  expect(() =>
    validatePdfFile({ name: "correcto.PDF", type: "", size: 50 }),
  ).not.toThrow();
  await expect(
    validatePdf(Buffer.from("No soy un PDF, aunque mi extensión diga .pdf")),
  ).rejects.toMatchObject({ code: "invalid" });
  await expect(
    validatePdf(
      Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"),
    ),
  ).rejects.toMatchObject({ code: "invalid" });
  await expect(validatePdf(new Uint8Array())).rejects.toMatchObject({
    code: "empty",
  });
  const empty = await PDFDocument.create();
  await expect(
    validatePdf(await empty.save({ addDefaultPage: false })),
  ).rejects.toMatchObject({ code: "invalid" });
});

for (const filename of ["encrypted_old.pdf", "encrypted_new.pdf"]) {
  test(`rechaza el documento cifrado real ${filename}`, async () => {
    await expect(
      validatePdf(await readFile(`tests/fixtures/${filename}`)),
    ).rejects.toMatchObject({ code: "encrypted" });
  });
}

test("exige dos documentos y traduce errores de memoria sin filtrar detalles", async () => {
  await expect(mergePdfs([])).rejects.toMatchObject({ code: "minimum" });
  await expect(
    mergePdfs([await validatePdf(await makePdf("A"))]),
  ).rejects.toMatchObject({ code: "minimum" });
  const error = toPdfError(
    new RangeError("Array buffer allocation failed"),
    "read",
  );
  expect(error.code).toBe("memory");
  expect(
    toPdfError(new Error("private content"), "invalid").message,
  ).not.toContain("private content");
  expect(toPdfError(new PdfError("encrypted"), "invalid").code).toBe(
    "encrypted",
  );
});

test("nombre descargable portable y extensión PDF única", () => {
  expect(pdfDownloadName("informe.PDF")).toBe("informe.pdf");
  expect(pdfDownloadName("  ")).toBe("archiva-documento-unido.pdf");
  expect(pdfDownloadName("../informe:final")).toBe("..-informe-final.pdf");
  expect(pdfDownloadName("CON.pdf")).toBe("archiva-CON.pdf");
});
