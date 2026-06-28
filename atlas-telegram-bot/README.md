# Atlas Telegram Bot — High Ticket Sales Project

Lets Abtin talk to "Atlas" (the orchestrator) and reference all of the High Ticket Sales / DM Closer Engine system prompts, from Telegram on his phone.

## What this does

- Runs a Telegram bot that forwards your messages to Claude (via the Anthropic API) with Atlas's full system prompt and all sub-agent prompts loaded as context.
- Replies in Telegram, with basic per-chat conversation memory (resets if the bot restarts).
- Lets you draft outreach, get critique, think through prospecting/qualification, etc. on the go.

## What this does NOT do yet (be aware)

- **No live Notion or Slack access.** The Claude.ai chat session has Notion/Slack connected via your account's OAuth — this standalone bot does not, and wiring that up is a separate, more advanced step (each service needs its own API credentials configured for the bot). For now, if you ask Atlas here to update the pipeline or post to Slack, it will tell you to do that in the main Claude.ai chat instead.
- **No scheduled/automatic runs.** This only responds when you message it — it doesn't proactively run the Prospecting Agent or push digests on its own. That's a separate Cowork scheduled task, unrelated to this bot.

## Setup

### 1. Get a Telegram bot token
1. Open Telegram, message **@BotFather**.
2. Send `/newbot`, follow the prompts (name + username ending in "bot").
3. Save the token it gives you.

### 2. Get an Anthropic API key
1. Go to https://console.anthropic.com, sign in, add credit.
2. Settings → API Keys → Create Key. Save it.

### 3. (Recommended) Find your Telegram user ID
1. Message **@userinfobot** on Telegram — it replies with your numeric ID.
2. This restricts the bot so only you can use it (otherwise anyone who finds your bot's username could message it and spend your API credit).

### 4. Install dependencies (if running locally to test)
```bash
npm install
```

### 5. Configure environment variables
Copy `.env.example` to `.env` and fill in:
```
TELEGRAM_BOT_TOKEN=...
ANTHROPIC_API_KEY=...
ALLOWED_TELEGRAM_USER_ID=...
```

### 6. Run it
**Locally (for testing):**
```bash
npm start
```

**Deploy to Railway (recommended for 24/7 uptime):**
1. Push this folder to a new GitHub repo.
2. Go to railway.app, sign in, "New Project" → "Deploy from GitHub repo" → select this repo.
3. In Railway's dashboard, go to Variables and add the same three environment variables from `.env`.
4. Railway will build and run it automatically (`npm start`). Check the logs for "Atlas Telegram bot is running..."

### 7. Talk to it
Open Telegram, find your bot by the username you gave it, send `/start`, then just message it normally.

## Commands

- `/start` — confirms the bot is online
- `/reset` — clears conversation memory for that chat

## Updating Atlas's knowledge

If you update any of the master prompts or agent system prompts in the Claude.ai project, copy the updated `.md` files into the `knowledge/` folder here and redeploy (push to GitHub; Railway auto-redeploys) so the Telegram bot stays in sync with what's in Project Knowledge.
