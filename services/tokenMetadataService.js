const axios = require('axios');

class TokenMetadataService {
  constructor() {
    this.cache = new Map(); // Cache token metadata to avoid repeated API calls
    this.cacheTimeout = 3600000; // 1 hour cache
  }

  // Get token metadata from various sources
  async getTokenMetadata(tokenAddress, network = 'solana-mainnet') {
    // Handle undefined or null token addresses
    if (!tokenAddress) {
      return this.getPatternBasedMetadata('unknown');
    }
    
    // Check cache first
    const cacheKey = `${network}-${tokenAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    let metadata = null;

    if (network === 'solana-mainnet') {
      metadata = await this.getSolanaTokenMetadata(tokenAddress);
    } else if (network.includes('ethereum') || network.includes('base')) {
      metadata = await this.getEVMTokenMetadata(tokenAddress, network);
    }

    // Cache the result
    if (metadata) {
      this.cache.set(cacheKey, {
        data: metadata,
        timestamp: Date.now()
      });
    }

    return metadata;
  }

  // Fetch Solana token metadata from multiple sources
  async getSolanaTokenMetadata(tokenAddress) {
    try {
      // Handle undefined or null token addresses
      if (!tokenAddress) {
        return this.getPatternBasedMetadata('unknown');
      }
      
      // Try Jupiter Token List first (most comprehensive)
      let metadata = await this.getFromJupiterTokenList(tokenAddress);
      if (metadata) return metadata;

      // Try Solana Token List
      metadata = await this.getFromSolanaTokenList(tokenAddress);
      if (metadata) return metadata;

      // Try CoinGecko
      metadata = await this.getFromCoinGecko(tokenAddress, 'solana');
      if (metadata) return metadata;

      // Pattern-based fallback
      return this.getPatternBasedMetadata(tokenAddress);

    } catch (error) {
      console.warn(`Error fetching Solana token metadata for ${tokenAddress}:`, error.message);
      return this.getPatternBasedMetadata(tokenAddress);
    }
  }

  // Jupiter Token List (most comprehensive for Solana)
  async getFromJupiterTokenList(tokenAddress) {
    try {
      if (!tokenAddress) {
        return null;
      }
      
      const response = await axios.get('https://token.jup.ag/all', {
        timeout: 5000
      });

      if (!response.data || !Array.isArray(response.data)) {
        return null;
      }

      const token = response.data.find(t => 
        t && t.address && tokenAddress && 
        t.address.toLowerCase() === tokenAddress.toLowerCase()
      );

      if (token) {
        return {
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          source: 'jupiter'
        };
      }
    } catch (error) {
      console.warn('Jupiter API error:', error.message);
    }
    return null;
  }

  // Solana Token List
  async getFromSolanaTokenList(tokenAddress) {
    try {
      if (!tokenAddress) {
        return null;
      }
      
      const response = await axios.get('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json', {
        timeout: 5000
      });

      if (!response.data || !response.data.tokens || !Array.isArray(response.data.tokens)) {
        return null;
      }

      const token = response.data.tokens.find(t => 
        t && t.address && tokenAddress && 
        t.address.toLowerCase() === tokenAddress.toLowerCase()
      );

      if (token) {
        return {
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          source: 'solana-token-list'
        };
      }
    } catch (error) {
      console.warn('Solana Token List API error:', error.message);
    }
    return null;
  }

  // CoinGecko API
  async getFromCoinGecko(tokenAddress, platform) {
    try {
      if (!tokenAddress) {
        return null;
      }
      
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${platform}/contract/${tokenAddress}`, {
        timeout: 5000
      });

      if (response.data) {
        return {
          symbol: response.data.symbol?.toUpperCase(),
          name: response.data.name,
          decimals: response.data.detail_platforms?.[platform]?.decimal_place || 6,
          logoURI: response.data.image?.small,
          source: 'coingecko'
        };
      }
    } catch (error) {
      // CoinGecko often returns 404 for new tokens, which is normal
      if (error.response?.status !== 404) {
        console.warn('CoinGecko API error:', error.message);
      }
    }
    return null;
  }

  // EVM token metadata (Ethereum, Base, etc.)
  async getEVMTokenMetadata(tokenAddress, network) {
    try {
      if (!tokenAddress) {
        return this.getPatternBasedMetadata('unknown');
      }
      
      // Try CoinGecko first
      let platform = 'ethereum';
      if (network.includes('base')) platform = 'base';

      const metadata = await this.getFromCoinGecko(tokenAddress, platform);
      if (metadata) return metadata;

      // Pattern-based fallback
      return this.getPatternBasedMetadata(tokenAddress);

    } catch (error) {
      console.warn(`Error fetching EVM token metadata for ${tokenAddress}:`, error.message);
      return this.getPatternBasedMetadata(tokenAddress);
    }
  }

  // Pattern-based metadata as fallback
  getPatternBasedMetadata(tokenAddress) {
    // Handle undefined or invalid token addresses
    if (!tokenAddress || tokenAddress === 'unknown') {
      return {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 0,
        source: 'pattern-unknown'
      };
    }
    
    const shortAddr = tokenAddress.substring(0, 8);

    // Pump.fun pattern
    if (tokenAddress.endsWith('pump')) {
      return {
        symbol: `PUMP-${shortAddr}`,
        name: `Pump.fun Token (${shortAddr})`,
        decimals: 6,
        source: 'pattern-pump'
      };
    }

    // Known major tokens
    const knownTokens = {
      // Solana tokens
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade Staked SOL', decimals: 9 },
      '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', name: 'Lido Staked SOL', decimals: 9 },
      
      // VINE token
      '4Q6WW2ouZ6V3iaF56hgF6hXWgJtT4nXgKcQzqo7Wn1fQ': { symbol: 'VINE', name: 'VINE Token', decimals: 9 },
      
      // TRUMP tokens
      '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN': { symbol: 'TRUMP', name: 'Trump Token', decimals: 6 },
      'E4jzcSdKf6bD8L4DPQj5iW7t9yTUa4kXfFuTGM7cdqTb': { symbol: 'TRUMP', name: 'Trump Token', decimals: 6 },
      '4h8LjZWUfUQVgbEZ29UzTuGXNW6rwrJis78ZU66ekkPV': { symbol: 'TRUMP', name: 'Trump Token', decimals: 6 },
      
      // DOGE
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'DOGE', name: 'Dogecoin', decimals: 8 },
      
      // Jupiter
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter', decimals: 6 },
      
      // UFD
      'UFDGrSH8iE9J8jMQAVpY6qAHdMnQC8pg1UjmTDfhcQn': { symbol: 'UFD', name: 'UFD Token', decimals: 9 },
      
      // Base tokens
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', name: 'USD Coin', decimals: 6 }, // Base USDC
      
      // Ethereum tokens
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', name: 'USD Coin', decimals: 6 }, // Ethereum USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6 }, // Ethereum USDT
    };

    const known = knownTokens[tokenAddress];
    if (known) {
      return {
        ...known,
        source: 'pattern-known'
      };
    }

    // Generic fallback
    return {
      symbol: `TOKEN-${shortAddr}`,
      name: `Token (${shortAddr})`,
      decimals: tokenAddress.length === 42 ? 18 : 6, // EVM vs Solana default
      source: 'pattern-generic'
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new TokenMetadataService();
