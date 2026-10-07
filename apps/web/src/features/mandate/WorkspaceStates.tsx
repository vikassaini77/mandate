import { AlertTriangle, Boxes, RefreshCw, RouteOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function StateIllustration({ kind = "empty" }: { kind?: "empty" | "error" | "missing" }) {
  const Icon = kind === "error" ? AlertTriangle : kind === "missing" ? RouteOff : Boxes;
  return (
    <div className="relative mx-auto grid size-24 place-items-center">
      <span className="absolute inset-0 rotate-45 rounded-md border border-border" />
      <span className="absolute inset-4 -rotate-12 rounded-md border border-signal/30" />
      <span className="relative grid size-12 place-items-center rounded-md border border-border bg-card">
        <Icon className="size-5 text-signal" />
      </span>
    </div>
  );
}

export function ActionEmpty({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-md border border-dashed border-border bg-card/60 p-8 text-center">
      <div>
        <StateIllustration />
        <h2 className="mt-6 font-display text-xl font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <Button className="mt-5" onClick={onAction}>
          {action}
        </Button>
      </div>
    </div>
  );
}

export function ScreenSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading screen" aria-live="polite">
      <span className="sr-only">Loading content</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-[360px]" />
    </div>
  );
}

export function RouteFailure({ missing, onRetry, error }: { missing?: boolean; onRetry?: () => void; error?: any }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <StateIllustration kind={missing ? "missing" : "error"} />
        <p className="mt-7 font-mono text-[10px] uppercase tracking-[.16em] text-danger">
          {missing ? "ROUTE OUTSIDE MANDATE" : "CONTROL PLANE INTERRUPTED"}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          {missing ? "This path has no clearance." : "The gate could not load."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground whitespace-pre-wrap text-left bg-muted/20 p-2 rounded">
          {missing
            ? "The page may have moved, or the address does not belong to this workspace."
            : error instanceof Error ? error.stack : (error?.message || "Your rules and funds remain safe. Retry the request or return to the control room.")}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw />
              Try again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Return home
          </Button>
        </div>
      </div>
    </main>
  );
}
