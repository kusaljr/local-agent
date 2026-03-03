import { OllamaAdapter } from "./adapters/ollama.adapter";
import { AgentService } from "./services/agents/agent.service";
import { DatabaseService } from "./services/database/database.service";
import { ToolRegistry } from "./services/tool-registry.service";
import { internetSearchSkill } from "./skills/internet-search.skills";
import { internetSpeedCheckSkill } from "./skills/internet-speed.skills";
import { pasalInventorySearchSkill } from "./skills/pasal/inventory-search.skill";

export function createAgent() {
  const tools = new ToolRegistry();

  tools.register(
    "internet_speed_check",
    "Measures internet speed and latency using ping and returns latency metrics.",
    internetSpeedCheckSkill
  );

  tools.register(
    "internet_search",
    "Searches the internet for up-to-date or factual information.",
    internetSearchSkill
  );

  tools.register(
    "pasal_inventory_search",
    `
    Search products on Pasal.com and check stock availability.
    Stores (storeId must be a NUMBER):
    - 1 = Talchowk Store
    - 5 = Dhungepatan Store

    IMPORTANT:
    Always use the numeric storeId (1 or 5).
    Never use store names as strings.

    Search query should be query: "your query", storeId: NUMBER
    `,
    pasalInventorySearchSkill
  );

  const llm = new OllamaAdapter();

  return new AgentService(llm, tools, new DatabaseService());
}
