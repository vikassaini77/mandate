import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, ScanFace, Lock, Unlock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BiometricModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  actionText?: string;
}

export function BiometricModal({
  open,
  onOpenChange,
  onVerified,
  actionText = "AUTHORIZE TRANSACTION",
}: BiometricModalProps) {
  const [phase, setPhase] = useState<"idle" | "scanning" | "verified">("idle");
  const [progress, setProgress] = useState(0);

  const handleAuthorize = async () => {
    try {
      if (window.PublicKeyCredential) {
        // Trigger actual native biometric prompt (TouchID / Windows Hello)
        const publicKey = {
          challenge: new Uint8Array([117, 61, 252, 231, 191, 241, 234, 137, 246, 219, 138, 203, 9, 212, 198, 172]),
          rp: { name: "Mandate Control Room" },
          user: {
            id: new Uint8Array([79, 252, 83, 72, 214, 7, 89, 26]),
            name: "operator@mandate.system",
            displayName: "Operator",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: { authenticatorAttachment: "platform" },
          timeout: 60000,
        };
        await navigator.credentials.create({ publicKey });
      }
    } catch (error) {
      console.warn("Biometric verification cancelled or failed:", error);
      return; // Do not proceed if they cancel the native prompt
    }

    setPhase("scanning");
  };

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setProgress(0);
    }
  }, [open]);

  useEffect(() => {
    if (phase === "scanning") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setPhase("verified");
            setTimeout(() => {
              onVerified();
              onOpenChange(false);
            }, 600);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, onVerified, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0, ease: "linear" }}
        className="relative w-full max-w-md border border-[#2A2A2A] bg-[#121212] p-8 shadow-2xl overflow-hidden font-mono text-[#EAEAEA]"
      >
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 size-2 border-t-2 border-l-2 border-[#FF0000]" />
        <div className="absolute top-0 right-0 size-2 border-t-2 border-r-2 border-[#FF0000]" />
        <div className="absolute bottom-0 left-0 size-2 border-b-2 border-l-2 border-[#FF0000]" />
        <div className="absolute bottom-0 right-0 size-2 border-b-2 border-r-2 border-[#FF0000]" />

        <div className="mb-6 flex items-center gap-3 border-b border-[#2A2A2A] pb-4">
          <AlertTriangle className="size-5 text-[#FF0000]" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#FF0000]">
            Identity Verification
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative mb-8">
            {phase === "verified" ? (
              <Unlock className="size-16 text-[#00FF00]" />
            ) : (
              <Lock className="size-16 text-muted-foreground" />
            )}
            
            {phase === "scanning" && (
              <motion.div
                className="absolute inset-0 border-2 border-[#FF0000]"
                animate={{
                  opacity: [0, 1, 0],
                  scale: [1, 1.2, 1.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </div>

          <p className="mb-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
            {phase === "idle" && "Awaiting hardware key or biometric signature"}
            {phase === "scanning" && "Verifying operator identity..."}
            {phase === "verified" && "Clearance granted."}
          </p>

          <div className="h-1 w-full bg-[#050505] overflow-hidden border border-[#2A2A2A]">
            <motion.div
              className={cn("h-full", phase === "verified" ? "bg-[#00FF00]" : "bg-[#FF0000]")}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div className="mt-2 flex w-full justify-between text-[10px] text-muted-foreground">
            <span>SYS.VERIFY</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 border border-[#2A2A2A] bg-[#050505] py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-[#2A2A2A] hover:text-[#EAEAEA] transition-none disabled:opacity-50"
            disabled={phase !== "idle"}
          >
            Abort
          </button>
          <button
            onClick={handleAuthorize}
            className={cn(
              "flex-1 border border-[#FF0000] bg-[#FF0000]/10 py-3 text-xs font-bold uppercase tracking-widest text-[#FF0000] hover:bg-[#FF0000] hover:text-[#050505] transition-none disabled:opacity-50",
              phase === "verified" && "border-[#00FF00] bg-[#00FF00]/10 text-[#00FF00]"
            )}
            disabled={phase !== "idle"}
          >
            {phase === "verified" ? "Authorized" : actionText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
