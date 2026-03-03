export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface StructuredGenerateOptions {
  messages: ChatMessage[];
  schema: any;
  schemaName: string;
}

export interface LLMAdapter {
  generateStructured(options: StructuredGenerateOptions): Promise<any>;
}

export interface OllamaResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
