const express = require('express');
const router = express.Router();
const tatumService = require('../services/tatumService');
const geminiService = require('../services/geminiService');

// Get portfolio data for a wallet
router.get('/:network/:address', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    console.log(`📊 Getting portfolio for ${address} on ${network}`);
    
    const result = await tatumService.getWalletPortfolio(network, address);
    
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
    console.error('Portfolio route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get portfolio analysis with AI
router.post('/analyze', async (req, res) => {
  try {
    const { network, address } = req.body;
    
    if (!network || !address) {
      return res.status(400).json({
        success: false,
        error: 'Network and address are required'
      });
    }
    
    console.log(`🤖 Analyzing portfolio for ${address} on ${network}`);
    
    // Get portfolio data
    const portfolioResult = await tatumService.getWalletPortfolio(network, address);
    
    if (!portfolioResult.success) {
      return res.status(400).json({
        success: false,
        error: portfolioResult.error
      });
    }
    
    // Analyze with Gemini AI
    const analysisResult = await geminiService.analyzePortfolio(portfolioResult.data);
    
    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: analysisResult.error
      });
    }
    
    res.json({
      success: true,
      data: {
        portfolio: portfolioResult.data,
        analysis: analysisResult.data
      }
    });
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Generate portfolio card
router.post('/card', async (req, res) => {
  try {
    const { network, address } = req.body;
    
    if (!network || !address) {
      return res.status(400).json({
        success: false,
        error: 'Network and address are required'
      });
    }
    
    console.log(`🎴 Generating portfolio card for ${address} on ${network}`);
    
    // Get portfolio data
    const portfolioResult = await tatumService.getWalletPortfolio(network, address);
    
    if (!portfolioResult.success) {
      return res.status(400).json({
        success: false,
        error: portfolioResult.error
      });
    }
    
    // Analyze portfolio
    const analysisResult = await geminiService.analyzePortfolio(portfolioResult.data);
    
    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        error: analysisResult.error
      });
    }
    
    // Generate card
    const cardResult = await geminiService.generatePortfolioCard(
      portfolioResult.data, 
      analysisResult.data
    );
    
    if (!cardResult.success) {
      return res.status(500).json({
        success: false,
        error: cardResult.error
      });
    }
    
    res.json({
      success: true,
      data: {
        portfolio: portfolioResult.data,
        analysis: analysisResult.data,
        card: cardResult.data
      }
    });
  } catch (error) {
    console.error('Portfolio card generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get transaction history
router.get('/:network/:address/transactions', async (req, res) => {
  try {
    const { network, address } = req.params;
    const { limit = 100 } = req.query;
    
    console.log(`📜 Getting transaction history for ${address} on ${network}`);
    
    const result = await tatumService.getTransactionHistory(network, address, parseInt(limit));
    
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
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get comprehensive transaction summary (Solscan-like)
router.get('/:network/:address/summary', async (req, res) => {
  try {
    const { network, address } = req.params;
    
    console.log(`📊 Getting comprehensive summary for ${address} on ${network}`);
    
    const portfolioResult = await tatumService.getWalletPortfolio(network, address);
    
    if (!portfolioResult.success) {
      return res.status(400).json({
        success: false,
        error: portfolioResult.error
      });
    }
    
    const portfolio = portfolioResult.data;
    const transactions = portfolio.transactions || [];
    
    // Calculate comprehensive statistics
    const totalTransactions = transactions.length;
    const successfulTxs = transactions.filter(tx => tx.transactionSubtype === 'success').length;
    const failedTxs = transactions.filter(tx => tx.transactionSubtype === 'failed').length;
    
    const incomingTxs = transactions.filter(tx => parseFloat(tx.amount) > 0);
    const outgoingTxs = transactions.filter(tx => parseFloat(tx.amount) < 0);
    
    const totalReceived = incomingTxs.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
    const totalSent = Math.abs(outgoingTxs.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0));
    const netFlow = totalReceived - totalSent;
    
    const totalFees = transactions.reduce((sum, tx) => sum + (parseFloat(tx.fee) || 0), 0);
    
    // Find first and last transactions
    const sortedTxs = transactions.sort((a, b) => b.timestamp - a.timestamp);
    const firstTx = sortedTxs[sortedTxs.length - 1];
    const lastTx = sortedTxs[0];
    
    // Find biggest transactions
    const biggestIncoming = incomingTxs.length > 0 ? 
      incomingTxs.reduce((max, tx) => 
        (parseFloat(tx.amount) || 0) > (parseFloat(max.amount) || 0) ? tx : max
      ) : null;
    
    const biggestOutgoing = outgoingTxs.length > 0 ? 
      outgoingTxs.reduce((min, tx) => 
        (parseFloat(tx.amount) || 0) < (parseFloat(min.amount) || 0) ? tx : min
      ) : null;
    
    // Calculate activity by time periods
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const txsLast24h = transactions.filter(tx => tx.timestamp > oneDayAgo).length;
    const txsLastWeek = transactions.filter(tx => tx.timestamp > oneWeekAgo).length;
    const txsLastMonth = transactions.filter(tx => tx.timestamp > oneMonthAgo).length;
    
    const summary = {
      address: portfolio.address,
      network: portfolio.network,
      balance: portfolio.balance,
      overview: {
        totalTransactions,
        successfulTransactions: successfulTxs,
        failedTransactions: failedTxs,
        successRate: totalTransactions > 0 ? ((successfulTxs / totalTransactions) * 100).toFixed(2) + '%' : '0%'
      },
      financial: {
        totalReceived: totalReceived.toFixed(9),
        totalSent: totalSent.toFixed(9),
        netFlow: netFlow.toFixed(9),
        totalFees: totalFees.toFixed(9),
        currentBalance: portfolio.balance || '0'
      },
      activity: {
        last24Hours: txsLast24h,
        lastWeek: txsLastWeek,
        lastMonth: txsLastMonth,
        averagePerDay: txsLastWeek > 0 ? (txsLastWeek / 7).toFixed(2) : '0'
      },
      transactions: {
        firstTransaction: firstTx ? {
          hash: firstTx.hash,
          timestamp: firstTx.timestamp,
          amount: firstTx.amount,
          blockNumber: firstTx.blockNumber
        } : null,
        lastTransaction: lastTx ? {
          hash: lastTx.hash,
          timestamp: lastTx.timestamp,
          amount: lastTx.amount,
          blockNumber: lastTx.blockNumber
        } : null,
        biggestIncoming: biggestIncoming ? {
          hash: biggestIncoming.hash,
          amount: biggestIncoming.amount,
          timestamp: biggestIncoming.timestamp,
          blockNumber: biggestIncoming.blockNumber
        } : null,
        biggestOutgoing: biggestOutgoing ? {
          hash: biggestOutgoing.hash,
          amount: biggestOutgoing.amount,
          timestamp: biggestOutgoing.timestamp,
          blockNumber: biggestOutgoing.blockNumber
        } : null
      },
      tokens: {
        totalTokens: portfolio.tokens?.length || 0,
        nativeBalance: portfolio.tokens?.find(t => t.tokenAddress === 'native')?.balance || '0'
      },
      nfts: {
        totalNFTs: portfolio.nfts?.length || 0
      },
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Transaction summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Comprehensive analysis endpoint
router.get('/:network/:address/comprehensive', async (req, res) => {
  try {
    const { network, address } = req.params;

    console.log(`🔍 Getting comprehensive analysis for ${address} on ${network}`);

    const analysisResult = await tatumService.getComprehensiveAnalysis(network, address);

    if (!analysisResult.success) {
      return res.status(400).json({
        success: false,
        error: analysisResult.error
      });
    }

    res.json({
      success: true,
      data: analysisResult.data
    });

  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
