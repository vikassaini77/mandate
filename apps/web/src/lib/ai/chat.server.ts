import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
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
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token)
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json({ message: "The conversation request is invalid." }, { status: 400 });
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
  const supabaseKey = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
  const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !authData.user)
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const userId = authData.user.id;
  const { data: thread } = await supabaseAuth
    .from("chat_threads")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!thread) return Response.json({ message: "Conversation not found." }, { status: 404 });
  const messages = parsed.data.messages as UIMessage[];
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (lastUser) {
    const { data: saved } = await supabaseAuth
      .from("chat_messages")
      .select("id")
      .eq("thread_id", thread.id)
      .eq("sdk_message_id", lastUser.id)
      .maybeSingle();
    if (!saved) {
      const { error } = await supabaseAuth.from("chat_messages").insert({
        thread_id: thread.id,
        user_id: userId,
        sdk_message_id: lastUser.id,
        role: "user",
        parts: lastUser.parts ? (JSON.parse(JSON.stringify(lastUser.parts)) as Json) : undefined,
      });
      if (error)
        return Response.json({ message: "Your message could not be saved." }, { status: 500 });
    }
  }
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const geminiApiKey = process.env["GEMINI_API_KEY"];
  if (!lovableApiKey && !geminiApiKey) {
    // Fallback Mock Streaming for the hackathon if API key is missing
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"start","messageId":"mock-msg-123"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"text-start","id":"text-1"}\n\n'));
        const responseText = "Sentinel Engine has analyzed your request. Based on your current Mandate constraints, this purchase requires approval. I have queued a proposal for your review.";
        const chunks = responseText.split(" ");
        let i = 0;
        const timer = setInterval(() => {
          if (i < chunks.length) {
            const chunk = chunks[i] + (i === chunks.length - 1 ? "" : " ");
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-delta", id: "text-1", delta: chunk })}\n\n`));
            i++;
          } else {
            controller.enqueue(encoder.encode('data: {"type":"text-end","id":"text-1"}\n\n'));
            controller.enqueue(encoder.encode('data: {"type":"finish"}\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            clearInterval(timer);
            controller.close();
          }
        }, 50);
      }
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
  }
  const run = createRunIdFetch(getRunId(request));
  let aiModel;
  
  if (geminiApiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: geminiApiKey,
      fetch: run.fetch,
    });
    aiModel = google("gemini-3.1-flash-lite");
  } else {
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableApiKey,
      headers: { "Lovable-API-Key": lovableApiKey!, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: run.fetch,
    });
    aiModel = provider.chat("openai/gpt-6-astra");
  }

  const result = streamText({
    model: aiModel,
    system:
      "You are MANDATE's procurement agent. Help the user research purchases while treating policy as binding. Be EXTREMELY concise (under 150 words), transparent, and never claim a purchase completed. Recommend AT MOST 2 products. Compare value, merchant, rating, and explain the likely verdict. Use markdown. ALWAYS include a brief text response. Include real hyperlink URLs to Amazon, BestBuy, or the manufacturer for the recommended products. If a purchase is complex, expensive (>$500), or requires deep research, you MUST use the delegate_task tool to consult the Researcher or Negotiator sub-agent before giving your final verdict.",
    messages: await convertToModelMessages(messages),
    maxTokens: 500,
    tools: {
      propose_product: tool({
        description: "Propose a product for the user to review. Call this when you want to show a specific product to the user, for example, the Auralis NC-7 headphones.",
        parameters: z.object({}),
        execute: async () => ({}),
      }),
      delegate_task: tool({
        description: "Swarm Tool: Delegate a complex task to a specialized agent (e.g., 'Researcher', 'Negotiator').",
        parameters: z.object({
          agent_type: z.enum(["Researcher", "Negotiator"]).optional().default("Researcher"),
          instructions: z.string().optional().default("Review this purchase for policy compliance."),
        }),
        execute: async ({ agent_type, instructions }) => {
          if (!aiModel) return { agent_type, response: "Sub-agent unavailable." };
          try {
            const { generateText } = await import("ai");
            const res = await generateText({
              model: aiModel,
              system: `You are an expert ${agent_type}. Execute the task to the best of your ability. Keep it concise.`,
              prompt: instructions,
              maxTokens: 250,
            });
            return {
              agent_type,
              response: res.text,
            };
          } catch (error: any) {
            return {
              agent_type,
              response: `[ERROR] Sub-agent ${agent_type} failed: ${error?.message || "Unknown error"}`,
            };
          }
        },
      }),
    },
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onFinish: async ({ responseMessage }) => {
      const { error } = await supabaseAuth.from("chat_messages").insert({
        thread_id: thread.id,
        user_id: userId,
        sdk_message_id: responseMessage.id,
        role: "assistant",
        parts: JSON.parse(JSON.stringify(responseMessage.parts)) as Json,
      });
      if (error) console.error("Failed to persist assistant message", error.message);
      await supabaseAuth
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id)
        .eq("user_id", userId);
    },
  });
  return withRunId(response, run);
}
