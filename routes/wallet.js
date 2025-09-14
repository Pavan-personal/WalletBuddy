const express = require('express');
const router = express.Router();
const tatumService = require('../services/tatumService');

// Get supported networks
router.get('/networks', async (req, res) => {
  try {
    console.log('🌐 Getting supported networks');
    
    const result = await tatumService.getSupportedNetworks();
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Networks route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get wallet balance
router.get('/:network/:address/balance', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    console.log(`💰 Getting balance for ${address} on ${network}`);
    
    const result = await tatumService.getWalletBalance(network, address);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Balance route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Validate wallet address
router.post('/validate', async (req, res) => {
  try {
    const { network, address } = req.body;
    
    if (!network || !address) {
      return res.status(400).json({
        success: false,
        error: 'Network and address are required'
      });
    }
    
    console.log(`✅ Validating address ${address} on ${network}`);
    
    // Try to get balance to validate address
    const result = await tatumService.getWalletBalance(network, address);
    
    res.json({
      success: true,
      data: {
        address,
        network,
        isValid: result.success,
        message: result.success ? 'Valid address' : 'Invalid address or network'
      }
    });
  } catch (error) {
    console.error('Address validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
