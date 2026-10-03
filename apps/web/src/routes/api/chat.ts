import { createFileRoute } from "@tanstack/react-router";
import { handleAgentChat } from "@/lib/ai/chat.server";

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handleAgentChat(request) } },
});
