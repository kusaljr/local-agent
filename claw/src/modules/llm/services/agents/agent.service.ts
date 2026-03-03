import { LLMAdapter } from "../../adapters/base.adapter";
import { ToolRegistry } from "../tool-registry.service";
import { AnswerAgent } from "./answer.agent.service";
import { ExecutionEngine } from "./execution.engine.service";
import { PlanningAgent } from "./planning.agent.service";

export class AgentService {
  private planner: PlanningAgent;
  private executor: ExecutionEngine;
  private answerer: AnswerAgent;

  constructor(
    private readonly llm: LLMAdapter,
    private readonly tools: ToolRegistry
  ) {
    this.planner = new PlanningAgent(llm);
    this.executor = new ExecutionEngine(tools);
    this.answerer = new AnswerAgent(llm);
  }

  async run(userInput: string) {
    const availableTools = this.tools.list();

    const plan = await this.planner.createPlan(userInput, availableTools);
    console.log("Generated Plan:", JSON.stringify(plan, null, 2));

    if (!plan.needsTools) {
      return plan.finalAnswer ?? "No tools required.";
    }

    const results = await this.executor.executePlan(plan.steps);

    return await this.answerer.generate(userInput, results);
  }
}
