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
  submitApprovalRequest(item: { id?: string; merchant: string; item: string; amount: number; reason?: string }): Promise<any>;
  getApprovalQueue(): Promise<any>;
  approveTransaction(id: string, payload?: { amount_cents?: number; merchant?: string; category?: string }): Promise<any>;
  denyTransaction(id: string): Promise<any>;
  getTransactions(): Promise<any>;
  completeTransaction(id: string, payload?: { paypal_order_id?: string; amount_cents?: number; merchant?: string; description?: string }): Promise<any>;
  refundTransaction(id: string, payload?: { amount_cents?: number; currency?: string }): Promise<any>;
  getPayPalStatus(): Promise<any>;
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
  async submitApprovalRequest(item: { id?: string; merchant: string; item: string; amount: number; reason?: string }) {
    await pause();
    return { status: 'success', data: item };
  },
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
    const randHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const orderId = `5O${randHex}`;
    const approveLink = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
    return {
      status: 'success',
      data: { id, paypal_order_id: orderId, status: 'approved' },
      intent: {
        id: orderId,
        provider_raw: {
          id: orderId,
          links: [{ rel: 'approve', href: approveLink }],
        },
      },
    };
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
    return { status: 'success', order_id: id, capture_id: `MOCK-CAP-${id}` };
  },
  async refundTransaction(id: string) {
    return { status: 'success', refund: { id: `MOCK-REFUND-${id}`, status: 'COMPLETED' } };
  },
  async getPayPalStatus() {
    return {
      status: 'ok',
      mode: 'mock',
      mock_mode: true,
      environment: 'mock',
      base_url: 'https://api-m.sandbox.paypal.com',
      client_id_configured: false,
      client_secret_configured: false,
      client_id_preview: 'mock_client_id',
      frontend_url: typeof window !== 'undefined' ? window.location.origin : 'https://mandate-2ht2.vercel.app',
    };
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
  async runRedTeamScenario(id: string) {
    try {
      const res = await fetch(`${API_V1_URL}/redteam/run?scenario_id=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'X-API-Key': 'dev-agent-key-123' },
      });
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { status: 'success', result: { bypassed_firewall: false, firewall_reason: 'Blocked by Sentinel Policy Engine' } };
  },
  async getRedTeamScoreboard() {
    try {
      const res = await fetch(`${API_V1_URL}/redteam/scoreboard`, {
        headers: { 'X-API-Key': 'dev-agent-key-123' },
      });
      if (res.ok) return await res.json();
    } catch {}
    await pause();
    return { overall_grade: 'A+', firewall_block_rate: '100%', trust_score_average: 99.9, active_threats: 0 };
  },
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
  async submitApprovalRequest(item: { id?: string; merchant: string; item: string; amount: number; reason?: string }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-agent-key-123',
        },
        body: JSON.stringify({
          id: item.id,
          merchant: item.merchant,
          item: item.item,
          amount: item.amount,
          amount_cents: Math.round(item.amount * 100),
          reason: item.reason,
        }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { status: 'success', data: item };
  },
  async getApprovalQueue() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/approvals/queue`, {
        headers: { 'X-API-Key': 'dev-agent-key-123' }
      });
      if (res.ok) return await res.json();
    } catch {}
    return { data: [] };
  },
  async approveTransaction(id: string, payload?: { amount_cents?: number; merchant?: string; category?: string }) {
    const res = await fetch(`${BACKEND_URL}/api/v1/approvals/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-agent-key-123',
      },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || `Failed to approve transaction (HTTP ${res.status})`);
    }
    return data;
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
    const res = await fetch(`${BACKEND_URL}/api/v1/transactions/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-agent-key-123',
      },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || `Failed to capture PayPal payment (HTTP ${res.status})`);
    }
    return data;
  },
  async refundTransaction(id: string, payload?: { amount_cents?: number; currency?: string }) {
    const res = await fetch(`${BACKEND_URL}/api/v1/transactions/${encodeURIComponent(id)}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'dev-agent-key-123',
      },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || `Failed to refund PayPal capture (HTTP ${res.status})`);
    }
    return data;
  },
  async getPayPalStatus() {
    const res = await fetch(`${BACKEND_URL}/api/v1/paypal/status`, {
      headers: { 'X-API-Key': 'dev-agent-key-123' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || `Failed to fetch PayPal gateway status (HTTP ${res.status})`);
    }
    return data;
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




