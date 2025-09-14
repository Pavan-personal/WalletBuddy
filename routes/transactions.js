const express = require('express');
const router = express.Router();
const tatumService = require('../services/tatumService');
const prismaService = require('../services/prismaService');

// Get detailed transactions (cached or fresh)
router.get('/:network/:address/detailed', async (req, res) => {
  try {
    const { network, address } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const forceRefresh = req.query.refresh === 'true';

    console.log(`📊 Getting detailed transactions for ${address} on ${network}`);

    if (forceRefresh) {
      // Clear cache and fetch fresh data
      await prismaService.clearPortfolioCache(address);
    }

    const result = await tatumService.fetchAndCacheDetailedTransactions(network, address, limit);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting detailed transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get transactions by specific token
router.get('/:network/:address/token/:tokenAddress', async (req, res) => {
  try {
    const { network, address, tokenAddress } = req.params;
    
    console.log(`🔍 Getting transactions for token ${tokenAddress} on ${network}`);
    
    const transactions = await prismaService.getCachedTransactionsByToken(address, network, tokenAddress);
    
    res.json({
      success: true,
      data: {
        address,
        network,
        tokenAddress,
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Error getting token transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search transactions by token name/symbol
router.get('/:network/:address/search', async (req, res) => {
  try {
    const { network, address } = req.params;
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term (q) is required'
      });
    }
    
    console.log(`🔍 Searching transactions for "${searchTerm}" on ${network}`);
    
    const transactions = await transactionCache.searchTransactionsByTokenName(address, network, searchTerm);
    
    res.json({
      success: true,
      data: {
        address,
        network,
        searchTerm,
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get transaction by hash
router.get('/:network/tx/:hash', async (req, res) => {
  try {
    const { network, hash } = req.params;
    
    console.log(`🔍 Getting transaction details for hash ${hash} on ${network}`);
    
    const result = await tatumService.getTransactionByHash(network, hash);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error getting transaction by hash:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token summary for a wallet
router.get('/:network/:address/tokens', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    console.log(`📊 Getting token summary for ${address} on ${network}`);
    
    const tokenSummary = await prismaService.getTokenSummary(address, network);
    
    res.json({
      success: true,
      data: {
        address,
        network,
        tokens: tokenSummary,
        count: tokenSummary.length
      }
    });
  } catch (error) {
    console.error('Error getting token summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache for a wallet
router.delete('/:network/:address/cache', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    console.log(`🗑️ Clearing cache for ${address} on ${network}`);
    
    const success = await prismaService.clearTransactionCache(address, network);
    
    res.json({
      success,
      message: success ? 'Cache cleared successfully' : 'Failed to clear cache'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific token analysis (e.g., VINE, TRUMP)
router.get('/:network/:address/analyze/:tokenType', async (req, res) => {
  try {
    const { network, address, tokenType } = req.params;
    
    console.log(`🔍 Analyzing ${tokenType} transactions for ${address} on ${network}`);
    
    // Define token addresses for different types
    const tokenAddresses = {
      'vine': ['4Q6WW2ouZ6V3iaF56hgF6hXWgJtT4nXgKcQzqo7Wn1fQ'],
      'trump': [
        '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
        'E4jzcSdKf6bD8L4DPQj5iW7t9yTUa4kXfFuTGM7cdqTb',
        '4h8LjZWUfUQVgbEZ29UzTuGXNW6rwrJis78ZU66ekkPV'
      ]
    };
    
    const addresses = tokenAddresses[tokenType.toLowerCase()];
    if (!addresses) {
      return res.status(400).json({
        success: false,
        error: `Unknown token type: ${tokenType}. Supported types: vine, trump`
      });
    }
    
    const allTransactions = [];
    let totalBought = 0;
    let totalSold = 0;
    let buyCount = 0;
    let sellCount = 0;
    
    for (const tokenAddress of addresses) {
      const transactions = await prismaService.getCachedTransactionsByToken(address, network, tokenAddress);
      allTransactions.push(...transactions);
      
      // Analyze buy/sell patterns
      for (const tx of transactions) {
        const amount = parseFloat(tx.amount);
        if (amount > 0) {
          totalBought += amount;
          buyCount++;
        } else if (amount < 0) {
          totalSold += Math.abs(amount);
          sellCount++;
        }
      }
    }
    
    // Also search by token name/symbol
    const nameSearch = await prismaService.searchTransactionsByTokenName(address, network, tokenType);
    allTransactions.push(...nameSearch);
    
    res.json({
      success: true,
      data: {
        address,
        network,
        tokenType,
        transactions: allTransactions,
        count: allTransactions.length,
        analysis: {
          totalBought,
          totalSold,
          buyCount,
          sellCount,
          netHolding: totalBought - totalSold,
          hasTraded: allTransactions.length > 0
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing token transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
