import sys
import json
import httpx

class MandateMCPServer:
    """
    Item 28: MCP integration
    Model Context Protocol server for integrating Mandate into Claude Desktop and Cursor.
    Provides standard JSON-RPC capabilities for local LLMs to securely delegate purchases.
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "http://localhost:8000/v1"
        self.client = httpx.Client(headers={"Authorization": f"Bearer {self.api_key}"})
        
    def handle_request(self, req: dict) -> dict:
        method = req.get("method")
        params = req.get("params", {})
        
        if method == "initialize":
            return {
                "serverInfo": {"name": "Mandate-MCP", "version": "1.0.0"},
                "capabilities": {
                    "tools": {
                        "mandate_purchase": {
                            "description": "Securely propose a purchase via Mandate.",
                            "parameters": {
                                "amount_cents": {"type": "integer"},
                                "merchant": {"type": "string"}
                            }
                        }
                    }
                }
            }
            
        elif method == "callTool":
            tool = params.get("name")
            args = params.get("arguments", {})
            if tool == "mandate_purchase":
                response = self.client.post(f"{self.base_url}/transactions/propose", json=args)
                return {"result": response.json()}
            else:
                return {"error": f"Unknown tool: {tool}"}
                
        return {"error": "Method not found"}

    def run_stdio(self):
        # Basic JSON-RPC loop over stdio
        for line in sys.stdin:
            try:
                req = json.loads(line)
                res = self.handle_request(req)
                sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": req.get("id"), **res}) + "\n")
                sys.stdout.flush()
            except Exception as e:
                pass

if __name__ == "__main__":
    import os
    server = MandateMCPServer(api_key=os.environ.get("MANDATE_API_KEY", "dev_key"))
    server.run_stdio()
