"use client";

import { useRef, useState } from "react";
import { FilePlus2, FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  disabled: boolean;
  hasFiles: boolean;
  onFiles: (files: File[]) => Promise<void>;
}

export function PdfDropzone({ disabled, hasFiles, onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [over, setOver] = useState(false);

  return (
    <section
      aria-labelledby="upload-title"
      data-testid="pdf-dropzone"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        if (!disabled) {
          dragDepth.current++;
          setOver(true);
        }
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setOver(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current = 0;
        setOver(false);
        if (!disabled) void onFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-card px-6 text-center transition-colors",
        hasFiles ? "py-6" : "min-h-[320px] py-10",
        over && !disabled && "border-primary bg-secondary",
        disabled && "opacity-65",
      )}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        disabled={disabled}
        className="hidden"
        aria-label="Seleccionar documentos PDF"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = ""; // Allow selecting a removed file again.
          void onFiles(files);
        }}
      />
      {!hasFiles && (
        <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
          <FilePlus2 className="size-7" strokeWidth={1.4} />
        </span>
      )}
      <h2
        id="upload-title"
        className={cn(
          "font-display font-semibold tracking-tight",
          hasFiles ? "text-base" : "text-xl",
        )}
      >
        {hasFiles ? "¿Un documento más?" : "Tus PDF, mejor juntos"}
      </h2>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        {hasFiles
          ? "Arrastra aquí otros PDF para añadirlos a la lista."
          : "Arrastra tus PDF aquí o selecciónalos desde tu dispositivo."}
      </p>
      <Button
        type="button"
        variant={hasFiles ? "outline" : "default"}
        disabled={disabled}
        className="mt-4 min-h-11"
        onClick={() => input.current?.click()}
      >
        {hasFiles ? <Plus /> : <FileUp />}
        {hasFiles ? "Añadir archivos" : "Seleccionar archivos"}
      </Button>
      {!hasFiles && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Selecciona al menos 2 PDF sin contraseña.
        </p>
      )}
    </section>
  );
}
