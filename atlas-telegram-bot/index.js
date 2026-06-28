import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Required environment variables ----
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
// Restrict the bot to your own Telegram user ID so strangers can't use your API credits.
// Get your numeric ID by messaging @userinfobot on Telegram, then set it here.
const ALLOWED_USER_ID = process.env.ALLOWED_TELEGRAM_USER_ID
  ? Number(process.env.ALLOWED_TELEGRAM_USER_ID)
  : null;

if (!TELEGRAM_TOKEN || !ANTHROPIC_API_KEY) {
  console.error('Missing TELEGRAM_BOT_TOKEN or ANTHROPIC_API_KEY in environment. Exiting.');
  process.exit(1);
}

// ---- Load all knowledge docs (master prompts + agent system prompts) into one system prompt ----
const knowledgeDir = path.join(__dirname, 'knowledge');
const knowledgeFiles = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md')).sort();

const knowledgeText = knowledgeFiles
  .map(f => `\n\n===== ${f} =====\n\n` + fs.readFileSync(path.join(knowledgeDir, f), 'utf-8'))
  .join('\n');

const SYSTEM_PROMPT = `You are Atlas, Abtin's orchestrator agent for his High Ticket Sales / DM Closer Engine operation, now reachable over Telegram.

You have access to all of the project's master prompts and sub-agent system prompts below. Apply the right one depending on what Abtin asks for, exactly as described in the Atlas Orchestrator system prompt. Speak as Atlas — direct, concise, no fluff — and keep responses Telegram-appropriate (shorter than a long chat response, no heavy markdown tables since Telegram rendering is limited; use simple dashes/bullets instead).

IMPORTANT — current limitations to be upfront about if relevant:
- This bot does NOT currently have live access to Abtin's Notion (Creator Pipeline / Review Queue) or Slack (#all-sales) the way the Claude.ai chat session does. Those connectors are authenticated separately. If Abtin asks you to update Notion or post to Slack from here, tell him this integration isn't wired up yet in the Telegram bot and that he should do that update in the main Claude.ai chat for now.
- You have no memory of past Telegram conversations beyond this running process's memory — if the bot restarts, conversation history resets.

${knowledgeText}`;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Simple in-memory conversation history per chat (resets on restart/redeploy)
const conversations = new Map();

function getHistory(chatId) {
  if (!conversations.has(chatId)) conversations.set(chatId, []);
  return conversations.get(chatId);
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text) return;

  if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
    bot.sendMessage(chatId, "This bot is private and isn't set up for you.");
    return;
  }

  if (text === '/start') {
    bot.sendMessage(chatId, "Atlas online. Send me anything \u2014 drafting a creator DM, reviewing a draft, thinking through a niche, or pipeline questions (note: I can't write to Notion/Slack from here yet \u2014 that still happens in the main Claude.ai chat).");
    return;
  }

  if (text === '/reset') {
    conversations.set(chatId, []);
    bot.sendMessage(chatId, 'Conversation history cleared.');
    return;
  }

  const history = getHistory(chatId);
  history.push({ role: 'user', content: text });

  // Keep the history from growing unbounded
  const trimmedHistory = history.slice(-20);

  try {
    bot.sendChatAction(chatId, 'typing');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: trimmedHistory,
    });

    const replyText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n\n');

    history.push({ role: 'assistant', content: replyText });
    conversations.set(chatId, history);

    // Telegram has a 4096 char limit per message; split if needed
    const chunks = replyText.match(/[\s\S]{1,3800}/g) || [replyText];
    for (const chunk of chunks) {
      await bot.sendMessage(chatId, chunk);
    }
  } catch (err) {
    console.error('Anthropic API error:', err);
    bot.sendMessage(chatId, 'Something went wrong talking to Claude. Check the server logs.');
  }
});

console.log('Atlas Telegram bot is running...');
