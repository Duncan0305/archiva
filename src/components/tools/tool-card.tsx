import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/config/tools";
import type { Tool } from "@/types/tool";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link
      href={`/tools/${tool.slug}/`}
      className="tool-card group flex h-full min-h-[211px] flex-col rounded-xl border border-border bg-card p-5"
      aria-label={`${tool.name} — ${tool.status === "planned" ? "en desarrollo, ver detalles" : "ver herramienta"}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <span
          className="tool-icon flex size-10 items-center justify-center rounded-[11px]"
          data-category={tool.category}
        >
          <Icon className="size-5" strokeWidth={1.55} aria-hidden="true" />
        </span>
        <ArrowUpRight
          className="size-4 text-muted-foreground/65 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <h3 className="font-display text-[15px] font-bold tracking-[-0.3px]">
        {tool.name}
      </h3>
      <p className="mt-2 text-[13px] leading-[1.65] text-muted-foreground">
        {tool.description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-[10px]">
        <span className="font-medium text-muted-foreground">
          {categories.find((category) => category.id === tool.category)?.name}
        </span>
        <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
          {tool.status === "planned" ? "Próximamente" : "Disponible"}
        </span>
      </div>
    </Link>
  );
}
