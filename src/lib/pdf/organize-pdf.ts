import { degrees, PDFDocument } from "pdf-lib";
import type { OrganizedPage } from "@/types/organize-pdf";

const normalizeRotation = (angle: number) => ((angle % 360) + 360) % 360;

export async function organizePdf(
  source: PDFDocument,
  pages: readonly OrganizedPage[],
  onProgress: (completed: number, total: number) => void = () => undefined,
) {
  const sourcePages = source.getPages();
  if (
    !pages.length ||
    pages.some(
      ({ originalIndex, rotationDelta }) =>
        !Number.isSafeInteger(originalIndex) ||
        originalIndex < 0 ||
        originalIndex >= sourcePages.length ||
        !Number.isSafeInteger(rotationDelta) ||
        rotationDelta % 90 !== 0,
    )
  )
    throw new Error("Invalid page organization");

  const destination = await PDFDocument.create();
  destination.setCreator("Archiva");
  const copied = await destination.copyPages(
    source,
    pages.map(({ originalIndex }) => originalIndex),
  );
  copied.forEach((page, index) => {
    page.setRotation(
      degrees(
        normalizeRotation(
          page.getRotation().angle + pages[index].rotationDelta,
        ),
      ),
    );
    destination.addPage(page);
    onProgress(index + 1, copied.length);
  });
  const bytes = await destination.save({ addDefaultPage: false });
  return { bytes: bytes.buffer as ArrayBuffer, pageCount: copied.length };
}
