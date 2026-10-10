import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTool, tools } from "@/config/tools";
import { ToolWorkspace } from "@/components/tools/tool-workspace";

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
    title: tool ? `${tool.name} — En desarrollo` : "Herramienta no encontrada",
    description: tool
      ? `${tool.description} Herramienta planificada, todavía no disponible.`
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
  return <ToolWorkspace tool={tool} />;
}
