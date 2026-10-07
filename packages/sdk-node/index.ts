/**
 * Item 25: JavaScript/TypeScript SDK
 * Client library for interacting with the Mandate Developer Platform.
 */
export class MandateClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "http://localhost:8000/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    };
    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!response.ok) {
      throw new Error(`Mandate API error: ${response.statusText}`);
    }
    return response.json();
  }

  async getMandate(mandateId: string) {
    return this.fetch(`/mandates/${mandateId}`);
  }

  async killSwitch(mandateId: string) {
    return this.fetch(`/mandates/${mandateId}/kill`, { method: "POST" });
  }

  async proposeTransaction(amount: number, merchant: string, description: string) {
    return this.fetch("/transactions/propose", {
      method: "POST",
      body: JSON.stringify({ amount_cents: amount, merchant, description }),
    });
  }
}
