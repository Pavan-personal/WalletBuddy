const express = require('express');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const tatumService = require('../services/tatumService');

// Get comprehensive portfolio for an address
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await portfolioService.getComprehensivePortfolio(address);
    res.json(result);
  } catch (error) {
    console.error('Error in portfolio route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token balances for an address on a specific chain
router.get('/:chain/:address/balances', async (req, res) => {
  try {
    const { chain, address } = req.params;
    const result = await portfolioService.getTokenBalances(chain, address);
    res.json(result);
  } catch (error) {
    console.error('Error in token balances route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transaction summary statistics
router.get('/:address/summary', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await portfolioService.getTransactionSummary(address);
    res.json(result);
  } catch (error) {
    console.error('Error in transaction summary route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check if user owns specific tokens
router.get('/:address/owns/:tokenSymbol', async (req, res) => {
  try {
    const { address, tokenSymbol } = req.params;
    const result = await portfolioService.checkTokenOwnership(address, tokenSymbol);
    res.json(result);
  } catch (error) {
    console.error('Error in token ownership route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token transaction history
router.get('/:address/token/:tokenSymbol/history', async (req, res) => {
  try {
    const { address, tokenSymbol } = req.params;
    const result = await portfolioService.getTokenTransactionHistory(address, tokenSymbol);
    res.json(result);
  } catch (error) {
    console.error('Error in token transaction history route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Refresh portfolio data (force fetch from blockchain)
router.post('/:address/refresh', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Clear cached portfolio
    const prismaService = require('../services/prismaService');
    await prismaService.clearPortfolioCache(address);
    
    // Fetch fresh portfolio
    const result = await portfolioService.getComprehensivePortfolio(address);
    res.json(result);
  } catch (error) {
    console.error('Error in portfolio refresh route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all transactions for an address
router.get('/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain } = req.query;
    
    const prismaService = require('../services/prismaService');
    let transactions = [];
    
    if (chain) {
      transactions = await prismaService.getCachedTransactions(address, chain);
    } else {
      // Get transactions from all chains
      const chains = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
      for (const network of chains) {
        const chainTxs = await prismaService.getCachedTransactions(address, network);
        transactions = [...transactions, ...chainTxs];
      }
    }
    
    res.json({
      success: true,
      data: {
        address,
        chain: chain || 'all',
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Error in transactions route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
