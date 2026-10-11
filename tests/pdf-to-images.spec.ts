import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { filePayload, makePdf } from "./helpers/pdf-fixtures";

const fileInput = (page: Page) => page.locator('input[type="file"]');

async function downloadedBytes(page: Page, linkName: string) {
  const event = page.waitForEvent("download");
  await page.getByRole("link", { name: linkName, exact: true }).click();
  const download = await event;
  return {
    name: download.suggestedFilename(),
    bytes: await readFile((await download.path())!),
  };
}

function jpegDimensions(bytes: Uint8Array) {
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
      };
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += Math.max(length + 2, 2);
  }
  throw new Error("JPEG dimensions not found");
}

test("convierte las páginas 2, 4, 6 y 8 a JPG de 150 DPI y crea un ZIP válido", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  context.on("request", (request) => {
    if (
      request.postDataBuffer() ||
      !["GET", "HEAD"].includes(request.method()) ||
      new URL(request.url()).origin !== "http://127.0.0.1:3100"
    )
      requests.push(`${request.method()} ${request.url()}`);
  });
  const sizes = Array.from(
    { length: 10 },
    (_, index) => [288 + index * 18, 432 + index * 12] as [number, number],
  );
  await page.goto("/tools/pdf-to-images/");
  await fileInput(page).setInputFiles(
    filePayload("diez-paginas.pdf", await makePdf("Aceptación", sizes)),
  );
  await expect(page.getByRole("button", { name: "Página 10" })).toBeVisible();
  await page.getByRole("button", { name: "Deseleccionar todas" }).click();
  await page.getByLabel("Selección por rangos").fill("2,4,6,8");
  await page.getByRole("button", { name: "Aplicar rango" }).click();
  await expect(page.getByText("4 de 10 seleccionadas")).toBeVisible();
  await page.getByLabel("Formato").selectOption("jpeg");
  await page.getByLabel("Resolución").selectOption("150");
  await expect(page.getByLabel("Calidad")).toHaveValue("85");
  await expect(page.getByLabel("Fondo")).toBeDisabled();
  await page.getByRole("button", { name: "Convertir 4 páginas" }).click();
  await expect(
    page.getByRole("heading", { name: "Tus imágenes están listas." }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.getByRole("button", { name: "Preparar ZIP" }).click();
  const archiveDownload = await downloadedBytes(page, "Descargar ZIP");
  expect(archiveDownload.name).toBe("archiva-imagenes.zip");
  const archive = await JSZip.loadAsync(archiveDownload.bytes);
  const names = Object.keys(archive.files);
  expect(names).toEqual([
    "archiva-pagina-02.jpg",
    "archiva-pagina-04.jpg",
    "archiva-pagina-06.jpg",
    "archiva-pagina-08.jpg",
  ]);
  for (const pageNumber of [2, 4, 6, 8]) {
    const bytes = await archive.files[
      `archiva-pagina-${String(pageNumber).padStart(2, "0")}.jpg`
    ].async("uint8array");
    expect(jpegDimensions(bytes)).toEqual({
      width: Math.ceil((sizes[pageNumber - 1][0] - 10) * (150 / 72) - 1e-7),
      height: Math.ceil((sizes[pageNumber - 1][1] - 10) * (150 / 72) - 1e-7),
    });
  }
  expect(requests).toEqual([]);
});

test("genera PNG transparente a 96 DPI y JPG con fondo blanco", async ({ page }) => {
  await page.goto("/tools/pdf-to-images/");
  await fileInput(page).setInputFiles(
    filePayload("carta.pdf", await makePdf("", [[612, 792]])),
  );
  await page.getByLabel("Resolución").selectOption("96");
  await page.getByLabel("Fondo").selectOption("transparent");
  await page.getByRole("button", { name: "Convertir 1 página" }).click();
  const png = await page.getByRole("img", { name: "Resultado de la página 1" }).evaluate(
    async (image) => {
      const blob = await fetch((image as HTMLImageElement).src).then((response) => response.blob());
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const alpha = context.getImageData(0, 0, 1, 1).data[3];
      bitmap.close();
      return { type: blob.type, width: canvas.width, height: canvas.height, alpha };
    },
  );
  expect(png).toEqual({ type: "image/png", width: 803, height: 1043, alpha: 0 });

  await page.getByRole("button", { name: "Ajustar conversión" }).click();
  await page.getByLabel("Formato").selectOption("jpeg");
  await page.getByRole("button", { name: "Convertir 1 página" }).click();
  const jpeg = await page.getByRole("img", { name: "Resultado de la página 1" }).evaluate(
    async (image) => {
      const blob = await fetch((image as HTMLImageElement).src).then((response) => response.blob());
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const pixel = [...context.getImageData(0, 0, 1, 1).data];
      bitmap.close();
      return { type: blob.type, pixel };
    },
  );
  expect(jpeg.type).toBe("image/jpeg");
  expect(jpeg.pixel.slice(0, 3).every((channel) => channel > 245)).toBe(true);
  expect(jpeg.pixel[3]).toBe(255);
});

test("genera WebP real con DPI personalizado y respeta una página horizontal", async ({
  page,
}) => {
  await page.goto("/tools/pdf-to-images/");
  await fileInput(page).setInputFiles(
    filePayload("horizontal.pdf", await makePdf("WebP", [[720, 360]])),
  );
  const webp = page.getByLabel("Formato").locator('option[value="webp"]');
  if (await webp.isDisabled()) {
    await expect(page.getByText(/no genera WebP real/)).toBeVisible();
    return;
  }
  await page.getByLabel("Formato").selectOption("webp");
  await page.getByLabel("Resolución").selectOption("custom");
  await page.getByLabel(/DPI personalizados/).fill("120");
  await page.getByLabel("Calidad").fill("70");
  await page.getByRole("button", { name: "Convertir 1 página" }).click();
  const result = await page.getByRole("img", { name: "Resultado de la página 1" }).evaluate(
    async (image) => {
      const blob = await fetch((image as HTMLImageElement).src).then((response) => response.blob());
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const bitmap = await createImageBitmap(blob);
      const value = {
        type: blob.type,
        width: bitmap.width,
        height: bitmap.height,
        riff: new TextDecoder().decode(bytes.slice(0, 4)),
        webp: new TextDecoder().decode(bytes.slice(8, 12)),
      };
      bitmap.close();
      return value;
    },
  );
  expect(result).toEqual({
    type: "image/webp",
    width: 1184,
    height: 584,
    riff: "RIFF",
    webp: "WEBP",
  });
});

test("valida rangos, archivos dañados y documentos protegidos", async ({ page }) => {
  await page.goto("/tools/pdf-to-images/");
  await fileInput(page).setInputFiles(
    filePayload("dañado.pdf", Buffer.from("%PDF-1.7\ninválido")),
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "No pudimos leer este PDF",
  );
  await fileInput(page).setInputFiles(
    filePayload("protegido.pdf", await readFile("tests/fixtures/encrypted_new.pdf")),
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "protegido o cifrado",
  );
  await fileInput(page).setInputFiles(
    filePayload("válido.pdf", await makePdf("Rangos", [[300, 400], [300, 400], [300, 400]])),
  );
  for (const value of ["1-", "3-2", "1-4", "0-2", "1,,2"]) {
    await page.getByLabel("Selección por rangos").fill(value);
    await page.getByRole("button", { name: "Aplicar rango" }).click();
    await expect(page.getByText(/formato|invertido|no existe|positivos/)).toBeVisible();
  }
  await page.getByLabel("Selección por rangos").fill("1-3,2,1");
  await page.getByRole("button", { name: "Aplicar rango" }).click();
  await expect(page.getByText("3 de 3 seleccionadas")).toBeVisible();
});

test("permite cancelar una conversión y volver a configurar", async ({ page }) => {
  await page.goto("/tools/pdf-to-images/");
  await fileInput(page).setInputFiles(
    filePayload(
      "largo.pdf",
      await makePdf("Cancelar", Array.from({ length: 12 }, () => [612, 792] as [number, number])),
    ),
  );
  await page.getByLabel("Resolución").selectOption("300");
  await page.getByRole("button", { name: "Convertir 12 páginas" }).click();
  await expect(page.getByRole("button", { name: "Cancelar conversión" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar conversión" }).click();
  await expect(page.getByRole("button", { name: "Convertir 12 páginas" })).toBeEnabled({
    timeout: 15_000,
  });
  await expect(page.getByText(/Conversión cancelada/)).toBeAttached();
});

test("es responsive, accesible y libera URLs al reiniciar", async ({ page }) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    (window as typeof window & { __urls: { created: string[]; revoked: string[] } }).__urls = {
      created: [],
      revoked: [],
    };
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      (
        window as typeof window & {
          __urls: { created: string[]; revoked: string[] };
        }
      ).__urls.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      (
        window as typeof window & {
          __urls: { created: string[]; revoked: string[] };
        }
      ).__urls.revoked.push(url);
      revoke(url);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/tools/pdf-to-images/");
  await fileInput(page).setInputFiles(
    filePayload("móvil.pdf", await makePdf("Móvil", [[360, 640], [640, 360]])),
  );
  await expect(page.getByRole("img", { name: "Vista de la página 1" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Convertir 2 páginas" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("button", { name: "Otro PDF" }).click();
  const urls = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __urls: { created: string[]; revoked: string[] };
        }
      ).__urls,
  );
  expect(urls.created.length).toBeGreaterThan(0);
  expect(new Set(urls.revoked)).toEqual(new Set(urls.created));
  await expect(page.getByRole("button", { name: "Seleccionar PDF" })).toBeEnabled();
});

