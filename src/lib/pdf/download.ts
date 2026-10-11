export const defaultPdfName = "archiva-documento-unido.pdf";

export function pdfDownloadName(name: string) {
  const base = name
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 160);
  // Prefix reserved Windows device names so downloads work across platforms.
  const safe = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(base)
    ? `archiva-${base}`
    : base;
  return safe ? `${safe}.pdf` : defaultPdfName;
}

export function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  const value = mb >= 1 ? mb : bytes / 1024;
  return `${new Intl.NumberFormat("es", { maximumFractionDigits: 1 }).format(value)} ${mb >= 1 ? "MB" : "KB"}`;
}
