// execution.engine.ts

import { ToolRegistry } from "../tool-registry.service";
import { PlanStep } from "./planning.agent.service";

export class ExecutionEngine {
  constructor(private readonly tools: ToolRegistry) {}

  async executePlan(steps: PlanStep[]) {
    const results: any[] = [];
    const executed = new Set<string>();

    for (const step of steps) {
      const key = `${step.tool}:${JSON.stringify(step.arguments)}`;

      if (executed.has(key)) {
        continue; // prevent duplicate execution
      }

      executed.add(key);

      const result = await this.tools.execute(step.tool, step.arguments);
      console.log(
        `Executed ${step.tool} with arguments ${JSON.stringify(
          step.arguments
        )} and got result:`,
        result
      );

      results.push({
        tool: step.tool,
        arguments: step.arguments,
        result,
      });
    }

    return results;
  }
}
