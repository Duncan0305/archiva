import {
  Archive,
  ArchiveRestore,
  Combine,
  FileImage,
  FileOutput,
  FileText,
  Image,
  ImageDown,
  Images,
  LayoutGrid,
  Minimize2,
  Presentation,
  RotateCw,
  Scaling,
  Scissors,
  Shrink,
} from "lucide-react";
import type { Category, Tool } from "@/types/tool";

export const categories: Category[] = [
  { id: "pdf", name: "PDF", icon: FileText },
  { id: "images", name: "Imágenes", icon: Image },
  { id: "files", name: "Archivos", icon: Archive },
];

// The catalog contains metadata only; PDF processing loads on file selection.
export const tools: Tool[] = [
  {
    slug: "merge-pdf",
    name: "Unir PDF",
    description:
      "Todos tus documentos, en un solo PDF. En el orden que tú elijas.",
    icon: Combine,
    category: "pdf",
    status: "available",
    inputLabel: "Archivos PDF",
    outputLabel: "Un documento PDF",
  },
  {
    slug: "split-pdf",
    name: "Dividir PDF",
    description: "Separa tu documento y quédate con las páginas que necesitas.",
    icon: Scissors,
    category: "pdf",
    status: "available",
    inputLabel: "Un archivo PDF",
    outputLabel: "Documentos PDF separados",
  },
  {
    slug: "compress-pdf",
    name: "Comprimir PDF",
    description:
      "Menos peso para tus documentos, más espacio para lo importante.",
    icon: Minimize2,
    category: "pdf",
    status: "planned",
    inputLabel: "Un archivo PDF",
    outputLabel: "Un PDF de menor tamaño",
  },
  {
    slug: "rotate-pdf",
    name: "Rotar PDF",
    description:
      "Dale a cada página la orientación correcta, sin complicaciones.",
    icon: RotateCw,
    category: "pdf",
    status: "planned",
    inputLabel: "Un archivo PDF",
    outputLabel: "Un PDF con páginas rotadas",
  },
  {
    slug: "organize-pdf",
    name: "Organizar páginas PDF",
    description: "Reordena, elimina y organiza las páginas a tu manera.",
    icon: LayoutGrid,
    category: "pdf",
    status: "available",
    inputLabel: "Un archivo PDF",
    outputLabel: "Un PDF reorganizado",
  },
  {
    slug: "pdf-to-word",
    name: "PDF a Word",
    description:
      "De documento a punto de partida. Prepara tu PDF para editarlo.",
    icon: FileOutput,
    category: "pdf",
    status: "planned",
    inputLabel: "Un archivo PDF",
    outputLabel: "Un documento Word",
  },
  {
    slug: "word-to-pdf",
    name: "Word a PDF",
    description: "Prepara tus documentos de Word para compartirlos como PDF.",
    icon: FileText,
    category: "pdf",
    status: "planned",
    inputLabel: "Un documento Word",
    outputLabel: "Un documento PDF",
  },
  {
    slug: "powerpoint-to-pdf",
    name: "PowerPoint a PDF",
    description: "Tus presentaciones, listas para consultar en formato PDF.",
    icon: Presentation,
    category: "pdf",
    status: "planned",
    inputLabel: "Una presentación PowerPoint",
    outputLabel: "Un documento PDF",
  },
  {
    slug: "pdf-to-images",
    name: "PDF a imágenes",
    description:
      "Transforma las páginas de tu documento en imágenes individuales.",
    icon: FileImage,
    category: "pdf",
    status: "available",
    inputLabel: "Un archivo PDF",
    outputLabel: "Imágenes de cada página",
  },
  {
    slug: "images-to-pdf",
    name: "Imágenes a PDF",
    description: "Reúne tus imágenes en un documento fácil de compartir.",
    icon: Images,
    category: "pdf",
    status: "available",
    inputLabel: "Archivos de imagen",
    outputLabel: "Un documento PDF",
  },
  {
    slug: "compress-images",
    name: "Comprimir imágenes",
    description:
      "Imágenes más ligeras para acompañar tus ideas a todas partes.",
    icon: Shrink,
    category: "images",
    status: "planned",
    inputLabel: "Archivos de imagen",
    outputLabel: "Imágenes optimizadas",
  },
  {
    slug: "jpg-to-png",
    name: "Convertir JPG a PNG",
    description: "Cambia el formato de tus imágenes para tu próximo proyecto.",
    icon: Image,
    category: "images",
    status: "planned",
    inputLabel: "Imágenes JPG",
    outputLabel: "Imágenes PNG",
  },
  {
    slug: "png-to-webp",
    name: "Convertir PNG a WebP",
    description: "Prepara tus imágenes con un formato pensado para la web.",
    icon: ImageDown,
    category: "images",
    status: "planned",
    inputLabel: "Imágenes PNG",
    outputLabel: "Imágenes WebP",
  },
  {
    slug: "resize-images",
    name: "Redimensionar imágenes",
    description: "Encuentra las dimensiones adecuadas para cada imagen.",
    icon: Scaling,
    category: "images",
    status: "planned",
    inputLabel: "Archivos de imagen",
    outputLabel: "Imágenes redimensionadas",
  },
  {
    slug: "create-zip",
    name: "Crear ZIP",
    description:
      "Agrupa tus archivos en un único paquete, todo bien organizado.",
    icon: Archive,
    category: "files",
    status: "planned",
    inputLabel: "Varios archivos",
    outputLabel: "Un archivo ZIP",
  },
  {
    slug: "extract-zip",
    name: "Extraer ZIP",
    description: "Abre tu archivo comprimido y recupera lo que hay dentro.",
    icon: ArchiveRestore,
    category: "files",
    status: "planned",
    inputLabel: "Un archivo ZIP",
    outputLabel: "Archivos extraídos",
  },
];

export function getTool(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}

export function categoryCount(id: Category["id"]) {
  return tools.filter((tool) => tool.category === id).length;
}
