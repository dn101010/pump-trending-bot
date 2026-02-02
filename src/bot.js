/**
 * Bot Module - Main Telegram bot controller
 */

const TelegramBot = require('node-telegram-bot-api');
const Monitor = require('./monitor');
const Tracker = require('./tracker');
const Formatter = require('./formatter');

class Bot {
  constructor() {
    // Get config from environment variables
    this.token = process.env.BOT_TOKEN;
    this.chatId = process.env.CHAT_ID;
    this.pollInterval = parseInt(process.env.POLL_INTERVAL_MS) || 15000; // Default: 15 seconds
    
    // Validate required env vars
    if (!this.token) {
      console.error(`[${new Date().toISOString()}] ERROR: BOT_TOKEN not set!`);
      process.exit(1);
    }
    if (!this.chatId) {
      console.error(`[${new Date().toISOString()}] ERROR: CHAT_ID not set!`);
      process.exit(1);
    }
    
    // Initialize components
    this.bot = new TelegramBot(this.token, { polling: true });
    this.monitor = new Monitor();
    this.tracker = new Tracker();
    this.formatter = new Formatter();
    
    // State
    this.isRunning = false;
    this.startTime = Date.now();
    this.checkTimeout = null;
    
    // Bind methods
    this.handleStart = this.handleStart.bind(this);
    this.handleStatus = this.handleStatus.bind(this);
    this.handleCheck = this.handleCheck.bind(this);
    this.performCheck = this.performCheck.bind(this);
    this.scheduleNextCheck = this.scheduleNextCheck.bind(this);
  }

  /**
   * Start the bot
   */
  start() {
    console.log(`[${new Date().toISOString()}] Starting Pump.fun Trending Bot...`);
    console.log(`[${new Date().toISOString()}] Poll interval: ${this.pollInterval}ms`);
    
    // Setup command handlers
    this.setupCommands();
    
    // Send startup message
    const startupMsg = this.formatter.formatStartupMessage(this.pollInterval);
    this.sendMessage(startupMsg);
    
    // Start monitoring
    this.isRunning = true;
    this.performCheck(); // First check immediately
    
    console.log(`[${new Date().toISOString()}] Bot started successfully!`);
  }

  /**
   * Setup Telegram command handlers
   */
  setupCommands() {
    // /start command
    this.bot.onText(/\/start/, this.handleStart);
    
    // /status command
    this.bot.onText(/\/status/, this.handleStatus);
    
    // /check command
    this.bot.onText(/\/check/, this.handleCheck);
    
    // Handle errors
    this.bot.on('error', (error) => {
      console.log(`[${new Date().toISOString()}] Telegram Bot Error:`, error.message);
    });
    
    this.bot.on('polling_error', (error) => {
      console.log(`[${new Date().toISOString()}] Polling Error:`, error.message);
    });
  }

  /**
   * Handle /start command
   */
  handleStart(msg) {
    const chatId = msg.chat.id;
    const welcomeMsg = `
👋 <b>Добро пожаловать в Pump.fun Trending Bot!</b>

Я отслеживаю новые монеты, которые только что попали в трендинг на pump.fun.

<b>Команды:</b>
/status - показать статус бота
/check - принудительная проверка трендинга

⏱ Интервал проверки: ${this.pollInterval / 1000} сек
🎯 Только свежие монеты (< 3 часов)
    `.trim();
    
    this.bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'HTML' });
  }

  /**
   * Handle /status command
   */
  handleStatus(msg) {
    const chatId = msg.chat.id;
    const stats = {
      uptime: Date.now() - this.startTime,
      trackedCount: this.tracker.getCount(),
      lastCheck: this.monitor.getLastCheck(),
      isRunning: this.isRunning
    };
    
    const statusMsg = this.formatter.formatStatusMessage(stats);
    this.bot.sendMessage(chatId, statusMsg, { parse_mode: 'HTML' });
  }

  /**
   * Handle /check command
   */
  async handleCheck(msg) {
    const chatId = msg.chat.id;
    this.bot.sendMessage(chatId, '🔍 Выполняю принудительную проверку...');
    
    try {
      const newCoins = await this.performCheck();
      if (newCoins.length === 0) {
        this.bot.sendMessage(chatId, '✅ Новых монет в трендинге не обнаружено.');
      }
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Ошибка при проверке: ${error.message}`);
    }
  }

  /**
   * Perform trending check and notify about new coins
   * @returns {Promise<Array>} - New coins found
   */
  async performCheck() {
    try {
      const coins = await this.monitor.fetchTrending();
      const newCoins = [];
      
      for (const coin of coins) {
        const mint = coin.mint;
        
        // Skip if already notified
        if (this.tracker.isNotified(mint)) {
          continue;
        }
        
        // Mark as notified
        this.tracker.markNotified(mint);
        newCoins.push(coin);
        
        // Send notification
        await this.notifyCoin(coin);
        
        // Small delay between messages to avoid rate limits
        await this.sleep(500);
      }
      
      if (newCoins.length > 0) {
        console.log(`[${new Date().toISOString()}] Notified about ${newCoins.length} new coins`);
      }
      
      // Schedule next check
      this.scheduleNextCheck();
      
      return newCoins;
    } catch (error) {
      console.log(`[${new Date().toISOString()}] Error in performCheck:`, error.message);
      this.scheduleNextCheck();
      return [];
    }
  }

  /**
   * Send notification about a coin
   * @param {Object} coin - Coin data
   */
  async notifyCoin(coin) {
    const message = this.formatter.formatCoinMessage(coin);
    
    try {
      await this.sendMessage(message);
      console.log(`[${new Date().toISOString()}] Notification sent for: ${coin.name}`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] Failed to send notification:`, error.message);
      
      // Retry once after 3 seconds if rate limited
      if (error.response && error.response.statusCode === 429) {
        await this.sleep(3000);
        try {
          await this.sendMessage(message);
          console.log(`[${new Date().toISOString()}] Retry successful for: ${coin.name}`);
        } catch (retryError) {
          console.log(`[${new Date().toISOString()}] Retry failed:`, retryError.message);
        }
      }
    }
  }

  /**
   * Send message to configured chat
   * @param {string} message - Message text
   */
  async sendMessage(message) {
    return this.bot.sendMessage(this.chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });
  }

  /**
   * Schedule next check
   */
  scheduleNextCheck() {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }
    
    this.checkTimeout = setTimeout(() => {
      this.performCheck();
    }, this.pollInterval);
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop the bot
   */
  stop() {
    this.isRunning = false;
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }
    this.bot.stopPolling();
    console.log(`[${new Date().toISOString()}] Bot stopped`);
  }
}

module.exports = Bot;
