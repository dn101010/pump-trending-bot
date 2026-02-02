/**
 * Pump.fun Trending Bot - Entry Point
 * Instant notifications when coins enter trending (like mobile app)
 */

const Bot = require('./src/bot');

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.log(`[${new Date().toISOString()}] UNCAUGHT EXCEPTION:`, error.message);
  console.log(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log(`[${new Date().toISOString()}] UNHANDLED REJECTION at:`, promise, 'reason:', reason);
});

// Start the bot
const bot = new Bot();
bot.start();
