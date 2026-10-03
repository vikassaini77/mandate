import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TransactionFlowBackground } from "@/features/mandate/TransactionFlowBackground";
import { VerdictBadge } from "@/features/mandate/VerdictBadge";

const decisions = [
  { merchant: "Notion", detail: "Team workspace · $96", verdict: "APPROVE", tone: "safe" },
  { merchant: "B&H Photo", detail: "New vendor · $149", verdict: "ESCALATE", tone: "warning" },
  {
    merchant: "Flight Club",
    detail: "Restricted category · $420",
    verdict: "BLOCK",
    tone: "danger",
  },
];

const steps = [
  {
    icon: Sparkles,
    title: "Set mandate",
    text: "Describe budgets, categories, merchants, and exceptions in plain English.",
  },
  {
    icon: Bot,
    title: "Agent shops",
    text: "Your agent researches and prepares purchases inside the scope you defined.",
  },
  {
    icon: Fingerprint,
    title: "Policy decides",
    text: "Every request receives a deterministic approve, escalate, or block verdict.",
  },
  {
    icon: CreditCard,
    title: "PayPal pays",
    text: "Approved requests complete through PayPal Sandbox with a complete audit trail.",
  },
];

const faqs = [
  [
    "Does MANDATE let an AI spend freely?",
    "No. Every purchase must satisfy the rules you set. Anything ambiguous pauses for your review.",
  ],
  [
    "Is this connected to real money?",
    "The current experience uses PayPal Sandbox, so approvals are safe simulations and no real funds move.",
  ],
  [
    "Can I see why a purchase was blocked?",
    "Yes. The ledger records the request, matched rule, verdict, confidence, and plain-English reasoning.",
  ],
  [
    "Can I pause an agent?",
    "Yes. Mandates can be paused or resumed instantly without deleting their decision history.",
  ],
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55 },
};

export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <TransactionFlowBackground density="ambient" />
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 md:px-8">
          <Brand />
          <nav className="ml-auto hidden items-center gap-7 text-xs text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#security" className="transition-colors hover:text-foreground">
              Security
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-8">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild variant="premium" size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-12 px-4 pb-20 pt-32 md:px-8 lg:grid-cols-[1fr_.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 border border-safe/25 bg-safe-soft/40 px-3 py-2 font-mono text-[10px] uppercase text-safe">
              <span className="size-1.5 animate-pulse rounded-full bg-safe" /> Policy gate online
            </div>
            <h1 className="font-display max-w-3xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Let your agent spend.
              <br />
              <span className="landing-gradient-text">Never lose control.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              A trust layer for AI shopping agents. Set intent in plain English, enforce it before
              payment, and know why every dollar moved.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="premium" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create your first mandate <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how">See the gate in action</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-safe" />
                Deterministic controls
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-safe" />
                PayPal Sandbox
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-safe" />
                Audit-ready
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.7 }}
            className="vault-shell relative overflow-hidden rounded-lg p-1"
          >
            <div className="gate-grid absolute inset-0" />
            <div className="relative overflow-hidden rounded-md bg-vault-raised p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-vault-line pb-4">
                <div>
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">
                    Live verdict stream
                  </p>
                  <p className="mt-1 text-sm font-medium">Autonomous procurement agent</p>
                </div>
                <span className="flex items-center gap-2 font-mono text-[9px] text-safe">
                  <i className="size-1.5 rounded-full bg-safe" /> ENFORCING
                </span>
              </div>
              <div className="relative mt-5 space-y-3 before:absolute before:bottom-0 before:left-[46px] before:top-0 before:w-px before:bg-vault-line">
                {decisions.map((item, index) => (
                  <motion.div
                    key={item.merchant}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.35 }}
                    className="relative grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border border-vault-line bg-vault/80 p-3 motion-reduce:opacity-100"
                  >
                    <span className="grid size-8 place-items-center rounded-sm bg-subtle font-mono text-[9px]">
                      0{index + 1}
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate text-xs">{item.merchant}</b>
                      <small className="block truncate text-[10px] text-muted-foreground">
                        {item.detail}
                      </small>
                    </span>
                    <VerdictBadge value={item.verdict.toLowerCase()} />
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-px bg-vault-line text-center">
                <div className="bg-vault p-3">
                  <b className="font-mono text-lg">4.2ms</b>
                  <span className="mt-1 block text-[9px] text-muted-foreground">AVG VERDICT</span>
                </div>
                <div className="bg-vault p-3">
                  <b className="font-mono text-lg">98.4%</b>
                  <span className="mt-1 block text-[9px] text-muted-foreground">AUTOMATED</span>
                </div>
                <div className="bg-vault p-3">
                  <b className="font-mono text-lg">100%</b>
                  <span className="mt-1 block text-[9px] text-muted-foreground">LOGGED</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-border bg-card/70">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border md:grid-cols-4">
            {[
              ["$2.8M", "spend governed"],
              ["1.2M", "policy decisions"],
              ["99.998%", "gate uptime"],
              ["0", "unlogged payments"],
            ].map(([value, label]) => (
              <div key={label} className="bg-card px-5 py-7 text-center">
                <p className="font-mono text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-[10px] uppercase text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <motion.section {...reveal} className="mx-auto max-w-7xl px-4 py-28 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase text-danger">The trust gap</p>
              <h2 className="font-display mt-4 text-4xl font-semibold">
                Agents can transact faster than teams can supervise.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-l border-danger pl-5">
                <p className="text-3xl font-mono">Before</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Loose prompts, binary permissions, and explanations written after the money moves.
                </p>
              </div>
              <div className="border-l border-safe pl-5">
                <p className="text-3xl font-mono">With MANDATE</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Explicit intent, deterministic checks, human escalation, and a signed reason for
                  every outcome.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <section id="how" className="border-y border-border bg-card/60 py-28">
          <motion.div {...reveal} className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase text-primary">Four controlled moves</p>
              <h2 className="font-display mt-4 text-4xl font-semibold">
                From intent to payment, every step has a boundary.
              </h2>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-4">
              {steps.map((step, index) => (
                <motion.div key={step.title} whileHover={{ y: -4 }} className="bg-background p-6">
                  <div className="flex items-center justify-between">
                    <step.icon className="size-5 text-signal" />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-10 font-display text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          id="security"
          {...reveal}
          className="mx-auto grid max-w-7xl gap-12 px-4 py-28 md:px-8 lg:grid-cols-[.8fr_1.2fr]"
        >
          <div>
            <div className="grid size-14 place-items-center rounded-md border border-safe/30 bg-safe-soft">
              <ShieldCheck className="size-7 text-safe" />
            </div>
            <h2 className="font-display mt-6 text-4xl font-semibold">
              Trust is an architecture, not a promise.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Rules are evaluated before payment. Exceptions require a human. Every result stays
              attributable and inspectable.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [LockKeyhole, "Policy-first payment", "No authorization is issued before a verdict."],
              [Fingerprint, "Human checkpoints", "Uncertain requests stop at the gate."],
              [Zap, "Deterministic engine", "The same facts always produce the same result."],
              [
                ShieldCheck,
                "Complete audit trail",
                "Inputs, rules, reasons, and outcomes stay linked.",
              ],
            ].map(([Icon, title, text]) => {
              const SecurityIcon = Icon as typeof LockKeyhole;
              return (
                <div key={String(title)} className="vault-panel p-5">
                  <SecurityIcon className="size-5 text-signal" />
                  <h3 className="mt-5 text-sm font-semibold">{String(title)}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{String(text)}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        <section id="faq" className="border-t border-border bg-card/50 py-28">
          <motion.div
            {...reveal}
            className="mx-auto grid max-w-5xl gap-12 px-4 md:grid-cols-[.65fr_1.35fr] md:px-8"
          >
            <div>
              <p className="font-mono text-[10px] uppercase text-primary">FAQ</p>
              <h2 className="font-display mt-4 text-4xl font-semibold">
                Clear answers. No fine print.
              </h2>
            </div>
            <Accordion type="single" collapsible>
              {faqs.map(([q, a], index) => (
                <AccordionItem key={q} value={`item-${index}`}>
                  <AccordionTrigger className="text-base hover:no-underline">{q}</AccordionTrigger>
                  <AccordionContent className="leading-6 text-muted-foreground">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </section>
      </main>
      <footer className="relative z-10 border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:px-8">
          <Brand />
          <p className="text-xs text-muted-foreground md:ml-auto">Agent spending, under control.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">Enter control room</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
