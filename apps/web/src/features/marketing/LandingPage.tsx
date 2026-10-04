import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Check,
  CreditCard,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
    icon: Zap,
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

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#EAEAEA] font-mono selection:bg-[#FF0000] selection:text-white">
      {/* Telemetry Top Bar */}
      <div className="fixed top-0 inset-x-0 h-8 border-b border-[#2A2A2A] bg-[#050505] z-50 flex items-center px-4 overflow-hidden text-[10px] uppercase tracking-widest text-[#EAEAEA]/50">
        <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap">
          SYSTEM_STATUS: ONLINE &bull; REGION: US-EAST-1 &bull; LATENCY: 12MS &bull; POLICY_ENGINE: ACTIVE &bull; DLQ: 0 &bull; SYSTEM_STATUS: ONLINE &bull; REGION: US-EAST-1 &bull; LATENCY: 12MS &bull; POLICY_ENGINE: ACTIVE &bull; DLQ: 0 &bull; SYSTEM_STATUS: ONLINE &bull; REGION: US-EAST-1 &bull; LATENCY: 12MS &bull; POLICY_ENGINE: ACTIVE &bull; DLQ: 0
        </div>
      </div>

      <header className="fixed inset-x-0 top-8 z-40 border-b border-[#2A2A2A] bg-[#050505]">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 md:px-8">
          <Brand />
          <nav className="ml-auto hidden items-center gap-7 text-xs text-[#EAEAEA]/70 md:flex">
            <a href="#how" className="hover:text-white hover:bg-[#FF0000] px-2 py-1 transition-none uppercase">
              How it works
            </a>
            <a href="#security" className="hover:text-white hover:bg-[#FF0000] px-2 py-1 transition-none uppercase">
              Security
            </a>
            <a href="#faq" className="hover:text-white hover:bg-[#FF0000] px-2 py-1 transition-none uppercase">
              FAQ
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-8">
            <Link to="/auth" className="px-4 py-2 text-xs border border-[#2A2A2A] hover:bg-[#EAEAEA] hover:text-black transition-none uppercase">
              Sign in
            </Link>
            <Link to="/auth" search={{ mode: "signup" }} className="px-4 py-2 text-xs bg-[#EAEAEA] text-black hover:bg-[#FF0000] hover:text-white transition-none uppercase flex items-center gap-2">
              Start free <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-24">
        {/* Grid Background overlay */}
        <div className="fixed inset-0 pointer-events-none border-[#2A2A2A] opacity-20" 
             style={{ backgroundImage: 'linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

        {/* Hero Section */}
        <section className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-0 border-x border-[#2A2A2A] lg:grid-cols-[1.2fr_0.8fr] bg-[#050505]">
          <div className="p-12 border-b lg:border-b-0 lg:border-r border-[#2A2A2A] h-full flex flex-col justify-center">
            <div className="mb-8 inline-flex items-center gap-2 border border-[#FF0000] bg-[#FF0000]/10 px-3 py-2 text-[10px] uppercase text-[#FF0000]">
              <span className="size-2 rounded-none bg-[#FF0000]" /> POLICY GATE ONLINE
            </div>
            <h1 className="font-serif text-6xl lg:text-8xl font-normal leading-[0.9] text-white tracking-tighter uppercase mb-8">
              Let your agent spend.<br />
              <span className="text-[#FF0000]">Never lose control.</span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-[#EAEAEA]/70 uppercase">
              A trust layer for AI shopping agents. Set intent in plain English, enforce it before payment, and know why every dollar moved.
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link to="/auth" search={{ mode: "signup" }} className="px-8 py-4 bg-[#EAEAEA] text-black hover:bg-[#FF0000] hover:text-white transition-none uppercase text-sm font-bold flex items-center gap-2 border border-[#EAEAEA]">
                Create your mandate <ArrowRight className="size-4" />
              </Link>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-4 border-t border-[#2A2A2A] pt-8">
              <div>
                <div className="text-[10px] text-[#EAEAEA]/50 uppercase">Architecture</div>
                <div className="mt-1 text-xs text-[#FF0000]">Deterministic controls</div>
              </div>
              <div>
                <div className="text-[10px] text-[#EAEAEA]/50 uppercase">Network</div>
                <div className="mt-1 text-xs">PayPal Sandbox</div>
              </div>
              <div>
                <div className="text-[10px] text-[#EAEAEA]/50 uppercase">Compliance</div>
                <div className="mt-1 text-xs">Audit-ready</div>
              </div>
            </div>
          </div>

          <div className="p-8 h-full bg-[#121212] relative flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-2 border-b border-l border-[#2A2A2A] text-[9px] text-[#FF0000] bg-[#050505]">
              LIVE_STREAM_FEED
            </div>
            <div className="border border-[#2A2A2A] bg-[#050505] p-6">
              <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase text-[#EAEAEA]/50">Target Entity</p>
                  <p className="text-xs">Autonomous procurement agent</p>
                </div>
                <span className="flex items-center gap-2 text-[10px] text-[#FF0000]">
                  ENFORCING <span className="size-2 bg-[#FF0000] animate-pulse" />
                </span>
              </div>
              
              <div className="space-y-0 border border-[#2A2A2A] divide-y divide-[#2A2A2A]">
                {decisions.map((item, index) => (
                  <div key={item.merchant} className="flex items-center justify-between p-3 hover:bg-[#121212] transition-none group cursor-crosshair">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-[#EAEAEA]/30">0{index + 1}</span>
                      <div>
                        <div className="text-xs font-bold uppercase group-hover:text-[#FF0000] transition-none">{item.merchant}</div>
                        <div className="text-[10px] text-[#EAEAEA]/50 uppercase">{item.detail}</div>
                      </div>
                    </div>
                    <div className="border border-[#2A2A2A] px-2 py-1 text-[9px] uppercase bg-[#121212] group-hover:bg-[#EAEAEA] group-hover:text-black transition-none">
                      {item.verdict}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 divide-x divide-[#2A2A2A] border border-[#2A2A2A] text-center">
                <div className="p-3 bg-[#121212]">
                  <div className="text-lg text-white">4.2ms</div>
                  <div className="text-[9px] text-[#EAEAEA]/50 mt-1">AVG VERDICT</div>
                </div>
                <div className="p-3 bg-[#121212]">
                  <div className="text-lg text-white">98.4%</div>
                  <div className="text-[9px] text-[#EAEAEA]/50 mt-1">AUTOMATED</div>
                </div>
                <div className="p-3 bg-[#121212]">
                  <div className="text-lg text-white">100%</div>
                  <div className="text-[9px] text-[#EAEAEA]/50 mt-1">LOGGED</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="mx-auto max-w-7xl border-x border-b border-[#2A2A2A] bg-[#050505]">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#2A2A2A]">
            {[
              ["$2.8M", "spend governed"],
              ["1.2M", "policy decisions"],
              ["99.998%", "gate uptime"],
              ["0", "unlogged payments"],
            ].map(([value, label]) => (
              <div key={label} className="p-8 text-center hover:bg-[#EAEAEA] hover:text-black transition-none group">
                <p className="text-3xl font-serif text-white group-hover:text-black transition-none">{value}</p>
                <p className="mt-2 text-[10px] uppercase text-[#EAEAEA]/50 group-hover:text-black/70 transition-none">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Gap */}
        <section className="mx-auto max-w-7xl border-x border-b border-[#2A2A2A] bg-[#121212] p-12 lg:p-24">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <div className="text-[10px] uppercase text-[#FF0000] mb-4">The trust gap</div>
              <h2 className="font-serif text-4xl lg:text-5xl text-white uppercase leading-tight">
                Agents can transact faster than teams can supervise.
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="border-t-2 border-[#2A2A2A] pt-4">
                <p className="text-sm uppercase text-[#EAEAEA]/50 mb-4">Before</p>
                <p className="text-xs leading-relaxed">
                  Loose prompts, binary permissions, and explanations written after the money moves.
                </p>
              </div>
              <div className="border-t-2 border-[#FF0000] pt-4">
                <p className="text-sm uppercase text-[#FF0000] mb-4">With Mandate</p>
                <p className="text-xs leading-relaxed text-white">
                  Explicit intent, deterministic checks, human escalation, and a signed reason for every outcome.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Four Moves */}
        <section id="how" className="mx-auto max-w-7xl border-x border-b border-[#2A2A2A] bg-[#050505]">
          <div className="p-12 lg:p-24 border-b border-[#2A2A2A]">
            <div className="text-[10px] uppercase text-[#EAEAEA]/50 mb-4">Four controlled moves</div>
            <h2 className="font-serif text-4xl lg:text-5xl text-white uppercase leading-tight max-w-2xl">
              From intent to payment, every step has a boundary.
            </h2>
          </div>
          <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#2A2A2A]">
            {steps.map((step, index) => (
              <div key={step.title} className="p-8 hover:bg-[#121212] transition-none group">
                <div className="flex justify-between items-start mb-12">
                  <step.icon className="size-6 text-[#EAEAEA]/30 group-hover:text-[#FF0000] transition-none" />
                  <span className="text-[10px] text-[#EAEAEA]/30">0{index + 1}</span>
                </div>
                <h3 className="text-sm uppercase text-white font-bold mb-4">{step.title}</h3>
                <p className="text-xs leading-relaxed text-[#EAEAEA]/70">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mx-auto max-w-7xl border-x border-b border-[#2A2A2A] bg-[#121212] grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#2A2A2A]">
          <div className="p-12 lg:p-24">
            <ShieldCheck className="size-12 text-[#FF0000] mb-8" />
            <h2 className="font-serif text-4xl text-white uppercase leading-tight mb-6">
              Trust is an architecture, not a promise.
            </h2>
            <p className="text-xs leading-relaxed text-[#EAEAEA]/70">
              Rules are evaluated before payment. Exceptions require a human. Every result stays attributable and inspectable.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2A2A2A]">
            <div className="grid grid-rows-2 divide-y divide-[#2A2A2A]">
              <div className="p-8 hover:bg-[#050505] transition-none">
                <LockKeyhole className="size-5 text-[#EAEAEA]/50 mb-4" />
                <h3 className="text-xs uppercase text-white font-bold mb-2">Policy-first payment</h3>
                <p className="text-[10px] text-[#EAEAEA]/50">No authorization is issued before a verdict.</p>
              </div>
              <div className="p-8 hover:bg-[#050505] transition-none">
                <Zap className="size-5 text-[#EAEAEA]/50 mb-4" />
                <h3 className="text-xs uppercase text-white font-bold mb-2">Deterministic engine</h3>
                <p className="text-[10px] text-[#EAEAEA]/50">The same facts always produce the same result.</p>
              </div>
            </div>
            <div className="grid grid-rows-2 divide-y divide-[#2A2A2A]">
              <div className="p-8 hover:bg-[#050505] transition-none">
                <Fingerprint className="size-5 text-[#EAEAEA]/50 mb-4" />
                <h3 className="text-xs uppercase text-white font-bold mb-2">Human checkpoints</h3>
                <p className="text-[10px] text-[#EAEAEA]/50">Uncertain requests stop at the gate.</p>
              </div>
              <div className="p-8 hover:bg-[#050505] transition-none">
                <ShieldCheck className="size-5 text-[#EAEAEA]/50 mb-4" />
                <h3 className="text-xs uppercase text-white font-bold mb-2">Complete audit trail</h3>
                <p className="text-[10px] text-[#EAEAEA]/50">Inputs, rules, reasons, and outcomes stay linked.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-7xl border-x border-b border-[#2A2A2A] bg-[#050505]">
          <div className="grid lg:grid-cols-[1fr_2fr] divide-y lg:divide-y-0 lg:divide-x divide-[#2A2A2A]">
            <div className="p-12 lg:p-24">
              <div className="text-[10px] uppercase text-[#FF0000] mb-4">FAQ</div>
              <h2 className="font-serif text-4xl text-white uppercase leading-tight">
                Clear answers.<br/>No fine print.
              </h2>
            </div>
            <div className="p-12 lg:p-24">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map(([q, a], index) => (
                  <AccordionItem key={q} value={`item-${index}`} className="border border-[#2A2A2A] bg-[#121212] data-[state=open]:border-[#FF0000] rounded-none">
                    <AccordionTrigger className="text-xs uppercase text-white hover:no-underline hover:bg-[#EAEAEA] hover:text-black p-6 transition-none [&>svg]:text-inherit rounded-none">
                      {q}
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-0 text-xs text-[#EAEAEA]/70 leading-relaxed rounded-none">
                      {a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#2A2A2A] bg-[#050505] py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 md:flex-row md:items-center md:px-8 uppercase text-[10px]">
          <Brand />
          <div className="flex items-center gap-4 text-[#EAEAEA]/50 md:ml-auto">
            <span>Agent spending, under control.</span>
            <span>&bull;</span>
            <a href="https://github.com/Sakshamp19" target="_blank" rel="noreferrer" className="hover:text-white transition-none">
              Built by Saksham & Vikas
            </a>
          </div>
          <Link to="/auth" className="px-4 py-2 border border-[#2A2A2A] hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] transition-none">
            Enter control room
          </Link>
        </div>
      </footer>
      
      {/* Global CSS Overrides for Brutalist Style */}
      <style dangerouslySetInnerHTML={{__html: `
        html { scroll-behavior: smooth; }
        .rounded-md, .rounded-lg, .rounded-full, .rounded, [data-radix-collection-item] {
          border-radius: 0 !important;
        }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
