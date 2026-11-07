import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mandateApi } from "./api";
import type { Mandate } from "./mock";

export type { Mandate } from "./mock";

export type Decision = "approved" | "review" | "blocked";
export type RequestStatus = "pending" | "approved" | "blocked";

export interface PurchaseRequest {
  id: string;
  merchant: string;
  item: string;
  amount: number;
  time: string;
  reason: string;
  status: RequestStatus;
  confidence: number;
  paypal_order_id?: string;
  resolved_at?: string;
}

export interface TransactionRecord {
  id: string;
  merchant: string;
  item: string;
  amount: number;
  category?: string;
  status: "completed" | "pending" | "refunded" | "denied";
  verdict?: string;
  ruleId?: string;
  reason?: string;
  paypalOrderId?: string;
  paypalApproveLink?: string;
  date?: string;
  mandate?: string;
  refunded?: number;
  employee?: string;
}

const defaultRequests: PurchaseRequest[] = [
  {
    id: "req-1",
    merchant: "Linear",
    item: "Business workspace · 12 seats",
    amount: 192,
    time: "2 min ago",
    reason: "Annual billing conflicts with mandate m-1",
    status: "pending",
    confidence: 94,
  },
  {
    id: "req-2",
    merchant: "B&H Photo",
    item: "Logitech Brio 4K webcam",
    amount: 149,
    time: "18 min ago",
    reason: "Price is within threshold; new merchant requires review",
    status: "pending",
    confidence: 87,
  },
  {
    id: "req-3",
    merchant: "Dell Technologies",
    item: "PowerEdge R750 Rack Server",
    amount: 8500,
    time: "32 min ago",
    reason: "High-value purchase exceeds $5,000 threshold. Quorum required.",
    status: "pending",
    confidence: 60,
  },
];

const defaultTransactions: TransactionRecord[] = [
  {
    id: "4KJ92163MR782114A",
    merchant: "Notion",
    item: "Team workspace · monthly",
    amount: 80,
    status: "completed",
    category: "Software",
    verdict: "APPROVE",
    ruleId: "MND-AUTO-01",
    date: "Oct 3, 2026 · 10:31",
  },
  {
    id: "9PL21094JS334211B",
    merchant: "Figma",
    item: "Professional annual · 2 seats",
    amount: 288,
    status: "completed",
    category: "Software",
    verdict: "APPROVE",
    ruleId: "MND-AUTO-01",
    date: "Oct 2, 2026 · 14:05",
  },
  {
    id: "1AB88231KL902341C",
    merchant: "Apple Store",
    item: "MacBook Pro 16 M3 Max",
    amount: 3499,
    status: "denied",
    category: "Hardware",
    verdict: "BLOCK",
    ruleId: "MND-MAX-CAP",
    reason: "Exceeds daily auto-spend cap ($1,000).",
    date: "Sep 28, 2026 · 11:22",
  },
];

interface MandateState {
  mandates: Mandate[];
  requests: PurchaseRequest[];
  transactions: TransactionRecord[];
  autoApproveLimit: number;
  dailySpendCap: number;
  monthlyCap: number;
  activeView: string;
  setActiveView: (view: string) => void;
  setLimits: (limits: { autoApproveLimit?: number; dailySpendCap?: number; monthlyCap?: number }) => void;
  addRequest: (request: { id?: string; merchant: string; item: string; amount: number; reason?: string }) => void;
  addTransaction: (tx: Partial<TransactionRecord> & { id: string; merchant: string; item: string; amount: number }) => void;
  completeTransaction: (id: string, paypalOrderId?: string) => void;
  localAI: boolean;
  setLocalAI: (enabled: boolean) => void;
  addMandate: (text: string, limit: number) => void;
  resolveRequest: (id: string, status: Exclude<RequestStatus, "pending">) => void;
  setRequests: (requests: PurchaseRequest[]) => void;
  fetchRequests: () => Promise<void>;
  resetRequests: () => Promise<void>;
  toggleMandate: (id: string) => void;
  theme: "Dark" | "Light" | "System";
  setTheme: (theme: "Dark" | "Light" | "System") => void;
  accent: string;
  setAccent: (accent: string) => void;
  intensity: number[];
  setIntensity: (intensity: number[]) => void;
}

export const useMandateStore = create<MandateState>()(
  persist(
    (set) => ({
      autoApproveLimit: 300,
      dailySpendCap: 1000,
      monthlyCap: 5000,
      activeView: "dashboard",
      setActiveView: (activeView) => set({ activeView }),
      setLimits: (limits) => set((state) => ({ ...state, ...limits })),
      addRequest: (request) =>
        set((state) => ({
          requests: [
            {
              id: request.id || `appr_${Date.now()}`,
              merchant: request.merchant,
              item: request.item,
              amount: request.amount,
              time: "Just now",
              reason: request.reason || "Escalated to human-in-the-loop approval queue.",
              status: "pending",
              confidence: 92,
            },
            ...(state.requests || []),
          ],
        })),
      localAI: false,
      setLocalAI: (enabled) => set({ localAI: enabled }),
      theme: "Dark",
      setTheme: (theme) => set({ theme }),
      accent: "#FF0000",
      setAccent: (accent) => set({ accent }),
      intensity: [35],
      setIntensity: (intensity) => set({ intensity }),
      mandates: [
        {
          id: "m-1",
          version: 4,
          rawText: "Buy developer tools up to $500/month. Never buy annual plans.",
          rules: {
            monthlyCap: 500,
            autoApproveLimit: 100,
            categories: ["Software", "Developer tools"],
            blockedMerchants: [],
            maxPerDay: 3,
          },
          status: "active",
        },
        {
          id: "m-2",
          version: 2,
          rawText: "Restock office essentials under $150 per order from trusted vendors.",
          rules: {
            monthlyCap: 600,
            autoApproveLimit: 150,
            categories: ["Office", "Electronics"],
            blockedMerchants: ["Unknown vendor"],
            maxPerDay: 5,
          },
          status: "active",
        },
      ],
      requests: defaultRequests,
      transactions: defaultTransactions,
      setRequests: (requests) => set({ requests }),
      fetchRequests: async () => {
        try {
          const res = await mandateApi.getApprovalQueue();
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            set({ requests: res.data as PurchaseRequest[] });
          }
        } catch (e) {
          console.warn("Could not sync approval requests from backend:", e);
        }
      },
      resetRequests: async () => {
        try {
          const BACKEND_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");
          await fetch(`${BACKEND_URL}/api/v1/approvals/reset`, {
            method: "POST",
            headers: { "X-API-Key": "dev-agent-key-123" },
          });
        } catch {}
        set({ requests: defaultRequests });
      },
      addTransaction: (tx) =>
        set((state) => ({
          transactions: [
            {
              id: tx.id,
              merchant: tx.merchant,
              item: tx.item,
              amount: tx.amount,
              category: tx.category || "General",
              status: tx.status || "completed",
              verdict: tx.verdict || "APPROVE",
              ruleId: tx.ruleId || "MND-HITL-001",
              reason: tx.reason || "Authorized by manager via Approvals Center.",
              paypalOrderId: tx.paypalOrderId,
              paypalApproveLink: tx.paypalApproveLink,
              date: tx.date || "Just now",
            },
            ...(state.transactions || []).filter((t) => t.id !== tx.id),
          ],
        })),
      completeTransaction: (id, paypalOrderId) =>
        set((state) => ({
          transactions: (state.transactions || []).map((tx) =>
            tx.id === id || tx.paypalOrderId === id || (paypalOrderId && tx.id === paypalOrderId)
              ? { ...tx, status: "completed", ...(paypalOrderId ? { paypalOrderId } : {}) }
              : tx,
          ),
        })),
      addMandate: (text, limit) =>
        set((state) => ({
          mandates: [
            {
              id: `m-${Date.now()}`,
              version: 1,
              rawText: text,
              rules: {
                monthlyCap: limit,
                autoApproveLimit: Math.min(limit, 100),
                categories: ["General"],
                blockedMerchants: [],
                maxPerDay: 3,
              },
              status: "active",
            },
            ...(state.mandates || []),
          ],
        })),
      resolveRequest: (id, status) =>
        set((state) => ({
          requests: (state.requests || []).map((request) =>
            request.id === id ? { ...request, status } : request,
          ),
        })),
      toggleMandate: (id) =>
        set((state) => ({
          mandates: (state.mandates || []).map((mandate) =>
            mandate.id === id
              ? { ...mandate, status: mandate.status === "active" ? "paused" : "active" }
              : mandate,
          ),
        })),
    }),
    {
      name: "mandate-app-store",
      partialize: (state) => ({
        theme: state.theme,
        accent: state.accent,
        intensity: state.intensity,
        localAI: state.localAI,
        mandates: state.mandates,
        requests: state.requests,
        transactions: state.transactions,
        autoApproveLimit: state.autoApproveLimit,
        dailySpendCap: state.dailySpendCap,
        monthlyCap: state.monthlyCap,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...((persistedState as any) || {}),
        transactions: ((persistedState as any)?.transactions && Array.isArray((persistedState as any).transactions))
          ? (persistedState as any).transactions
          : currentState.transactions || defaultTransactions,
        requests: ((persistedState as any)?.requests && Array.isArray((persistedState as any).requests))
          ? (persistedState as any).requests
          : currentState.requests || defaultRequests,
      }),
    },
  ),
);
