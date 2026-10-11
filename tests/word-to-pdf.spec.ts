import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { docxPayload, makeDocx } from "./helpers/docx-fixtures";

const fileInput = (page: Page) => page.locator('input[type="file"]');

test("abre un DOCX de cinco páginas y prepara una impresión semántica local", async ({
  page,
  context,
}) => {
  const unsafeRequests: string[] = [];
  context.on("request", (request) => {
    if (
      request.postDataBuffer() ||
      !["GET", "HEAD"].includes(request.method()) ||
      new URL(request.url()).origin !== "http://127.0.0.1:3100"
    )
      unsafeRequests.push(`${request.method()} ${request.url()}`);
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "print", {
      configurable: true,
      value: () => {
        const root = document.querySelector("#word-print-root");
        Object.assign(window, {
          __archivaPrint: {
            text: root?.textContent ?? "",
            title: document.title,
            pages: root?.querySelectorAll("section.archiva-docx").length ?? 0,
            hasImage: Boolean(root?.querySelector("img, svg image")),
            html: root?.outerHTML ?? "",
          },
        });
      },
    });
  });
  const documentBytes = await makeDocx();

  await page.goto("/tools/word-to-pdf/");
  await fileInput(page).setInputFiles(
    docxPayload("informe-cinco-paginas.docx", documentBytes),
  );
  await expect(page.getByText("DOCX validado localmente")).toBeVisible();
  const preview = page.getByTestId("docx-preview-content");
  await expect(preview).toContainText("Informe español: áéíóú y ñ");
  await expect(preview).toContainText("Columna A");
  await expect(preview).toContainText("Encabezado Archiva");
  await expect(preview).toContainText("Pie confidencial");
  await expect(preview.locator("section.archiva-docx")).toHaveCount(5);
  await expect(preview.locator("img, svg image")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/word-to-pdf-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByLabel("Nombre sugerido").fill("reporte privado.pdf");
  await page
    .getByRole("button", { name: "Guardar como PDF mediante impresión" })
    .click();
  await expect(page.getByText("Diálogo de impresión cerrado")).toBeVisible();

  const printed = await page.evaluate(() =>
    (
      window as typeof window & {
        __archivaPrint?: {
          text: string;
          title: string;
          pages: number;
          hasImage: boolean;
          html: string;
        };
      }
    ).__archivaPrint,
  );
  expect(printed).toMatchObject({
    title: "reporte privado",
    pages: 5,
    hasImage: true,
  });
  expect(printed?.text).toContain("Página 5 final");

  await page.evaluate((html) => {
    document.body.insertAdjacentHTML("beforeend", html);
    document.body.classList.add("printing-word-document");
  }, printed?.html ?? "");
  await page.emulateMedia({ media: "print" });
  const pdfBytes = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(pdfBytes),
  }).promise;
  const extractedPages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const pdfPage = await pdf.getPage(pageNumber);
    const content = await pdfPage.getTextContent();
    extractedPages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    pdfPage.cleanup();
  }
  pdf.cleanup();
  expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(extractedPages.join(" ")).toContain("Informe español: áéíóú y ñ");
  expect(extractedPages.join(" ")).toContain("Página 5 final");

  await expect(page.locator("a[download]")).toHaveCount(0);
  expect(unsafeRequests).toEqual([]);
});

test("reemplaza, elimina y carga un DOCX mediante arrastre", async ({ page }) => {
  await page.goto("/tools/word-to-pdf/");
  const first = await makeDocx();
  await fileInput(page).setInputFiles(docxPayload("primero.docx", first));
  await expect(page.getByText("primero.docx")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reemplazar" })).toBeEnabled();

  const second = await makeDocx({ externalLink: true });
  await fileInput(page).setInputFiles(docxPayload("segundo.docx", second));
  await expect(page.getByText("segundo.docx")).toBeVisible();
  await expect(page.getByText("Los enlaces se muestran")).toBeVisible();
  await page.getByRole("button", { name: "Quitar DOCX" }).click();
  await expect(page.getByRole("button", { name: "Seleccionar DOCX" })).toBeVisible();

  const transfer = await page.evaluateHandle(
    ({ bytes }) => {
      const data = new DataTransfer();
      data.items.add(
        new File([new Uint8Array(bytes)], "arrastrado.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      );
      return data;
    },
    { bytes: [...first] },
  );
  await page.getByTestId("docx-dropzone").dispatchEvent("drop", {
    dataTransfer: transfer,
  });
  await expect(page.getByText("arrastrado.docx")).toBeVisible();
});

test("rechaza archivos falsos, macros y recursos externos", async ({ page }) => {
  await page.goto("/tools/word-to-pdf/");
  await fileInput(page).setInputFiles(
    docxPayload("falso.docx", Buffer.from("contenido falso")),
  );
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "No pudimos abrir el documento" });
  await expect(alert).toContainText("dañado");

  await fileInput(page).setInputFiles(
    docxPayload("macro.docx", await makeDocx({ macro: true })),
  );
  await expect(alert).toContainText("macros");

  await fileInput(page).setInputFiles(
    docxPayload("externo.docx", await makeDocx({ externalImage: true })),
  );
  await expect(alert).toContainText("recursos externos");
});

test("la herramienta es responsive y accesible en modo oscuro", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/tools/word-to-pdf/");
  await fileInput(page).setInputFiles(
    docxPayload("móvil.docx", await makeDocx()),
  );
  await expect(
    page.getByRole("button", { name: "Guardar como PDF mediante impresión" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    390,
  );
  await page.screenshot({
    path: "test-results/word-to-pdf-mobile-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
