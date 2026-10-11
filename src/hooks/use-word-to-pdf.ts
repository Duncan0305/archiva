"use client";

import { useCallback, useRef, useState } from "react";
import {
  DocxError,
  inspectDocx,
  toDocxError,
  validateDocxFile,
} from "@/lib/docx/validate-docx";
import type { WordToolState } from "@/types/word-to-pdf";

const initialState: WordToolState = {
  phase: "empty",
  source: null,
  bytes: null,
  renderedPages: null,
  error: null,
  announcement: "Selecciona un documento DOCX.",
  printCompleted: false,
};

export function useWordToPdf() {
  const [state, setState] = useState(initialState);
  const [name, setName] = useState("archiva-word-convertido.pdf");
  const generation = useRef(0);
  const locked = useRef(false);

  function reset() {
    generation.current++;
    locked.current = false;
    setState({ ...initialState, announcement: "Listo para elegir otro DOCX." });
    setName("archiva-word-convertido.pdf");
  }

  async function load(file: File) {
    if (locked.current) return;
    reset();
    locked.current = true;
    const run = generation.current;
    setState({
      ...initialState,
      phase: "validating",
      announcement: `Validando ${file.name}.`,
    });
    try {
      validateDocxFile(file);
      const bytes = await file.arrayBuffer().catch((error) => {
        throw toDocxError(error, "read");
      });
      if (run !== generation.current) return;
      const source = await inspectDocx(bytes, file);
      if (run !== generation.current) return;
      setState({
        phase: "rendering",
        source,
        bytes,
        renderedPages: null,
        error: null,
        announcement: "Documento válido. Generando la vista previa local.",
        printCompleted: false,
      });
    } catch (error) {
      if (run !== generation.current) return;
      const safe = toDocxError(error, "invalid");
      setState({
        ...initialState,
        phase: "error",
        error: safe.message,
        announcement: safe.message,
      });
    } finally {
      if (run === generation.current) locked.current = false;
    }
  }

  const previewReady = useCallback((pageCount: number) => {
    setState((current) => {
      if (current.phase !== "rendering") return current;
      return {
        ...current,
        phase: "ready",
        renderedPages: pageCount,
        announcement: `Vista previa lista con ${pageCount} ${pageCount === 1 ? "página" : "páginas"} aproximadas.`,
      };
    });
  }, []);

  const previewFailed = useCallback((error: unknown) => {
    const safe =
      error instanceof DocxError ? error : toDocxError(error, "render");
    setState((current) => ({
      ...current,
      phase: "error",
      error: safe.message,
      announcement: safe.message,
    }));
  }, []);

  const printing = useCallback(() => {
    setState((current) => ({
      ...current,
      phase: "printing",
      printCompleted: false,
      announcement:
        "Se abrió el diálogo de impresión. Selecciona Guardar como PDF.",
    }));
  }, []);

  const printFinished = useCallback(() => {
    setState((current) => ({
      ...current,
      phase: "ready",
      printCompleted: true,
      announcement:
        "El diálogo de impresión se cerró. El navegador no informa si guardaste el PDF.",
    }));
  }, []);

  return {
    ...state,
    name,
    setName,
    busy: state.phase === "validating" || state.phase === "rendering",
    load,
    reset,
    previewReady,
    previewFailed,
    printing,
    printFinished,
  };
}
