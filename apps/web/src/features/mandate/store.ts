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

interface MandateState {
  mandates: Mandate[];
  requests: PurchaseRequest[];
  autoApproveLimit: number;
  dailySpendCap: number;
  monthlyCap: number;
  activeView: string;
  setActiveView: (view: string) => void;
  setLimits: (limits: { autoApproveLimit?: number; dailySpendCap?: number; monthlyCap?: number }) => void;
  addRequest: (request: { id?: string; merchant: string; item: string; amount: number; reason?: string }) => void;
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

<<<<<<< HEAD
export const useMandateStore = create<MandateState>((set) => ({
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
        ...state.requests,
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
  requests: [
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
  ],
  addMandate: (text, limit) =>
    set((state) => ({
=======
export const useMandateStore = create<MandateState>()(
  persist(
    (set) => ({
      localAI: false,
      setLocalAI: (enabled) => set({ localAI: enabled }),
      theme: "Dark",
      setTheme: (theme) => set({ theme }),
      accent: "#FF0000",
      setAccent: (accent) => set({ accent }),
      intensity: [35],
      setIntensity: (intensity) => set({ intensity }),
>>>>>>> 8771a4c (Fix: Fixes in Approval, Agent Chat and Transations)
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
            ...state.mandates,
          ],
        })),
      resolveRequest: (id, status) =>
        set((state) => ({
          requests: state.requests.map((request) =>
            request.id === id ? { ...request, status } : request,
          ),
        })),
      toggleMandate: (id) =>
        set((state) => ({
          mandates: state.mandates.map((mandate) =>
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
      }),
    },
  ),
);
