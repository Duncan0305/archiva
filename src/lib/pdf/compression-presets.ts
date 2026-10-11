import type { CompressionLevel } from "@/types/compress-pdf";

export interface CompressionPreset {
  level: CompressionLevel;
  name: string;
  description: string;
  effect: string;
  requiresImages: boolean;
  args: string[];
}

export const compressionPresets: CompressionPreset[] = [
  {
    level: "soft",
    name: "Suave",
    description: "Prioriza la compatibilidad y la preservación exacta.",
    effect: "Comprime flujos compatibles y genera objetos comprimidos.",
    requiresImages: false,
    args: [
      "--object-streams=generate",
      "--compress-streams=y",
      "--decode-level=generalized",
      "--compression-level=6",
    ],
  },
  {
    level: "balanced",
    name: "Equilibrada",
    description: "Busca una reducción mayor sin modificar imágenes.",
    effect: "Además vuelve a comprimir flujos Flate con nivel máximo.",
    requiresImages: false,
    args: [
      "--object-streams=generate",
      "--compress-streams=y",
      "--decode-level=generalized",
      "--recompress-flate",
      "--compression-level=9",
    ],
  },
  {
    level: "high",
    name: "Alta",
    description: "Puede reducir más los PDF que contienen imágenes compatibles.",
    effect: "Optimiza imágenes compatibles como JPEG con calidad 60.",
    requiresImages: true,
    args: [
      "--object-streams=generate",
      "--compress-streams=y",
      "--decode-level=generalized",
      "--recompress-flate",
      "--compression-level=9",
      "--optimize-images",
      "--jpeg-quality=60",
    ],
  },
];

export function compressionPreset(level: CompressionLevel) {
  const preset = compressionPresets.find((item) => item.level === level);
  if (!preset) throw new Error("Unknown compression level");
  return preset;
}
