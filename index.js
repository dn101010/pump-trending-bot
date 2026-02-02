const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Config
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS) || 15000;
const MAX_AGE_HOURS = 3;

// Validate
if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Missing BOT_TOKEN or CHAT_ID');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN);
const notified = new Map(); // CA -> timestamp

// Clean old entries every 10 min
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [ca, ts] of notified) {
    if (ts < cutoff) notified.delete(ca);
  }
}, 10 * 60 * 1000);

async function fetchTrending() {
  const endpoints = [
    'https://frontend-api.pump.fun/coins/trending',
    'https://client-api-2-74b1891ee9f9.herokuapp.com/coins?sort=trending'
  ];

  for (const url of endpoints) {
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://pump.fun/'
        }
      });
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.log(`[${new Date().toISOString()}] ${url} failed: ${e.message}`);
    }
  }
  return null;
}

function isYoung(coin) {
  if (!coin.created_timestamp) return true;
  const created = new Date(coin.created_timestamp).getTime();
  const age = Date.now() - created;
  return age < MAX_AGE_HOURS * 60 * 60 * 1000;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendNotification(coin) {
  const name = escapeHtml(coin.name || coin.symbol || 'Unknown');
  const ca = coin.mint || coin.address || 'N/A';

  const message = `<b>${name}</b>\n<code>${ca}</code>`;

  try {
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
    console.log(`[${new Date().toISOString()}] Sent: ${name}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Telegram error: ${e.message}`);
  }
}

async function check() {
  console.log(`[${new Date().toISOString()}] Checking trending...`);

  const coins = await fetchTrending();
  if (!coins) {
    console.log(`[${new Date().toISOString()}] No data`);
    return;
  }

  for (const coin of coins) {
    const ca = coin.mint || coin.address;
    if (!ca) continue;

    if (notified.has(ca)) continue;
    if (!isYoung(coin)) continue;

    notified.set(ca, Date.now());
    await sendNotification(coin);

    // Small delay between messages
    await new Promise(r => setTimeout(r, 500));
  }
}

// Start
console.log(`[${new Date().toISOString()}] Bot starting...`);
console.log(`Poll interval: ${POLL_INTERVAL}ms`);

check();
setInterval(check, POLL_INTERVAL);
