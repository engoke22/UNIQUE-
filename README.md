# UNIQUE 001 — Telegram Group Management Bot

**Owner:** Lesley Engoke  
**Version:** v1.0.0  
**Runtime:** Cloudflare Workers  
**AI/OpenRouter:** Not used

Unique 001 is a Telegram group-management bot built directly on the Telegram Bot API. It does not use OpenRouter or an AI service.

## Features

### Admin tools
- `/ban` — ban a member
- `/unban` — unban a member
- `/kick` — remove a member
- `/mute` — mute a member
- `/unmute` — unmute a member
- `/warn` — add a warning
- `/warnings` — view warnings
- `/unwarn` — clear warnings
- `/del` — delete a replied-to message
- `/purge 20` — attempt to delete up to 20 recent messages

For member moderation, **reply to the member's message** and run the command. Example:

```text
/warn advertising links
/mute
/ban spam
```

You can also provide a numeric Telegram user ID where Telegram permits the action.

### Group protection

```text
/antilink on
/antilink off

/antispam on
/antispam off

/antiflood on
/antiflood off
```

Anti-link removes common HTTP/HTTPS, `t.me`, and `www.` links from non-admin messages.

Anti-flood watches short bursts of messages and can temporarily mute a flooding member.

Anti-spam detects repeated identical text and warns the sender.

### Welcome / goodbye

```text
/welcome on
/welcome off
/goodbye on
/goodbye off

/setwelcome Welcome {name} to {group}! Use /rules.
/setgoodbye Goodbye {name}!
```

Available variables:

- `{name}`
- `{username}`
- `{group}`
- `{count}`

### Rules

```text
/rules
/setrules Be respectful. No spam. No illegal content.
```

### Group settings

```text
/settings
/lock
/unlock
```

`/lock` restricts normal members from sending messages. `/unlock` restores common sending permissions.

### Utilities

```text
/start
/menu
/help
/ping
/id
/info
/admins
/stats
/members
/time
/echo hello
```

### Fun

```text
/joke
/fact
/quote
/8ball
```

### Owner

```text
/broadcast Your message
/botstats
```

The owner ID is configured with the `OWNER_ID` secret.

## 1. Create the Telegram bot

Open Telegram and talk to **@BotFather**.

Create a new bot and copy the bot token.

Do not put the token directly in `src/index.js`.

## 2. Install Node.js

Install a current LTS version of Node.js.

Then inside this project:

```bash
npm install
```

## 3. Create the Cloudflare KV namespace

Run:

```bash
npx wrangler login
npx wrangler kv namespace create BOT_KV
```

Cloudflare will return a namespace ID.

Open `wrangler.toml` and replace:

```toml
id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"
```

with your real ID.

KV stores:

- group settings
- warnings
- anti-flood state
- known group chat IDs for owner broadcasts

## 4. Add secrets

Run:

```bash
npx wrangler secret put BOT_TOKEN
```

Paste the BotFather token.

Create a strong webhook secret:

```bash
npx wrangler secret put WEBHOOK_SECRET
```

Example format:

```text
Unique001_2026_very_strong_secret
```

Then set the owner's Telegram numeric ID:

```bash
npx wrangler secret put OWNER_ID
```

To find your Telegram ID, add the bot to a group and use `/id`, or use a trusted Telegram ID utility.

## 5. Deploy

```bash
npm run deploy
```

Wrangler will give you a Worker URL similar to:

```text
https://unique-001-telegram-bot.<your-subdomain>.workers.dev
```

Keep that URL.

## 6. Set the Telegram webhook

Use Telegram's Bot API `setWebhook` endpoint.

Replace:

- `BOT_TOKEN` with your bot token
- `WORKER_URL` with your deployed Worker URL
- `WEBHOOK_SECRET` with the exact secret you configured

Example:

```bash
curl -X POST "https://api.telegram.org/botBOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://WORKER_URL",
    "secret_token": "WEBHOOK_SECRET",
    "allowed_updates": ["message", "callback_query"]
  }'
```

A successful response contains:

```json
{
  "ok": true,
  "result": true
}
```

## 7. Add Unique 001 to your group

Add the bot to the Telegram group and promote it to administrator.

For moderation features, give it the permissions it needs:

- Delete messages
- Ban users
- Restrict users
- Invite users, if you want it to manage invites

Telegram's own permissions determine what the bot can actually do.

## 8. Important Telegram privacy setting

For reliable group moderation, open **@BotFather**:

```text
/mybots
→ Unique 001
→ Bot Settings
→ Group Privacy
→ Turn off
```

This allows the bot to receive ordinary group messages that it needs for anti-spam, anti-link and anti-flood processing.

## Interactive menu

Send:

```text
/menu
```

The bot displays a button-based menu:

```text
┌─────────────────────────────┐
│       👑 UNIQUE 001         │
├─────────────────────────────┤
│  👑 Admin     🛡 Protection │
│  ⚙️ Settings  🔧 Utilities  │
│  🎮 Fun       📖 Help       │
└─────────────────────────────┘
```

Buttons navigate between the bot's sections.

## Security

Never commit:

- `BOT_TOKEN`
- `WEBHOOK_SECRET`
- private API keys

The project uses Cloudflare Worker secrets so these values are not stored in GitHub source code.

## Local development

Run:

```bash
npm install
npm run dev
```

For webhook testing during development, use a public HTTPS endpoint. Telegram webhooks cannot deliver updates to an ordinary localhost URL.

## Notes

Telegram controls which moderation operations are possible. The bot must be an administrator and have the relevant permissions.

The `/members` command does not attempt to enumerate every group member because Telegram's Bot API does not provide a general "list all members" method. It directs users to `/admins` and `/stats`.

The bot is intentionally built without OpenRouter. All command logic runs in the Worker and calls Telegram's Bot API directly.

## Project structure

```text
UNIQUE-001/
├── src/
│   └── index.js
├── README.md
├── package.json
└── wrangler.toml
```

## License

You can modify and deploy this project for your own bot.
