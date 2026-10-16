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
  runRedTeamScenario(id: string): Promise<any>;
  getRedTeamScoreboard(): Promise<any>;
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
  async runRedTeamScenario(id: string) { await pause(); return { status: 'success', result: { bypassed_firewall: false, firewall_reason: 'Mock blocked' } }; },
  async getRedTeamScoreboard() { await pause(); return { overall_grade: 'A+', firewall_block_rate: '100%', trust_score_average: 99.9, active_threats: 0 }; },
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

const BACKEND_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");

const realApi: MandateApi = {
  async runRedTeamScenario(id: string) { await pause(); return { status: 'success', result: { bypassed_firewall: false, firewall_reason: 'Mock blocked' } }; },
  async getRedTeamScoreboard() { await pause(); return { overall_grade: 'A+', firewall_block_rate: '100%', trust_score_average: 99.9, active_threats: 0 }; },
  async getMandate(id: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/mandates/${id}`);
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { is_active: true, kill_switch_engaged: false, trust_score: 100, rules: {} };
  },
  async killMandate(id: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/mandates/${id}/kill`, {
        method: 'POST',
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { status: 'success' };
  },
  async activateMandate(id: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/mandates/${id}/activate`, {
        method: 'POST',
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { status: 'success' };
  },
  async getApprovalQueue() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/queue`, {
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { data: [{id: 'appr_123', amount_cents: 250000, merchant: 'Apple', status: 'PENDING'}] };
  },
  async approveTransaction(id: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { status: 'success' };
  },
  async denyTransaction(id: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/${id}/deny`, {
        method: 'POST',
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { status: 'success' };
  },
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




