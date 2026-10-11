import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { filePayload, inspectPdf } from "./helpers/pdf-fixtures";

const fileInput = (page: Page) => page.locator('input[type="file"]');

async function compressionFixture(pages = 8) {
  const document = await PDFDocument.create();
  document.setTitle("Prueba de compresión local");
  for (let index = 0; index < pages; index++) {
    const page = document.addPage(index % 2 ? [842, 595] : [595, 842]);
    page.drawText(`Archiva compresión - página ${index + 1}`, {
      x: 40,
      y: 60,
      size: 18,
    });
    page.drawRectangle({ x: 40, y: 100, width: 180, height: 80, borderWidth: 2 });
  }
  return Buffer.from(await document.save({ useObjectStreams: false }));
}

async function downloadPdf(page: Page) {
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const download = await downloadEvent;
  return {
    name: download.suggestedFilename(),
    bytes: await readFile((await download.path())!),
  };
}

test("comprime realmente un PDF, conserva sus páginas y no transmite el archivo", async ({
  page,
  context,
}) => {
  const unsafeRequests: string[] = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (
      request.postDataBuffer() ||
      !["GET", "HEAD"].includes(request.method()) ||
      url.origin !== "http://127.0.0.1:3100"
    )
      unsafeRequests.push(`${request.method()} ${request.url()}`);
  });
  const original = await compressionFixture();

  await page.goto("/tools/compress-pdf/");
  await fileInput(page).setInputFiles(filePayload("informe.pdf", original));
  await expect(page.getByRole("heading", { name: "Documento analizado" })).toBeVisible();
  await expect(page.getByAltText("Vista previa de la primera página")).toBeVisible();
  await expect(page.getByText("5,5 KB · 8 páginas")).toBeVisible();
  await page.getByRole("button", { name: "Comprimir PDF" }).click();

  await expect(page.getByRole("heading", { name: "Tu PDF ocupa menos." })).toBeVisible();
  await expect(page.getByAltText("Vista previa del PDF optimizado")).toBeVisible();
  const result = await downloadPdf(page);
  expect(result.name).toBe("archiva-pdf-comprimido.pdf");
  expect(result.bytes.byteLength).toBeLessThan(original.byteLength);
  expect(await inspectPdf(result.bytes)).toEqual(await inspectPdf(original));
  expect(unsafeRequests).toEqual([]);
});

test("detecta imágenes, habilita el nivel alto y permite reemplazar el PDF", async ({
  page,
}) => {
  const document = await PDFDocument.create();
  const pageWithImage = document.addPage([400, 400]);
  const png = await document.embedPng(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==",
  );
  pageWithImage.drawImage(png, { x: 50, y: 50, width: 250, height: 250 });

  await page.goto("/tools/compress-pdf/");
  await fileInput(page).setInputFiles(
    filePayload("escaneado.pdf", Buffer.from(await document.save())),
  );
  await expect(page.getByText("1 imagen incrustada detectada")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Alta/ })).toBeEnabled();
  await page.getByRole("radio", { name: /Alta/ }).check();
  await expect(page.getByRole("radio", { name: /Alta/ })).toBeChecked();

  await fileInput(page).setInputFiles(
    filePayload("solo-texto.pdf", await compressionFixture(2)),
  );
  await expect(page.getByText("0 imágenes incrustadas detectadas")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Alta/ })).toBeDisabled();
});

test("el nivel alto optimiza una imagen compatible sin rasterizar la página", async ({
  page,
}) => {
  await page.goto("/tools/compress-pdf/");
  const pngDataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 123456789;
    for (let index = 0; index < pixels.data.length; index += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      pixels.data[index] = seed & 255;
      pixels.data[index + 1] = (seed >>> 8) & 255;
      pixels.data[index + 2] = (seed >>> 16) & 255;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png");
  });
  const pdfDocument = await PDFDocument.create();
  const pdfPage = pdfDocument.addPage([595, 842]);
  const image = await pdfDocument.embedPng(pngDataUrl);
  pdfPage.drawImage(image, { x: 40, y: 300, width: 480, height: 360 });
  pdfPage.drawText("Texto vectorial que debe seguir en el documento", {
    x: 40,
    y: 250,
  });
  const original = Buffer.from(
    await pdfDocument.save({ useObjectStreams: false }),
  );

  await fileInput(page).setInputFiles(filePayload("mixto.pdf", original));
  await page.getByRole("radio", { name: /Alta/ }).check();
  await page.getByRole("button", { name: "Comprimir PDF" }).click();
  await expect(page.getByRole("heading", { name: "Tu PDF ocupa menos." })).toBeVisible();
  const result = await downloadPdf(page);
  expect(result.bytes.byteLength).toBeLessThan(original.byteLength);
  expect((await inspectPdf(result.bytes))[0].contents).toEqual(
    (await inspectPdf(original))[0].contents,
  );
});

test("rechaza entradas inválidas y documentos cifrados", async ({ page }) => {
  await page.goto("/tools/compress-pdf/");
  await fileInput(page).setInputFiles(
    filePayload("falso.pdf", Buffer.from("No soy un documento PDF")),
  );
  const toolAlert = page
    .getByRole("alert")
    .filter({ hasText: "No pudimos completar la optimización" });
  await expect(toolAlert).toContainText("dañado");

  await fileInput(page).setInputFiles({
    name: "protegido.pdf",
    mimeType: "application/pdf",
    buffer: await readFile("tests/fixtures/encrypted_new.pdf"),
  });
  await expect(toolAlert).toContainText("protegido");
});

test("no ofrece una descarga peor para un PDF ya optimizado", async ({ page }) => {
  await page.goto("/tools/compress-pdf/");
  await fileInput(page).setInputFiles(
    filePayload("sin-optimizar.pdf", await compressionFixture(2)),
  );
  await page.getByRole("button", { name: "Comprimir PDF" }).click();
  await expect(page.getByRole("heading", { name: "Tu PDF ocupa menos." })).toBeVisible();
  const optimized = await downloadPdf(page);

  await page.getByRole("button", { name: "Comprimir otro PDF" }).click();
  await fileInput(page).setInputFiles(
    filePayload("optimizado.pdf", optimized.bytes),
  );
  await page.getByRole("button", { name: "Comprimir PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Este PDF ya parece estar optimizado" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toHaveCount(0);
});

test("permite cancelar el trabajo y libera el documento", async ({ page }) => {
  await page.goto("/tools/compress-pdf/");
  await fileInput(page).setInputFiles(
    filePayload("extenso.pdf", await compressionFixture(80)),
  );
  await page.getByRole("button", { name: "Comprimir PDF" }).click();
  await page.getByRole("button", { name: "Cancelar y vaciar" }).click();
  await expect(page.getByRole("heading", { name: "Menos peso, el mismo documento" })).toBeVisible();
  await expect(page.getByText("extenso.pdf")).toHaveCount(0);
});

test("la interfaz móvil en tema oscuro es accesible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/tools/compress-pdf/");
  await fileInput(page).setInputFiles(
    filePayload("movil.pdf", await compressionFixture(2)),
  );
  await expect(page.getByRole("button", { name: "Comprimir PDF" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    390,
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
