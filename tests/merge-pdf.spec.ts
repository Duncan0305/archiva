import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import { filePayload, inspectPdf, makePdf } from "./helpers/pdf-fixtures";

const input = (page: Page) => page.locator('input[type="file"]');
const rows = (page: Page) =>
  page
    .getByRole("list", { name: "Documentos seleccionados" })
    .getByRole("listitem");

async function downloadPdf(page: Page) {
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const download = await downloadEvent;
  const path = await download.path();
  expect(path).not.toBeNull();
  return { name: download.suggestedFilename(), bytes: await readFile(path!) };
}

test("seleccionar dos PDF, unir, renombrar y descargar un resultado válido", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const a = await makePdf(
    "Documento A",
    [
      [300, 400],
      [842, 595],
    ],
    90,
  );
  const b = await makePdf("Documento B", [[600, 600]]);
  await page.goto("/tools/merge-pdf/");
  await expect(
    page.getByRole("button", { name: "Unir PDF", exact: true }),
  ).toBeDisabled();
  await input(page).setInputFiles([
    filePayload("A.pdf", a),
    filePayload("B.pdf", b),
  ]);
  await expect(rows(page)).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Unir PDF", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: "test-results/merge-selected-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Un único PDF. Todo en orden." }),
  ).toBeVisible();
  await page
    .getByLabel("Nombre del archivo", { exact: true })
    .fill("mi-informe.PDF");
  const result = await downloadPdf(page);
  expect(result.name).toBe("mi-informe.pdf");
  expect(await inspectPdf(result.bytes)).toEqual([
    ...(await inspectPdf(a)),
    ...(await inspectPdf(b)),
  ]);
  await page.screenshot({
    path: "test-results/merge-result-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Nueva combinación" }).click();
  await expect(
    page.getByRole("button", { name: "Seleccionar archivos" }),
  ).toBeEnabled();
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
});

test("muestra carátulas reales, permite ampliarlas y conserva cada una al reordenar", async ({
  page,
}) => {
  async function cover(red: number, blue: number) {
    const pdf = await PDFDocument.create();
    const first = pdf.addPage([300, 400]);
    first.drawRectangle({
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      color: rgb(red, 0.2, blue),
    });
    pdf.addPage([300, 400]);
    return Buffer.from(await pdf.save());
  }
  await page.goto("/tools/merge-pdf/");
  await input(page).setInputFiles([
    filePayload("Rojo.pdf", await cover(0.9, 0.1)),
    filePayload("Azul.pdf", await cover(0.1, 0.9)),
  ]);
  const colors = await Promise.all(
    ["Rojo.pdf", "Azul.pdf"].map(async (name) => {
      const thumbnail = page.getByRole("img", {
        name: `Primera página de ${name}`,
        exact: true,
      });
      await expect(thumbnail).toBeVisible();
      return thumbnail.evaluate(async (element) => {
        const imageUrl = getComputedStyle(element).backgroundImage.match(
          /url\("?(blob:[^"\)]+)"?\)/,
        )?.[1];
        if (!imageUrl) throw new Error("Falta la miniatura local");
        const bitmap = await createImageBitmap(
          await (await fetch(imageUrl)).blob(),
        );
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.drawImage(bitmap, 0, 0, 1, 1);
        bitmap.close();
        return [...context.getImageData(0, 0, 1, 1).data];
      });
    }),
  );
  expect(colors[0][0]).toBeGreaterThan(colors[0][2]);
  expect(colors[1][2]).toBeGreaterThan(colors[1][0]);
  await page
    .getByRole("button", { name: "Ampliar portada de Rojo.pdf" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Portada de Rojo.pdf" });
  await expect(
    dialog.getByRole("img", { name: "Primera página ampliada de Rojo.pdf" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Subir Azul.pdf" }).click();
  await expect(rows(page).first()).toContainText("Azul.pdf");
  await expect(
    rows(page).first().getByRole("img", { name: "Primera página de Azul.pdf" }),
  ).toBeVisible();
  const redCoverUrl = await page
    .getByRole("img", { name: "Primera página de Rojo.pdf", exact: true })
    .evaluate(
      (element) =>
        getComputedStyle(element).backgroundImage.match(
          /url\("?(blob:[^"\)]+)"?\)/,
        )?.[1],
    );
  expect(redCoverUrl).toBeTruthy();
  await page.getByRole("button", { name: "Eliminar Rojo.pdf" }).click();
  await expect(rows(page)).toHaveCount(1);
  expect(
    await page.evaluate(async (url) => {
      try {
        await fetch(url!);
        return false;
      } catch {
        return true;
      }
    }, redCoverUrl),
  ).toBe(true);
});

test("añadir, quitar y ordenar tres PDF mediante flechas y arrastre", async ({
  page,
}) => {
  const a = await makePdf("A");
  const b = await makePdf("B");
  const c = await makePdf("C");
  await page.goto("/tools/merge-pdf/");
  await input(page).setInputFiles(filePayload("A.pdf", a));
  await expect(rows(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Unir PDF", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Añadir archivos" }),
  ).toBeEnabled();
  await input(page).setInputFiles([
    filePayload("B.pdf", b),
    filePayload("C.pdf", c),
  ]);
  await expect(rows(page)).toHaveCount(3);
  await page
    .getByRole("button", { name: "Eliminar B.pdf", exact: true })
    .click();
  await expect(rows(page)).toHaveCount(2);
  await input(page).setInputFiles(filePayload("B.pdf", b));
  await expect(rows(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Subir C.pdf", exact: true }).click();
  await expect(rows(page).nth(0)).toContainText("C.pdf");
  // C,A,B -> B,C,A. Real HTML5 drag-and-drop, not a state setter.
  await page
    .getByRole("button", { name: "Mover B.pdf", exact: true })
    .dragTo(rows(page).first());
  await expect(rows(page).nth(0)).toContainText("B.pdf");
  await expect(rows(page).nth(1)).toContainText("C.pdf");
  await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
  const result = await downloadPdf(page);
  expect(await inspectPdf(result.bytes)).toEqual([
    ...(await inspectPdf(b)),
    ...(await inspectPdf(c)),
    ...(await inspectPdf(a)),
  ]);
});

test("rechaza archivos falsos, vacíos, dañados y protegidos sin perder los válidos", async ({
  page,
}) => {
  await page.goto("/tools/merge-pdf/");
  const valid = await makePdf("Valido");
  const protectedPdf = await readFile("tests/fixtures/encrypted_new.pdf");
  await input(page).setInputFiles([
    filePayload("nota.txt", Buffer.from("texto"), "text/plain"),
    filePayload("falso.pdf", Buffer.from("texto, no PDF")),
    filePayload("vacio.pdf", Buffer.alloc(0)),
    filePayload(
      "roto.pdf",
      Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"),
    ),
    filePayload("protegido.pdf", protectedPdf),
    filePayload("valido.pdf", valid),
  ]);
  const issues = page.locator("main").getByRole("alert");
  await expect(issues).toContainText("nota.txt");
  await expect(issues).toContainText("falso.pdf");
  await expect(issues).toContainText("vacío");
  await expect(issues).toContainText("roto.pdf");
  await expect(issues).toContainText("protegido o cifrado");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("valido.pdf");
  await input(page).setInputFiles(filePayload("otro.pdf", valid));
  await expect(rows(page)).toHaveCount(2);
  await expect(issues).toHaveCount(0);
  await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
  expect((await inspectPdf((await downloadPdf(page)).bytes)).length).toBe(2);
});

test("arrastrar PDF al área de carga y procesar sin solicitudes de documentos", async ({
  page,
  context,
}) => {
  const requests: { url: string; method: string; hasBody: boolean }[] = [];
  context.on("request", (request) =>
    requests.push({
      url: request.url(),
      method: request.method(),
      hasBody: !!request.postDataBuffer(),
    }),
  );
  await page.goto("/tools/merge-pdf/");
  const a = await makePdf("Private A");
  const b = await makePdf("Private B");
  const transfer = await page.evaluateHandle(
    (bytes) => {
      const data = new DataTransfer();
      data.items.add(
        new File([new Uint8Array(bytes)], "privado-a.pdf", {
          type: "application/pdf",
        }),
      );
      return data;
    },
    [...a],
  );
  await page
    .getByTestId("pdf-dropzone")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await transfer.dispose();
  await expect(rows(page)).toHaveCount(1);
  await expect(
    page.getByRole("img", { name: "Primera página de privado-a.pdf" }),
  ).toBeVisible();
  // Once the local engine is loaded, all subsequent work succeeds offline.
  await context.setOffline(true);
  await input(page).setInputFiles(filePayload("privado-b.pdf", b));
  await expect(rows(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
  const result = await downloadPdf(page);
  expect(await inspectPdf(result.bytes)).toHaveLength(2);
  expect(
    requests.filter(
      (request) =>
        request.hasBody ||
        !["GET", "HEAD"].includes(request.method) ||
        new URL(request.url).origin !== "http://127.0.0.1:3100",
    ),
  ).toEqual([]);
  expect(
    requests.some((request) => /privado-[ab]\.pdf/.test(request.url)),
  ).toBe(false);
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
});

test("móvil, modo oscuro y accesibilidad de selección y resultado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/tools/merge-pdf/");
  const a = await makePdf("A");
  const b = await makePdf("B");
  const longName =
    "documento-con-un-nombre-muy-largo-que-debe-adaptarse-a-la-pantalla.pdf";
  await input(page).setInputFiles([
    filePayload(longName, a),
    filePayload("B.pdf", b),
  ]);
  await expect(rows(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Subir B.pdf", exact: true }).click();
  await expect(rows(page).first()).toContainText("B.pdf");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "test-results/merge-mobile-dark-selected.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toBeVisible();
  expect(await inspectPdf((await downloadPdf(page)).bytes)).toEqual([
    ...(await inspectPdf(b)),
    ...(await inspectPdf(a)),
  ]);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/merge-mobile-dark-result.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("un fallo al crear la descarga libera la selección y permite volver a empezar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    let failOnce = true;
    URL.createObjectURL = (blob) => {
      if (failOnce && blob instanceof Blob && blob.type === "application/pdf") {
        failOnce = false;
        throw new Error("Array buffer allocation failed");
      }
      return create(blob);
    };
  });
  await page.goto("/tools/merge-pdf/");
  const payloads = [
    filePayload("A.pdf", await makePdf("A")),
    filePayload("B.pdf", await makePdf("B")),
  ];
  await input(page).setInputFiles(payloads);
  await expect(
    page.getByRole("button", { name: "Unir PDF", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "memoria suficiente",
  );
  await expect(rows(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Unir PDF", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toHaveCount(
    0,
  );
  await input(page).setInputFiles(payloads);
  await expect(
    page.getByRole("button", { name: "Unir PDF", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
  expect(await inspectPdf((await downloadPdf(page)).bytes)).toHaveLength(2);
});

test("libera worker y URLs al terminar, reiniciar y salir", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counts = {
      urls: [] as string[],
      revoked: [] as string[],
      stopped: 0,
    };
    (window as typeof window & { pdfResources: typeof counts }).pdfResources =
      counts;
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    const terminate = Worker.prototype.terminate;
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      counts.urls.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      counts.revoked.push(url);
      revoke(url);
    };
    Worker.prototype.terminate = function () {
      counts.stopped++;
      terminate.call(this);
    };
  });
  await page.goto("/tools/merge-pdf/");
  const payloads = [
    filePayload("A.pdf", await makePdf("A")),
    filePayload("B.pdf", await makePdf("B")),
  ];
  for (let run = 0; run < 2; run++) {
    await input(page).setInputFiles(payloads);
    await expect(
      page.getByRole("button", { name: "Unir PDF", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Unir PDF", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Descargar PDF" }),
    ).toBeVisible();
    if (!run)
      await page.getByRole("button", { name: "Nueva combinación" }).click();
    else {
      await page.getByRole("link", { name: /Volver al catálogo/ }).click();
      await expect(
        page.getByRole("heading", { name: "Cada archivo, una solución." }),
      ).toBeVisible();
    }
  }
  const resources = await page.evaluate(
    () =>
      (
        window as typeof window & {
          pdfResources: { urls: string[]; revoked: string[]; stopped: number };
        }
      ).pdfResources,
  );
  expect(resources.urls).toHaveLength(6); // Two covers and one result per run.
  expect([...resources.revoked].sort()).toEqual([...resources.urls].sort());
  expect(resources.stopped).toBeGreaterThanOrEqual(2);
});

test("cancelar una lectura pendiente no repone archivos ni mantiene controles bloqueados", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      const read = original.bind(this);
      return new Promise<ArrayBuffer>((resolve, reject) => {
        (
          window as typeof window & { completePdfRead?: () => void }
        ).completePdfRead = () => {
          read().then(resolve, reject);
        };
      });
    };
  });
  await page.goto("/tools/merge-pdf/");
  await input(page).setInputFiles(filePayload("A.pdf", await makePdf("A")));
  await expect(
    page.getByRole("button", { name: "Seleccionar archivos" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: "Validando documentos:" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar y vaciar" }).click();
  await page.evaluate(() =>
    (
      window as typeof window & { completePdfRead?: () => void }
    ).completePdfRead?.(),
  );
  await expect(
    page.getByRole("button", { name: "Seleccionar archivos" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("list", { name: "Documentos seleccionados" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Unir PDF", exact: true }),
  ).toBeDisabled();
});
