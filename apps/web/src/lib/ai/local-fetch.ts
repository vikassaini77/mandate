import { getWebLLMEngine } from "./webllm";
import { Message } from "@ai-sdk/react";

export async function customAiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const reqBody = init?.body ? JSON.parse(init.body as string) : {};
  const messages: Message[] = reqBody.messages || [];

  try {
    const engine = await getWebLLMEngine();

    const stream = new ReadableStream({
      async start(controller) {
        const textEncoder = new TextEncoder();
        try {
          const asyncChunkGenerator = await engine.chat.completions.create({
            messages: messages.map((m) => ({ role: m.role as any, content: m.content })),
            stream: true,
          });

          for await (const chunk of asyncChunkGenerator) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              // Vercel AI SDK Data Stream protocol format for text chunks:
              // 0:"text"
              const encodedChunk = `0:${JSON.stringify(content)}\n`;
              controller.enqueue(textEncoder.encode(encodedChunk));
            }
          }
        } catch (error: any) {
          console.error("Local AI Error:", error);
          controller.enqueue(textEncoder.encode(`3:${JSON.stringify(error.message)}\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1"
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to load local model" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
