const express = require('express');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const tatumService = require('../services/tatumService');
const prismaService = require('../services/prismaService');

// Single endpoint to populate all three collections for an address
router.post('/populate/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { force = false } = req.query;
    
    console.log(`🔄 Populating all collections for ${address} (force=${force})`);
    
    // Step 1: Check if we need to force refresh
    if (force === 'true') {
      console.log('🧹 Force refresh requested, clearing all cached data');
      await prismaService.clearTransactionCache(address);
      await prismaService.clearPortfolioCache(address);
      // Note: Token summary is cleared automatically when transactions are cleared
    }
    
    // Step 2: Fetch transactions for each chain
    const chains = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    for (const chain of chains) {
      console.log(`🔍 Fetching transactions for ${address} on ${chain}`);
      await tatumService.fetchAndCacheDetailedTransactions(chain, address);
    }
    
    // Step 3: Generate comprehensive portfolio
    console.log(`📊 Generating comprehensive portfolio for ${address}`);
    await portfolioService.getComprehensivePortfolio(address);
    
    // Step 4: Return success response
    res.json({
      success: true,
      message: 'Database population completed',
      address
    });
  } catch (error) {
    console.error('Error in populate route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get database status for an address
router.get('/status/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const chains = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    
    const status = {
      address,
      transactions: {},
      portfolio: null,
      tokenSummaries: {}
    };
    
    // Check transactions
    for (const chain of chains) {
      const txs = await prismaService.getCachedTransactions(address, chain);
      status.transactions[chain] = {
        count: txs.length,
        exists: txs.length > 0
      };
    }
    
    // Check portfolio
    const portfolio = await prismaService.getPortfolio(address);
    status.portfolio = {
      exists: !!portfolio,
      lastUpdated: portfolio ? new Date(JSON.parse(portfolio.portfolioData).lastUpdated) : null
    };
    
    // Check token summaries
    for (const chain of chains) {
      const tokens = await prismaService.getTokenSummary(address, chain);
      status.tokenSummaries[chain] = {
        count: tokens.length,
        exists: tokens.length > 0
      };
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error in status route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all data from all three collections for an address
router.get('/all-data/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log(`📊 Fetching all data for ${address} from all collections`);
    
    const chains = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    const result = {
      address,
      transactions: {},
      tokenSummaries: {},
      portfolio: null
    };
    
    // Get transactions from all chains
    for (const chain of chains) {
      const txs = await prismaService.getCachedTransactions(address, chain);
      result.transactions[chain] = txs;
    }
    
    // Get token summaries from all chains
    for (const chain of chains) {
      const tokens = await prismaService.getTokenSummary(address, chain);
      result.tokenSummaries[chain] = tokens;
    }
    
    // Get portfolio data
    const portfolio = await prismaService.getPortfolio(address);
    if (portfolio) {
      result.portfolio = JSON.parse(portfolio.portfolioData);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;