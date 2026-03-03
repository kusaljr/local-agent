import { LLMAdapter } from "../../adapters/base.adapter";
import { DatabaseService } from "../database/database.service";
import { eventBus } from "../events.service";
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
    private readonly tools: ToolRegistry,
    private readonly db: DatabaseService // ✅ injected
  ) {
    this.planner = new PlanningAgent(llm);
    this.executor = new ExecutionEngine(tools);
    this.answerer = new AnswerAgent(llm);
  }

  async run(userInput: string) {
    const availableTools = this.tools.list();

    const plan = await this.planner.createPlan(userInput, availableTools);
    console.log("Generated Plan:", JSON.stringify(plan, null, 2));

    // publish plan to any SSE listeners
    try {
      eventBus.publish({ type: "plan", plan });
    } catch (e) {
      console.warn(e);
    }

    let finalResponse: string;

    // Save initial request first
    const requestId = this.db.saveRequest(userInput, plan, "");

    // notify front-end a new request started
    eventBus.publish({ type: "reset", requestId, userInput });

    if (!plan.needsTools || plan.steps.length === 0) {
      finalResponse = plan.finalAnswer ?? "No tools required.";
    } else {
      const results = [];

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];

        const start = Date.now();

        try {
          // notify listeners that this tool call is starting
          eventBus.publish({
            type: "tool_start",
            id: `${requestId}-${i}`,
            tool: step.tool,
            args: step.arguments,
            stepIndex: i,
          });

          const result = await this.tools.execute(step.tool, step.arguments);

          const duration = Date.now() - start;

          const execId = this.db.saveExecution({
            requestId,
            stepIndex: i,
            tool: step.tool,
            args: step.arguments,
            result,
            durationMs: duration,
          });

          // publish tool end with result
          eventBus.publish({
            type: "tool_end",
            id: `${requestId}-${i}`,
            tool: step.tool,
            result,
            durationMs: duration,
            executionId: execId,
          });

          results.push({
            tool: step.tool,
            arguments: step.arguments,
            result,
            executionId: execId,
          });
        } catch (err: any) {
          const duration = Date.now() - start;

          const execId = this.db.saveExecution({
            requestId,
            stepIndex: i,
            tool: step.tool,
            args: step.arguments,
            error: err.message,
            durationMs: duration,
          });

          eventBus.publish({
            type: "tool_end",
            id: `${requestId}-${i}`,
            tool: step.tool,
            error: err.message,
            durationMs: duration,
            executionId: execId,
          });

          // include failed execution id for tracing
          results.push({
            tool: step.tool,
            arguments: step.arguments,
            error: err.message,
            executionId: execId,
          });

          throw err;
        }
      }

      finalResponse = await this.answerer.generate(userInput, results);
    }

    // Update final response via service helper
    this.db.updateResponse(requestId, finalResponse);

    // stream tokens to listeners (best-effort simulated streaming)
    try {
      const text = String(finalResponse || "");
      const chunkSize = 32;
      for (let i = 0; i < text.length; i += chunkSize) {
        const token = text.slice(i, i + chunkSize);
        eventBus.publish({ type: "token", token, requestId });
        // small delay to simulate streaming
        await new Promise((r) => setTimeout(r, 20));
      }
      eventBus.publish({
        type: "final_response",
        response: finalResponse,
        requestId,
      });
    } catch (e) {
      console.warn("stream error", e);
    }

    return finalResponse;
  }
}
