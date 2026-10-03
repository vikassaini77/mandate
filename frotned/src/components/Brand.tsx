import { Link } from "@tanstack/react-router";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ large = false, to = "/" }: { large?: boolean; to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="MANDATE home">
      <span
        className={cn(
          "brand-gradient grid place-items-center rounded-md text-signal-foreground shadow-[var(--shadow-action)] transition-transform group-hover:scale-105",
          large ? "size-11" : "size-8",
        )}
      >
        <Command className={large ? "size-6" : "size-4"} />
      </span>
      <span
        className={cn("font-display font-semibold tracking-[.16em]", large ? "text-xl" : "text-sm")}
      >
        MANDATE
      </span>
    </Link>
  );
}
