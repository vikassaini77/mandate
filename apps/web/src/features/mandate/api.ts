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
  approveTransaction(id: string, payload?: { amount_cents?: number; merchant?: string; category?: string }): Promise<any>;
  denyTransaction(id: string): Promise<any>;
  getTransactions(): Promise<any>;
  completeTransaction(id: string, payload?: { paypal_order_id?: string; amount_cents?: number; merchant?: string; description?: string }): Promise<any>;
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
  async getApprovalQueue() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/queue`, {
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    return { data: [] };
  },
  async approveTransaction(id: string, payload?: any) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-agent-key-123',
        },
        body: JSON.stringify(payload || {}),
      });
      if (res.ok) return await res.json();
    } catch {}
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
    return { status: 'success' };
  },
  async getTransactions() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/transactions/`, {
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    return { data: [] };
  },
  async completeTransaction(id: string) {
    return { status: 'success' };
  },
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

const mocksEnabled = import.meta.env["VITE_USE_MOCKS"] === "true";

export const BACKEND_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");
export const API_V1_URL = `${BACKEND_URL}/api/v1`;

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
  async approveTransaction(id: string, payload?: { amount_cents?: number; merchant?: string }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-agent-key-123',
        },
        body: JSON.stringify(payload || {}),
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
  async getTransactions() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/transactions/`, {
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    return { data: [] };
  },
  async completeTransaction(id: string, payload?: { paypal_order_id?: string; amount_cents?: number; merchant?: string; description?: string }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/transactions/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-agent-key-123',
        },
        body: JSON.stringify(payload || {}),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { status: 'success' };
  },
  async getActivity() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/activity`);
      if (res.ok) return await res.json();
    } catch {}
    return activity;
  },
  async getAuditEvents() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit-events`);
      if (res.ok) return await res.json();
    } catch {}
    return auditRecords;
  },
  async getProducts() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/products`);
      if (res.ok) return await res.json();
    } catch {}
    return products;
  },
  async getPurchaseProposals() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/purchase-proposals`);
      if (res.ok) return await res.json();
    } catch {}
    return purchaseProposals;
  },
  async getRedTeamScenarios() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/red-team-scenarios`);
      if (res.ok) return await res.json();
    } catch {}
    return redTeamScenarios;
  },
  async getSpendSeries() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spend-series`);
      if (res.ok) return await res.json();
    } catch {}
    return spendData;
  },
};

function createApiClient(): MandateApi {
  if (mocksEnabled) return mockApi;
  return realApi;
}

export const mandateApi = createApiClient();




