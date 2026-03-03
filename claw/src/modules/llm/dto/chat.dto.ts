import { Static, Type } from "@sinclair/typebox";

export const ChatRequestSchema = Type.Object({
  messages: Type.Array(
    Type.Object({
      role: Type.String(),
      content: Type.String(),
    })
  ),
});
export type ChatRequestDTO = Static<typeof ChatRequestSchema>;
