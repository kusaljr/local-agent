import type {
  ChatMessage,
  LLMAdapter,
  OllamaResponse,
  StructuredGenerateOptions,
} from "./base.adapter";

export class OllamaAdapter implements LLMAdapter {
  constructor(
    private readonly model: string = "qwen",
    private readonly baseUrl: string = "http://localhost:11434"
  ) {}

  async generateStructured(options: StructuredGenerateOptions): Promise<any> {
    for (let attempt = 0; attempt < 3; attempt++) {
      // 🔥 Convert tool role → assistant (Ollama doesn't support tool role)
      const formattedMessages = this.normalizeMessages(options.messages);

      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          keep_alive: "5m",
          temperature: 0.2,
          stream: false,
          messages: formattedMessages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: options.schemaName,
              strict: true,
              schema: options.schema,
            },
          },
        }),
      });

      if (res.status === 503) {
        console.log("Model loading... retrying");
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("Ollama error:", text);
        throw new Error("Ollama request failed");
      }

      const data = (await res.json()) as OllamaResponse;
      const content = data.choices?.[0]?.message?.content;

      try {
        return JSON.parse(content);
      } catch (err) {
        console.error("Failed to parse JSON:", content);
        throw new Error("Model returned invalid JSON");
      }
    }

    throw new Error("Model unavailable after retries");
  }

  /**
   * Convert unsupported roles for Ollama
   */
  private normalizeMessages(
    messages: ChatMessage[]
  ): { role: "system" | "user" | "assistant"; content: string }[] {
    const normalized: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [];

    for (const m of messages) {
      if (m.role === "tool") {
        // Convert tool → user
        normalized.push({
          role: "user",
          content: `Tool result:\n${m.content}`,
        });
      } else {
        // Explicitly reconstruct object (this narrows the type properly)
        normalized.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    return normalized;
  }
}
