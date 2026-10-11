import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { filePayload, inspectPdf, makePdf } from "./helpers/pdf-fixtures";

const fileInput = (page: Page) => page.locator('input[type="file"]');
async function download(page: Page, name: string) {
  const event = page.waitForEvent("download");
  await page.getByRole("link", { name, exact: true }).click();
  const result = await event;
  return {
    name: result.suggestedFilename(),
    bytes: await readFile((await result.path())!),
  };
}

test("muestra páginas reales y extrae una selección no consecutiva visible", async ({
  page,
}) => {
  const sizes: [number, number][] = [
    [300, 400],
    [400, 500],
    [500, 600],
    [600, 700],
    [700, 800],
  ];
  const source = await makePdf("Libro", sizes, 90);
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(filePayload("libro.pdf", source));
  await expect(
    page.getByRole("img", { name: "Vista de la página 1" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Página 5" })).toBeVisible();
  await page.getByRole("button", { name: "Página 2" }).click();
  await page.getByRole("button", { name: "Página 4" }).click();
  await expect(page.getByRole("button", { name: "Página 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("2 de 5 páginas seleccionadas")).toBeVisible();
  await page.getByRole("button", { name: "Dividir PDF", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tu PDF está listo." }),
  ).toBeVisible();
  await page.getByLabel("Nombre del archivo").fill("mis-páginas.PDF");
  const output = await download(page, "Descargar PDF");
  expect(output.name).toBe("mis-páginas.pdf");
  const original = await inspectPdf(source);
  expect(await inspectPdf(output.bytes)).toEqual([original[1], original[3]]);
  await page.getByRole("button", { name: "Dividir otro PDF" }).click();
  await expect(
    page.getByRole("button", { name: "Seleccionar PDF" }),
  ).toBeEnabled();
});

test("seleccionar todas, deseleccionar y reemplazar documento", async ({
  page,
}) => {
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(
    filePayload(
      "primero.pdf",
      await makePdf("Uno", [
        [300, 400],
        [300, 400],
        [300, 400],
      ]),
    ),
  );
  await expect(page.getByRole("button", { name: "Página 3" })).toBeVisible();
  await page
    .getByRole("button", { name: "Seleccionar todas", exact: true })
    .click();
  await expect(page.getByText("3 de 3 páginas seleccionadas")).toBeVisible();
  await page.getByRole("button", { name: "Deseleccionar todas" }).click();
  await expect(
    page.getByRole("button", { name: "Dividir PDF", exact: true }),
  ).toBeDisabled();
  await fileInput(page).setInputFiles(
    filePayload(
      "segundo.pdf",
      await makePdf("Dos", [
        [400, 500],
        [400, 500],
      ]),
    ),
  );
  await expect(page.getByText("segundo.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "Página 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Página 3" })).toHaveCount(0);
  await page.getByRole("button", { name: "Quitar" }).click();
  await expect(
    page.getByRole("button", { name: "Seleccionar PDF" }),
  ).toBeVisible();
});

test("divide por rangos en el orden escrito, permite descargas y ZIP local", async ({
  page,
}) => {
  const source = await makePdf(
    "Rangos",
    Array.from(
      { length: 7 },
      (_, index) => [300 + index * 10, 400 + index * 10] as [number, number],
    ),
  );
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(filePayload("rangos.pdf", source));
  await expect(page.getByRole("radio", { name: /Por rangos/ })).toBeVisible();
  await page.getByRole("radio", { name: /Por rangos/ }).check();
  await page.getByLabel("Rangos de páginas").fill("5-7, 1-2, 3-4");
  await expect(page.getByText("PDF 1 · Páginas 5-7")).toBeVisible();
  await page.getByRole("button", { name: "Dividir PDF", exact: true }).click();
  await expect(
    page
      .getByRole("list", { name: "Archivos generados" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  const original = await inspectPdf(source);
  const firstEvent = page.waitForEvent("download");
  await page
    .getByRole("list", { name: "Archivos generados" })
    .getByRole("link", { name: "Descargar" })
    .first()
    .click();
  const first = await firstEvent;
  expect(await inspectPdf(await readFile((await first.path())!))).toEqual(
    original.slice(4, 7),
  );
  await page.getByRole("button", { name: "Preparar descarga ZIP" }).click();
  const zip = await download(page, "Descargar todos en ZIP");
  expect(zip.name).toBe("archiva-pdf-divididos.zip");
  const archive = await JSZip.loadAsync(zip.bytes);
  const files = Object.keys(archive.files).filter((name) =>
    name.endsWith(".pdf"),
  );
  expect(files).toEqual([
    "archiva-rango-01.pdf",
    "archiva-rango-02.pdf",
    "archiva-rango-03.pdf",
  ]);
  expect(
    await inspectPdf(await archive.files[files[1]].async("uint8array")),
  ).toEqual(original.slice(0, 2));
});

test("divide cada N páginas y conserva el bloque final corto", async ({
  page,
}) => {
  const source = await makePdf(
    "Bloques",
    Array.from({ length: 8 }, () => [400, 600] as [number, number]),
  );
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(filePayload("bloques.pdf", source));
  await page.getByRole("radio", { name: /Cada N páginas/ }).check();
  await page.getByLabel("Páginas por documento").fill("3");
  await expect(page.getByText("PDF 3 · Páginas 7-8")).toBeVisible();
  await page.getByRole("button", { name: "Dividir PDF", exact: true }).click();
  const rows = page
    .getByRole("list", { name: "Archivos generados" })
    .getByRole("listitem");
  await expect(rows).toHaveCount(3);
  const event = page.waitForEvent("download");
  await rows.last().getByRole("link", { name: "Descargar" }).click();
  const last = await event;
  expect(await inspectPdf(await readFile((await last.path())!))).toEqual(
    (await inspectPdf(source)).slice(6),
  );
});

test("rechaza rangos erróneos, PDF dañado o cifrado", async ({ page }) => {
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(
    filePayload("dañado.pdf", Buffer.from("%PDF-1.7\ninválido")),
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "No pudimos leer este PDF",
  );
  await fileInput(page).setInputFiles(
    filePayload(
      "protegido.pdf",
      await readFile("tests/fixtures/encrypted_new.pdf"),
    ),
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "protegido o cifrado",
  );
  await fileInput(page).setInputFiles(
    filePayload(
      "válido.pdf",
      await makePdf("Válido", [
        [300, 400],
        [300, 400],
        [300, 400],
      ]),
    ),
  );
  await page.getByRole("radio", { name: /Por rangos/ }).check();
  for (const value of ["1-", "3-2", "1-4", "0-2", "1,,2"]) {
    await page.getByLabel("Rangos de páginas").fill(value);
    await expect(
      page.getByRole("button", { name: "Dividir PDF", exact: true }),
    ).toBeDisabled();
  }
});

test("móvil, miniaturas seleccionables y ningún documento enviado por red", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  const requests: string[] = [];
  context.on("request", (request) => {
    if (
      request.postDataBuffer() ||
      !["GET", "HEAD"].includes(request.method()) ||
      new URL(request.url()).origin !== "http://127.0.0.1:3100"
    )
      requests.push(`${request.method()} ${request.url()}`);
  });
  await page.goto("/tools/split-pdf/");
  const source = await makePdf("Privado", [
    [300, 400],
    [300, 400],
    [300, 400],
    [300, 400],
  ]);
  await fileInput(page).setInputFiles(filePayload("privado.pdf", source));
  await page
    .getByRole("button", { name: "Página 1", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("img", { name: "Vista de la página 1" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Página 3" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Dividir PDF", exact: true }).click();
  expect(
    await inspectPdf((await download(page, "Descargar PDF")).bytes),
  ).toEqual([(await inspectPdf(source))[2]]);
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
});

test("carga miniaturas progresivamente en un PDF extenso", async ({ page }) => {
  const source = await makePdf(
    "Extenso",
    Array.from({ length: 80 }, () => [400, 600] as [number, number]),
  );
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(filePayload("extenso.pdf", source));
  await expect(page.getByRole("button", { name: "Página 80" })).toBeVisible();
  await page
    .getByRole("button", { name: "Página 1", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("img", { name: "Vista de la página 1" }),
  ).toBeVisible();
  expect(
    await page.getByRole("img", { name: /^Vista de la página / }).count(),
  ).toBeLessThan(40);
  await page
    .getByRole("button", { name: "Página 80" })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("img", { name: "Vista de la página 80" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Página 80" }).click();
  await page.getByRole("button", { name: "Dividir PDF", exact: true }).click();
  expect(
    await inspectPdf((await download(page, "Descargar PDF")).bytes),
  ).toEqual([(await inspectPdf(source))[79]]);
});

test("cancelar una lectura pendiente no repone el documento", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      const read = original.bind(this);
      return new Promise<ArrayBuffer>((resolve, reject) => {
        (
          window as typeof window & { completePdfRead?: () => void }
        ).completePdfRead = () => read().then(resolve, reject);
      });
    };
  });
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(
    filePayload("pendiente.pdf", await makePdf("Pendiente")),
  );
  await expect(
    page.getByRole("button", { name: "Seleccionar PDF" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar y vaciar" }).click();
  await page.evaluate(() =>
    (
      window as typeof window & { completePdfRead?: () => void }
    ).completePdfRead?.(),
  );
  await expect(
    page.getByRole("button", { name: "Seleccionar PDF" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Página 1", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("al reiniciar libera miniaturas, resultados, ZIP y workers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const resources = {
      urls: [] as string[],
      revoked: [] as string[],
      stopped: 0,
    };
    (
      window as typeof window & { pdfResources: typeof resources }
    ).pdfResources = resources;
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    const terminate = Worker.prototype.terminate;
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      resources.urls.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      resources.revoked.push(url);
      revoke(url);
    };
    Worker.prototype.terminate = function () {
      resources.stopped++;
      terminate.call(this);
    };
  });
  await page.goto("/tools/split-pdf/");
  await fileInput(page).setInputFiles(
    filePayload(
      "recursos.pdf",
      await makePdf("Recursos", [
        [300, 400],
        [300, 400],
        [300, 400],
      ]),
    ),
  );
  await expect(
    page.getByRole("img", { name: "Vista de la página 1" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Por rangos/ }).check();
  await page.getByLabel("Rangos de páginas").fill("1, 2, 3");
  await page.getByRole("button", { name: "Dividir PDF", exact: true }).click();
  await page.getByRole("button", { name: "Preparar descarga ZIP" }).click();
  await expect(
    page.getByRole("link", { name: "Descargar todos en ZIP" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dividir otro PDF" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const resources = (
          window as typeof window & {
            pdfResources: {
              urls: string[];
              revoked: string[];
              stopped: number;
            };
          }
        ).pdfResources;
        return resources.urls.length === resources.revoked.length;
      }),
    )
    .toBe(true);
  const resources = await page.evaluate(
    () =>
      (
        window as typeof window & {
          pdfResources: { urls: string[]; revoked: string[]; stopped: number };
        }
      ).pdfResources,
  );
  expect(resources.urls.length).toBeGreaterThanOrEqual(4);
  expect([...resources.revoked].sort()).toEqual([...resources.urls].sort());
  expect(resources.stopped).toBeGreaterThanOrEqual(2);
});
