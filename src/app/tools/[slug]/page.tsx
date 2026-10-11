import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTool, tools } from "@/config/tools";
import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { MergePdfTool } from "@/components/tools/merge-pdf/merge-pdf-tool";
import { SplitPdfTool } from "@/components/tools/split-pdf/split-pdf-tool";
import { OrganizePdfTool } from "@/components/tools/organize-pdf/organize-pdf-tool";
import { ImagesToPdfTool } from "@/components/tools/images-to-pdf/images-to-pdf-tool";
import { PdfToImagesTool } from "@/components/tools/pdf-to-images/pdf-to-images-tool";
import { CompressPdfTool } from "@/components/tools/compress-pdf/compress-pdf-tool";
import { WordToPdfTool } from "@/components/tools/word-to-pdf/word-to-pdf-tool";

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return {
    title: tool
      ? `${tool.name} — ${tool.status === "available" ? "Local y privado" : "En desarrollo"}`
      : "Herramienta no encontrada",
    description: tool
      ? `${tool.description} ${tool.status === "available" ? "Procesa el archivo en tu dispositivo, sin subir documentos a un servidor." : "Herramienta planificada, todavía no disponible."}`
      : undefined,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const tool = getTool((await params).slug);
  if (!tool) notFound();
  return (
    <ToolWorkspace tool={tool}>
      {tool.slug === "merge-pdf" ? (
        <MergePdfTool />
      ) : tool.slug === "compress-pdf" ? (
        <CompressPdfTool />
      ) : tool.slug === "split-pdf" ? (
        <SplitPdfTool />
      ) : tool.slug === "organize-pdf" ? (
        <OrganizePdfTool />
      ) : tool.slug === "images-to-pdf" ? (
        <ImagesToPdfTool />
      ) : tool.slug === "pdf-to-images" ? (
        <PdfToImagesTool />
      ) : tool.slug === "word-to-pdf" ? (
        <WordToPdfTool />
      ) : undefined}
    </ToolWorkspace>
  );
}
