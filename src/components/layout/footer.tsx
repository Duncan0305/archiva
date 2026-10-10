import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { site } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="page-container flex flex-col justify-between gap-7 py-9 sm:flex-row sm:items-center">
        <div>
          <Logo />
          <p className="mt-3 text-xs text-muted-foreground">
            Menos pasos. Más posibilidades.
          </p>
        </div>
        <nav
          aria-label="Navegación del pie"
          className="flex flex-wrap gap-x-7 gap-y-4 text-xs"
        >
          {site.navigation.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:underline">
              {label}
            </Link>
          ))}
          <Link
            href="/#privacidad"
            className="flex items-center gap-1.5 hover:underline"
          >
            Privacidad <ArrowUpRight className="size-3" />
          </Link>
        </nav>
      </div>
      <div className="page-container flex flex-wrap justify-between gap-3 border-t border-border py-5 text-[10px] text-muted-foreground">
        <span>
          © {new Date().getFullYear()} Archiva. Hecho para simplificar.
        </span>
        <span>
          {site.phase} <span className="mx-2">/</span> Herramientas en
          desarrollo
        </span>
      </div>
    </footer>
  );
}
