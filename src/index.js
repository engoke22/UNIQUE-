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
};.replace(/^-?\d+\s*/,"") || "No reason given");
    } else if (action === "unwarn") {
      await putJson(env,`warnings:${msg.chat.id}:${target.id}`,{count:0,reasons:[]});
      await send(env,msg.chat.id,`✅ Warnings cleared for ${mention(target)}.`,{parse_mode:"HTML"});
    }
  } catch (e) {
    await send(env,msg.chat.id,`❌ Action failed. Make sure Unique 001 is an administrator with the required permissions.`);
  }
}

async function showWarnings(env,msg,args) {
  if (!(await requireAdmin(env,msg))) return;
  const target = await targetFrom(msg,args);
  if (!target) { await send(env,msg.chat.id,"Reply to a user's message or provide their numeric Telegram ID."); return; }
  const data = await getJson(env,`warnings:${msg.chat.id}:${target.id}`,{count:0,reasons:[]});
  await send(env,msg.chat.id,`⚠️ ${mention(target)} has ${data.count} warning(s).`,{parse_mode:"HTML"});
}

async function toggle(env,msg,key,valueArg) {
  if (!(await requireAdmin(env,msg))) return;
  const s = await getSettings(env,msg.chat.id);
  let value;
  if (valueArg === "on") value = true;
  else if (valueArg === "off") value = false;
  else value = !Boolean(s[key]);
  s[key] = value;
  await saveSettings(env,msg.chat.id,s);
  await send(env,msg.chat.id,`${value ? "🟢" : "🔴"} ${key} is now ${value ? "ON" : "OFF"}.`);
}

async function settingsText(env,chatId) {
  const s=await getSettings(env,chatId);
  return `╔═══[ ⚙️ ${BRAND} SETTINGS ]═══╗
┃ Welcome: ${s.welcome ? "ON":"OFF"}
┃ Goodbye: ${s.goodbye ? "ON":"OFF"}
┃ Anti-Link: ${s.antilink ? "ON":"OFF"}
┃ Anti-Spam: ${s.antispam ? "ON":"OFF"}
┃ Anti-Flood: ${s.antiflood ? "ON":"OFF"}
┃ Warning limit: ${s.warnLimit}
╚══════════════════════════════╝`;
}

async function handleCommand(env,msg,c) {
  const {cmd,args}=c;
  if (["menu","start"].includes(cmd)) {
    await send(env,msg.chat.id,MENU,{reply_markup:{inline_keyboard:buttons.main}});
    return;
  }
  if (cmd==="help") { await send(env,msg.chat.id,MENU,{reply_markup:{inline_keyboard:buttons.main}}); return; }
  if (cmd==="ping") { await send(env,msg.chat.id,"🏓 PONG — UNIQUE 001 is ONLINE."); return; }
  if (cmd==="time") { await send(env,msg.chat.id,`🕒 ${new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi"})}`); return; }
  if (cmd==="id") {
    const target = replyUser(msg) || msg.from;
    await send(env,msg.chat.id,`🆔 User ID: ${target.id}\n💬 Chat ID: ${msg.chat.id}`);
    return;
  }
  if (cmd==="echo") { await send(env,msg.chat.id,args || "Usage: /echo your text"); return; }
  if (cmd==="info") {
    const target=replyUser(msg)||msg.from;
    await send(env,msg.chat.id,`👤 ${nameOf(target)}\n🆔 ${target.id}\n🔗 Username: ${target.username ? "@"+target.username : "none"}`);
    return;
  }
  if (cmd==="admins") {
    try {
      const admins=await tg(env,"getChatAdministrators",{chat_id:msg.chat.id});
      const text=admins.map((a,i)=>`${i+1}. ${mention(a.user)} — ${a.status}`).join("\n");
      await send(env,msg.chat.id,`👮 ADMINISTRATORS\n\n${text}`,{parse_mode:"HTML"});
    } catch { await send(env,msg.chat.id,"❌ Could not read administrators."); }
    return;
  }
  if (cmd==="rules") {
    const s=await getSettings(env,msg.chat.id);
    await send(env,msg.chat.id,`📖 GROUP RULES\n\n${htmlEscape(s.rules)}`,{parse_mode:"HTML"});
    return;
  }
  if (cmd==="settings") { if(await requireAdmin(env,msg)) await send(env,msg.chat.id,await settingsText(env,msg.chat.id)); return; }
  if (cmd==="setrules") {
    if(!(await requireAdmin(env,msg)))return;
    if(!args){await send(env,msg.chat.id,"Usage: /setrules Your group rules");return;}
    const s=await getSettings(env,msg.chat.id); s.rules=args; await saveSettings(env,msg.chat.id,s);
    await send(env,msg.chat.id,"✅ Group rules updated.");
    return;
  }
  if (["welcome","goodbye","antilink","antispam","antiflood"].includes(cmd)) {
    await toggle(env,msg,cmd,args.toLowerCase());
    return;
  }
  if (cmd==="setwelcome" || cmd==="setgoodbye") {
    if(!(await requireAdmin(env,msg)))return;
    if(!args){await send(env,msg.chat.id,`Usage: /${cmd} Your message\nVariables: {name} {username} {group} {count}`);return;}
    const s=await getSettings(env,msg.chat.id);
    s[cmd==="setwelcome"?"welcomeText":"goodbyeText"]=args;
    await saveSettings(env,msg.chat.id,s);
    await send(env,msg.chat.id,"✅ Message saved.");
    return;
  }
  if (["ban","unban","kick","mute","unmute","warn","unwarn"].includes(cmd)) { await moderation(env,msg,cmd,args); return; }
  if (cmd==="warnings") { await showWarnings(env,msg,args); return; }
  if (cmd==="del") {
    if(!(await requireAdmin(env,msg)))return;
    if(!msg.reply_to_message){await send(env,msg.chat.id,"Reply to the message you want me to delete.");return;}
    const ok=await deleteMessage(env,msg.chat.id,msg.reply_to_message.message_id);
    if(!ok)await send(env,msg.chat.id,"❌ I could not delete that message.");
    return;
  }
  if (cmd==="purge") {
    if(!(await requireAdmin(env,msg)))return;
    const n=Math.min(Math.max(parseInt(args||"10",10)||10,1),100);
    const ids=[];
    for(let i=0;i<n;i++) if(msg.message_id-i>0) ids.push(msg.message_id-i);
    let deleted=0;
    for(const id of ids) if(await deleteMessage(env,msg.chat.id,id))deleted++;
    await send(env,msg.chat.id,`🗑 Deleted approximately ${deleted} message(s).`);
    return;
  }
  if (cmd==="lock" || cmd==="unlock") {
    if(!(await requireAdmin(env,msg)))return;
    try {
      await tg(env,"setChatPermissions",{chat_id:msg.chat.id,permissions:cmd==="lock"?{can_send_messages:false}:{can_send_messages:true,can_send_audios:true,can_send_documents:true,can_send_photos:true,can_send_videos:true,can_send_video_notes:true,can_send_voice_notes:true,can_send_polls:true,can_send_other_messages:true,can_add_web_page_previews:true}});
      await send(env,msg.chat.id,cmd==="lock"?"🔒 Group locked.":"🔓 Group unlocked.");
    } catch { await send(env,msg.chat.id,"❌ Could not change group permissions."); }
    return;
  }
  if (cmd==="stats") {
    try {
      const cinfo=await tg(env,"getChat",{chat_id:msg.chat.id});
      const count=await tg(env,"getChatMemberCount",{chat_id:msg.chat.id});
      await send(env,msg.chat.id,`📊 GROUP STATS\n\nName: ${cinfo.title || "Private chat"}\nType: ${cinfo.type}\nMembers: ${count}`);
    } catch { await send(env,msg.chat.id,"❌ Stats are available in groups/supergroups."); }
    return;
  }
  if (cmd==="members") {
    await send(env,msg.chat.id,"👥 Telegram does not expose a general 'list every member' API to bots. Use /admins for administrators and /stats for member count.");
    return;
  }
  if (cmd==="top") { await send(env,msg.chat.id,"📊 Activity leaderboard is not enabled in this lightweight build. It can be added with KV-based message counting."); return; }
  if (cmd==="quote") { await send(env,msg.chat.id,"“Small steps every day build big results.”\n\n— UNIQUE 001"); return; }
  if (cmd==="joke") { await send(env,msg.chat.id,"Why did the admin mute the bot? Because it kept saying: /help."); return; }
  if (cmd==="fact") { await send(env,msg.chat.id,"🧠 Fact: Telegram bots can manage groups when they are given the necessary administrator permissions."); return; }
  if (cmd==="8ball") {
    const answers=["Yes.","No.","Probably.","Ask again later.","It looks promising.","I don't know yet."];
    await send(env,msg.chat.id,`🎱 ${answers[Math.floor(Math.random()*answers.length)]}`);
    return;
  }
  if (cmd==="broadcast") {
    if(!(await requireOwner(env,msg)))return;
    if(!args){await send(env,msg.chat.id,"Usage: /broadcast message");return;}
    if(!env.BOT_KV){await send(env,msg.chat.id,"KV is required for broadcast recipient storage.");return;}
    const chats=await getJson(env,"broadcast:chats",[]);
    let ok=0;
    for(const chatId of chats){try{await send(env,chatId,args);ok++;}catch{}}
    await send(env,msg.chat.id,`📢 Broadcast finished.\nDelivered: ${ok}/${chats.length}`);
    return;
  }
  if (cmd==="botstats") {
    if(!(await requireOwner(env,msg)))return;
    const chats=await getJson(env,"broadcast:chats",[]);
    await send(env,msg.chat.id,`👑 ${BRAND}\nVersion: ${VERSION}\nOwner: ${OWNER_NAME}\nStored chats: ${chats.length}`);
    return;
  }
}

function interpolate(template,user,chat,count) {
  return String(template)
    .replaceAll("{name}",htmlEscape(nameOf(user)))
    .replaceAll("{username}",htmlEscape(user.username ? "@"+user.username : nameOf(user)))
    .replaceAll("{group}",htmlEscape(chat.title || "this group"))
    .replaceAll("{count}",String(count ?? ""));
}

async function rememberChat(env,chatId) {
  if(!env.BOT_KV)return;
  const chats=await getJson(env,"broadcast:chats",[]);
  if(!chats.includes(chatId)) {
    chats.push(chatId);
    await putJson(env,"broadcast:chats",chats);
  }
}

async function antiProcess(env,msg) {
  if(!isGroup(msg.chat) || !msg.from || msg.from.is_bot || !msg.text) return false;
  const s=await getSettings(env,msg.chat.id);

  if(s.antilink && /(https?:\/\/|www\.|t\.me\/|telegram\.me\/)/i.test(msg.text)) {
    const admin=await isAdmin(env,msg.chat.id,msg.from.id);
    if(!admin) {
      await deleteMessage(env,msg.chat.id,msg.message_id);
      await warnUser(env,msg,{...msg.from},"Unapproved link");
      return true;
    }
  }

  if(s.antiflood) {
    const key=`flood:${msg.chat.id}:${msg.from.id}`;
    const now=Date.now();
    const data=await getJson(env,key,{times:[]});
    data.times=(data.times||[]).filter(t=>now-t<8000);
    data.times.push(now);
    await putJson(env,key,data,15);
    if(data.times.length>=6 && !(await isAdmin(env,msg.chat.id,msg.from.id))) {
      await deleteMessage(env,msg.chat.id,msg.message_id);
      try{await tg(env,"restrictChatMember",{chat_id:msg.chat.id,user_id:msg.from.id,permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+60});}catch{}
      await send(env,msg.chat.id,`🛡 ${mention(msg.from)} was temporarily muted for flooding.`,{parse_mode:"HTML"});
      return true;
    }
  }

  if(s.antisp
