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
    
    // Step 2: Fetch and store transactions for all networks
    const networks = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    const transactionResults = {};
    
    for (const network of networks) {
      console.log(`🔍 Fetching transactions for ${address} on ${network}`);
      try {
        const txs = await tatumService.fetchAndCacheDetailedTransactions(network, address);
        transactionResults[network] = {
          success: true,
          count: txs.length
        };
      } catch (error) {
        console.error(`Error fetching transactions for ${network}:`, error);
        transactionResults[network] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Step 3: Generate comprehensive portfolio (which will populate wallet_portfolio)
    console.log(`📊 Generating comprehensive portfolio for ${address}`);
    const portfolioResult = await portfolioService.getComprehensivePortfolio(address);
    
    // Step 4: Return status of all operations
    res.json({
      success: true,
      address,
      transactions: transactionResults,
      portfolio: {
        success: portfolioResult.success,
        cached: portfolioResult.cached || false
      },
      message: 'Database population completed'
    });
    
  } catch (error) {
    console.error('Error in populate route:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to populate database collections'
    });
  }
});

// Get population status for an address
router.get('/status/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Check transactions in each network
    const networks = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    const status = {
      address,
      transactions: {},
      portfolio: null,
      tokenSummary: null
    };
    
    // Check transactions
    for (const network of networks) {
      const txs = await prismaService.getCachedTransactions(address, network, 1);
      status.transactions[network] = {
        exists: txs && txs.length > 0,
        count: txs ? txs.length : 0
      };
    }
    
    // Check portfolio
    const portfolio = await prismaService.getPortfolio(address);
    status.portfolio = {
      exists: !!portfolio,
      lastUpdated: portfolio ? portfolio.lastUpdated : null
    };
    
    // Check token summary
    const tokenSummary = await prismaService.getTokenSummary(address);
    status.tokenSummary = {
      exists: !!tokenSummary && tokenSummary.length > 0,
      count: tokenSummary ? tokenSummary.length : 0
    };
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Error in population status route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
