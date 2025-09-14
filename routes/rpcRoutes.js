const express = require('express');
const router = express.Router();
const rpcService = require('../services/rpcService');
const portfolioService = require('../services/portfolioService');

// Get native balance for an address (direct RPC call - fast)
router.get('/:network/:address/balance', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    console.log(`💰 Getting balance for ${address} on ${network} (RPC)`);
    
    const result = await rpcService.getNativeBalance(network, address);
    res.json(result);
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      balance: '0'
    });
  }
});

// Get transaction count for an address (direct RPC call - fast)
router.get('/:network/:address/count', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    console.log(`📊 Getting transaction count for ${address} on ${network} (RPC)`);
    
    const result = await rpcService.getTransactionCount(network, address);
    res.json(result);
  } catch (error) {
    console.error('Error getting transaction count:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      count: 0
    });
  }
});

// Get basic account info (balance + transaction count for all networks)
router.get('/:address/info', async (req, res) => {
  try {
    const { address } = req.params;
    
    console.log(`ℹ️ Getting basic account info for ${address} (RPC)`);
    
    const result = await rpcService.getBasicAccountInfo(address);
    
    // Trigger background DB population for new wallets
    setImmediate(async () => {
      try {
        console.log(`🔄 Starting background DB population for ${address}`);
        await portfolioService.getComprehensivePortfolio(address);
        console.log(`✅ Background DB population completed for ${address}`);
      } catch (error) {
        console.error(`❌ Background DB population failed for ${address}:`, error);
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting account info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto-detect networks for an address
router.get('/:address/detect', async (req, res) => {
  try {
    const { address } = req.params;
    
    const networks = rpcService.detectNetwork(address);
    
    res.json({
      success: true,
      address,
      supportedNetworks: networks,
      isValid: networks.length > 0
    });
  } catch (error) {
    console.error('Error detecting networks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      supportedNetworks: [],
      isValid: false
    });
  }
});

// Quick health check for RPC endpoints
router.get('/health', async (req, res) => {
  try {
    // Test a simple RPC call to each network
    const testAddress = {
      'ethereum-mainnet': '0x0000000000000000000000000000000000000000',
      'base-mainnet': '0x0000000000000000000000000000000000000000',
      'solana-mainnet': '11111111111111111111111111111112'
    };
    
    const results = {};
    
    for (const [network, address] of Object.entries(testAddress)) {
      try {
        const balance = await rpcService.getNativeBalance(network, address);
        results[network] = { status: 'ok', balance: balance.balance };
      } catch (error) {
        results[network] = { status: 'error', error: error.message };
      }
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      networks: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
