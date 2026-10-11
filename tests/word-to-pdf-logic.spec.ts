import { test, expect } from "@playwright/test";
import {
  inspectDocx,
  validateDocxFile,
} from "../src/lib/docx/validate-docx";
import { printablePdfName } from "../src/lib/docx/render-docx";
import { makeDocx } from "./helpers/docx-fixtures";

test("valida el contenedor DOCX y analiza contenido compatible", async () => {
  const bytes = await makeDocx({ externalLink: true });
  const analysis = await inspectDocx(
    new Uint8Array(bytes).slice().buffer,
    { name: "informe.docx", size: bytes.byteLength },
  );
  expect(analysis).toMatchObject({
    title: "Informe de aceptación",
    author: "Archiva",
    imageCount: 1,
    tableCount: 1,
    sectionCount: 2,
    hasHeaders: true,
    hasFooters: true,
    hasLandscapeSections: true,
  });
  expect(analysis.requestedFonts).toContain("Arial");
  expect(analysis.warnings.map(({ code }) => code)).toEqual(
    expect.arrayContaining(["font-substitution", "external-links"]),
  );
});

test("rechaza formatos incorrectos, macros y recursos externos automáticos", async () => {
  expect(() =>
    validateDocxFile({ name: "antiguo.doc", type: "application/msword", size: 20 }),
  ).toThrow(/DOCX/);
  expect(() =>
    validateDocxFile({ name: "vacío.docx", type: "", size: 0 }),
  ).toThrow(/vacío/);
  expect(() =>
    validateDocxFile({ name: "grande.docx", type: "", size: 51 * 1024 * 1024 }),
  ).toThrow(/50 MB/);

  for (const options of [{ macro: true }, { externalImage: true }]) {
    const bytes = await makeDocx(options);
    await expect(
      inspectDocx(
        new Uint8Array(bytes).slice().buffer,
        { name: "inseguro.docx", size: bytes.byteLength },
      ),
    ).rejects.toMatchObject({
      code: options.macro ? "active-content" : "external-resource",
    });
  }
  await expect(
    inspectDocx(new TextEncoder().encode("No es ZIP").buffer, {
      name: "falso.docx",
      size: 9,
    }),
  ).rejects.toMatchObject({ code: "invalid" });
});

test("normaliza el nombre sugerido sin prometer una descarga automática", () => {
  expect(printablePdfName(" informe final.PDF ")).toBe("informe final.pdf");
  expect(printablePdfName("CON")).toBe("archiva-CON.pdf");
  expect(printablePdfName("<>:")).toBe("---.pdf");
  expect(printablePdfName("  ")).toBe("archiva-word-convertido.pdf");
});
