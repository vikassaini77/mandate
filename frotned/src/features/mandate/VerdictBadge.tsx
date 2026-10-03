import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerdictValue = "approve" | "approved" | "escalate" | "review" | "block" | "blocked";

export function VerdictBadge({
  value,
  className,
}: {
  value: VerdictValue | string;
  className?: string;
}) {
  const normalized = value === "review" ? "escalate" : value;
  const approved = normalized === "approve" || normalized === "approved";
  const blocked = normalized === "block" || normalized === "blocked";
  const Icon = approved ? CheckCircle2 : blocked ? XCircle : AlertTriangle;
  const label = approved ? "Approve" : blocked ? "Block" : "Escalate";

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[11px] font-medium uppercase",
        approved
          ? "bg-safe-soft text-safe"
          : blocked
            ? "bg-danger-soft text-danger"
            : "bg-warning-soft text-warning",
        className,
      )}
      aria-label={`Policy verdict: ${label}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
