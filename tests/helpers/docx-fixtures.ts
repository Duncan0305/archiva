import JSZip from "jszip";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==",
  "base64",
);

const xml = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;

export async function makeDocx({
  externalImage = false,
  externalLink = false,
  macro = false,
}: {
  externalImage?: boolean;
  externalLink?: boolean;
  macro?: boolean;
} = {}) {
  const archive = new JSZip();
  archive.file(
    "[Content_Types].xml",
    xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="png" ContentType="image/png"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
      <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
      <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
      <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    </Types>`),
  );
  archive.file(
    "_rels/.rels",
    xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    </Relationships>`),
  );
  archive.file(
    "docProps/core.xml",
    xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>Informe de aceptación</dc:title><dc:creator>Archiva</dc:creator>
    </cp:coreProperties>`),
  );
  archive.file(
    "word/styles.xml",
    xml(`<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
      <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
      <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="285D47"/><w:sz w:val="36"/></w:rPr></w:style>
    </w:styles>`),
  );
  archive.file(
    "word/numbering.xml",
    xml(`<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    </w:numbering>`),
  );
  archive.file(
    "word/header1.xml",
    xml(`<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Encabezado Archiva</w:t></w:r></w:p></w:hdr>`),
  );
  archive.file(
    "word/footer1.xml",
    xml(`<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>Pie confidencial</w:t></w:r></w:p></w:ftr>`),
  );
  const relationships = [
    `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    `<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`,
    `<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`,
    `<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`,
    externalImage
      ? `<Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://example.com/private.png" TargetMode="External"/>`
      : `<Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>`,
    externalLink
      ? `<Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/" TargetMode="External"/>`
      : "",
  ].join("");
  archive.file(
    "word/_rels/document.xml.rels",
    xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`),
  );
  if (!externalImage) archive.file("word/media/image1.png", png);
  if (macro) archive.file("word/vbaProject.bin", Buffer.from([1, 2, 3]));

  const pageBreak = `<w:r><w:br w:type="page"/></w:r>`;
  archive.file(
    "word/document.xml",
    xml(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Informe español: áéíóú y ñ</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/><w:i/></w:rPr><w:t>Texto en negrita y cursiva</w:t></w:r></w:p>
        <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Primer elemento numerado</w:t></w:r></w:p>
        <w:p>${pageBreak}</w:p>
        <w:p><w:r><w:t>Página 2 con tabla</w:t></w:r></w:p>
        <w:tbl><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr><w:tc><w:p><w:r><w:t>Columna A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Columna B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
        <w:p>${pageBreak}</w:p>
        <w:p><w:r><w:t>Página 3 con imagen</w:t></w:r></w:p>
        <w:p><w:r><w:pict><v:shape id="Imagen1" type="#_x0000_t75" style="width:72pt;height:72pt"><v:imagedata r:id="rIdImage" o:title="Imagen local"/></v:shape></w:pict></w:r></w:p>
        <w:p>${pageBreak}</w:p>
        <w:p><w:r><w:t>Página 4 horizontal</w:t></w:r></w:p>
        <w:p><w:pPr><w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/></w:sectPr></w:pPr></w:p>
        <w:p>${pageBreak}</w:p>
        <w:p><w:r><w:t>Página 5 final</w:t></w:r></w:p>
        ${externalLink ? `<w:p><w:hyperlink r:id="rIdLink"><w:r><w:t>Enlace externo</w:t></w:r></w:hyperlink></w:p>` : ""}
        <w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/></w:sectPr>
      </w:body>
    </w:document>`),
  );
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export function docxPayload(name: string, buffer: Buffer) {
  return {
    name,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer,
  };
}
