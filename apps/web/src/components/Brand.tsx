import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const MandateLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer Hexagon Shield */}
    <path
      d="M20 4L6 11V29L20 36L34 29V11L20 4Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Inner 'M' and Node connections */}
    <path
      d="M6 11L20 19L34 11"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M20 19V36"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Secondary structural lines */}
    <path
      d="M20 4V19"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      className="opacity-40"
    />
    {/* AI Engine Core (Center Node) */}
    <circle cx="20" cy="19" r="3" fill="currentColor" />
  </svg>
);

export function Brand({ large = false, to = "/" }: { large?: boolean; to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="MANDATE home">
      <span
        className={cn(
          "brand-gradient grid place-items-center rounded-md text-signal-foreground shadow-[var(--shadow-action)] transition-transform group-hover:scale-105",
          large ? "size-11" : "size-8",
        )}
      >
        <MandateLogo className={large ? "size-6" : "size-[18px]"} />
      </span>
      <span
        className={cn("font-display font-semibold tracking-[.16em]", large ? "text-xl" : "text-sm")}
      >
        MANDATE
      </span>
    </Link>
  );
}
