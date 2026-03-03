import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import type { AgentService } from "../llm/services/agent.service";

declare global {
  // Prevent duplicate initialization during reload
  var whatsappClient: Client | undefined;
}

export function startWhatsApp(agent: AgentService) {
  if (global.whatsappClient) {
    console.log("WhatsApp already initialized.");
    return;
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: "main-bot",
      dataPath: "./.wwebjs_auth",
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox"],
    },
  });

  global.whatsappClient = client;

  // 🔒 Allowlist (numbers only, without @c.us)
  const ALLOWED_NUMBERS = ["9779840603070@c.us"];

  client.on("qr", (qr) => {
    console.log("Scan this QR:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("WhatsApp ready 🚀");
  });

  client.on("auth_failure", (msg) => {
    console.error("Auth failure:", msg);
  });

  client.on("disconnected", (reason) => {
    console.log("WhatsApp disconnected:", reason);
  });

  client.on("loading_screen", (percent, message) => {
    console.log("Loading:", percent, message);
  });

  client.on("message", async (msg) => {
    console.log("Received message from:", msg.from);
    if (msg.type !== "chat") return;
    if (msg.from.includes("@g.us")) return;

    const number = msg.from.replace("@c.us", "");

    if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(msg.from)) {
      console.log("Blocked message from:", number);
      return;
    }

    try {
      console.log("Incoming message:", msg.body);

      const reply = await agent.run(msg.body);

      await msg.reply(reply);
    } catch (err) {
      console.error("Agent error:", err);
      await msg.reply("Something went wrong.");
    }
  });

  client.initialize();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("Shutting down WhatsApp...");
    await client.destroy();
    process.exit();
  });
}
