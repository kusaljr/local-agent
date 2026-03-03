import { Static, t } from "elysia";

export const ToolCallSchema = t.Object({
  action: t.Union([t.Literal("tool_call"), t.Literal("final_answer")]),
  tool: t.Optional(t.String()),
  arguments: t.Optional(t.Record(t.String(), t.Any())),
  content: t.Optional(t.String()),
});

export type ToolCallDTO = Static<typeof ToolCallSchema>;
