import { Elysia } from "elysia";
import { createAgent } from "./agent.factory";
import { ChatRequestSchema } from "./dto/chat.dto";

const agent = createAgent();

export const LLMModule = new Elysia({ name: "llm" }).post(
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
);
