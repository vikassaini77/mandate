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
  autoApproveLimit: z.number().optional(),
  dailySpendCap: z.number().optional(),
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
  const userText = lastUser?.parts
    ? (lastUser.parts as any[])
        .map((p) => (typeof p === "string" ? p : p?.text || ""))
        .filter(Boolean)
        .join(" ")
    : "";

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

  // Queue purchase proposal to the Policy Engine backend
  const queueProposal = async () => {
    try {
      const BACKEND_URL = (process.env["API_URL"] || process.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");
      const text = userText.toLowerCase();

      let merchant = "Amazon Business";
      let item = "Enterprise Equipment Order";
      let amountCents = 34900;
      let category = "Hardware";

      if (text.includes("headphone") || text.includes("audio") || text.includes("sony") || text.includes("auralis")) {
        merchant = "Sony Electronics";
        item = "Sony WH-1000XM5 Wireless Noise-Canceling Headphones";
        amountCents = 39900;
        category = "Electronics";
      } else if (text.includes("keyboard") || text.includes("mouse") || text.includes("logitech") || text.includes("keychron")) {
        merchant = "Keychron";
        item = "Keychron Q1 Pro Mechanical Keyboard";
        amountCents = 21900;
        category = "Electronics";
      } else if (text.includes("monitor") || text.includes("dell") || text.includes("display") || text.includes("screen")) {
        merchant = "Dell Technologies";
        item = "Dell UltraSharp 32 4K USB-C Hub Monitor";
        amountCents = 79900;
        category = "Hardware";
      } else if (text.includes("laptop") || text.includes("macbook") || text.includes("computer") || text.includes("apple")) {
        merchant = "Apple Store";
        item = "MacBook Pro 14-inch M3 Pro";
        amountCents = 199900;
        category = "Hardware";
      } else if (text.includes("software") || text.includes("seat") || text.includes("license") || text.includes("figma") || text.includes("linear")) {
        merchant = "Figma";
        item = "Enterprise Team License · 5 Seats";
        amountCents = 37500;
        category = "Software";
      }

      await fetch(`${BACKEND_URL}/api/v1/transactions/propose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "dev-agent-key-123",
        },
        body: JSON.stringify({
          amount_cents: amountCents,
          merchant,
          category,
          description: item,
        }),
      });
    } catch (err) {
      console.warn("Failed to queue proposal from chat.server:", err);
    }
  };

  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const geminiApiKey = process.env["GEMINI_API_KEY"];
  if (!lovableApiKey && !geminiApiKey) {
    // Submit proposal to policy engine backend before streaming
    await queueProposal();

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
    aiModel = google("gemini-3.5-flash");
  } else {
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableApiKey,
      headers: { "Lovable-API-Key": lovableApiKey!, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: run.fetch,
    });
    aiModel = provider.chat("openai/gpt-6-astra");
  }

  const autoApproveLimit = typeof parsed.data.autoApproveLimit === "number" ? parsed.data.autoApproveLimit : 300;
  const dailySpendCap = typeof parsed.data.dailySpendCap === "number" ? parsed.data.dailySpendCap : 1000;

  const result = streamText({
    model: aiModel,
    system:
      "You are MANDATE's intelligent autonomous procurement agent. You act as an expert enterprise purchasing assistant following a natural, interactive shopping and procurement workflow.\n\n" +
      "THE 3-STEP SHOPPING & PROCUREMENT WORKFLOW:\n\n" +
      "Step 1: DISCOVER & SUGGEST (Do NOT call propose_product yet!)\n" +
      "When the user asks to find, browse, or purchase products (e.g., 'I want monitors', 'find me wired earphones', 'I need a mechanical keyboard'):\n" +
      "- Suggest 2 to 3 distinct, high-quality candidate options in concise markdown bullets (Include Product Name, Unit Price in USD, Key Specs/Rating, and Merchant e.g. Amazon, B&H Photo, Dell, Best Buy).\n" +
      "- Ask the user which option they prefer or if they'd like adjustments.\n" +
      "- DO NOT call the `propose_product` tool during this suggestion step. Simply provide the helpful suggestions in text!\n\n" +
      "Step 2: SELECTION & QUANTITY CONFIRMATION\n" +
      "When the user selects an option or agrees on a specific product (e.g., 'I like option 1', 'let's go with the Dell 27-inch', 'sounds good'):\n" +
      "- If the user did NOT mention how many they want, confirm the product and ask: 'Great choice! How many units would you like to order?'\n" +
      "- If the user already specified quantity (e.g., 'I want 2 monitors', 'get 1 figma license for $15'), proceed directly to Step 3.\n\n" +
      "Step 3: GENERATE PAYMENT CARD (Call propose_product!)\n" +
      "Once both the product choice and quantity are clear:\n" +
      "- Calculate: Total Price = Unit Price × Quantity.\n" +
      "- Explain the policy verdict:\n" +
      `  * If Total Price <= $${autoApproveLimit}: AUTO-APPROVED for immediate PayPal checkout under the corporate threshold.\n` +
      `  * If Total Price > $${autoApproveLimit}: ESCALATED to manager approvals queue.\n` +
      "- INVOKE the `propose_product` tool with `name`, `quantity`, `unit_price`, `price` (total price), `merchant`, `category`, and `reasoning`.\n" +
      "- Provide a brief closing summary confirming the order details.\n\n" +
      "CONVERSATIONAL STYLE: Professional, concise, responsive, and attentive. Never rush to show the payment card until the user has chosen their product and quantity.",
    messages: await convertToModelMessages(messages),
    maxTokens: 750,
    maxSteps: 3,
    tools: {
      propose_product: tool({
        description:
          "Generate the final purchase order proposal card for PayPal checkout AFTER the user has chosen a product and confirmed the quantity. Do NOT call this on initial search queries.",
        parameters: z.object({
          name: z.string().describe("Product name e.g. 'Dell UltraSharp 27-inch 4K Monitor'"),
          quantity: z.number().optional().default(1).describe("Number of units selected"),
          unit_price: z.number().optional().describe("Price per unit in USD"),
          price: z.number().describe("Total price in USD (unit_price * quantity)"),
          merchant: z.string().describe("Merchant name e.g. 'Dell', 'Amazon', 'B&H Photo', 'Best Buy'"),
          category: z.string().optional().default("Electronics"),
          rating: z.number().optional().default(4.7),
          image: z.string().optional().describe("Product image URL"),
          reasoning: z.string().optional().describe("Summary of quantity, total price, and policy check"),
        }),
        execute: async (args) => args,
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

      // If the assistant message mentions queuing a proposal, guarantee it is sent to backend
      const partsStr = JSON.stringify(responseMessage.parts);
      if (partsStr.includes("requires approval") || partsStr.includes("queued a proposal")) {
        await queueProposal();
      }
    },
  });
  return withRunId(response, run);
}
