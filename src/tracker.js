/**
 * Tracker Module - Manages notified coins with TTL
 * Prevents duplicate notifications with automatic cleanup
 */

class Tracker {
  constructor() {
    // Map: mint -> timestamp when notified
    this.notifiedCoins = new Map();
    
    // TTL: 6 hours (coins older than this are removed from tracking)
    this.TTL_MS = 6 * 60 * 60 * 1000;
    
    // Run cleanup every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Check if coin was already notified
   * @param {string} mint - Coin mint address
   * @returns {boolean}
   */
  isNotified(mint) {
    return this.notifiedCoins.has(mint);
  }

  /**
   * Mark coin as notified
   * @param {string} mint - Coin mint address
   */
  markNotified(mint) {
    this.notifiedCoins.set(mint, Date.now());
    console.log(`[${new Date().toISOString()}] Marked as notified: ${mint}`);
  }

  /**
   * Get count of tracked coins
   * @returns {number}
   */
  getCount() {
    return this.notifiedCoins.size;
  }

  /**
   * Get all tracked mints (for debugging)
   * @returns {Array}
   */
  getAllTracked() {
    return Array.from(this.notifiedCoins.keys());
  }

  /**
   * Cleanup old entries (older than TTL)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [mint, timestamp] of this.notifiedCoins.entries()) {
      if (now - timestamp > this.TTL_MS) {
        this.notifiedCoins.delete(mint);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[${new Date().toISOString()}] Cleaned up ${cleaned} old entries. Current tracked: ${this.getCount()}`);
    }
  }
}

module.exports = Tracker;
