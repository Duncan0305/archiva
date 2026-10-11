import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { analyzePdf } from "../src/lib/pdf/compress-pdf";
import {
  compressionPreset,
  compressionPresets,
} from "../src/lib/pdf/compression-presets";

test("los tres niveles ejecutan estrategias de compresión distintas", () => {
  expect(compressionPresets.map(({ level }) => level)).toEqual([
    "soft",
    "balanced",
    "high",
  ]);
  expect(compressionPreset("soft").args).not.toContain("--recompress-flate");
  expect(compressionPreset("balanced").args).toContain("--recompress-flate");
  expect(compressionPreset("balanced").args).not.toContain("--optimize-images");
  expect(compressionPreset("high").args).toEqual(
    expect.arrayContaining(["--optimize-images", "--jpeg-quality=60"]),
  );
  expect(compressionPreset("high").requiresImages).toBe(true);
});

test("analiza páginas, flujos e imágenes incrustadas reales", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([300, 400]);
  const png = await document.embedPng(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==",
  );
  page.drawImage(png, { x: 20, y: 20, width: 100, height: 100 });
  page.drawText("Contenido vectorial preservable", { x: 20, y: 160 });
  const loaded = await PDFDocument.load(await document.save());
  const analysis = analyzePdf(loaded);

  expect(analysis.pageCount).toBe(1);
  expect(analysis.imageCount).toBeGreaterThanOrEqual(1);
  expect(analysis.streamCount).toBeGreaterThanOrEqual(2);
  expect(analysis.compressedStreamCount).toBeGreaterThanOrEqual(1);
});
