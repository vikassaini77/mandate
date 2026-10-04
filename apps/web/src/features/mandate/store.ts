import { create } from "zustand";
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

interface MandateState {
  mandates: Mandate[];
  requests: PurchaseRequest[];
  addMandate: (text: string, limit: number) => void;
  resolveRequest: (id: string, status: Exclude<RequestStatus, "pending">) => void;
  toggleMandate: (id: string) => void;
}

export const useMandateStore = create<MandateState>((set) => ({
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
}));
