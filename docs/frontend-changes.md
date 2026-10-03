# Frontend Changes

To connect the frontend to the real backend, the following changes are required:

1. **Update `src/features/mandate/api.ts` to make real HTTP requests**:
   When `VITE_USE_MOCKS` is `false`, the `MandateApi` implementation should fetch data from the backend instead of resolving the mock data directly.
   
   Example:
   ```typescript
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
   ```
