import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/shared/providers";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: "Archiva — Un espacio para tus archivos",
    template: "%s | Archiva",
  },
  description: site.description,
  applicationName: site.name,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        style={
          {
            "--font-body": '"DM Sans Variable"',
            "--font-heading": '"Manrope Variable"',
          } as React.CSSProperties
        }
      >
        <Providers>
          <a href="#contenido" className="skip-link">
            Saltar al contenido
          </a>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
