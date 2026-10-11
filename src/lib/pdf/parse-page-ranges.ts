import type { PageGroup } from "@/types/split-pdf";

export class PageRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageRangeError";
  }
}

function pageNumber(value: string, total: number): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1)
    throw new PageRangeError("Escribe números de página enteros y positivos.");
  if (number > total)
    throw new PageRangeError(
      `La página ${number} no existe. Este PDF tiene ${total} páginas.`,
    );
  return number;
}

export function parsePageRanges(text: string, total: number): PageGroup[] {
  if (!text.trim())
    throw new PageRangeError(
      "Escribe al menos un rango, por ejemplo: 1-3, 4-6.",
    );
  return text.split(",").map((part) => {
    const match = /^\s*([1-9]\d*)(?:\s*-\s*([1-9]\d*))?\s*$/.exec(part);
    if (!match)
      throw new PageRangeError(
        "Usa el formato 1-3, 4-6. Separa cada rango con una coma.",
      );
    const start = pageNumber(match[1], total);
    const end = match[2] ? pageNumber(match[2], total) : start;
    if (end < start)
      throw new PageRangeError(`El rango ${start}-${end} está invertido.`);
    return {
      pages: Array.from(
        { length: end - start + 1 },
        (_, index) => start + index,
      ),
      label: start === end ? `Página ${start}` : `Páginas ${start}-${end}`,
    };
  });
}

export function groupsEveryN(value: string, total: number): PageGroup[] {
  if (!/^\s*[1-9]\d*\s*$/.test(value))
    throw new PageRangeError(
      "Indica un número entero y positivo de páginas por documento.",
    );
  const count = Number(value.trim());
  if (!Number.isSafeInteger(count))
    throw new PageRangeError(
      "El número de páginas por documento es demasiado grande.",
    );
  const groups: PageGroup[] = [];
  for (let start = 1; start <= total; start += count) {
    const end = Math.min(total, start + count - 1);
    groups.push({
      pages: Array.from(
        { length: end - start + 1 },
        (_, index) => start + index,
      ),
      label: start === end ? `Página ${start}` : `Páginas ${start}-${end}`,
    });
  }
  return groups;
}

export function selectedGroup(selected: ReadonlySet<number>): PageGroup[] {
  const pages = [...selected].sort((a, b) => a - b);
  return pages.length
    ? [
        {
          pages,
          label: `${pages.length} ${pages.length === 1 ? "página" : "páginas"} seleccionadas`,
        },
      ]
    : [];
}
