import type { LucideIcon } from "lucide-react";

export type CategoryId = "pdf" | "images" | "files";
export type ToolStatus = "planned" | "available";

export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: CategoryId;
  icon: LucideIcon;
  status: ToolStatus;
  inputLabel: string;
  outputLabel: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  icon: LucideIcon;
}
