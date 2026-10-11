"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileText } from "lucide-react";
import { PagePreviewSession } from "@/lib/pdf/page-preview-session";
import { cn } from "@/lib/utils";

interface Props {
  number: number;
  session: PagePreviewSession;
  selectable: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function PdfPageThumbnail({
  number,
  session,
  selectable,
  selected,
  disabled,
  onToggle,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "360px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let imageUrl: string | null = null;
    void session
      .render(number, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        imageUrl = URL.createObjectURL(blob);
        setUrl(imageUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [visible, session, number]);

  const body = (
    <>
      <span
        className={cn(
          "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border bg-white",
          selected ? "border-primary" : "border-border",
        )}
      >
        {url ? (
          <span
            role="img"
            aria-label={`Vista de la página ${number}`}
            className="size-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${url}")` }}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-center text-[10px] text-muted-foreground">
            <FileText className="size-5" aria-hidden="true" />
            {failed
              ? "Vista no disponible"
              : visible
                ? "Cargando página"
                : "Vista pendiente"}
          </span>
        )}
        {selectable && selected && (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" />
          </span>
        )}
      </span>
      <span className="mt-2 block text-center text-xs font-medium">
        Página {number}
      </span>
    </>
  );

  return (
    <div ref={container} className="min-w-0">
      {selectable ? (
        <button
          type="button"
          aria-label={`Página ${number}`}
          aria-pressed={selected}
          disabled={disabled}
          onClick={onToggle}
          className={cn(
            "w-full rounded-lg border p-2 text-left transition-colors focus-visible:outline-2",
            selected
              ? "border-primary bg-secondary"
              : "border-border bg-card hover:border-primary",
          )}
        >
          {body}
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-card p-2">
          {body}
        </div>
      )}
    </div>
  );
}
