import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { filePayload, inspectPdf, makePdf } from "./helpers/pdf-fixtures";

const input = (page: Page) => page.locator('input[type="file"]');

async function loadPdf(page: Page, pages = 6) {
  const source = await makePdf(
    "Organizable",
    Array.from(
      { length: pages },
      (_, index) => [300 + index * 10, 400 + index * 10] as [number, number],
    ),
  );
  await input(page).setInputFiles(filePayload("organizable.pdf", source));
  await expect(
    page.getByRole("img", {
      name: "Vista de la página original 1",
      exact: true,
    }),
  ).toBeVisible();
  return source;
}

async function dragPage(page: Page, original: number, target: number) {
  const from = page.locator(`[data-original-page="${original}"]`);
  const to = page.locator(`[data-original-page="${target}"]`);
  await from.scrollIntoViewIfNeeded();
  await to.scrollIntoViewIfNeeded();
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("Missing drag coordinates");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    start.x + start.width / 2 + 12,
    start.y + start.height / 2,
    { steps: 3 },
  );
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 12,
  });
  await expect(from).toHaveClass(/shadow-xl/);
  await expect
    .poll(() =>
      page
        .locator("[data-original-page]")
        .evaluateAll(
          (items, dragged) =>
            items.some(
              (item) =>
                item.getAttribute("data-original-page") !== String(dragged) &&
                (item as HTMLElement).style.transform !== "" &&
                !(item as HTMLElement).style.transform.startsWith(
                  "translate3d(0px, 0px",
                ),
            ),
          original,
        ),
    )
    .toBe(true);
  await page.mouse.up();
}

test("arrastra la última página a la segunda posición y exporta ese orden", async ({
  page,
}) => {
  await page.goto("/tools/organize-pdf/");
  const source = await loadPdf(page, 10);
  await dragPage(page, 10, 2);
  const cards = page.locator("[data-original-page]");
  await expect(cards.nth(1)).toHaveAttribute("data-original-page", "10");
  const exportButton = page
    .locator("aside")
    .getByRole("button", { name: "Crear PDF organizado", exact: true });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await expect(
    page.getByRole("heading", { name: "Tu PDF quedó organizado." }),
  ).toBeVisible();
  const event = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const download = await event;
  const output = await inspectPdf(await readFile((await download.path())!));
  const original = await inspectPdf(source);
  expect(output.map(({ contents }) => contents)).toEqual([
    original[0].contents,
    original[9].contents,
    ...original.slice(1, 9).map(({ contents }) => contents),
  ]);
});

test("selecciona, rota, elimina, deshace, rehace y restablece", async ({
  page,
}) => {
  await page.goto("/tools/organize-pdf/");
  await loadPdf(page, 4);
  await page.locator('[data-original-page="1"] [role="button"]').click();
  await page.locator('[data-original-page="3"] [role="button"]').click();
  await expect(page.getByText("2 páginas seleccionadas")).toBeVisible();
  await page.getByRole("button", { name: "Girar derecha" }).click();
  await expect(page.locator('[data-original-page="1"]')).toContainText("90°");
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.locator("[data-original-page]")).toHaveCount(2);
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.locator("[data-original-page]")).toHaveCount(4);
  await page.getByRole("button", { name: "Rehacer" }).click();
  await expect(page.locator("[data-original-page]")).toHaveCount(2);
  await page.getByRole("button", { name: "Restablecer original" }).click();
  await expect(page.locator("[data-original-page]")).toHaveCount(4);
  await expect(page.locator('[data-original-page="1"]')).not.toContainText(
    "90°",
  );
});

test("impide eliminar todas las páginas y cancela un arrastre con Escape", async ({
  page,
}) => {
  await page.goto("/tools/organize-pdf/");
  await loadPdf(page, 3);
  await page.getByRole("button", { name: "Seleccionar todas" }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "al menos una página",
  );
  await page.getByRole("button", { name: "Deseleccionar todas" }).click();
  const second = page.locator('[data-original-page="2"] [role="button"]');
  await second.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-original-page]").nth(1)).toHaveAttribute(
    "data-original-page",
    "2",
  );
});

test("funciona en móvil, carga progresivamente y no envía documentos", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  const unsafe: string[] = [];
  context.on("request", (request) => {
    if (
      request.postDataBuffer() ||
      !["GET", "HEAD"].includes(request.method()) ||
      new URL(request.url()).origin !== "http://127.0.0.1:3100"
    )
      unsafe.push(`${request.method()} ${request.url()}`);
  });
  await page.goto("/tools/organize-pdf/");
  await loadPdf(page, 50);
  expect(
    await page
      .getByRole("img", { name: /^Vista de la página original / })
      .count(),
  ).toBeLessThan(35);
  await page.locator('[data-original-page="50"]').scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("img", { name: "Vista de la página original 50" }),
  ).toBeVisible();
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
  await page
    .getByRole("button", { name: "Crear PDF organizado", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tu PDF quedó organizado." }),
  ).toBeVisible();
  expect(unsafe).toEqual([]);
});

test("rechaza PDF dañado y protegido", async ({ page }) => {
  await page.goto("/tools/organize-pdf/");
  await input(page).setInputFiles(
    filePayload("dañado.pdf", Buffer.from("%PDF-1.7\ninválido")),
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "No pudimos leer este PDF",
  );
  await input(page).setInputFiles(
    filePayload(
      "protegido.pdf",
      await readFile("tests/fixtures/encrypted_new.pdf"),
    ),
  );
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "protegido o cifrado",
  );
});

test("reordena entre filas mediante interacción táctil", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/tools/organize-pdf/");
  await loadPdf(page, 6);
  const from = page.locator('[data-original-page="4"] [role="button"]');
  const to = page.locator('[data-original-page="1"] [role="button"]');
  await to.scrollIntoViewIfNeeded();
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("Missing touch coordinates");
  await page.evaluate(
    async ({ start, end }) => {
      const target = document.elementFromPoint(start.x, start.y);
      if (!(target instanceof Element)) throw new Error("Missing touch target");
      const makeTouch = (x: number, y: number) =>
        new Touch({
          identifier: 7,
          target,
          clientX: x,
          clientY: y,
          pageX: x + scrollX,
          pageY: y + scrollY,
        });
      const initial = makeTouch(start.x, start.y);
      target.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: [initial],
          targetTouches: [initial],
          changedTouches: [initial],
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 220));
      for (let step = 1; step <= 8; step++) {
        const touch = makeTouch(
          start.x + ((end.x - start.x) * step) / 8,
          start.y + ((end.y - start.y) * step) / 8,
        );
        target.dispatchEvent(
          new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch],
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 16));
      }
      const finalTouch = makeTouch(end.x, end.y);
      target.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [finalTouch],
        }),
      );
    },
    {
      start: {
        x: start.x + start.width / 2,
        y: start.y + start.height / 2,
      },
      end: { x: end.x + end.width / 2, y: end.y + end.height / 2 },
    },
  );
  await expect(page.locator("[data-original-page]").first()).toHaveAttribute(
    "data-original-page",
    "4",
  );
  await context.close();
});

test("aplica rotación individual y eliminación al PDF descargado", async ({
  page,
}) => {
  await page.goto("/tools/organize-pdf/");
  const source = await loadPdf(page, 4);
  await page
    .getByRole("button", { name: "Girar página original 2 a la derecha" })
    .click();
  await page
    .getByRole("button", { name: "Eliminar página original 3" })
    .click();
  await page
    .locator("aside")
    .getByRole("button", { name: "Crear PDF organizado" })
    .click();
  const event = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const download = await event;
  const original = await inspectPdf(source);
  const output = await inspectPdf(await readFile((await download.path())!));
  expect(output.map(({ contents }) => contents)).toEqual([
    original[0].contents,
    original[1].contents,
    original[3].contents,
  ]);
  expect(output.map(({ rotation }) => rotation)).toEqual([0, 90, 0]);
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
          window as typeof window & { finishOrganizeRead?: () => void }
        ).finishOrganizeRead = () => read().then(resolve, reject);
      });
    };
  });
  await page.goto("/tools/organize-pdf/");
  await input(page).setInputFiles(
    filePayload("pendiente.pdf", await makePdf("Pendiente")),
  );
  await expect(
    page.getByRole("button", { name: "Seleccionar PDF" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar y vaciar" }).click();
  await page.evaluate(() =>
    (
      window as typeof window & { finishOrganizeRead?: () => void }
    ).finishOrganizeRead?.(),
  );
  await expect(
    page.getByRole("button", { name: "Seleccionar PDF" }),
  ).toBeEnabled();
  await expect(page.locator("[data-original-page]")).toHaveCount(0);
});

test("al reiniciar libera miniaturas, resultado y workers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const resources = {
      urls: [] as string[],
      revoked: [] as string[],
      stopped: 0,
    };
    (
      window as typeof window & { organizeResources: typeof resources }
    ).organizeResources = resources;
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
  await page.goto("/tools/organize-pdf/");
  await loadPdf(page, 3);
  await page
    .locator("aside")
    .getByRole("button", { name: "Crear PDF organizado" })
    .click();
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toBeVisible();
  await page.getByRole("button", { name: "Organizar otro PDF" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const resources = (
          window as typeof window & {
            organizeResources: {
              urls: string[];
              revoked: string[];
              stopped: number;
            };
          }
        ).organizeResources;
        return resources.urls.length === resources.revoked.length;
      }),
    )
    .toBe(true);
  const resources = await page.evaluate(
    () =>
      (
        window as typeof window & {
          organizeResources: {
            urls: string[];
            revoked: string[];
            stopped: number;
          };
        }
      ).organizeResources,
  );
  expect(resources.urls.length).toBeGreaterThanOrEqual(2);
  expect([...resources.revoked].sort()).toEqual([...resources.urls].sort());
  expect(resources.stopped).toBeGreaterThanOrEqual(2);
});
