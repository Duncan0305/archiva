import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
  degrees,
} from "pdf-lib";

export async function makePdf(
  label: string,
  sizes: [number, number][] = [[595, 842]],
  rotation = 0,
) {
  const document = await PDFDocument.create();
  document.setTitle(label);
  for (const [index, size] of sizes.entries()) {
    const page = document.addPage(size);
    page.setRotation(degrees(rotation));
    page.setCropBox(5, 5, size[0] - 10, size[1] - 10);
    page.drawText(`${label} - page ${index + 1}`, { x: 30, y: 40, size: 14 });
  }
  return Buffer.from(await document.save());
}

export async function inspectPdf(bytes: Uint8Array) {
  const document = await PDFDocument.load(bytes);
  return document.getPages().map((page) => {
    const contents = page.node.Contents();
    const streams =
      contents instanceof PDFArray
        ? contents.asArray().map((ref) => {
            const stream = document.context.lookup(ref);
            if (!(stream instanceof PDFRawStream))
              throw new Error("Expected a page content stream");
            return stream;
          })
        : contents instanceof PDFRawStream
          ? [contents]
          : [];
    return {
      size: page.getSize(),
      rotation: page.getRotation().angle,
      cropBox: page.getCropBox(),
      // Compare actual decoded page operators/text, not only page counts.
      contents: streams.map((stream) =>
        Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"),
      ),
    };
  });
}

export function filePayload(
  name: string,
  buffer: Buffer,
  mimeType = "application/pdf",
) {
  return { name, mimeType, buffer };
}
