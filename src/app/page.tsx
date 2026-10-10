import { Suspense } from "react";
import { ConnectedExplorer, Explorer } from "@/components/home/explorer";
import { About } from "@/components/home/about";

export default function HomePage() {
  return (
    <main id="contenido">
      <Suspense fallback={<Explorer category="all" />}>
        <ConnectedExplorer />
      </Suspense>
      <About />
    </main>
  );
}
