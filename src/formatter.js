/**
 * Formatter Module - Formats coin data for Telegram messages
 */

class Formatter {
  /**
   * Format market cap to readable string
   * @param {number} marketCap - Raw market cap value
   * @returns {string}
   */
  formatMarketCap(marketCap) {
    if (!marketCap || marketCap === 0) return 'N/A';
    
    if (marketCap >= 1_000_000_000) {
      return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
    } else if (marketCap >= 1_000_000) {
      return `$${(marketCap / 1_000_000).toFixed(2)}M`;
    } else if (marketCap >= 1_000) {
      return `$${(marketCap / 1_000).toFixed(2)}K`;
    } else {
      return `$${marketCap.toFixed(2)}`;
    }
  }

  /**
   * Format time ago from timestamp
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string}
   */
  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) {
      return 'just now';
    } else if (minutes < 60) {
      return `${minutes} min ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Format coin data into Telegram message
   * @param {Object} coin - Coin data object
   * @returns {string} - HTML formatted message
   */
  formatCoinMessage(coin) {
    const name = coin.name || 'Unknown';
    const symbol = coin.symbol || '???';
    const mint = coin.mint || coin.address || '';
    const marketCap = coin.marketCap || coin.usdMarketCap || coin.market_cap || 0;
    const createdAt = coin.createdTimestamp || coin.created_at || coin.created || 0;
    
    const formattedMC = this.formatMarketCap(marketCap);
    const timeAgo = this.formatTimeAgo(createdAt);
    
    return `
🚀 <b>Только что вошла в Trending!</b>

🪙 <b>${this.escapeHtml(name)}</b> ($${this.escapeHtml(symbol)})
💰 MCap: ${formattedMC}
⏰ Created: ${timeAgo}
🔗 <a href="https://pump.fun/coin/${mint}">Pump.fun</a> | <a href="https://dexscreener.com/solana/${mint}">DexScreener</a>

<code>${mint}</code>
    `.trim();
  }

  /**
   * Escape HTML special characters
   * @param {string} text 
   * @returns {string}
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Format startup message
   * @param {number} intervalMs - Polling interval in ms
   * @returns {string}
   */
  formatStartupMessage(intervalMs) {
    const seconds = Math.floor(intervalMs / 1000);
    return `✅ <b>Pump.fun Trending Monitor запущен</b>\n⏱ Интервал проверки: ${seconds} сек`;
  }

  /**
   * Format status message
   * @param {Object} stats - Bot statistics
   * @returns {string}
   */
  formatStatusMessage(stats) {
    const { uptime, trackedCount, lastCheck, isRunning } = stats;
    
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);
    
    return `
📊 <b>Статус бота</b>

🟢 Статус: ${isRunning ? 'Работает' : 'Остановлен'}
⏱ Uptime: ${uptimeHours}ч ${uptimeMinutes}м
📈 Отслеживается монет: ${trackedCount}
🕐 Последняя проверка: ${lastCheck || 'Нет данных'}
    `.trim();
  }
}

module.exports = Formatter;
