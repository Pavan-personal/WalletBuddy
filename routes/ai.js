const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const tatumService = require('../services/tatumService');
const prismaService = require('../services/prismaService');
const rpcService = require('../services/rpcService');

// Ask AI a question about portfolio
router.post('/ask', async (req, res) => {
  try {
    const { question, network, address } = req.body;
    
    if (!question || !network || !address) {
      return res.status(400).json({
        success: false,
        error: 'Question, network, and address are required'
      });
    }
    
    console.log(`🤖 AI Question: "${question}" for ${address} on ${network}`);
    
    // Get detailed transaction data (cached or fresh)
    const transactionResult = await tatumService.fetchAndCacheDetailedTransactions(network, address);
    
    if (!transactionResult.success) {
      return res.status(500).json({
        success: false,
        error: transactionResult.error
      });
    }

    // Get token summary
    const tokenSummary = await prismaService.getTokenSummary(address, network);

    // Create enhanced portfolio data for AI
    const enhancedPortfolioData = {
      address,
      network,
      balance: '0', // Will be calculated from transactions
      tokens: tokenSummary,
      nfts: [], // Not implemented yet
      transactions: transactionResult.data.transactions,
      cached: transactionResult.data.cached
    };
    
    // Get AI answer with enhanced data
    const answerResult = await geminiService.answerQuestion(question, enhancedPortfolioData);
    
    if (!answerResult.success) {
      return res.status(500).json({
        success: false,
        error: answerResult.error
      });
    }
    
    res.json({
      success: true,
      data: answerResult.data
    });
  } catch (error) {
    console.error('AI question error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get quick stats
router.post('/stats', async (req, res) => {
  try {
    const { network, address } = req.body;
    
    if (!network || !address) {
      return res.status(400).json({
        success: false,
        error: 'Network and address are required'
      });
    }
    
    console.log(`📊 Getting quick stats for ${address} on ${network}`);
    
    // Get portfolio data
    const portfolioResult = await tatumService.getWalletPortfolio(network, address);
    
    if (!portfolioResult.success) {
      return res.status(400).json({
        success: false,
        error: portfolioResult.error
      });
    }
    
    // Calculate quick stats
    const portfolio = portfolioResult.data;
    const transactions = portfolio.transactions || [];
    
    // Calculate win rate (simplified)
    const profitableTxs = transactions.filter(tx => 
      tx.type === 'transfer' && parseFloat(tx.value) > 0
    ).length;
    const winRate = transactions.length > 0 ? (profitableTxs / transactions.length) * 100 : 0;
    
    // Calculate best and worst trades (simplified)
    const tradeValues = transactions
      .filter(tx => tx.type === 'transfer')
      .map(tx => parseFloat(tx.value))
      .filter(val => !isNaN(val));
    
    const bestTrade = tradeValues.length > 0 ? Math.max(...tradeValues) : 0;
    const worstTrade = tradeValues.length > 0 ? Math.min(...tradeValues) : 0;
    
    const stats = {
      totalValue: parseFloat(portfolio.balance) || 0,
      totalTrades: transactions.length,
      winRate: Math.round(winRate),
      bestTrade,
      worstTrade,
      tokenCount: portfolio.tokens?.length || 0,
      nftCount: portfolio.nfts?.length || 0,
      network: portfolio.network,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get profit/loss analysis
router.post('/profit-loss', async (req, res) => {
  try {
    const { network, address } = req.body;
    
    if (!network || !address) {
      return res.status(400).json({
        success: false,
        error: 'Network and address are required'
      });
    }
    
    console.log(`💰 Getting profit/loss analysis for ${address} on ${network}`);
    
    // Get portfolio data
    const portfolioResult = await tatumService.getWalletPortfolio(network, address);
    
    if (!portfolioResult.success) {
      return res.status(400).json({
        success: false,
        error: portfolioResult.error
      });
    }
    
    const portfolio = portfolioResult.data;
    const transactions = portfolio.transactions || [];
    const tokens = portfolio.tokens || [];
    
    // Analyze transactions for profit/loss
    const incomingTxs = transactions.filter(tx => 
      parseFloat(tx.amount) > 0
    );
    const outgoingTxs = transactions.filter(tx => 
      parseFloat(tx.amount) < 0
    );
    
    // Calculate total received vs sent
    const totalReceived = incomingTxs.reduce((sum, tx) => 
      sum + (parseFloat(tx.amount) || 0), 0
    );
    const totalSent = outgoingTxs.reduce((sum, tx) => 
      sum + (parseFloat(tx.amount) || 0), 0
    );
    
    // Calculate current token values (simplified - would need price data)
    const currentTokenValues = tokens.reduce((sum, token) => 
      sum + (parseFloat(token.balance) || 0), 0
    );
    
    // Find biggest winners and losers by transaction amount
    const biggestGain = incomingTxs.length > 0 ? 
      Math.max(...incomingTxs.map(tx => parseFloat(tx.amount) || 0)) : 0;
    const biggestLoss = outgoingTxs.length > 0 ? 
      Math.min(...outgoingTxs.map(tx => parseFloat(tx.amount) || 0)) : 0;
    
    // Find the transaction with the highest gain
    const highestGainTx = incomingTxs.length > 0 ? 
      incomingTxs.reduce((max, tx) => 
        (parseFloat(tx.amount) || 0) > (parseFloat(max.amount) || 0) ? tx : max
      ) : null;
    
    // Find the transaction with the biggest loss
    const biggestLossTx = outgoingTxs.length > 0 ? 
      outgoingTxs.reduce((min, tx) => 
        (parseFloat(tx.amount) || 0) < (parseFloat(min.amount) || 0) ? tx : min
      ) : null;
    
    // Find most active tokens
    const tokenActivity = {};
    transactions.forEach(tx => {
      if (tx.tokenAddress) {
        tokenActivity[tx.tokenAddress] = (tokenActivity[tx.tokenAddress] || 0) + 1;
      }
    });
    
    const mostActiveToken = Object.keys(tokenActivity).length > 0 ?
      Object.keys(tokenActivity).reduce((a, b) => 
        tokenActivity[a] > tokenActivity[b] ? a : b
      ) : null;
    
    const analysis = {
      address: portfolio.address,
      network: portfolio.network,
      summary: {
        totalReceived: totalReceived,
        totalSent: totalSent,
        netFlow: totalReceived - totalSent,
        currentHoldings: currentTokenValues,
        totalTransactions: transactions.length,
        incomingTransactions: incomingTxs.length,
        outgoingTransactions: outgoingTxs.length
      },
      performance: {
        biggestGain: biggestGain,
        biggestLoss: biggestLoss,
        mostActiveToken: mostActiveToken,
        tokenActivityCount: Object.keys(tokenActivity).length,
        highestGainTransaction: highestGainTx ? {
          hash: highestGainTx.hash,
          amount: highestGainTx.amount,
          timestamp: highestGainTx.timestamp,
          blockNumber: highestGainTx.blockNumber
        } : null,
        biggestLossTransaction: biggestLossTx ? {
          hash: biggestLossTx.hash,
          amount: biggestLossTx.amount,
          timestamp: biggestLossTx.timestamp,
          blockNumber: biggestLossTx.blockNumber
        } : null
      },
      tokens: {
        totalTokens: tokens.length,
        tokenList: tokens.slice(0, 10).map(token => ({
          address: token.tokenAddress,
          balance: token.balance,
          type: token.type
        }))
      },
      nfts: {
        totalNFTs: portfolio.nfts?.length || 0,
        nftList: (portfolio.nfts || []).slice(0, 5).map(nft => ({
          address: nft.tokenAddress,
          tokenId: nft.tokenId,
          name: nft.metadata?.name || 'Unknown'
        }))
      },
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Profit/loss analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Query AI about portfolio across all chains
router.post('/query', async (req, res) => {
  try {
    const { query, address } = req.body;
    
    if (!query || !address) {
      return res.status(400).json({
        success: false,
        error: 'Query and address are required'
      });
    }
    
    console.log(`🤖 AI Query: "${query}" for ${address} across all chains`);
    
    // Check if this is a simple balance query - use fast RPC instead of heavy DB
    const isBalanceQuery = /balance|how much|what.*balance/i.test(query);
    
    if (isBalanceQuery) {
      console.log('🚀 Detected balance query - using fast RPC calls');
      
      try {
        // Get balances from individual networks (avoid rate limits)
        const networks = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
        const balances = {};
        
        // Get balances sequentially to avoid rate limits
        for (const network of networks) {
          try {
            const balance = await rpcService.getNativeBalance(network, address);
            if (balance.success) {
              balances[network] = {
                balance: balance.balance || '0',
                symbol: balance.symbol || (network.includes('solana') ? 'SOL' : 'ETH'),
                success: true
              };
            }
          } catch (error) {
            console.warn(`Failed to get balance for ${network}:`, error.message);
            balances[network] = {
              balance: '0',
              symbol: network.includes('solana') ? 'SOL' : 'ETH',
              success: false,
              error: error.message
            };
          }
        }
        
        // Create simplified data for AI
        const simplePortfolioData = {
          address,
          type: 'balance_query',
          networks: balances,
          timestamp: new Date().toISOString()
        };
        
        // Get AI answer with balance data
        const answerResult = await geminiService.answerQuestion(query, simplePortfolioData);
        
        if (answerResult.success) {
          return res.json({
            success: true,
            data: {
              ...answerResult.data,
              queryType: 'balance',
              dataSource: 'rpc'
            }
          });
        }
      } catch (error) {
        console.warn('RPC balance query failed, falling back to comprehensive data:', error.message);
      }
    }
    
    // For complex queries, use comprehensive portfolio data
    console.log('🔍 Complex query - using comprehensive portfolio data');
    const portfolioService = require('../services/portfolioService');
    const portfolioResult = await portfolioService.getComprehensivePortfolio(address);
    
    if (!portfolioResult.success) {
      return res.status(500).json({
        success: false,
        error: portfolioResult.error || 'Failed to get portfolio data'
      });
    }
    
    // Get AI answer with comprehensive data
    const answerResult = await geminiService.answerQuestion(query, portfolioResult.data);
    
    if (!answerResult.success) {
      return res.status(500).json({
        success: false,
        error: answerResult.error
      });
    }
    
    res.json({
      success: true,
      data: {
        ...answerResult.data,
        queryType: 'comprehensive',
        dataSource: 'database'
      }
    });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Validate question (check if crypto-related)
router.post('/validate', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }
    
    // Simple validation - check for crypto-related keywords
    const cryptoKeywords = [
      'crypto', 'bitcoin', 'ethereum', 'portfolio', 'trade', 'trading',
      'wallet', 'balance', 'token', 'nft', 'defi', 'hodl', 'diamond',
      'hands', 'profit', 'loss', 'gain', 'value', 'price', 'market'
    ];
    
    const isCryptoRelated = cryptoKeywords.some(keyword => 
      question.toLowerCase().includes(keyword)
    );
    
    res.json({
      success: true,
      data: {
        question,
        isValid: isCryptoRelated,
        message: isCryptoRelated 
          ? 'Valid crypto-related question' 
          : 'Please ask about your crypto portfolio, trades, or blockchain activities'
      }
    });
  } catch (error) {
    console.error('Question validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
