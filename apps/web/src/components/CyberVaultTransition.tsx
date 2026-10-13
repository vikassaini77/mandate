import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface CyberVaultTransitionProps {
  active: boolean;
  title?: string;
  onComplete?: () => void;
  durationMs?: number;
}

const MandateShield = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M20 4L6 11V29L20 36L34 29V11L20 4Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M6 11L20 19L34 11"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M20 19V36"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M20 4V19"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      className="opacity-30"
    />
    <circle cx="20" cy="19" r="2.8" fill="currentColor" />
  </svg>
);

export function CyberVaultTransition({
  active,
  title = "Authenticating session...",
  onComplete,
  durationMs = 1100,
}: CyberVaultTransitionProps) {
  const [phase, setPhase] = useState<"verifying" | "ready">("verifying");

  useEffect(() => {
    if (!active) {
      setPhase("verifying");
      return;
    }

    const timer1 = setTimeout(() => {
      setPhase("ready");
    }, durationMs * 0.7);

    const timer2 = setTimeout(() => {
      onComplete?.();
    }, durationMs);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [active, durationMs, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md font-mono select-none"
        >
          {/* Subtle Centered Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative flex flex-col items-center px-8 py-7 rounded-xl bg-[#0C0C0C]/90 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-xs w-full text-center overflow-hidden"
          >
            {/* Soft Ambient Breathing Glow behind Logo */}
            <motion.div
              animate={{
                scale: [0.9, 1.25, 0.9],
                opacity: [0.35, 0.65, 0.35],
              }}
              transition={{
                duration: 1.8,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="absolute top-10 size-24 rounded-full bg-[#FF0000]/30 blur-2xl pointer-events-none"
            />

            {/* Logo with Soft Ring */}
            <div className="relative size-14 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-white mb-4 shadow-inner">
              {/* Delicate Spinning Border Ring */}
              <div className="absolute -inset-[3px] rounded-lg border border-transparent border-t-[#FF0000] border-r-[#FF0000]/30 animate-spin" />
              <MandateShield className="size-7 text-white" />
            </div>

            {/* Clean Monospace Status */}
            <p className="text-xs font-semibold text-white tracking-wide">
              {phase === "ready" ? "Access granted" : title}
            </p>
            <p className="text-[10px] text-white/40 tracking-wider uppercase mt-1">
              {phase === "ready" ? "Entering Control Room..." : "Verifying Mandate Policy"}
            </p>

            {/* Subtle Slim Progress Hairline */}
            <div className="w-32 h-[2px] bg-white/10 rounded-full mt-4 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: durationMs / 1000, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-[#FF0000] to-red-400"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
