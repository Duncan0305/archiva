import { PDFDocument } from "pdf-lib";
import type { SplitOutput } from "@/types/split-pdf";

export async function splitPdf(
  source: PDFDocument,
  groups: readonly (readonly number[])[],
  onProgress: (completed: number, total: number) => void = () => undefined,
): Promise<SplitOutput[]> {
  const totalPages = source.getPageCount();
  if (
    !groups.length ||
    groups.some(
      (group) =>
        !group.length ||
        group.some(
          (page) =>
            !Number.isSafeInteger(page) || page < 1 || page > totalPages,
        ),
    )
  )
    throw new Error("Invalid page groups");
  const outputs: SplitOutput[] = [];
  for (const [index, group] of groups.entries()) {
    const destination = await PDFDocument.create();
    destination.setCreator("Archiva");
    const copied = await destination.copyPages(
      source,
      group.map((page) => page - 1),
    );
    for (const page of copied) destination.addPage(page);
    const bytes = await destination.save({ addDefaultPage: false });
    outputs.push({ pages: [...group], bytes: bytes.buffer as ArrayBuffer });
    onProgress(index + 1, groups.length);
  }
  return outputs;
}
