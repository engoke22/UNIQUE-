import { webhookCallback } from "grammy";
import { createBot } from "./bot.js";

export default {
  async fetch(request, env, ctx) {
    // Basic webhook secret check — Telegram sends this header when you set
    // secret_token during setWebhook. Rejects anything that isn't Telegram.
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (env.WEBHOOK_SECRET && secret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const bot = createBot(env);
    const handleUpdate = webhookCallback(bot, "cloudflare-mod");

    try {
      return await handleUpdate(request);
    } catch (err) {
      console.error("Update handling failed:", err);
      return new Response("OK"); // always 200 so Telegram doesn't retry-storm
    }
  },
};
