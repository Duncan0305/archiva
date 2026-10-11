"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Search,
  ArrowDown,
  ArrowUpRight,
  LayoutGrid,
  LockKeyhole,
  X,
  SearchX,
  Leaf,
  ArrowRight,
} from "lucide-react";
import { categories, categoryCount, tools } from "@/config/tools";
import type { CategoryId } from "@/types/tool";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/tools/tool-card";
import { FileIllustration } from "@/components/home/file-illustration";
import { cn } from "@/lib/utils";

type Filter = CategoryId | "all";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function ConnectedExplorer() {
  const params = useSearchParams();
  const value = params.get("category");
  const category = categories.some(({ id }) => id === value)
    ? (value as CategoryId)
    : "all";
  return <Explorer category={category} />;
}

export function Explorer({ category }: { category: Filter }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered = tools.filter(
    (tool) =>
      (category === "all" || tool.category === category) &&
      terms.every((term) =>
        normalize(`${tool.name} ${tool.description}`).includes(term),
      ),
  );
  const filters = [
    { id: "all" as const, name: "Todas las herramientas", icon: LayoutGrid },
    ...categories,
  ];
  const availableCount = filtered.filter(
    (tool) => tool.status === "available",
  ).length;

  function selectCategory(id: Filter) {
    router.replace(
      id === "all" ? "/#herramientas" : `/?category=${id}#herramientas`,
      { scroll: false },
    );
  }

  function clearFilters() {
    setQuery("");
    selectCategory("all");
  }

  return (
    <>
      <section
        className="page-container pt-7 sm:pt-10"
        aria-labelledby="hero-title"
      >
        <div className="relative overflow-hidden rounded-2xl border border-border bg-hero">
          <div className="grid items-center gap-3 px-6 pt-9 pb-8 sm:px-10 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:px-12 lg:pt-12 lg:pb-10">
            <div className="enter relative z-10">
              <p className="eyebrow mb-5 flex items-center gap-2.5 text-primary">
                <span className="h-px w-6 bg-primary" />
                EL SIGUIENTE CAPÍTULO DE TUS ARCHIVOS
              </p>
              <h1
                id="hero-title"
                className="font-display text-[clamp(2.5rem,4.5vw,3.6rem)] leading-[1.11] font-semibold tracking-[-0.055em]"
              >
                Tus archivos.
                <br />
                Más posibilidades<span className="text-primary">.</span>
              </h1>
              <p className="mt-5 max-w-[380px] text-[14px] leading-7 text-muted-foreground">
                Unir, transformar, organizar. Un espacio sencillo para hacer más
                con tus PDF, imágenes y archivos.
              </p>
              <form
                role="search"
                className="relative mt-6 w-full max-w-[430px]"
                onSubmit={(event) => {
                  event.preventDefault();
                  document.getElementById("catalog-results")?.focus();
                }}
              >
                <label htmlFor="tool-search" className="sr-only">
                  Buscar herramientas
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  ref={searchRef}
                  id="tool-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="¿Qué necesitas hacer?"
                  className="h-12 rounded-lg bg-card pr-24 pl-10 text-sm shadow-none placeholder:text-[13px]"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Borrar búsqueda"
                    className="absolute inset-y-0 right-12 flex w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                  >
                    <X className="size-4" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Ver resultados de búsqueda"
                  className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ArrowRight className="size-4" />
                </button>
              </form>
              <a
                href="#herramientas"
                className="mt-4 inline-flex items-center gap-2.5 rounded-sm text-[11px] font-semibold text-primary"
              >
                Explora las herramientas <ArrowDown className="size-3.5" />
              </a>
            </div>
            <div className="hidden lg:block">
              <FileIllustration />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/35 px-6 py-3.5 text-[10px] sm:px-10 lg:px-12">
            <span className="flex items-center gap-2 text-muted-foreground">
              <LockKeyhole className="size-3.5 text-primary" />
              Diseñado para procesar en tu dispositivo
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Unir, Dividir y Organizar PDF están disponibles
            </span>
          </div>
        </div>
      </section>

      <section
        id="herramientas"
        className="page-container pt-12 pb-16 sm:pt-14 sm:pb-20"
        aria-labelledby="catalog-title"
      >
        <div className="mb-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow mb-2.5 text-muted-foreground">
              LA CAJA DE HERRAMIENTAS
            </p>
            <h2
              id="catalog-title"
              className="font-display text-[25px] leading-tight font-semibold tracking-[-1px] sm:text-[29px]"
            >
              Cada archivo, una solución.
            </h2>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[188px_1fr] lg:gap-8">
          <aside
            aria-label="Filtrar herramientas"
            className="lg:sticky lg:top-7"
          >
            <div
              className="flex flex-wrap gap-1.5 lg:flex-col"
              aria-label="Categorías"
            >
              {filters.map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={category === id}
                  onClick={() => selectCategory(id)}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-left text-[12px] transition-colors duration-150 lg:w-full",
                    category === id
                      ? "bg-secondary font-semibold text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className="size-4 shrink-0"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{name}</span>
                  <span className="ml-1 text-[11px] tabular-nums">
                    {id === "all" ? tools.length : categoryCount(id)}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-7 hidden border-t border-border pt-6 lg:block">
              <Leaf className="mb-3 size-5 text-primary" strokeWidth={1.4} />
              <p className="text-[12px] leading-5 font-medium">
                Pequeñas herramientas.
                <br />
                Grandes posibilidades.
              </p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Estamos preparando cada detalle. Esto es solo el comienzo.
              </p>
              <a
                href="#nuestra-idea"
                className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-[11px] font-medium text-primary"
              >
                Conoce Archiva <ArrowUpRight className="size-3" />
              </a>
            </div>
          </aside>
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <p role="status" aria-live="polite" aria-atomic="true">
                {filtered.length}{" "}
                {filtered.length === 1 ? "herramienta" : "herramientas"}
                {query.trim() ? ` para “${query.trim()}”` : " para explorar"}
              </p>
              <span>
                {availableCount}{" "}
                {availableCount === 1 ? "disponible" : "disponibles"} ·{" "}
                {filtered.filter((tool) => tool.status === "planned").length}{" "}
                próximamente
              </span>
            </div>
            <div
              id="catalog-results"
              tabIndex={-1}
              aria-label="Resultados del catálogo"
              className="rounded-lg"
            >
              {filtered.length > 0 ? (
                <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((tool) => (
                    <motion.div
                      key={tool.slug}
                      initial={false}
                      animate={{ opacity: 1 }}
                      layout={reducedMotion ? false : "position"}
                      transition={{ duration: reducedMotion ? 0 : 0.2 }}
                      className="min-w-0"
                    >
                      <ToolCard tool={tool} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
                  <SearchX
                    className="mb-4 size-8 text-muted-foreground"
                    strokeWidth={1.3}
                  />
                  <h3 className="font-display text-lg font-semibold">
                    No encontramos esa herramienta
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    Prueba con otra palabra o explora todas las categorías.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5"
                    onClick={clearFilters}
                  >
                    Restablecer filtros
                  </Button>
                </div>
              )}
            </div>
            <p className="mt-6 flex items-start gap-2 text-[10px] leading-5 text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
              Unir, Dividir y Organizar PDF ya funcionan en tu navegador. Las
              herramientas marcadas como «Próximamente» siguen en desarrollo.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
