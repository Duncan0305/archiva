import { test, expect } from "@playwright/test";
import {
  dimensionsAtDpi,
  validateCanvasDimensions,
} from "../src/lib/pdf/pdf-to-images-layout";
import { parseImagePageRanges } from "../src/lib/pdf/parse-image-page-ranges";
import {
  effectiveDpi,
  imageDownloadName,
} from "../src/lib/images/image-formats";

test("calcula dimensiones reales a 96, 150 y 300 DPI", () => {
  expect(dimensionsAtDpi(612, 792, 96)).toEqual({ width: 816, height: 1056 });
  expect(dimensionsAtDpi(612, 792, 150)).toEqual({ width: 1275, height: 1650 });
  expect(dimensionsAtDpi(612, 792, 300)).toEqual({ width: 2550, height: 3300 });
  expect(dimensionsAtDpi(792, 612, 150)).toEqual({ width: 1650, height: 1275 });
});

test("aplica DPI personalizado y rechaza lienzos excesivos", () => {
  expect(
    effectiveDpi({
      format: "png",
      dpiPreset: "custom",
      customDpi: 220,
      quality: 85,
      background: "transparent",
      backgroundColor: "#ffffff",
    }),
  ).toBe(220);
  expect(() => validateCanvasDimensions(20_000, 2_000)).toThrow(
    /demasiado grande/,
  );
  expect(() => validateCanvasDimensions(4_000, 4_000)).not.toThrow();
});

test("normaliza rangos, elimina duplicados y mantiene el orden natural", () => {
  expect(parseImagePageRanges("8, 2-4, 4, 6, 2", 10)).toEqual([
    2, 3, 4, 6, 8,
  ]);
  expect(() => parseImagePageRanges("5-2", 10)).toThrow(/invertido/);
  expect(() => parseImagePageRanges("1-11", 10)).toThrow(/no existe/);
  expect(() => parseImagePageRanges("1,,2", 10)).toThrow(/formato/);
});

test("crea nombres portables con página original y extensión real", () => {
  expect(imageDownloadName("Informe final.png", 2, 10, "jpeg")).toBe(
    "Informe final-pagina-02.jpg",
  );
  expect(imageDownloadName("CON", 8, 120, "webp")).toBe(
    "archiva-CON-pagina-008.webp",
  );
});
