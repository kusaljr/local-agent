type ToolHandler = (args: any) => Promise<any>;

interface ToolDefinition {
  description: string;
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(name: string, description: string, handler: ToolHandler) {
    this.tools.set(name, { description, handler });
  }

  async execute(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool.handler(args);
  }

  getDescription(name: string) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool.description;
  }

  list() {
    return [...this.tools.entries()].map(([name, def]) => ({
      name,
      description: def.description,
    }));
  }
}
