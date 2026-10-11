import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("búsqueda, categorías y recuperación del estado vacío", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator("#catalog-results .tool-card");
  await expect(cards).toHaveCount(16);
  await page
    .getByRole("textbox", { name: "Buscar herramientas" })
    .fill("UNIR pdf");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Unir PDF");
  await page
    .getByRole("button", { name: "Ver resultados de búsqueda" })
    .click();
  await expect(page.locator("#catalog-results")).toBeFocused();
  await page.getByRole("button", { name: "Borrar búsqueda" }).click();
  await page.getByRole("button", { name: "Imágenes 4" }).click();
  await expect(cards).toHaveCount(4);
  await expect(page).toHaveURL(/category=images/);
  await page
    .getByRole("textbox", { name: "Buscar herramientas" })
    .fill("imagenes");
  await expect(cards).toHaveCount(4);
  await page
    .getByRole("textbox", { name: "Buscar herramientas" })
    .fill("sin coincidencias");
  await expect(
    page.getByRole("heading", { name: "No encontramos esa herramienta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restablecer filtros" }).click();
  await expect(cards).toHaveCount(16);
  await page.getByRole("button", { name: "Archivos 2" }).click();
  await expect(cards).toHaveCount(2);
  await page.reload();
  await expect(cards).toHaveCount(2);
});

test("menú de categorías con teclado y navegación de herramienta", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Categorías", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "PDF 10" }).click();
  await expect(page.locator("#catalog-results .tool-card")).toHaveCount(10);
  await page
    .getByRole("link", {
      name: "Unir PDF — ver herramienta",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unir PDF", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Volver al catálogo/ }).click();
  await expect(page.locator("#catalog-results .tool-card")).toHaveCount(10);
});

test("las 16 rutas exportadas son honestas y no suben archivos", async ({
  page,
}) => {
  const unsafeRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (
      !["GET", "HEAD"].includes(request.method()) ||
      new URL(request.url()).origin !== "http://127.0.0.1:3100"
    )
      unsafeRequests.push(`${request.method()} ${request.url()}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const paths = await page
    .locator("#catalog-results .tool-card")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  expect(paths).toHaveLength(16);
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    if (path === "/tools/merge-pdf/") {
      await expect(
        page.getByRole("button", { name: "Seleccionar archivos" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Unir PDF", exact: true }),
      ).toBeDisabled();
      continue;
    }
    if (path === "/tools/split-pdf/") {
      await expect(
        page.getByRole("button", { name: "Seleccionar PDF" }),
      ).toBeEnabled();
      continue;
    }
    await expect(
      page.getByText("Estamos preparando esta herramienta"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Seleccionar archivos" }),
    ).toBeDisabled();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator("a[download]")).toHaveCount(0);
  }
  expect(unsafeRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("tema persistente y preferencia del sistema", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page
    .getByRole("button", { name: "Cambiar tema claro u oscuro" })
    .click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page
    .getByRole("button", { name: "Cambiar tema claro u oscuro" })
    .click();
  await page.goto("/tools/merge-pdf/");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("menú móvil, Escape y selección de categoría", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegación móvil" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("link", { name: "Imágenes", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Navegación móvil" }),
  ).toHaveCount(0);
  await expect(page.locator("#catalog-results .tool-card")).toHaveCount(4);
});

test("responsive sin desbordamiento y capturas de revisión", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/tools/organize-pdf/"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${path} a ${width}px`,
      ).toBe(true);
      if ([390, 1440].includes(width)) {
        await page.screenshot({
          path: `test-results/${path === "/" ? "home" : "tool"}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
        await page.screenshot({
          path: `test-results/${path === "/" ? "home" : "tool"}-${width}-viewport.png`,
          animations: "disabled",
        });
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Cambiar tema claro u oscuro" })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: "test-results/home-dark.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("accesibilidad automatizada en inicio y herramienta en ambos temas", async ({
  page,
}) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const path of ["/", "/tools/merge-pdf/"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        ),
      );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations, `${path} en ${colorScheme}`).toEqual([]);
    }
  }
});

test("movimiento reducido y página 404", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator(".enter")
      .first()
      .evaluate((element) => getComputedStyle(element).animationDuration),
  ).toBe("1e-05s");
  await page.locator(".tool-card").first().hover();
  expect(
    await page
      .locator(".tool-card")
      .first()
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  await page.goto("/404.html");
  await expect(
    page.getByRole("heading", { name: "Esta página no está en el archivo" }),
  ).toBeVisible();
});
