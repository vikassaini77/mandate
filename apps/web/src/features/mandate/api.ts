import {
  activity,
  auditRecords,
  products,
  purchaseProposals,
  redTeamScenarios,
  spendData,
  type AuditRecord,
  type Product,
  type PurchaseProposal,
} from "./mock";

export interface MandateApi {
  getActivity(): Promise<typeof activity>;
  getAuditEvents(): Promise<AuditRecord[]>;
  getProducts(): Promise<Product[]>;
  getPurchaseProposals(): Promise<PurchaseProposal[]>;
  getRedTeamScenarios(): Promise<typeof redTeamScenarios>;
  getSpendSeries(): Promise<typeof spendData>;
}

const pause = (milliseconds = 220) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const mockApi: MandateApi = {
  async getActivity() {
    await pause();
    return activity;
  },
  async getAuditEvents() {
    await pause();
    return auditRecords;
  },
  async getProducts() {
    await pause();
    return products;
  },
  async getPurchaseProposals() {
    await pause();
    return purchaseProposals;
  },
  async getRedTeamScenarios() {
    await pause();
    return redTeamScenarios;
  },
  async getSpendSeries() {
    await pause();
    return spendData;
  },
};

const mocksEnabled = import.meta.env["VITE_USE_MOCKS"] !== "false";

const BACKEND_URL = "http://localhost:8000";

const realApi: MandateApi = {
  async getActivity() {
    const res = await fetch(`${BACKEND_URL}/api/activity`);
    return res.json();
  },
  async getAuditEvents() {
    const res = await fetch(`${BACKEND_URL}/api/audit-events`);
    return res.json();
  },
  async getProducts() {
    const res = await fetch(`${BACKEND_URL}/api/products`);
    return res.json();
  },
  async getPurchaseProposals() {
    const res = await fetch(`${BACKEND_URL}/api/purchase-proposals`);
    return res.json();
  },
  async getRedTeamScenarios() {
    const res = await fetch(`${BACKEND_URL}/api/red-team-scenarios`);
    return res.json();
  },
  async getSpendSeries() {
    const res = await fetch(`${BACKEND_URL}/api/spend-series`);
    return res.json();
  },
};

function createApiClient(): MandateApi {
  if (mocksEnabled) return mockApi;
  return realApi;
}

export const mandateApi = createApiClient();
