import Link from "next/link";
import { ArrowLeft, FolderSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="contenido"
      className="page-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center"
    >
      <FolderSearch className="mb-5 size-12 text-primary" strokeWidth={1.3} />
      <p className="eyebrow mb-3 text-muted-foreground">ERROR 404</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Esta página no está en el archivo
      </h1>
      <p className="mt-4 mb-7 max-w-sm text-sm leading-6 text-muted-foreground">
        Puede que el enlace haya cambiado. Todas nuestras herramientas están en
        el catálogo.
      </p>
      <Link href="/#herramientas" className={buttonVariants()}>
        <ArrowLeft />
        Volver al catálogo
      </Link>
    </main>
  );
}
