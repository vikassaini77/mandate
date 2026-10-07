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
  getMandate(id: string): Promise<any>;
  killMandate(id: string): Promise<any>;
  activateMandate(id: string): Promise<any>;
  getApprovalQueue(): Promise<any>;
  approveTransaction(id: string): Promise<any>;
  denyTransaction(id: string): Promise<any>;
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
  async getMandate(id: string) { await pause(); return { is_active: true, kill_switch_engaged: false, trust_score: 100, rules: {} }; },
  async killMandate(id: string) { await pause(); return { status: 'success' }; },
  async activateMandate(id: string) { await pause(); return { status: 'success' }; },
  async getApprovalQueue() { await pause(); return { data: [{id: 'appr_123', amount_cents: 250000, merchant: 'Apple', status: 'PENDING'}] }; },
  async approveTransaction(id: string) { await pause(); return { status: 'success' }; },
  async denyTransaction(id: string) { await pause(); return { status: 'success' }; },
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
  async getMandate(id: string) { await pause(); return { is_active: true, kill_switch_engaged: false, trust_score: 100, rules: {} }; },
  async killMandate(id: string) { await pause(); return { status: 'success' }; },
  async activateMandate(id: string) { await pause(); return { status: 'success' }; },
  async getApprovalQueue() { await pause(); return { data: [{id: 'appr_123', amount_cents: 250000, merchant: 'Apple', status: 'PENDING'}] }; },
  async approveTransaction(id: string) { await pause(); return { status: 'success' }; },
  async denyTransaction(id: string) { await pause(); return { status: 'success' }; },
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



