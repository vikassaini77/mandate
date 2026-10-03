import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  Crosshair,
  LockKeyhole,
  Play,
  Radar,
  ShieldCheck,
  Siren,
  TerminalSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { redTeamScenarios } from "./mock";

type Scenario = (typeof redTeamScenarios)[number];

export function RedTeamLab() {
  const [selected, setSelected] = useState<Scenario>(() => {
    const initial = redTeamScenarios[0];
    if (!initial) throw new Error("Red-team scenarios are unavailable");
    return initial;
  });
  const [phase, setPhase] = useState<"idle" | "attacking" | "blocked">("idle");
  const runAttack = () => {
    setPhase("attacking");
    window.setTimeout(() => setPhase("blocked"), 1350);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-danger">
            Adversarial proving ground
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Red-Team Lab</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Challenge the shopping agent with hostile commerce content. The mandate remains the
            final authority.
          </p>
        </div>
        <div className="flex items-center gap-4 border-l border-border pl-5">
          <ScoreRing value={94} />
          <div>
            <p className="font-mono text-xl">47/50</p>
            <p className="text-[10px] text-muted-foreground">attacks blocked</p>
          </div>
        </div>
      </div>
      <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
        {[
          ["Prompt injection", 19, 20, "bg-danger"],
          ["Urgency manipulation", 15, 16, "bg-warning"],
          ["Metadata spoofing", 13, 14, "bg-signal"],
        ].map(([label, blocked, total, color]) => (
          <div key={String(label)} className="bg-card p-4">
            <div className="flex items-center justify-between text-xs">
              <span>{label}</span>
              <span className="font-mono">
                {blocked}/{total}
              </span>
            </div>
            <Progress
              value={(Number(blocked) / Number(total)) * 100}
              className={cn(
                "mt-3 h-1.5 [&>div]:bg-safe",
                color === "bg-warning" && "[&>div]:bg-warning",
                color === "bg-signal" && "[&>div]:bg-signal",
              )}
            />
          </div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[330px_1fr]">
        <aside className="rounded-md border border-border bg-card p-3">
          <div className="flex items-center gap-2 px-2 py-2">
            <Crosshair className="size-4 text-danger" />
            <h2 className="text-sm font-semibold">Attack the agent</h2>
          </div>
          <div className="mt-2 space-y-2">
            {redTeamScenarios.map((scenario) => (
              <Button
                key={scenario.id}
                variant="ghost"
                onClick={() => {
                  setSelected(scenario);
                  setPhase("idle");
                }}
                className={cn(
                  "h-auto w-full justify-start border p-3 text-left",
                  selected.id === scenario.id
                    ? "border-danger/40 bg-danger-soft"
                    : "border-transparent bg-subtle",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">{scenario.name}</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {scenario.type} · {scenario.severity}
                  </span>
                </span>
                <ChevronMark active={selected.id === scenario.id} />
              </Button>
            ))}
          </div>
          <Button
            variant="destructive"
            className="mt-4 w-full"
            onClick={runAttack}
            disabled={phase === "attacking"}
          >
            <Play />
            {phase === "attacking" ? "Attack running…" : "Run selected attack"}
          </Button>
        </aside>
        <section className="min-w-0 overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Radar
                className={cn("size-4 text-danger", phase === "attacking" && "animate-pulse")}
              />
              <span className="font-mono text-[10px] uppercase">Live containment trace</span>
            </div>
            <span
              className={cn(
                "rounded-sm px-2 py-1 font-mono text-[9px]",
                phase === "blocked"
                  ? "bg-safe-soft text-safe"
                  : phase === "attacking"
                    ? "bg-warning-soft text-warning"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {phase === "blocked" ? "CONTAINED" : phase === "attacking" ? "EVALUATING" : "ARMED"}
            </span>
          </div>
          <div className="grid min-h-[470px] lg:grid-cols-2">
            <AttackPane side="Agent attempt" icon={Bot} danger>
              <div className="rounded-md border border-danger/20 bg-danger-soft p-4">
                <p className="font-mono text-[9px] uppercase text-danger">
                  Untrusted input · {selected.source}
                </p>
                <p className="mt-3 font-mono text-xs leading-6">“{selected.payload}”</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selected.id}-${phase}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5"
                >
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">
                    What the agent was tricked into attempting
                  </p>
                  <p className="mt-3 text-sm leading-6">
                    {phase === "idle"
                      ? "Run the scenario to expose the agent's attempted action."
                      : selected.attempt}
                  </p>
                  {phase === "attacking" && (
                    <div className="mt-5 space-y-2">
                      {[80, 62, 73].map((width) => (
                        <motion.div
                          key={width}
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          className="h-2 bg-danger-soft"
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </AttackPane>
            <AttackPane side="Policy engine" icon={ShieldCheck}>
              <div className="relative flex h-full min-h-[330px] flex-col justify-center">
                <div className="absolute left-0 top-0 h-full w-px bg-safe/30" />
                <AnimatePresence mode="wait">
                  {phase === "idle" ? (
                    <motion.div
                      key="ready"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center"
                    >
                      <LockKeyhole className="mx-auto size-9 text-muted-foreground" />
                      <p className="mt-4 text-sm font-medium">Gate standing by</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        No action can execute before evaluation.
                      </p>
                    </motion.div>
                  ) : phase === "attacking" ? (
                    <motion.div
                      key="scan"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4 pl-6"
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-2 animate-pulse rounded-full bg-warning" />
                        <span className="font-mono text-xs">Parsing proposed action</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="size-2 animate-pulse rounded-full bg-warning [animation-delay:180ms]" />
                        <span className="font-mono text-xs">Checking mandate graph</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="size-2 animate-pulse rounded-full bg-warning [animation-delay:360ms]" />
                        <span className="font-mono text-xs">Locking payment rail</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="blocked"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pl-6"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 place-items-center rounded-full bg-safe-soft">
                          <ShieldCheck className="size-6 text-safe" />
                        </span>
                        <div>
                          <p className="font-mono text-2xl text-safe">BLOCK</p>
                          <p className="text-xs text-muted-foreground">Payment never initiated</p>
                        </div>
                      </div>
                      <div className="mt-6 border-l-2 border-safe pl-4">
                        <p className="font-mono text-[9px] uppercase text-muted-foreground">
                          Binding rule
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6">{selected.rule}</p>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <LabFact label="Tool calls stopped" value="4" />
                        <LabFact label="Funds exposed" value="$0.00" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </AttackPane>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-subtle px-5 py-3 text-[10px] text-muted-foreground">
            <AlertTriangle className="size-3.5 text-warning" />
            <span>Simulation only</span>
            <ArrowRight className="size-3.5" />
            <span>No merchant contact</span>
            <ArrowRight className="size-3.5" />
            <span>No payment authorization</span>
          </div>
        </section>
      </div>
      <LiveThreatStream />
    </div>
  );
}

import { useEffect } from "react";

function LiveThreatStream() {
  const [threats, setThreats] = useState<any[]>([]);

  useEffect(() => {
    // Only connect if we are not using mocks
    if (import.meta.env.VITE_USE_MOCKS === "true") return;

    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/redteam/security-stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setThreats((prev) => [data, ...prev].slice(0, 5)); // keep last 5
    };

    return () => eventSource.close();
  }, []);

  if (threats.length === 0) return null;

  return (
    <div className="rounded-md border border-danger/40 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Siren className="size-4 text-danger animate-pulse" />
        <h2 className="text-sm font-semibold text-danger">Live Threat Map</h2>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {threats.map((threat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between text-xs bg-danger-soft border border-danger/20 p-2 rounded"
            >
              <span className="font-mono">{threat.type || "PROMPT_INJECTION"}</span>
              <span className="text-muted-foreground">{new Date().toLocaleTimeString()}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-16">
      <svg viewBox="0 0 68 68" className="-rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
        <motion.circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke="var(--safe)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 0.9 }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-xs">{value}%</span>
    </div>
  );
}
function AttackPane({
  side,
  icon: Icon,
  danger,
  children,
}: {
  side: string;
  icon: typeof Bot;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("p-5 md:p-7", danger && "border-b border-border lg:border-b-0 lg:border-r")}>
      <div className="mb-6 flex items-center gap-2">
        <Icon className={cn("size-4", danger ? "text-danger" : "text-safe")} />
        <p className="font-mono text-[10px] uppercase text-muted-foreground">{side}</p>
      </div>
      {children}
    </div>
  );
}
function LabFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-subtle p-3">
      <p className="font-mono text-[8px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-sm">{value}</p>
    </div>
  );
}
function ChevronMark({ active }: { active: boolean }) {
  return active ? (
    <Siren className="size-4 shrink-0 text-danger" />
  ) : (
    <TerminalSquare className="size-4 shrink-0 text-muted-foreground" />
  );
}
