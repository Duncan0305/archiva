"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categories, categoryCount } from "@/config/tools";
import { site } from "@/config/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return (
    <header className="relative z-30 border-b border-border bg-background">
      <div className="page-container flex h-[84px] items-center justify-between gap-5">
        <Logo />
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-8 text-[13px] font-medium md:flex"
        >
          <Link
            href="/#herramientas"
            className="transition-colors hover:text-primary"
          >
            Herramientas
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-sm py-2 transition-colors hover:text-primary">
              Categorías <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              {categories.map(({ id, name, icon: Icon }) => (
                <DropdownMenuItem key={id} asChild>
                  <Link
                    href={`/?category=${id}#herramientas`}
                    className="flex gap-3"
                  >
                    <Icon className="size-4" />
                    <span className="flex-1">{name}</span>
                    <span className="text-muted-foreground">
                      {categoryCount(id)}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="/#nuestra-idea"
            className="transition-colors hover:text-primary"
          >
            Nuestra idea
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex">
            <span className="size-1.5 rounded-full bg-primary" />7 herramientas
            disponibles
          </span>
          <ThemeToggle />
          <Button
            ref={menuButton}
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          key={pathname}
          id="mobile-navigation"
          aria-label="Navegación móvil"
          className="enter absolute inset-x-0 top-full border-b border-border bg-background px-5 pb-6 shadow-lg md:hidden"
        >
          {site.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-border py-4 text-sm font-medium"
            >
              {item.label}
              <ArrowUpRight className="size-4" />
            </Link>
          ))}
          <p className="eyebrow mt-5 mb-2 text-muted-foreground">
            Explorar categorías
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map(({ id, name }) => (
              <Link
                key={id}
                href={`/?category=${id}#herramientas`}
                onClick={() => setOpen(false)}
                className="rounded-lg bg-secondary px-4 py-3 text-sm"
              >
                {name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
