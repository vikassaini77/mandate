import { useEffect, useState } from "react";
import { Server, Zap, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export function TelemetryWidget({
  messages,
  status,
}: {
  messages: any[];
  status: string;
}) {
  const [tokens, setTokens] = useState({ prompt: 0, completion: 0 });
  const [latency, setLatency] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Approximate cost per 1k tokens for Gemini Flash
  const COST_PER_1K_PROMPT = 0.000075;
  const COST_PER_1K_COMPLETION = 0.0003;

  useEffect(() => {
    if (status === "submitted") {
      setStartTime(Date.now());
    } else if (status === "streaming" && startTime) {
      setLatency(Date.now() - startTime);
      setStartTime(null);
    }
  }, [status, startTime]);

  useEffect(() => {
    let pTokens = 0;
    let cTokens = 0;

    const msgs = messages || [];
    msgs.forEach((m) => {
      let len = m.content?.length || 0;
      if (m.parts) {
        m.parts.forEach((p: any) => {
          if (p.type === 'text') len += p.text?.length || 0;
        });
      }
      
      if (m.role === "user") {
        pTokens += Math.ceil(len / 4);
      } else {
        cTokens += Math.ceil(len / 4);
      }
    });

    setTokens({ prompt: pTokens, completion: cTokens });
  }, [messages]);

  const totalCost = (tokens.prompt / 1000) * COST_PER_1K_PROMPT + (tokens.completion / 1000) * COST_PER_1K_COMPLETION;

  return (
    <div className="absolute top-16 right-4 z-50 flex items-center gap-4 rounded-xl border border-border/50 bg-background/80 px-4 py-2 text-xs backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Server className={cn("size-3.5", status === "streaming" ? "text-signal animate-pulse" : "")} />
        <span className="font-mono">{latency > 0 ? `${latency}ms` : "idle"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground border-l border-border/50 pl-4">
        <Zap className="size-3.5" />
        <span className="font-mono">
          <span className="text-foreground">{tokens.prompt + tokens.completion}</span> <span className="opacity-50">tok</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground border-l border-border/50 pl-4">
        <Coins className="size-3.5" />
        <span className="font-mono text-signal/80">
          ${totalCost < 0.00001 && totalCost > 0 ? "<0.00001" : totalCost.toFixed(5)}
        </span>
      </div>
    </div>
  );
}
