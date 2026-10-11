import { PageRangeError, parsePageRanges } from "./parse-page-ranges";

export { PageRangeError };

export function parseImagePageRanges(text: string, total: number) {
  const pages = parsePageRanges(text, total).flatMap((group) => group.pages);
  return [...new Set(pages)].sort((a, b) => a - b);
}
