// answer.agent.ts

import { LLMAdapter } from "../../adapters/base.adapter";

export class AnswerAgent {
  constructor(private readonly llm: LLMAdapter) {}

  async generate(userInput: string, toolResults: any[]) {
    const result = await this.llm.generateStructured({
      messages: [
        {
          role: "system",
          content: `
You are a precise and reliable AI assistant.

GENERAL RULES:
- Use ONLY the provided tool results.
- Do NOT invent facts.
- Do NOT mention tools or planning.
- If information is missing, clearly say it cannot be determined.
- Be concise but complete.

RESPONSE LOGIC:

1) If tool results contain shopping products (fields like sellingPrice, quantity):
   - Format in clean Markdown.
   - ALWAYS include:
     - Price → "Rs. PRICE"
     - Stock → "Stock: QUANTITY"
   - Group similar products logically.

2) If tool results contain search results (fields like title, url, description):
   - Extract the factual answer from them.
   - If the question expects a number (ranking, score, price),
     the answer MUST include a number.
   - If the answer cannot be determined from snippets,
     say: "The requested information could not be determined from the search results."

3) If the question is factual:
   - Provide a direct answer sentence.
   - Avoid unnecessary formatting.

Never return incomplete fragments like only a name.
Never hallucinate missing data.
`,
        },
        {
          role: "user",
          content: `
User request:
${userInput}

Tool results (JSON):
${JSON.stringify(toolResults, null, 2)}
`,
        },
      ],
      schemaName: "final_answer",
      schema: {
        type: "object",
        properties: {
          content: { type: "string" },
        },
        required: ["content"],
        additionalProperties: false,
      },
    });

    return result.content;
  }
}
