import { Elysia } from "elysia";
import { createAgent } from "./agent.factory";
import { ChatRequestSchema } from "./dto/chat.dto";
import { eventBus } from "./services/events.service";

const agent = createAgent();

const app = new Elysia({ name: "llm" })
  .post(
    "/chat",
    async ({ body }) => {
      const userMessage = body.messages.at(-1)?.content;

      if (!userMessage) {
        throw new Error("No user message provided");
      }

      const result = await agent.run(userMessage);

      return {
        success: true,
        data: result,
      };
    },
    {
      body: ChatRequestSchema,
    }
  )
  .get("/events", async () => {
    let unsub: (() => void) | undefined;
    let ping: Timer | undefined;

    const stream = new ReadableStream({
      start(controller) {
        unsub = eventBus.subscribe((evt: any) => {
          try {
            const payload = `data: ${JSON.stringify(evt)}\n\n`;
            controller.enqueue(new TextEncoder().encode(payload));
          } catch (e) {
            console.error("SSE encode error", e);
          }
        });

        // keep-alive ping every 15s
        ping = setInterval(() => {
          controller.enqueue(
            new TextEncoder().encode('data: {"type":"ping"}\n\n')
          );
        }, 15000);
      },

      cancel() {
        // Called when client disconnects
        if (ping) clearInterval(ping);
        if (unsub) unsub();
        console.log("SSE connection closed");
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });

export const LLMModule = app;
