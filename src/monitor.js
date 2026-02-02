/**
 * Monitor Module - Fetches and monitors pump.fun trending data
 */

const axios = require('axios');

class Monitor {
  constructor() {
    // API endpoints to try (in order of priority)
    this.endpoints = [
      {
        url: 'https://frontend-api.pump.fun/coins/trending',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        parser: (data) => this.parsePumpFunResponse(data)
      },
      {
        url: 'https://client-api-2-74b1891ee9f9.herokuapp.com/coins?sort=trending',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        parser: (data) => this.parsePumpFunResponse(data)
      },
      {
        url: 'https://api.dexscreener.com/token-boosts/top/v1',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        parser: (data) => this.parseDexScreenerResponse(data)
      }
    ];

    // Only show coins created less than 3 hours ago (fresh coins)
    this.MAX_AGE_HOURS = 3;
    
    // Last check timestamp
    this.lastCheck = null;
  }

  /**
   * Fetch trending coins from pump.fun
   * @returns {Promise<Array>} - Array of coin objects
   */
  async fetchTrending() {
    console.log(`[${new Date().toISOString()}] Fetching trending coins...`);
    
    for (const endpoint of this.endpoints) {
      try {
        console.log(`[${new Date().toISOString()}] Trying: ${endpoint.url}`);
        
        const response = await axios.get(endpoint.url, {
          headers: endpoint.headers,
          timeout: 10000
        });
        
        console.log(`[${new Date().toISOString()}] Response status: ${response.status}`);
        
        if (response.data) {
          const coins = endpoint.parser(response.data);
          console.log(`[${new Date().toISOString()}] Parsed ${coins.length} coins`);
          
          this.lastCheck = new Date().toISOString();
          
          // Filter only fresh coins
          const freshCoins = this.filterFreshCoins(coins);
          console.log(`[${new Date().toISOString()}] Fresh coins (< ${this.MAX_AGE_HOURS}h): ${freshCoins.length}`);
          
          return freshCoins;
        }
      } catch (error) {
        console.log(`[${new Date().toISOString()}] Error with ${endpoint.url}: ${error.message}`);
        continue;
      }
    }
    
    console.log(`[${new Date().toISOString()}] All endpoints failed`);
    return [];
  }

  /**
   * Parse pump.fun API response
   * @param {Object} data - Raw API response
   * @returns {Array}
   */
  parsePumpFunResponse(data) {
    // Handle different response formats
    let coins = [];
    
    if (Array.isArray(data)) {
      coins = data;
    } else if (data.coins && Array.isArray(data.coins)) {
      coins = data.coins;
    } else if (data.data && Array.isArray(data.data)) {
      coins = data.data;
    }
    
    return coins.map(coin => ({
      name: coin.name || coin.tokenName,
      symbol: coin.symbol || coin.ticker || coin.tokenSymbol,
      mint: coin.mint || coin.address || coin.id,
      marketCap: coin.marketCap || coin.usdMarketCap || coin.market_cap || 0,
      volume: coin.volume || coin.volume24h || 0,
      createdTimestamp: coin.createdTimestamp || coin.created_at || coin.created || Date.now(),
      url: coin.mint ? `https://pump.fun/coin/${coin.mint}` : null
    })).filter(coin => coin.mint); // Only return coins with mint address
  }

  /**
   * Parse DexScreener response
   * @param {Object} data - Raw API response
   * @returns {Array}
   */
  parseDexScreenerResponse(data) {
    if (!data || !Array.isArray(data)) return [];
    
    // Filter for Solana tokens with pump.fun links
    return data
      .filter(item => {
        const isSolana = item.chainId === 'solana';
        const hasPumpFun = item.url && item.url.includes('pump.fun');
        return isSolana || hasPumpFun;
      })
      .map(item => ({
        name: item.tokenName || item.name,
        symbol: item.tokenSymbol || item.symbol,
        mint: item.tokenAddress || item.address,
        marketCap: item.marketCap || item.market_cap || 0,
        volume: item.volume || 0,
        createdTimestamp: item.createdTimestamp || Date.now(),
        url: item.url
      }))
      .filter(coin => coin.mint);
  }

  /**
   * Filter only fresh coins (created less than MAX_AGE_HOURS ago)
   * @param {Array} coins - Array of coin objects
   * @returns {Array}
   */
  filterFreshCoins(coins) {
    const maxAgeMs = this.MAX_AGE_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    
    return coins.filter(coin => {
      const age = now - (coin.createdTimestamp || 0);
      return age < maxAgeMs;
    });
  }

  /**
   * Get last check timestamp
   * @returns {string|null}
   */
  getLastCheck() {
    return this.lastCheck;
  }
}

module.exports = Monitor;
