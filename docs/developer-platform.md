# Mandate Developer Platform (Phase 4)

Welcome to the Mandate Developer Platform. By building on top of Mandate, your external applications and local AI IDEs can inherit our strict Agent Firewall, Policy-as-Code engine, and Human Approval Center automatically.

## 1. REST API
Our core API is documented via FastAPI's OpenAPI specification. 
All endpoints require an `Authorization: Bearer <MANDATE_API_KEY>` header.
- `GET /v1/mandates/{id}`: Fetch agent state and trust scores.
- `POST /v1/mandates/{id}/kill`: Trigger the Emergency Kill Switch.
- `POST /v1/transactions/propose`: Securely route a transaction into the Approval Queue.

## 2. Webhooks
Register a URL to receive real-time POST events whenever your agent:
- Hits an anomaly in the Policy Engine
- Trust Score falls below the 30.0 threshold
- Requires human approval for a transaction

## 3. Python SDK
`pip install mandate-sdk`

```python
from mandate import MandateClient
client = MandateClient(api_key="mdt_live_...")
response = client.propose_transaction(amount=25000, merchant="Apple", description="New laptop")
```

## 4. TypeScript / Node.js SDK
`npm install @mandate/sdk`

```typescript
import { MandateClient } from '@mandate/sdk';
const client = new MandateClient("mdt_live_...");
await client.killSwitch("mandate_1");
```

## 5. LangChain / LangGraph Integration
Bind your existing LangGraph agents to our approval system.
```python
from packages.langchain_mandate.tool import MandateTool
agent_tools = [MandateTool(api_key="mdt_live_...")]
```

## 6. MCP Server (Claude Desktop / Cursor)
Mandate acts as an MCP server. Add this to your Claude Desktop config to give Claude the power to securely trigger internal purchases.
```json
"mcpServers": {
  "mandate": {
    "command": "python",
    "args": ["packages/mcp/server.py"],
    "env": {"MANDATE_API_KEY": "mdt_live_..."}
  }
}
```
