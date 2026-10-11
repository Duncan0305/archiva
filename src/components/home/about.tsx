import { HardDrive, Fingerprint, Sparkles, ArrowUpRight } from "lucide-react";

export function About() {
  return (
    <section
      id="nuestra-idea"
      className="border-t border-border bg-hero/55 py-12 sm:py-16"
      aria-labelledby="about-title"
    >
      <div className="page-container grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div>
          <p className="eyebrow mb-4 text-primary">
            SIMPLE POR FUERA. TUYO POR DENTRO.
          </p>
          <h2
            id="about-title"
            className="font-display text-3xl leading-[1.2] font-semibold tracking-[-1.2px]"
          >
            Tus archivos no necesitan
            <br className="hidden sm:block" /> ir a ninguna parte.
          </h2>
          <p className="mt-4 max-w-sm text-[13px] leading-6 text-muted-foreground">
            Creemos en herramientas que simplifican tu día y respetan lo que es
            tuyo. Así estamos construyendo Archiva.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <div id="privacidad">
            <HardDrive className="mb-4 size-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-[12px] font-semibold">En tu dispositivo</h3>
            <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
              Unir PDF procesa tus documentos localmente, desde el navegador,
              sin subirlos a un servidor.
            </p>
          </div>
          <div>
            <Fingerprint
              className="mb-4 size-5 text-primary"
              strokeWidth={1.5}
            />
            <h3 className="text-[12px] font-semibold">Sin pasos de más</h3>
            <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
              Una experiencia pensada sin cuentas ni registros. Tú, tus archivos
              y lo que necesitas hacer.
            </p>
          </div>
          <div>
            <Sparkles className="mb-4 size-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-[12px] font-semibold">Un buen comienzo</h3>
            <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
              Ya puedes unir tus PDF. Estamos preparando las demás herramientas
              con el mismo cuidado.
            </p>
            <a
              href="#herramientas"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-primary"
            >
              Ver el catálogo <ArrowUpRight className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
