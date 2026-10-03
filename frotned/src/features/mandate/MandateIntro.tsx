import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SESSION_KEY = "mandate:intro-seen";
const particles = [
  [9, 19, 0],
  [16, 72, 1],
  [24, 36, 2],
  [31, 84, 3],
  [39, 13, 4],
  [46, 62, 5],
  [57, 27, 6],
  [64, 79, 7],
  [71, 42, 8],
  [79, 16, 9],
  [87, 66, 10],
  [92, 35, 11],
] as const;

export function MandateIntro({ onComplete }: { onComplete: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [skipVisible, setSkipVisible] = useState(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "true");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      onComplete();
      return;
    }
    const skipTimer = window.setTimeout(() => setSkipVisible(true), 800);
    const context = gsap.context(() => {
      if (reducedMotion) {
        gsap.set("[data-intro-static]", { opacity: 1, scale: 1 });
        gsap.set("[data-intro-static] [data-tagline]", { opacity: 1, y: 0 });
        gsap.to(rootRef.current, { opacity: 0, duration: 0.3, delay: 0.65, onComplete: finish });
        return;
      }
      gsap
        .timeline({ defaults: { ease: "power3.inOut" }, onComplete: finish })
        .fromTo(
          "[data-particle]",
          {
            opacity: 0,
            scale: 0,
            x: () => gsap.utils.random(-30, 30),
            y: () => gsap.utils.random(-24, 24),
          },
          {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            stagger: 0.045,
            duration: 0.65,
            ease: "back.out(1.8)",
          },
        )
        .to("[data-particle]", {
          x: () => gsap.utils.random(-12, 12),
          y: () => gsap.utils.random(-10, 10),
          duration: 0.65,
          stagger: 0.02,
          ease: "sine.inOut",
        })
        .to("[data-gate]", { scaleY: 1, opacity: 1, duration: 0.65 }, 1.15)
        .to("[data-gate-sweep]", { yPercent: 210, duration: 0.8 }, 1.25)
        .to(
          "[data-particle]",
          {
            left: "50%",
            top: (_, target: HTMLElement) =>
              `${42 + (Number(target.dataset["particle"]) % 4) * 6}%`,
            duration: 0.85,
            stagger: 0.025,
          },
          1.85,
        )
        .to("[data-verdict='approve']", { opacity: 1, y: 0, duration: 0.28 }, 2.55)
        .to("[data-verdict='escalate']", { opacity: 1, y: 0, duration: 0.28 }, 2.82)
        .to("[data-verdict='block']", { opacity: 1, y: 0, duration: 0.28 }, 3.09)
        .to(
          "[data-particle='2'], [data-particle='5'], [data-particle='8']",
          {
            backgroundColor: "var(--safe)",
            boxShadow: "0 0 22px var(--safe)",
            x: 130,
            duration: 0.55,
          },
          2.55,
        )
        .to(
          "[data-particle='4']",
          {
            backgroundColor: "var(--warning)",
            boxShadow: "0 0 24px var(--warning)",
            scale: 1.4,
            duration: 0.45,
          },
          2.8,
        )
        .to(
          "[data-particle='7']",
          {
            backgroundColor: "var(--danger)",
            boxShadow: "0 0 24px var(--danger)",
            scale: 0,
            rotation: 80,
            duration: 0.35,
          },
          3.08,
        )
        .to("[data-scene]", { opacity: 0, scale: 1.06, duration: 0.5 }, 3.45)
        .to("[data-wordmark]", { opacity: 1, scale: 1, duration: 0.55 }, 3.65)
        .fromTo(
          "[data-letter]",
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, stagger: 0.07, duration: 0.28, ease: "power2.out" },
          3.72,
        )
        .to("[data-tagline]", { opacity: 1, y: 0, duration: 0.45 }, 4.25)
        .to(rootRef.current, { opacity: 0, scale: 1.025, duration: 0.55, delay: 0.4 });
    }, rootRef);
    return () => {
      window.clearTimeout(skipTimer);
      context.revert();
    };
  }, [finish, onComplete, reducedMotion]);

  return (
    <motion.div
      ref={rootRef}
      className="intro-stage fixed inset-0 z-[100] overflow-hidden bg-ink text-ink-foreground"
    >
      <div
        data-intro-static
        className={cn("absolute inset-0 grid place-items-center", !reducedMotion && "opacity-0")}
      >
        <IntroWordmark />
      </div>
      {!reducedMotion && (
        <div data-scene className="absolute inset-0">
          <div className="intro-grid absolute inset-0" />
          {particles.map(([left, top, id]) => (
            <i
              key={id}
              data-particle={id}
              className="intro-particle absolute size-2 rounded-full"
              style={{ left: `${left}%`, top: `${top}%` }}
            />
          ))}
          <div
            data-gate
            className="intro-gate absolute left-1/2 top-[12%] h-[76%] w-px origin-top scale-y-0 opacity-0"
          >
            <div
              data-gate-sweep
              className="absolute -left-6 -top-1/2 h-28 w-12 bg-gradient-to-b from-transparent via-signal/80 to-transparent blur-md"
            />
          </div>
          <div className="absolute inset-x-0 top-[76%] flex justify-center gap-3 px-4 font-mono text-[9px] uppercase sm:gap-8">
            <Verdict
              data="approve"
              label="Approve"
              className="border-safe/40 bg-safe-soft text-safe"
            />
            <Verdict
              data="escalate"
              label="Escalate"
              className="border-warning/40 bg-warning-soft text-warning"
            />
            <Verdict
              data="block"
              label="Block"
              className="border-danger/40 bg-danger-soft text-danger"
            />
          </div>
        </div>
      )}
      {!reducedMotion && (
        <div data-wordmark className="absolute inset-0 grid scale-95 place-items-center opacity-0">
          <IntroWordmark />
        </div>
      )}
      <AnimatePresence>
        {skipVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-5 top-5 sm:right-8 sm:top-8"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={finish}
              className="border border-ink-border bg-ink/60 text-ink-muted backdrop-blur-md hover:bg-ink-border hover:text-ink-foreground"
            >
              Skip
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Verdict({ data, label, className }: { data: string; label: string; className: string }) {
  return (
    <span
      data-verdict={data}
      className={cn("translate-y-2 rounded-sm border px-3 py-2 opacity-0", className)}
    >
      {label}
    </span>
  );
}
function IntroWordmark() {
  return (
    <div className="flex flex-col items-center px-6 text-center">
      <div className="brand-gradient mb-6 h-px w-20" />
      <div className="flex font-display text-4xl font-semibold tracking-[.18em] sm:text-7xl">
        {"MANDATE".split("").map((letter, index) => (
          <span key={`${letter}-${index}`} data-letter>
            {letter}
          </span>
        ))}
      </div>
      <p data-tagline className="mt-5 translate-y-2 text-sm text-ink-muted opacity-0 sm:text-base">
        Let your agent spend. Never lose control.
      </p>
    </div>
  );
}
