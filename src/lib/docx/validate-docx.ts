import type { DocxAnalysis, DocxWarning } from "@/types/word-to-pdf";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_DOCX_BYTES = 50 * 1024 * 1024;

export type DocxErrorCode =
  | "type"
  | "empty"
  | "large"
  | "invalid"
  | "encrypted"
  | "active-content"
  | "external-resource"
  | "memory"
  | "read"
  | "render";

const messages: Record<DocxErrorCode, string> = {
  type: "Selecciona un documento DOCX. El formato Word antiguo .doc no es compatible.",
  empty: "El archivo está vacío. Selecciona un documento DOCX con contenido.",
  large:
    "Este documento supera el límite local de 50 MB. Prueba con una copia más pequeña para evitar agotar la memoria del navegador.",
  invalid:
    "No pudimos abrir este DOCX. Puede estar dañado, cifrado o tener una estructura incompatible.",
  encrypted:
    "Este documento está cifrado o protegido de una forma incompatible. Utiliza una copia DOCX sin contraseña.",
  "active-content":
    "El documento contiene macros o contenido activo. Archiva no lo ejecuta ni lo procesa por seguridad.",
  "external-resource":
    "El documento intenta cargar recursos externos. Archiva los bloquea para mantener el procesamiento privado.",
  memory:
    "El navegador no tiene memoria suficiente para representar este documento. Prueba con una copia más pequeña.",
  read: "No pudimos leer el archivo del dispositivo. Vuelve a seleccionarlo.",
  render:
    "No pudimos generar una vista previa segura de este documento. Puede contener elementos no compatibles.",
};

export class DocxError extends Error {
  constructor(
    public readonly code: DocxErrorCode,
    message = messages[code],
  ) {
    super(message);
    this.name = "DocxError";
  }
}

export function toDocxError(error: unknown, fallback: DocxErrorCode) {
  if (error instanceof DocxError) return error;
  if (
    error instanceof Error &&
    /out of memory|allocation failed|array buffer|invalid typed array length/i.test(
      error.message,
    )
  )
    return new DocxError("memory");
  return new DocxError(fallback);
}

export function validateDocxFile(file: Pick<File, "name" | "type" | "size">) {
  if (!file.size) throw new DocxError("empty");
  if (file.size > MAX_DOCX_BYTES) throw new DocxError("large");
  const extension = file.name.toLowerCase().endsWith(".docx");
  const mime = !file.type || file.type === DOCX_MIME;
  if (!extension || !mime) throw new DocxError("type");
}

function xmlValue(xml: string, localName: string) {
  const match = xml.match(
    new RegExp(`<[^:>]*:?${localName}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${localName}>`, "i"),
  );
  return match?.[1]
    ? match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim() || null
    : null;
}

function count(xml: string, expression: RegExp) {
  return Array.from(xml.matchAll(expression)).length;
}

function requestedFonts(xmlFiles: string[]) {
  const names = new Set<string>();
  for (const xml of xmlFiles) {
    for (const match of xml.matchAll(/w:(?:ascii|hAnsi|eastAsia|cs)="([^"]+)"/gi)) {
      if (match[1]) names.add(match[1]);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b)).slice(0, 12);
}

function relationshipAttributes(tag: string) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map((match) => [
      match[1].toLowerCase(),
      match[2],
    ]),
  );
}

export async function inspectDocx(
  bytes: ArrayBuffer,
  file: Pick<File, "name" | "size">,
): Promise<DocxAnalysis> {
  try {
    const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
    if (
      signature.length < 4 ||
      signature[0] !== 0x50 ||
      signature[1] !== 0x4b ||
      !(
        (signature[2] === 0x03 && signature[3] === 0x04) ||
        (signature[2] === 0x05 && signature[3] === 0x06) ||
        (signature[2] === 0x07 && signature[3] === 0x08)
      )
    )
      throw new DocxError("invalid");

    const { default: JSZip } = await import("jszip");
    const archive = await JSZip.loadAsync(bytes);
    const names = Object.keys(archive.files);
    if (names.some((name) => name === "EncryptionInfo" || name === "EncryptedPackage"))
      throw new DocxError("encrypted");
    if (
      names.some((name) =>
        /(^|\/)(vbaProject\.bin|activeX\/[^/]+|embeddings\/.*\.(exe|dll|js|vbs))$/i.test(
          name,
        ),
      )
    )
      throw new DocxError("active-content");
    const required = ["[Content_Types].xml", "_rels/.rels", "word/document.xml"];
    if (required.some((name) => !archive.file(name)))
      throw new DocxError("invalid");

    const contentTypes = await archive.file("[Content_Types].xml")!.async("text");
    if (
      !contentTypes.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
      )
    )
      throw new DocxError("invalid");

    const relationshipFiles = names.filter((name) => name.endsWith(".rels"));
    let hasExternalLinks = false;
    for (const name of relationshipFiles) {
      const xml = await archive.file(name)!.async("text");
      for (const tag of xml.match(/<Relationship\b[^>]*\/?\s*>/gi) ?? []) {
        const attrs = relationshipAttributes(tag);
        if (attrs.targetmode?.toLowerCase() !== "external") continue;
        if (attrs.type?.toLowerCase().endsWith("/hyperlink")) {
          hasExternalLinks = true;
          continue;
        }
        throw new DocxError("external-resource");
      }
    }

    const documentXml = await archive.file("word/document.xml")!.async("text");
    const stylesXml = archive.file("word/styles.xml")
      ? await archive.file("word/styles.xml")!.async("text")
      : "";
    const coreXml = archive.file("docProps/core.xml")
      ? await archive.file("docProps/core.xml")!.async("text")
      : "";
    const warnings: DocxWarning[] = [];
    const fonts = requestedFonts([documentXml, stylesXml]);
    if (fonts.length) {
      warnings.push({
        code: "font-substitution",
        message:
          "La distribución puede cambiar si alguna tipografía del documento no está instalada en este dispositivo.",
      });
    }
    if (
      /<w:(?:txbxContent|altChunk|smartTag)\b/i.test(documentXml) ||
      names.some((name) => /word\/(?:charts|diagrams|embeddings)\//i.test(name))
    ) {
      warnings.push({
        code: "complex-layout",
        message:
          "Se detectaron elementos complejos que pueden verse distintos en la vista HTML o en la impresión.",
      });
    }
    if (/<w:(?:ins|del|moveFrom|moveTo)\b/i.test(documentXml)) {
      warnings.push({
        code: "tracked-changes",
        message:
          "El documento contiene control de cambios; la vista muestra el contenido aceptado y puede omitir revisiones eliminadas.",
      });
    }
    if (hasExternalLinks) {
      warnings.push({
        code: "external-links",
        message:
          "Los enlaces se muestran, pero Archiva no abre ni carga sus destinos automáticamente.",
      });
    }

    const sectionCount = Math.max(1, count(documentXml, /<w:sectPr\b/gi));
    return {
      name: file.name,
      size: file.size,
      title: xmlValue(coreXml, "title"),
      author: xmlValue(coreXml, "creator"),
      imageCount: names.filter((name) => /^word\/media\/[^/]+$/i.test(name)).length,
      tableCount: count(documentXml, /<w:tbl\b/gi),
      sectionCount,
      hasHeaders: names.some((name) => /^word\/header\d+\.xml$/i.test(name)),
      hasFooters: names.some((name) => /^word\/footer\d+\.xml$/i.test(name)),
      hasLandscapeSections: /<w:pgSz\b[^>]*w:orient="landscape"/i.test(
        documentXml,
      ),
      requestedFonts: fonts,
      warnings,
    };
  } catch (error) {
    throw toDocxError(error, "invalid");
  }
}
