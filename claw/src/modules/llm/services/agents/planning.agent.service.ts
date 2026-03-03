import { LLMAdapter } from "../../adapters/base.adapter";

export interface PlanStep {
  tool: string;
  arguments: Record<string, any>;
}

export interface AgentPlan {
  needsTools: boolean;
  steps: PlanStep[];
  finalAnswer?: string;
}

export class PlanningAgent {
  constructor(private readonly llm: LLMAdapter) {}

  async createPlan(
    userInput: string,
    availableTools: { name: string; description: string }[]
  ): Promise<AgentPlan> {
    const toolsDescription = availableTools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");

    const result = await this.llm.generateStructured({
      messages: [
        {
          role: "system",
          content: `
You are an intelligent task planner.
Today's date: ${new Date().toLocaleDateString()}
Your knowledge cutoff: 2024-06, so you need to use tools if you want to access current information.

GENERAL RULE:
Break high-level goals into the smallest executable tool calls.

FOOD RULE:
If the user wants to cook or prepare ANY dish:
- You can use pasal_inventory_search to find ANY grocery item.
- It supports all food and grocery products available in store.

Planning Steps:
1. Determine the ingredient list for the requested dish.
2. Create one pasal_inventory_search call per ingredient.
3. Each query must represent a single grocery item.
4. Never search "<dish> ingredients".

Do not create shallow plans.
Generic searches are incorrect.

Available tools:
${toolsDescription}

Rules:
1. Decide if tools are required.
2. Create an ordered list of tool calls.
3. Do NOT repeat identical tool calls.
4. Only use tools from the available list.
5. If no tools needed, return direct finalAnswer.
`,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      schemaName: "agent_plan",
      schema: {
        type: "object",
        properties: {
          needsTools: { type: "boolean" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tool: { type: "string" },
                arguments: {
                  type: "object",
                  properties: {
                    storeId: { type: "number" },
                  },
                  required: ["storeId"],
                  additionalProperties: true,
                },
              },
              required: ["tool", "arguments"],
              additionalProperties: false,
            },
          },
          finalAnswer: { type: "string" },
        },
        required: ["needsTools"],
        additionalProperties: false,
      },
    });

    return result;
  }
}
