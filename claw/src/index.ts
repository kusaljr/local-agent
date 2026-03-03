import { Elysia } from "elysia";
import { frontEndModule } from "./modules/frontend/frontend.module";
import { LLMModule } from "./modules/llm/llm.module";

// const agent = createAgent();

// startWhatsApp(agent);

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .use(LLMModule)
  .use(frontEndModule)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
