import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Construction,
  FileUp,
  LockKeyhole,
  Settings2,
  Files,
  CircleDashed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/tools/tool-card";
import { categories, tools } from "@/config/tools";
import type { Tool } from "@/types/tool";
import type { ReactNode } from "react";

export function ToolWorkspace({
  tool,
  children,
}: {
  tool: Tool;
  children?: ReactNode;
}) {
  const Icon = tool.icon;
  const category = categories.find(({ id }) => id === tool.category);
  const related = tools
    .filter(
      (item) => item.category === tool.category && item.slug !== tool.slug,
    )
    .slice(0, 3);

  return (
    <main id="contenido" className="page-container py-8 sm:py-12">
      <Link
        href={`/?category=${tool.category}#herramientas`}
        className="inline-flex items-center gap-2 rounded-sm text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Volver al catálogo<span className="mx-1 text-border">/</span>
        {category?.name}
      </Link>
      <div className="enter mt-10 mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <span
          className="tool-icon flex size-16 shrink-0 items-center justify-center rounded-2xl"
          data-category={tool.category}
        >
          <Icon className="size-8" strokeWidth={1.4} />
        </span>
        <div>
          <Badge variant="secondary" className="mb-3 text-[10px] font-medium">
            <span className="mr-1 size-1.5 rounded-full bg-current" />
            {tool.status === "available"
              ? "Disponible · Procesamiento local"
              : "En desarrollo"}
          </Badge>
          <h1 className="font-display text-3xl font-semibold tracking-[-1.2px] sm:text-4xl">
            {tool.name}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {tool.description}
          </p>
        </div>
      </div>

      {children ?? (
        <>
          <div
            role="note"
            className="mb-7 flex items-start gap-3 rounded-xl border border-border bg-secondary/65 px-5 py-4"
          >
            <Construction className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold">
                Estamos preparando esta herramienta
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Esta es una vista previa de su espacio de trabajo. Todavía no
                puedes cargar, procesar ni descargar archivos.
              </p>
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              <section
                aria-labelledby="upload-title"
                className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center"
              >
                <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted">
                  <FileUp
                    className="size-7 text-muted-foreground"
                    strokeWidth={1.4}
                  />
                </div>
                <h2
                  id="upload-title"
                  className="font-display text-xl font-semibold tracking-tight"
                >
                  Aquí comenzará todo
                </h2>
                <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                  Podrás arrastrar tus archivos a este espacio
                  <br className="hidden sm:block" /> o seleccionarlos desde tu
                  dispositivo.
                </p>
                <Button
                  disabled
                  className="mt-5"
                  aria-describedby="upload-unavailable"
                >
                  <FileUp className="size-4" />
                  Seleccionar archivos
                </Button>
                <p
                  id="upload-unavailable"
                  className="mt-3 text-[10px] text-muted-foreground"
                >
                  Carga deshabilitada durante la fase 1
                </p>
              </section>
              <section
                aria-labelledby="results-title"
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-2">
                  <Files className="size-4 text-muted-foreground" />
                  <h2 id="results-title" className="text-sm font-semibold">
                    Tus resultados
                  </h2>
                </div>
                <div className="mt-5 flex flex-col items-center gap-3 rounded-lg bg-muted/60 px-4 py-8 text-center">
                  <CircleDashed
                    className="size-6 text-muted-foreground"
                    strokeWidth={1.3}
                  />
                  <p className="text-xs leading-6 text-muted-foreground">
                    Los archivos procesados aparecerán aquí.
                    <br />
                    No hay resultados en esta versión de vista previa.
                  </p>
                </div>
              </section>
            </div>
            <aside className="space-y-5">
              <section
                aria-labelledby="settings-title"
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="size-4 text-muted-foreground" />
                  <h2 id="settings-title" className="text-sm font-semibold">
                    Opciones de la herramienta
                  </h2>
                </div>
                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  Aquí encontrarás los ajustes de {tool.name.toLowerCase()}{" "}
                  cuando esté disponible.
                </p>
                <div className="my-5 border-t border-border" />
                <p className="eyebrow text-muted-foreground">FLUJO PREVISTO</p>
                <p className="mt-3 text-xs">{tool.inputLabel}</p>
                <ArrowRight className="my-3 size-4 text-muted-foreground" />
                <p className="text-xs font-medium">{tool.outputLabel}</p>
                <Badge
                  variant="outline"
                  className="mt-5 text-[10px] font-normal text-muted-foreground"
                >
                  Disponible en una próxima fase
                </Badge>
              </section>
              <div className="p-2">
                <LockKeyhole
                  className="mb-3 size-5 text-primary"
                  strokeWidth={1.4}
                />
                <h2 className="text-xs font-semibold">
                  Tu privacidad, desde el principio
                </h2>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  La herramienta se diseñará para trabajar en tu navegador. Esta
                  vista previa no lee archivos ni los envía a ningún servidor.
                </p>
                <Link
                  href="/#privacidad"
                  className="mt-3 inline-block rounded-sm text-[11px] font-medium text-primary hover:underline"
                >
                  Conoce nuestro enfoque
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}

      <section
        aria-labelledby="related-title"
        className="mt-14 mb-5 border-t border-border pt-8"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="related-title"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Más posibilidades para tus{" "}
            {tool.category === "pdf" ? "PDF" : category?.name.toLowerCase()}
          </h2>
          <Link
            href="/#herramientas"
            className="flex items-center gap-2 rounded-sm text-xs text-primary"
          >
            Ver todas <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <ToolCard key={item.slug} tool={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
