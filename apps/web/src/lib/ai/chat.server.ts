import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { createRunIdFetch, getRunId, withRunId } from "./run-id.server.ts";

const bodySchema = z.object({
  id: z.string().uuid(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      parts: z.array(z.unknown()),
    }),
  ),
});

export async function handleAgentChat(request: Request) {
  try {
    const parsed = await request.json();
    const messages = parsed.messages || [];
    
    // Fallback if no messages
    if (messages.length === 0) {
      return Response.json({ message: "No messages provided." }, { status: 400 });
    }

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const userText = lastUser?.content || (lastUser?.parts?.[0] as any)?.text || "Hello";
    
    const history = messages
      .filter(m => m.id !== lastUser?.id)
      .map(m => ({
        role: m.role,
        content: m.content || (m.parts?.[0] as any)?.text || ""
      }));

    const res = await fetch("http://localhost:8000/api/v1/agent/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        history: history
      })
    });

    if (!res.ok) {
      return Response.json({ message: "Python backend error." }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'token') {
                controller.enqueue(encoder.encode(`0:${JSON.stringify(data.content)}\n`));
              } else if (data.type === 'tool_call') {
                // Formatting custom tool calls to text for display
                const callMsg = `\n*[Tool Call: ${data.name}]*\n`;
                controller.enqueue(encoder.encode(`0:${JSON.stringify(callMsg)}\n`));
              } else if (data.type === 'tool_result') {
                // Formatting custom tool results to text for display
                const resMsg = `\n*[Tool Result: ${data.name}]*\n`;
                controller.enqueue(encoder.encode(`0:${JSON.stringify(resMsg)}\n`));
              }
            } catch(e) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    });

    return new Response(res.body!.pipeThrough(transformStream), {
      headers: { 
        "x-vercel-ai-data-stream": "v1", 
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  } catch (err: any) {
    console.error("Agent Chat Proxy Error:", err);
    return Response.json({ message: "Failed to connect to backend agent." }, { status: 500 });
  }
}
