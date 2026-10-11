import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import {
  groupsEveryN,
  PageRangeError,
  parsePageRanges,
  selectedGroup,
} from "@/lib/pdf/parse-page-ranges";
import { splitPdf } from "@/lib/pdf/split-pdf";
import { inspectPdf, makePdf } from "./helpers/pdf-fixtures";

test("interpreta rangos en el orden escrito y rechaza sintaxis o páginas inexistentes", () => {
  expect(parsePageRanges("4-5, 2, 7-8", 8).map(({ pages }) => pages)).toEqual([
    [4, 5],
    [2],
    [7, 8],
  ]);
  for (const text of [
    "",
    "1-",
    "0-2",
    "3-2",
    "1,,3",
    "1-9",
    "abc",
    "1.5",
    "-1",
    "1-−2",
  ]) {
    expect(() => parsePageRanges(text, 8), text).toThrow(PageRangeError);
  }
});

test("crea bloques de N páginas y conserva el último bloque corto", () => {
  expect(groupsEveryN("3", 8).map(({ pages }) => pages)).toEqual([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8],
  ]);
  expect(groupsEveryN("20", 3).map(({ pages }) => pages)).toEqual([[1, 2, 3]]);
  for (const value of ["0", "-1", "2.5", "", "abc", "2 páginas"])
    expect(() => groupsEveryN(value, 8)).toThrow(PageRangeError);
});

test("ordena páginas elegidas y genera PDF válidos sin alterar tamaño ni contenido", async () => {
  const bytes = await makePdf(
    "Original",
    [
      [300, 400],
      [842, 595],
      [600, 800],
      [420, 600],
    ],
    90,
  );
  const source = await PDFDocument.load(bytes);
  const selection = selectedGroup(new Set([4, 2]));
  expect(selection[0].pages).toEqual([2, 4]);
  const progress: number[] = [];
  const outputs = await splitPdf(
    source,
    [selection[0].pages, [1, 3]],
    (completed) => progress.push(completed),
  );
  const original = await inspectPdf(bytes);
  expect(await inspectPdf(new Uint8Array(outputs[0].bytes))).toEqual([
    original[1],
    original[3],
  ]);
  expect(await inspectPdf(new Uint8Array(outputs[1].bytes))).toEqual([
    original[0],
    original[2],
  ]);
  expect(progress).toEqual([1, 2]);
  expect(source.getPageCount()).toBe(4);
  await expect(splitPdf(source, [])).rejects.toThrow();
  await expect(splitPdf(source, [[5]])).rejects.toThrow();
});
