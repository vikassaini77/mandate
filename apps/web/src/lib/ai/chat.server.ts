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
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token)
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json({ message: "The conversation request is invalid." }, { status: 400 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user)
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const userId = authData.user.id;
  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("id")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!thread) return Response.json({ message: "Conversation not found." }, { status: 404 });
  const messages = parsed.data.messages as UIMessage[];
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (lastUser) {
    const { data: saved } = await supabaseAdmin
      .from("chat_messages")
      .select("id")
      .eq("thread_id", thread.id)
      .eq("sdk_message_id", lastUser.id)
      .maybeSingle();
    if (!saved) {
      const { error } = await supabaseAdmin.from("chat_messages").insert({
        thread_id: thread.id,
        user_id: userId,
        sdk_message_id: lastUser.id,
        role: "user",
        parts: JSON.parse(JSON.stringify(lastUser.parts)) as Json,
      });
      if (error)
        return Response.json({ message: "Your message could not be saved." }, { status: 500 });
    }
  }
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return Response.json({ message: "Lovable AI is not configured." }, { status: 401 });
  const run = createRunIdFetch(getRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: run.fetch,
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "You are MANDATE's procurement agent. Help the user research purchases while treating policy as binding. Be concise, transparent, and never claim a purchase completed. When recommending products, compare value, merchant, rating, and explain the likely APPROVE, ESCALATE, or BLOCK verdict. Use markdown.",
    messages: await convertToModelMessages(messages),
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
      const { error } = await supabaseAdmin.from("chat_messages").insert({
        thread_id: thread.id,
        user_id: userId,
        sdk_message_id: responseMessage.id,
        role: "assistant",
        parts: JSON.parse(JSON.stringify(responseMessage.parts)) as Json,
      });
      if (error) console.error("Failed to persist assistant message", error.message);
      await supabaseAdmin
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id)
        .eq("user_id", userId);
    },
  });
  return withRunId(response, run);
}
