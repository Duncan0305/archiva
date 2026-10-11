import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import {
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
} from "pdf-lib";

interface ImagePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

async function makeImage(
  page: Page,
  name: string,
  type: "image/jpeg" | "image/png" | "image/webp",
  width: number,
  height: number,
  color: string,
  transparent = false,
): Promise<ImagePayload> {
  const bytes = await page.evaluate(
    async ({ type, width, height, color, transparent }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      if (transparent) context.clearRect(0, 0, width, height);
      else {
        context.fillStyle = "#f8f5ed";
        context.fillRect(0, 0, width, height);
      }
      context.globalAlpha = transparent ? 0.65 : 1;
      context.fillStyle = color;
      context.fillRect(
        width * 0.08,
        height * 0.08,
        width * 0.84,
        height * 0.68,
      );
      context.globalAlpha = 1;
      context.fillStyle = "#17221c";
      context.font = `${Math.max(18, width / 12)}px sans-serif`;
      context.fillText(`${width}x${height}`, width * 0.1, height * 0.9);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("encode"))),
          type,
          0.92,
        ),
      );
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    },
    { type, width, height, color, transparent },
  );
  return { name, mimeType: type, buffer: Buffer.from(bytes) };
}

async function fixtures(page: Page) {
  return [
    await makeImage(page, "01-roja.jpg", "image/jpeg", 320, 480, "#b84b4b"),
    await makeImage(
      page,
      "02-verde.png",
      "image/png",
      500,
      300,
      "#3f7f5b",
      true,
    ),
    await makeImage(page, "03-azul.webp", "image/webp", 360, 540, "#4566a8"),
    await makeImage(page, "04-ocre.jpg", "image/jpeg", 640, 360, "#a06c36"),
    await makeImage(
      page,
      "05-morada.png",
      "image/png",
      420,
      420,
      "#80528e",
      true,
    ),
    await makeImage(
      page,
      "06-turquesa.webp",
      "image/webp",
      700,
      350,
      "#39858a",
    ),
  ];
}

async function dragImage(page: Page, fromName: string, toName: string) {
  const from = page.locator(`[data-image-name="${fromName}"]`);
  const to = page.locator(`[data-image-name="${toName}"]`);
  await from.scrollIntoViewIfNeeded();
  await to.scrollIntoViewIfNeeded();
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("Missing drag coordinates");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 3);
  await page.mouse.down();
  await page.mouse.move(
    start.x + start.width / 2 + 10,
    start.y + start.height / 3,
    { steps: 3 },
  );
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 3, {
    steps: 12,
  });
  await expect(from).toHaveClass(/shadow-xl/);
  await expect
    .poll(() =>
      page
        .locator("[data-image-name]")
        .evaluateAll(
          (items, dragged) =>
            items.some(
              (item) =>
                item.getAttribute("data-image-name") !== dragged &&
                (item as HTMLElement).style.transform !== "" &&
                !(item as HTMLElement).style.transform.startsWith(
                  "translate3d(0px, 0px",
                ),
            ),
          fromName,
        ),
    )
    .toBe(true);
  await page.mouse.up();
}

function embeddedSizes(bytes: Uint8Array) {
  return PDFDocument.load(bytes).then((document) =>
    document.getPages().map((page) => {
      const resources = page.node.Resources();
      if (!resources) throw new Error("Missing page resources");
      const xObjects = resources.lookup(PDFName.of("XObject"), PDFDict);
      const dimensions = xObjects
        .entries()
        .map(([, ref]) => document.context.lookup(ref))
        .filter((value): value is PDFRawStream => value instanceof PDFRawStream)
        .map((stream) => ({
          width: stream.dict.lookup(PDFName.of("Width"), PDFNumber).asNumber(),
          height: stream.dict
            .lookup(PDFName.of("Height"), PDFNumber)
            .asNumber(),
        }));
      return {
        page: page.getSize(),
        image: dimensions.sort(
          (a, b) => b.width * b.height - a.width * a.height,
        )[0],
      };
    }),
  );
}

test("carga formatos mixtos, añade, elimina y evita duplicados", async ({
  page,
}) => {
  await page.goto("/tools/images-to-pdf/");
  const files = await fixtures(page);
  await page.locator('input[type="file"]').setInputFiles(files.slice(0, 3));
  await expect(page.locator("[data-image-name]")).toHaveCount(3);
  await expect(
    page.getByRole("img", { name: "Vista de 01-roja.jpg" }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(files.slice(3));
  await expect(page.locator("[data-image-name]")).toHaveCount(6);
  await page.getByRole("button", { name: "Eliminar 05-morada.png" }).click();
  await expect(page.locator("[data-image-name]")).toHaveCount(5);
  await page.locator('input[type="file"]').setInputFiles([files[0], files[0]]);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "ya está en la selección",
  );
  await expect(page.locator("[data-image-name]")).toHaveCount(5);
});

test("arrastra la imagen 6 a la posición 2, rota y genera A4 en ese orden", async ({
  page,
}) => {
  await page.goto("/tools/images-to-pdf/");
  const files = await fixtures(page);
  await page.locator('input[type="file"]').setInputFiles(files);
  await expect(page.locator("[data-image-name]")).toHaveCount(6);
  await dragImage(page, "06-turquesa.webp", "02-verde.png");
  await expect(page.locator("[data-image-name]").nth(1)).toHaveAttribute(
    "data-image-name",
    "06-turquesa.webp",
  );
  await page
    .getByRole("button", { name: "Girar 03-azul.webp a la derecha" })
    .click();
  await page.getByLabel("Tamaño de página").selectOption("a4");
  await page.getByLabel("Orientación").selectOption("auto");
  await page.getByLabel("Márgenes").selectOption("small");
  await page.getByLabel("Ajuste").selectOption("contain");
  await page
    .locator("aside")
    .getByRole("button", { name: "Crear PDF" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tus imágenes ya son un PDF." }),
  ).toBeVisible();
  await page.getByLabel("Nombre del archivo").fill("mi álbum.PDF");
  const event = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe("mi álbum.pdf");
  const output = await embeddedSizes(await readFile((await download.path())!));
  expect(output).toHaveLength(6);
  expect(output.map(({ image }) => image)).toEqual([
    { width: 320, height: 480 },
    { width: 700, height: 350 },
    { width: 500, height: 300 },
    { width: 540, height: 360 },
    { width: 640, height: 360 },
    { width: 420, height: 420 },
  ]);
  expect(output[0].page).toEqual({ width: 595.28, height: 841.89 });
  expect(output[1].page).toEqual({ width: 841.89, height: 595.28 });
});

test("genera Carta, A3, tamaño de imagen, márgenes y Rellenar", async ({
  page,
}) => {
  await page.goto("/tools/images-to-pdf/");
  const source = await makeImage(
    page,
    "panorama.jpg",
    "image/jpeg",
    800,
    400,
    "#4b765e",
  );
  const options = [
    {
      size: "letter",
      orientation: "portrait",
      margin: "none",
      fit: "contain",
      expected: [612, 792],
    },
    {
      size: "a3",
      orientation: "landscape",
      margin: "large",
      fit: "cover",
      expected: [1190.55, 841.89],
    },
    {
      size: "image",
      orientation: "auto",
      margin: "medium",
      fit: "contain",
      expected: [672, 372],
    },
  ];
  for (const option of options) {
    await page.locator('input[type="file"]').setInputFiles(source);
    await page.getByLabel("Tamaño de página").selectOption(option.size);
    await page.getByLabel("Orientación").selectOption(option.orientation);
    await page.getByLabel("Márgenes").selectOption(option.margin);
    await page.getByLabel("Ajuste").selectOption(option.fit);
    await page
      .locator("aside")
      .getByRole("button", { name: "Crear PDF" })
      .click();
    const event = page.waitForEvent("download");
    await page.getByRole("link", { name: "Descargar PDF" }).click();
    const result = await embeddedSizes(
      await readFile((await (await event).path())!),
    );
    expect(result[0].page.width).toBeCloseTo(option.expected[0], 2);
    expect(result[0].page.height).toBeCloseTo(option.expected[1], 2);
    if (option.fit === "cover")
      expect(result[0].image.width / result[0].image.height).toBeCloseTo(
        (option.expected[0] - 108) / (option.expected[1] - 108),
        2,
      );
    await page.getByRole("button", { name: "Crear otro PDF" }).click();
  }
});

test("rechaza archivos dañados y formatos no admitidos", async ({ page }) => {
  await page.goto("/tools/images-to-pdf/");
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: "falsa.png",
      mimeType: "image/png",
      buffer: Buffer.from("no-image"),
    },
    { name: "texto.txt", mimeType: "text/plain", buffer: Buffer.from("hola") },
  ]);
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "JPG, PNG o WebP",
  );
  await expect(page.locator("[data-image-name]")).toHaveCount(0);
});

test("es responsive, accesible y convierte sin enviar imágenes", async ({
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
  await page.goto("/tools/images-to-pdf/");
  await page
    .locator('input[type="file"]')
    .setInputFiles((await fixtures(page)).slice(0, 3));
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
  await page.getByRole("button", { name: "Crear PDF", exact: true }).click();
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toBeVisible();
  expect(unsafe).toEqual([]);
});

test("acepta imágenes arrastradas al área de carga", async ({ page }) => {
  await page.goto("/tools/images-to-pdf/");
  const payload = await makeImage(
    page,
    "arrastrada.png",
    "image/png",
    360,
    240,
    "#49745b",
  );
  await page.evaluate(
    ({ bytes, name, type }) => {
      const file = new File([new Uint8Array(bytes)], name, { type });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      document.querySelector('[data-testid="images-dropzone"]')!.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
    },
    {
      bytes: Array.from(payload.buffer),
      name: payload.name,
      type: payload.mimeType,
    },
  );
  await expect(
    page.locator('[data-image-name="arrastrada.png"]'),
  ).toBeVisible();
});

test("cancela el arrastre con Escape y reordena mediante toque", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/tools/images-to-pdf/");
  const files = (await fixtures(page)).slice(0, 4);
  await page.locator('input[type="file"]').setInputFiles(files);
  const second = page.getByRole("button", {
    name: /02-verde.png, posición 2 de 4/,
  });
  await second.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-image-name]").nth(1)).toHaveAttribute(
    "data-image-name",
    "02-verde.png",
  );
  await context.close();

  const touchContext = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const touchPage = await touchContext.newPage();
  await touchPage.goto("http://127.0.0.1:3100/tools/images-to-pdf/");
  await touchPage.locator('input[type="file"]').setInputFiles(files);
  const from = touchPage.getByRole("button", {
    name: /04-ocre.jpg, posición 4 de 4/,
  });
  const to = touchPage.getByRole("button", {
    name: /02-verde.png, posición 2 de 4/,
  });
  await from.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("Missing touch coordinates");
  await touchPage.evaluate(
    async ({ start, end }) => {
      const target = document.querySelector(
        '[data-image-name="04-ocre.jpg"] [role="button"]',
      );
      if (!(target instanceof Element)) throw new Error("Missing touch target");
      const touchAt = (x: number, y: number) =>
        new Touch({
          identifier: 9,
          target,
          clientX: x,
          clientY: y,
          pageX: x + scrollX,
          pageY: y + scrollY,
        });
      const initial = touchAt(start.x, start.y);
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
        const touch = touchAt(
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
      const finalTouch = touchAt(end.x, end.y);
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
        y: start.y + start.height / 3,
      },
      end: { x: end.x + end.width / 2, y: end.y + end.height / 3 },
    },
  );
  await expect(touchPage.locator("[data-image-name]").nth(1)).toHaveAttribute(
    "data-image-name",
    "04-ocre.jpg",
  );
  await touchContext.close();
});

test("cancelar una lectura pendiente no repone imágenes", async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      const read = original.bind(this);
      return new Promise<ArrayBuffer>((resolve, reject) => {
        (
          window as typeof window & { finishImageRead?: () => void }
        ).finishImageRead = () => read().then(resolve, reject);
      });
    };
  });
  await page.goto("/tools/images-to-pdf/");
  const file = await makeImage(
    page,
    "pendiente.jpg",
    "image/jpeg",
    300,
    400,
    "#55775d",
  );
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(
    page.getByRole("button", { name: "Seleccionar imágenes" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar y vaciar" }).click();
  await page.evaluate(() =>
    (
      window as typeof window & { finishImageRead?: () => void }
    ).finishImageRead?.(),
  );
  await expect(
    page.getByRole("button", { name: "Seleccionar imágenes" }),
  ).toBeEnabled();
  await expect(page.locator("[data-image-name]")).toHaveCount(0);
});

test("al reiniciar libera miniaturas, resultado y worker", async ({ page }) => {
  await page.addInitScript(() => {
    const resources = {
      urls: [] as string[],
      revoked: [] as string[],
      stopped: 0,
    };
    (
      window as typeof window & { imageResources: typeof resources }
    ).imageResources = resources;
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
  await page.goto("/tools/images-to-pdf/");
  await page
    .locator('input[type="file"]')
    .setInputFiles((await fixtures(page)).slice(0, 2));
  await page
    .locator("aside")
    .getByRole("button", { name: "Crear PDF" })
    .click();
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toBeVisible();
  await page.getByRole("button", { name: "Crear otro PDF" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const value = (
          window as typeof window & {
            imageResources: {
              urls: string[];
              revoked: string[];
              stopped: number;
            };
          }
        ).imageResources;
        return value.urls.length === value.revoked.length;
      }),
    )
    .toBe(true);
  const resources = await page.evaluate(
    () =>
      (
        window as typeof window & {
          imageResources: {
            urls: string[];
            revoked: string[];
            stopped: number;
          };
        }
      ).imageResources,
  );
  expect(resources.urls.length).toBeGreaterThanOrEqual(3);
  expect([...resources.revoked].sort()).toEqual([...resources.urls].sort());
  expect(resources.stopped).toBeGreaterThanOrEqual(1);
});
