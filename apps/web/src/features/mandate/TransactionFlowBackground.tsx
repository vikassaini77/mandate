import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useMandateStore } from "./store";

type FlowDensity = "ambient" | "quiet";
type FlowNode = {
  x: number;
  y: number;
  speed: number;
  radius: number;
  phase: number;
  verdict: 0 | 1 | 2;
  flash: number;
};
type FlowPalette = { node: string; line: string; approve: string; escalate: string; block: string };

const MAX_FPS_INTERVAL = 1000 / 60;
const GATE_POSITIONS = [0.34, 0.68];

function readPalette(): FlowPalette {
  const styles = getComputedStyle(document.documentElement);
  return {
    node: styles.getPropertyValue("--flow-node").trim(),
    line: styles.getPropertyValue("--flow-gate").trim(),
    approve: styles.getPropertyValue("--safe").trim(),
    escalate: styles.getPropertyValue("--warning").trim(),
    block: styles.getPropertyValue("--danger").trim(),
  };
}

export function TransactionFlowBackground({ density = "ambient" }: { density?: FlowDensity }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const intensity = useMandateStore((s) => s.intensity[0]);
  const intensityFactor = intensity / 100;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const lowPower =
      (typeof memory === "number" && memory <= 4) || (typeof cores === "number" && cores <= 4);
    if (reducedMotion.matches || lowPower) {
      setFallback(true);
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = 0;
    let palette = readPalette();
    let nodes: FlowNode[] = [];
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let hidden = document.hidden;

    const makeNode = (index: number, count: number): FlowNode => ({
      x: ((index * 0.61803398875) % 1) * width,
      y: (0.08 + ((index * 0.38196601125) % 0.84)) * height,
      speed: 7 + (index % 7) * 1.55,
      radius: 0.7 + (index % 4) * 0.3,
      phase: (index / Math.max(count, 1)) * Math.PI * 2,
      verdict: (index % 13 === 0 ? 2 : index % 7 === 0 ? 1 : 0) as 0 | 1 | 2,
      flash: 0,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mobile = width < 768;
      const baseCount = mobile ? 18 : width < 1280 ? 29 : 40;
      const count = density === "quiet" ? Math.round(baseCount * 0.58) : baseCount;
      nodes = Array.from({ length: count }, (_, index) => makeNode(index, count));
      palette = readPalette();
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = (event.clientX / Math.max(width, 1) - 0.5) * 8;
      targetY = (event.clientY / Math.max(height, 1) - 0.5) * 6;
    };
    const onVisibilityChange = () => {
      hidden = document.hidden;
      if (!hidden) {
        lastFrame = performance.now();
        frame = window.requestAnimationFrame(draw);
      } else {
        window.cancelAnimationFrame(frame);
      }
    };
    const onThemeChange = () => {
      palette = readPalette();
    };
    const observer = new MutationObserver(onThemeChange);

    const draw = (now: number) => {
      if (hidden) return;
      const elapsed = now - lastFrame;
      if (elapsed < MAX_FPS_INTERVAL) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      const delta = Math.min(elapsed / 1000, 0.04);
      lastFrame = now - (elapsed % MAX_FPS_INTERVAL);
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      context.clearRect(0, 0, width, height);

      context.save();
      context.translate(pointerX, pointerY);
      context.globalAlpha = density === "quiet" ? 0.34 : 0.52;
      context.strokeStyle = palette.line;
      context.lineWidth = 0.65;
      context.setLineDash([2, 9]);
      for (const gate of GATE_POSITIONS) {
        const gateX = width * gate;
        context.beginPath();
        context.moveTo(gateX, -12);
        context.lineTo(gateX, height + 12);
        context.stroke();
      }
      context.setLineDash([]);

      for (const node of nodes) {
        const priorX = node.x;
        // scale speed by intensityFactor (1.0 = 100%)
        node.x += node.speed * delta * (intensityFactor * 2);
        node.y += Math.sin(now * 0.00032 + node.phase) * delta * 1.5 * (intensityFactor * 2);
        for (const gate of GATE_POSITIONS) {
          const gateX = width * gate;
          if (priorX < gateX && node.x >= gateX) node.flash = 1;
        }
        if (node.x > width + 18) {
          node.x = -18;
          node.y = (0.07 + ((node.phase * 0.159) % 0.86)) * height;
          node.flash = 0;
        }
        node.flash = Math.max(0, node.flash - delta * 1.8);
        const verdictColor =
          node.verdict === 0
            ? palette.approve
            : node.verdict === 1
              ? palette.escalate
              : palette.block;
        const color = node.flash > 0 ? verdictColor : palette.node;
        context.globalAlpha = (density === "quiet" ? 0.24 : 0.38) + node.flash * 0.48;
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 3 + node.flash * 11;
        context.beginPath();
        context.arc(node.x, node.y, node.radius + node.flash * 0.8, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      frame = window.requestAnimationFrame(draw);
    };

    resize();
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [density, intensityFactor]);

  return (
    <div
      aria-hidden
      className={cn(
        "transaction-flow pointer-events-none fixed inset-0 z-0 overflow-hidden",
        fallback && "transaction-flow-static",
      )}
      style={{ opacity: Math.max(0.05, intensityFactor) }}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "size-full transition-opacity duration-500",
          fallback ? "opacity-0" : "opacity-100",
        )}
      />
    </div>
  );
}
