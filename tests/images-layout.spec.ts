import { test, expect } from "@playwright/test";
import {
  calculatePageLayout,
  marginPoints,
} from "../src/lib/pdf/images-to-pdf";
import type { ImagePdfSettings } from "../src/types/images-to-pdf";

const settings = (value: Partial<ImagePdfSettings>): ImagePdfSettings => ({
  pageSize: "a4",
  orientation: "auto",
  margin: "small",
  fit: "contain",
  ...value,
});

test("calcula A4, Carta y A3 con orientación automática o forzada", () => {
  const landscape = { width: 1600, height: 900, rotation: 0 };
  const a4 = calculatePageLayout(landscape, settings({ pageSize: "a4" }));
  expect([a4.pageWidth, a4.pageHeight]).toEqual([841.89, 595.28]);
  const letter = calculatePageLayout(
    landscape,
    settings({ pageSize: "letter", orientation: "portrait" }),
  );
  expect([letter.pageWidth, letter.pageHeight]).toEqual([612, 792]);
  const a3 = calculatePageLayout(
    { width: 600, height: 900, rotation: 0 },
    settings({ pageSize: "a3", orientation: "landscape" }),
  );
  expect([a3.pageWidth, a3.pageHeight]).toEqual([1190.55, 841.89]);
});

test("convierte píxeles a puntos y contempla rotación y márgenes", () => {
  const layout = calculatePageLayout(
    { width: 1200, height: 800, rotation: 90 },
    settings({ pageSize: "image", margin: "medium" }),
  );
  expect(layout.margin).toBe(marginPoints.medium);
  expect(layout.pageWidth).toBeCloseTo(800 * 0.75 + 72, 5);
  expect(layout.pageHeight).toBeCloseTo(1200 * 0.75 + 72, 5);
  expect(layout.imageWidth).toBe(800);
  expect(layout.imageHeight).toBe(1200);
});

test("contener conserva proporción y rellenar ocupa el área imprimible", () => {
  const image = { width: 1600, height: 900, rotation: 0 };
  const contain = calculatePageLayout(
    image,
    settings({ orientation: "portrait", margin: "large", fit: "contain" }),
  );
  expect(contain.drawWidth / contain.drawHeight).toBeCloseTo(1600 / 900, 6);
  expect(contain.drawWidth).toBeLessThanOrEqual(contain.pageWidth - 108);
  expect(contain.drawHeight).toBeLessThanOrEqual(contain.pageHeight - 108);
  const cover = calculatePageLayout(
    image,
    settings({ orientation: "portrait", margin: "large", fit: "cover" }),
  );
  expect(cover.drawWidth).toBeCloseTo(cover.pageWidth - 108, 6);
  expect(cover.drawHeight).toBeCloseTo(cover.pageHeight - 108, 6);
  expect(cover.x).toBe(54);
  expect(cover.y).toBe(54);
});
