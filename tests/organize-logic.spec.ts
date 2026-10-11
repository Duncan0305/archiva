import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { organizePdf } from "../src/lib/pdf/organize-pdf";
import { inspectPdf, makePdf } from "./helpers/pdf-fixtures";

test("exporta orden, eliminaciones y rotaciones sin rasterizar páginas", async () => {
  const sourceBytes = await makePdf(
    "Organizar",
    [
      [300, 400],
      [320, 420],
      [340, 440],
      [360, 460],
    ],
    90,
  );
  const source = await PDFDocument.load(sourceBytes);
  const result = await organizePdf(source, [
    { id: "p4", originalIndex: 3, rotationDelta: 90 },
    { id: "p1", originalIndex: 0, rotationDelta: -90 },
    { id: "p3", originalIndex: 2, rotationDelta: 180 },
  ]);
  const original = await inspectPdf(sourceBytes);
  const output = await inspectPdf(new Uint8Array(result.bytes));
  expect(output.map(({ contents }) => contents)).toEqual([
    original[3].contents,
    original[0].contents,
    original[2].contents,
  ]);
  expect(output.map(({ rotation }) => rotation)).toEqual([180, 0, 270]);
  expect(output.map(({ size }) => size)).toEqual([
    original[3].size,
    original[0].size,
    original[2].size,
  ]);
});

test("rechaza una organización vacía o con índices inválidos", async () => {
  const source = await PDFDocument.load(await makePdf("Fuente"));
  await expect(organizePdf(source, [])).rejects.toThrow(
    "Invalid page organization",
  );
  await expect(
    organizePdf(source, [{ id: "bad", originalIndex: 4, rotationDelta: 0 }]),
  ).rejects.toThrow("Invalid page organization");
});
