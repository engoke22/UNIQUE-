import { Bot } from "grammy";
import { getWeather, getQuote, getJoke, getTrivia, getCryptoPrice } from "./api.js";

const MENU = `
┏━━━━━━━━━━━━━━━━━━━┓
   📋 GROUP MENU
┗━━━━━━━━━━━━━━━━━━━┛

👑 Admin
/kick — remove a member (reply to them)
/ban — ban a member (reply to them)
/mute [minutes] — mute a member (reply to them)
/unmute — unmute a member (reply to them)
/promote — make a member admin (reply to them)
/demote — remove admin (reply to them)
/warn — warn a member (reply to them)
/all <text> — mention every member (throttled)

📊 Group
/stats — this group's activity stats
/rules — show group rules
/setrules <text> — set group rules (admin)

🎲 Fun / Free APIs
/weather <city>
/quote
/joke
/trivia
/crypto <coin id, e.g. bitcoin>

ℹ️ /menu — show this menu
`;

export function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);

  // ---------- helpers ----------

  async function withTyping(ctx, action, fn) {
    // Shows "typing…" (or "recording voice…" etc.) before replying, so the
    // bot feels alive rather than instant-firing canned text.
    try {
      await ctx.replyWithChatAction(action);
    } catch {
      /* non-fatal */
    }
    return fn();
  }

  async function isAdmin(ctx) {
    if (!ctx.from || !ctx.chat) return false;
    if (String(ctx.from.id) === String(env.BOT_OWNER_ID)) return true;
    try {
      const member = await ctx.getChatMember(ctx.from.id);
      return ["administrator", "creator"].includes(member.status);
    } catch {
      return false;
    }
  }

  function targetUser(ctx) {
    return ctx.message?.reply_to_message?.from ?? null;
  }

  async function kvIncr(env, key) {
    const current = parseInt((await env.BOT_KV?.get(key)) ?? "0", 10);
    await env.BOT_KV?.put(key, String(current + 1));
  }

  // ---------- welcome / goodbye ----------

  bot.on("message:new_chat_members", async (ctx) => {
    for (const member of ctx.message.new_chat_members) {
      if (member.is_bot) continue;
      await withTyping(ctx, "typing", () =>
        ctx.reply(
          `👋 Welcome, ${member.first_name}! Glad to have you here.\nType /menu to see what this bot can do.`,
          { reply_to_message_id: ctx.message.message_id }
        )
      );
    }
  });

  bot.on("message:left_chat_member", async (ctx) => {
    const member = ctx.message.left_chat_member;
    if (member.is_bot) return;
    await ctx.reply(`👋 ${member.first_name} has left the group.`);
  });

  // ---------- stats tracking (every message) ----------

  bot.on("message", async (ctx, next) => {
    if (ctx.chat?.type !== "private" && env.BOT_KV) {
      await kvIncr(env, `stats:${ctx.chat.id}:messages`);
      if (ctx.from) {
        await kvIncr(env, `stats:${ctx.chat.id}:user:${ctx.from.id}`);
      }
    }
    await next();
  });

  // ---------- menu ----------

  bot.command("menu", (ctx) => ctx.reply(MENU));
  bot.command("start", (ctx) => ctx.reply(MENU));

  // ---------- moderation ----------

  bot.command("kick", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const user = targetUser(ctx);
    if (!user) return ctx.reply("Reply to the member you want to kick.");
    try {
      await ctx.banChatMember(user.id);
      await ctx.unbanChatMember(user.id); // ban+unban = kick, not permanent ban
      await ctx.reply(`✅ ${user.first_name} was removed from the group.`);
    } catch (e) {
      await ctx.reply(`Couldn't kick: ${e.message}`);
    }
  });

  bot.command("ban", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const user = targetUser(ctx);
    if (!user) return ctx.reply("Reply to the member you want to ban.");
    try {
      await ctx.banChatMember(user.id);
      await ctx.reply(`🔨 ${user.first_name} was banned.`);
    } catch (e) {
      await ctx.reply(`Couldn't ban: ${e.message}`);
    }
  });

  bot.command("mute", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const user = targetUser(ctx);
    if (!user) return ctx.reply("Reply to the member you want to mute.");
    const minutes = parseInt(ctx.match, 10) || 60;
    const until = Math.floor(Date.now() / 1000) + minutes * 60;
    try {
      await ctx.restrictChatMember(user.id, { can_send_messages: false }, { until_date: until });
      await ctx.reply(`🔇 ${user.first_name} muted for ${minutes} minutes.`);
    } catch (e) {
      await ctx.reply(`Couldn't mute: ${e.message}`);
    }
  });

  bot.command("unmute", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const user = targetUser(ctx);
    if (!user) return ctx.reply("Reply to the member you want to unmute.");
    try {
      await ctx.restrictChatMember(user.id, {
        can_send_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      });
      await ctx.reply(`🔊 ${user.first_name} unmuted.`);
    } catch (e) {
      await ctx.reply(`Couldn't unmute: ${e.message}`);
    }
  });

  bot.command("promote", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const user = targetUser(ctx);
    if (!user) return ctx.reply("Reply to the member you want to promote.");
    try {
      await ctx.promoteChatMember(user.id, {
        can_manage_chat: true,
        can_delete_messages: true,
        can_restrict_members: true,
        can_invite_users: true,
      });
      await ctx.reply(`⭐ ${user.first_name} is now an admin.`);
    } catch (e) {
      await ctx.reply(`Couldn't promote: ${e.message}`);
    }
  });

  bot.command("demote", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const user = targetUser(ctx);
    if (!user) return ctx.reply("Reply to the member you want to demote.");
    try {
      await ctx.promoteChatMember(user.id, {
        can_manage_chat: false,
        can_delete_messages: false,
        can_restrict_members: false,
        can_invite_users: false,
      });
      await ctx.reply(`${user.first_name} is no longer an admin.`);
    } catch (e) {
      await ctx.reply(`Couldn't demote: ${e.message}`);
    }
  });

  bot.command("warn", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const user = targetUser(ctx);
    if (!user) return ctx.reply("Reply to the member you want to warn.");
    const key = `warn:${ctx.chat.id}:${user.id}`;
    const count = parseInt((await env.BOT_KV?.get(key)) ?? "0", 10) + 1;
    await env.BOT_KV?.put(key, String(count));
    await ctx.reply(`⚠️ ${user.first_name} has been warned (${count}/3).`);
    if (count >= 3) {
      try {
        await ctx.banChatMember(user.id);
        await ctx.reply(`🔨 ${user.first_name} auto-banned after 3 warnings.`);
        await env.BOT_KV?.delete(key);
      } catch {
        /* ignore */
      }
    }
  });

  // ---------- mention everyone (throttled) ----------

  bot.command("all", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only — this prevents spam.");
    const text = ctx.match || "attention everyone!";

    let admins;
    try {
      admins = await ctx.getChatAdministrators();
    } catch (e) {
      return ctx.reply(`Couldn't fetch members: ${e.message}`);
    }

    // Telegram groups don't expose a full member list via bot API, so this
    // mentions admins + anyone who has recently messaged (tracked via KV).
    const recentKey = `recent:${ctx.chat.id}`;
    const recentIds = JSON.parse((await env.BOT_KV?.get(recentKey)) ?? "[]");

    const seen = new Set();
    const mentions = [];
    for (const a of admins) {
      if (!a.user.is_bot && !seen.has(a.user.id)) {
        seen.add(a.user.id);
        mentions.push(`[${a.user.first_name}](tg://user?id=${a.user.id})`);
      }
    }
    for (const id of recentIds) {
      if (!seen.has(id)) {
        seen.add(id);
        mentions.push(`[👤](tg://user?id=${id})`);
      }
    }

    // Telegram caps message length ~4096 chars — chunk into batches of 30.
    const chunkSize = 30;
    for (let i = 0; i < mentions.length; i += chunkSize) {
      const chunk = mentions.slice(i, i + chunkSize).join(" ");
      await withTyping(ctx, "typing", () =>
        ctx.reply(`${text}\n\n${chunk}`, { parse_mode: "Markdown" })
      );
      await new Promise((r) => setTimeout(r, 500)); // avoid Telegram flood limits
    }
  });

  // track recent senders so /all can reach non-admins too
  bot.on("message", async (ctx, next) => {
    if (ctx.chat?.type !== "private" && ctx.from && env.BOT_KV) {
      const key = `recent:${ctx.chat.id}`;
      const recent = new Set(JSON.parse((await env.BOT_KV.get(key)) ?? "[]"));
      recent.add(ctx.from.id);
      const trimmed = [...recent].slice(-200); // cap to last 200 unique senders
      await env.BOT_KV.put(key, JSON.stringify(trimmed));
    }
    await next();
  });

  // ---------- group stats & rules ----------

  bot.command("stats", async (ctx) => {
    if (ctx.chat.type === "private") return ctx.reply("Stats only work in groups.");
    const total = (await env.BOT_KV?.get(`stats:${ctx.chat.id}:messages`)) ?? "0";
    await ctx.reply(`📊 Group stats\nTotal tracked messages: ${total}`);
  });

  bot.command("setrules", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("Admins only.");
    const rules = ctx.match;
    if (!rules) return ctx.reply("Usage: /setrules <text>");
    await env.BOT_KV?.put(`rules:${ctx.chat.id}`, rules);
    await ctx.reply("✅ Rules updated.");
  });

  bot.command("rules", async (ctx) => {
    const rules = await env.BOT_KV?.get(`rules:${ctx.chat.id}`);
    await ctx.reply(rules ? `📜 Group rules:\n${rules}` : "No rules set yet. Admins: /setrules <text>");
  });

  // ---------- free public-API fun commands ----------

  bot.command("weather", async (ctx) => {
    const city = ctx.match;
    if (!city) return ctx.reply("Usage: /weather <city>");
    await withTyping(ctx, "typing", async () => ctx.reply(await getWeather(city)));
  });

  bot.command("quote", async (ctx) => {
    await withTyping(ctx, "typing", async () => ctx.reply(await getQuote()));
  });

  bot.command("joke", async (ctx) => {
    await withTyping(ctx, "typing", async () => ctx.reply(await getJoke()));
  });

  bot.command("trivia", async (ctx) => {
    await withTyping(ctx, "typing", async () => ctx.reply(await getTrivia()));
  });

  bot.command("crypto", async (ctx) => {
    const coin = ctx.match;
    if (!coin) return ctx.reply("Usage: /crypto <coin id, e.g. bitcoin>");
    await withTyping(ctx, "typing", async () => ctx.reply(await getCryptoPrice(coin)));
  });

  return bot;
}
