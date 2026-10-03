import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMandateStore } from "@/features/mandate/store";

const personas = [
  { id: "careful", name: "Sentinel", note: "Escalates new vendors and unusual categories." },
  { id: "balanced", name: "Operator", note: "Balances speed with measured checkpoints." },
  { id: "autonomous", name: "Navigator", note: "Moves quickly inside strict budget boundaries." },
] as const;

export function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [connected, setConnected] = useState(false);
  const [mandate, setMandate] = useState(
    "Buy productivity software up to $250 per month. Monthly plans only. Ask me before purchasing from a new vendor.",
  );
  const [persona, setPersona] = useState<(typeof personas)[number]["id"]>("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const addMandate = useMandateStore((state) => state.addMandate);
  const next = () => {
    if (step === 1 && !connected) {
      setError("Connect the sandbox account to continue.");
      return;
    }
    if (step === 2 && mandate.trim().length < 20) {
      setError("Describe the spending scope in at least 20 characters.");
      return;
    }
    setError(null);
    setStep((value) => Math.min(3, value + 1));
  };
  const finish = async () => {
    setBusy(true);
    setError(null);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Your session expired. Please sign in again.");
      setBusy(false);
      return;
    }
    const displayName =
      typeof userData.user.user_metadata?.["display_name"] === "string"
        ? userData.user.user_metadata["display_name"]
        : null;
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      display_name: displayName,
      paypal_sandbox_connected: connected,
      agent_persona: persona,
      first_mandate: mandate.trim(),
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      setError(profileError.message);
      setBusy(false);
      return;
    }
    const amount = mandate.match(/\$([\d,]+)/)?.[1];
    addMandate(mandate.trim(), amount ? Number(amount.replace(",", "")) : 250);
    await navigate({ to: "/dashboard", replace: true });
  };
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="gate-grid absolute inset-0" />
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 md:px-8">
          <Brand />
          <span className="ml-auto font-mono text-[9px] text-muted-foreground">SETUP {step}/3</span>
        </div>
      </header>
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-12 md:px-8 lg:grid-cols-[.65fr_1.35fr]">
        <aside>
          <p className="font-mono text-[10px] uppercase text-primary">Initialize your vault</p>
          <h1 className="font-display mt-4 text-4xl font-semibold">
            Three steps to controlled autonomy.
          </h1>
          <div className="mt-10 space-y-1">
            {["Connect payment rail", "Set first mandate", "Choose agent posture"].map(
              (label, index) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 border-l px-4 py-3 text-sm ${step === index + 1 ? "border-signal bg-accent text-foreground" : "border-border text-muted-foreground"}`}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full font-mono text-[9px] ${step > index + 1 ? "bg-safe-soft text-safe" : "bg-muted"}`}
                  >
                    {step > index + 1 ? <Check className="size-3" /> : index + 1}
                  </span>
                  {label}
                </div>
              ),
            )}
          </div>
        </aside>
        <section className="vault-shell min-h-[470px] p-1">
          <div className="vault-panel flex min-h-[462px] flex-col p-6 sm:p-10">
            {step === 1 && (
              <>
                <CreditCard className="size-8 text-paypal" />
                <p className="font-mono mt-8 text-[10px] uppercase text-muted-foreground">
                  Step 01 · Payment rail
                </p>
                <h2 className="font-display mt-3 text-3xl font-semibold">Connect PayPal Sandbox</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  Link a sandbox account to simulate policy-approved payments. No real money will
                  move.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConnected(true);
                    setError(null);
                  }}
                  aria-pressed={connected}
                  className={`mt-10 h-auto w-full justify-between p-5 text-left ${connected ? "border-safe bg-safe-soft" : "hover:border-paypal"}`}
                >
                  <span>
                    <b className="block italic">PayPal</b>
                    <small className="mt-1 block text-muted-foreground">
                      Sandbox merchant connection
                    </small>
                  </span>
                  {connected ? (
                    <span className="flex items-center gap-2 text-xs text-safe">
                      <Check className="size-4" />
                      Connected
                    </span>
                  ) : (
                    <span className="text-xs">Connect</span>
                  )}
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <Sparkles className="size-8 text-signal" />
                <p className="font-mono mt-8 text-[10px] uppercase text-muted-foreground">
                  Step 02 · Spending intent
                </p>
                <h2 className="font-display mt-3 text-3xl font-semibold">
                  Create your first mandate
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Include a purpose, amount, period, and anything that should require your approval.
                </p>
                <Textarea
                  aria-label="First spending mandate"
                  value={mandate}
                  onChange={(e) => setMandate(e.target.value.slice(0, 500))}
                  className="mt-8 min-h-36 bg-card p-4 leading-6"
                />
                <p
                  aria-live="polite"
                  className="mt-2 text-right font-mono text-[9px] text-muted-foreground"
                >
                  {mandate.length}/500
                </p>
              </>
            )}
            {step === 3 && (
              <>
                <Bot className="size-8 text-signal" />
                <p className="font-mono mt-8 text-[10px] uppercase text-muted-foreground">
                  Step 03 · Agent posture
                </p>
                <h2 className="font-display mt-3 text-3xl font-semibold">
                  Choose an operating persona
                </h2>
                <div className="mt-8 grid gap-3">
                  {personas.map((item) => (
                    <Button
                      type="button"
                      variant="outline"
                      key={item.id}
                      onClick={() => setPersona(item.id)}
                      aria-pressed={persona === item.id}
                      className={`h-auto justify-start gap-4 p-4 text-left ${persona === item.id ? "border-primary bg-accent" : "hover:border-primary/50"}`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted">
                        <ShieldCheck className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-sm">{item.name}</b>
                        <small className="mt-1 block whitespace-normal text-muted-foreground">
                          {item.note}
                        </small>
                      </span>
                      {persona === item.id && <Check className="size-5 shrink-0 text-safe" />}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <div className="mt-auto pt-8">
              {error && (
                <p role="alert" className="mb-3 text-xs text-danger">
                  {error}
                </p>
              )}
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  disabled={step === 1 || busy}
                  onClick={() => setStep((value) => value - 1)}
                >
                  <ArrowLeft />
                  Back
                </Button>
                {step < 3 ? (
                  <Button variant="premium" onClick={next}>
                    Continue
                    <ArrowRight />
                  </Button>
                ) : (
                  <Button variant="premium" onClick={finish} disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />}Enter control room
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
