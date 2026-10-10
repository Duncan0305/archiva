import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Archiva, inicio"
      className={cn(
        "inline-flex w-fit items-center gap-2.5 rounded-sm",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-[9px] bg-primary text-primary-foreground">
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 8.5 12 5l7 3.5-7 3.5-7-3.5ZM5 12.5l7 3.5 7-3.5M5 16.5l7 3.5 7-3.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-[25px] font-extrabold tracking-[-1.2px]">
        archiva<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
