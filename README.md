# Telegram OpenRouter AI Bot

## Files
- src/index.js - Main Cloudflare Worker bot code
- package.json - Project configuration
- wrangler.toml - Cloudflare Worker configuration

## Required Cloudflare Secrets
Add these in Cloudflare Worker settings. Do NOT put them in GitHub:

- TELEGRAM_BOT_TOKEN
- OPENROUTER_API_KEY
- OWNER_ID

OWNER_ID must be the Telegram numeric user ID of the bot owner.

## Commands
- /start
- /owner

## Deployment
Upload these files to your GitHub repository, then connect or deploy the repository with Cloudflare Workers.
After deployment, set the Telegram webhook to your Worker URL.
