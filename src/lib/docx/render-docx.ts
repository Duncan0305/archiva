export const docxRenderOptions = {
  className: "archiva-docx",
  inWrapper: true,
  hideWrapperOnPrint: true,
  breakPages: true,
  ignoreLastRenderedPageBreak: false,
  renderHeaders: true,
  renderFooters: true,
  renderFootnotes: true,
  renderEndnotes: true,
  renderComments: false,
  renderChanges: false,
  renderAltChunks: false,
  useBase64URL: true,
  experimental: false,
} as const;

export async function renderDocx(bytes: ArrayBuffer, container: HTMLElement) {
  const { renderAsync } = await import("docx-preview");
  await renderAsync(bytes.slice(0), container, container, docxRenderOptions);

  container
    .querySelectorAll("script, iframe, object, embed, form")
    .forEach((element) => element.remove());
  container.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (/^https?:/i.test(image.src)) image.remove();
  });
  container.querySelectorAll<HTMLAnchorElement>("a").forEach((anchor) => {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });

  return Math.max(
    1,
    container.querySelectorAll("section.archiva-docx").length,
  );
}

export function fitDocxPreview(container: HTMLElement) {
  const wrapper = container.querySelector<HTMLElement>(
    ".archiva-docx-wrapper",
  );
  const page = container.querySelector<HTMLElement>("section.archiva-docx");
  if (!wrapper || !page) return;
  wrapper.style.zoom = "1";
  const available = Math.max(container.clientWidth - 32, 240);
  const pageWidth = page.getBoundingClientRect().width;
  wrapper.style.zoom = String(Math.min(1, available / pageWidth));
}

export function printablePdfName(value: string) {
  const base = value
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 140);
  const safe = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)
    ? `archiva-${base}`
    : base;
  return `${safe || "archiva-word-convertido"}.pdf`;
}
