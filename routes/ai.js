const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const tatumService = require('../services/tatumService');
const prismaService = require('../services/prismaService');
const rpcService = require('../services/rpcService');
const portfolioService = require('../services/portfolioService');

// Function to get complete wallet data from all three tables
async function getCompleteWalletData(address) {
  try {
    console.log(`📊 Getting complete wallet data for ${address} from all tables`);
    
    // Normalize address for database queries
    const normalizedAddress = address.toLowerCase();
    
    // 1. Get portfolio data (cached if available)
    const portfolioResult = await portfolioService.getComprehensivePortfolio(address);
    if (!portfolioResult.success) {
      return {
        success: false,
        error: portfolioResult.error || 'Failed to get portfolio data'
      };
    }
    const portfolioData = portfolioResult.data;
    
    // 2. Get all transactions across chains
    const networks = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    const allTransactions = [];
    
    for (const network of networks) {
      const transactions = await prismaService.getCachedTransactions(normalizedAddress, network, 1000);
      allTransactions.push(...transactions);
    }
    
    // 3. Get token summaries across chains
    const allTokenSummaries = [];
    
    for (const network of networks) {
      const tokenSummaries = await prismaService.getTokenSummary(normalizedAddress, network);
      allTokenSummaries.push(...tokenSummaries);
    }
    
    // 4. Process transactions to get unique tokens with detailed information
    const uniqueTokens = {};
    const networkTokens = {
      'ethereum-mainnet': [],
      'base-mainnet': [],
      'solana-mainnet': []
    };
    
    // Track token transactions by date
    const tokenTransactionsByDate = {};
    
    allTransactions.forEach(tx => {
      if (tx.tokenAddress) {
        const key = `${tx.network}:${tx.tokenAddress}`;
        if (!uniqueTokens[key]) {
          uniqueTokens[key] = {
            network: tx.network,
            address: tx.tokenAddress,
            symbol: tx.tokenSymbol || 'Unknown',
            name: tx.tokenName || 'Unknown Token',
            decimals: tx.tokenDecimals || 0,
            transactions: 0,
            sent: 0,
            received: 0,
            totalAmount: 0,
            firstTransaction: null,
            lastTransaction: null,
            largestTransaction: null,
            recentTransactions: []
          };
          
          // Add to network-specific list
          if (networkTokens[tx.network]) {
            networkTokens[tx.network].push(uniqueTokens[key]);
          }
          
          // Initialize date tracking for this token
          tokenTransactionsByDate[key] = {};
        }
        
        uniqueTokens[key].transactions++;
        
        // Track sent/received and update transaction details
        const amount = parseFloat(tx.amount || 0);
        const timestamp = parseInt(tx.timestamp || 0);
        const date = timestamp ? new Date(timestamp).toISOString().split('T')[0] : 'unknown';
        
        // Track transactions by date
        if (!tokenTransactionsByDate[key][date]) {
          tokenTransactionsByDate[key][date] = {
            date,
            count: 0,
            sent: 0,
            received: 0,
            netAmount: 0
          };
        }
        tokenTransactionsByDate[key][date].count++;
        
        // Process transaction type and amount
        if (tx.transactionType === 'send' || amount < 0) {
          uniqueTokens[key].sent++;
          uniqueTokens[key].totalAmount -= Math.abs(amount);
          tokenTransactionsByDate[key][date].sent++;
          tokenTransactionsByDate[key][date].netAmount -= Math.abs(amount);
        } else if (tx.transactionType === 'receive' || amount > 0) {
          uniqueTokens[key].received++;
          uniqueTokens[key].totalAmount += Math.abs(amount);
          tokenTransactionsByDate[key][date].received++;
          tokenTransactionsByDate[key][date].netAmount += Math.abs(amount);
        }
        
        // Track first transaction
        if (!uniqueTokens[key].firstTransaction || 
            (timestamp && timestamp < parseInt(uniqueTokens[key].firstTransaction?.timestamp || Infinity))) {
          uniqueTokens[key].firstTransaction = {
            hash: tx.transactionHash,
            timestamp: tx.timestamp,
            type: tx.transactionType,
            amount: tx.amount,
            date: date !== 'unknown' ? date : null
          };
        }
        
        // Track last transaction
        if (!uniqueTokens[key].lastTransaction || 
            (timestamp && timestamp > parseInt(uniqueTokens[key].lastTransaction?.timestamp || 0))) {
          uniqueTokens[key].lastTransaction = {
            hash: tx.transactionHash,
            timestamp: tx.timestamp,
            type: tx.transactionType,
            amount: tx.amount,
            date: date !== 'unknown' ? date : null
          };
        }
        
        // Track largest transaction by absolute amount
        if (!uniqueTokens[key].largestTransaction || 
            (Math.abs(amount) > Math.abs(parseFloat(uniqueTokens[key].largestTransaction?.amount || 0)))) {
          uniqueTokens[key].largestTransaction = {
            hash: tx.transactionHash,
            timestamp: tx.timestamp,
            type: tx.transactionType,
            amount: tx.amount,
            date: date !== 'unknown' ? date : null
          };
        }
        
        // Add to recent transactions (keep only 5 most recent)
        uniqueTokens[key].recentTransactions.push({
          hash: tx.transactionHash,
          timestamp: tx.timestamp,
          type: tx.transactionType,
          amount: tx.amount,
          date: date !== 'unknown' ? date : null
        });
      }
    });
    
    // Sort recent transactions by timestamp (newest first) and limit to 5
    Object.values(uniqueTokens).forEach(token => {
      token.recentTransactions.sort((a, b) => {
        const timestampA = parseInt(a.timestamp || 0);
        const timestampB = parseInt(b.timestamp || 0);
        return timestampB - timestampA;
      });
      token.recentTransactions = token.recentTransactions.slice(0, 5);
    });
    
    // Convert date tracking to arrays for easier consumption
    const tokenTransactionHistory = {};
    Object.entries(tokenTransactionsByDate).forEach(([tokenKey, dates]) => {
      tokenTransactionHistory[tokenKey] = Object.values(dates).sort((a, b) => a.date.localeCompare(b.date));
    });
    
    // 5. Combine all data into a structured format
    const completeData = {
      address: address,
      lastUpdated: Date.now(),
      
      // Portfolio data
      portfolioSummary: portfolioData.summary,
      chains: portfolioData.chains,
      totalValueUSD: portfolioData.totalValueUSD,
      totalTransactionCount: portfolioData.totalTransactionCount,
      
      // Token data
      uniqueTokens: Object.values(uniqueTokens),
      uniqueTokenCount: Object.keys(uniqueTokens).length,
      networkTokens: networkTokens,
      tokenTransactionHistory: tokenTransactionHistory,
      
      // Raw data from all tables
      rawData: {
        transactions: allTransactions,
        tokenSummaries: allTokenSummaries,
        portfolio: portfolioData
      },
      
      // Special sections for specific tokens (VINE, TRUMP, etc.)
      specialTokens: {
        VINE: allTransactions.filter(tx => 
          tx.tokenSymbol === 'VINE' || 
          tx.tokenName === 'Vine' || 
          tx.tokenAddress === '6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump'
        ),
        TRUMP: allTransactions.filter(tx => 
          tx.tokenSymbol === 'TRUMP' || 
          tx.tokenName?.includes('Trump') || 
          ['6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', 'E4jzcSdKf6bD8L4DPQj5iW7t9yTUa4kXfFuTGM7cdqTb', '4h8LjZWUfUQVgbEZ29UzTuGXNW6rwrJis78ZU66ekkPV'].includes(tx.tokenAddress)
        ),
        USDC: allTransactions.filter(tx => 
          tx.tokenSymbol === 'USDC' || 
          tx.tokenName === 'USD Coin' || 
          tx.tokenAddress === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' ||
          tx.tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        ),
        PUMP: allTransactions.filter(tx => 
          tx.tokenSymbol?.includes('PUMP') || 
          tx.tokenName?.includes('Pump.fun') || 
          tx.tokenAddress?.includes('pump')
        )
      }
    };
    
    return {
      success: true,
      data: completeData
    };
  } catch (error) {
    console.error('Error getting complete wallet data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

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
    
    // For complex queries, use comprehensive data from all tables
    console.log('🔍 Complex query - using comprehensive data from all database tables');
    
    // Get data from all three tables
    const completeWalletData = await getCompleteWalletData(address);
    
    if (!completeWalletData.success) {
      return res.status(500).json({
        success: false,
        error: completeWalletData.error || 'Failed to get wallet data'
      });
    }
    
    // Get AI answer with complete wallet data
    const answerResult = await geminiService.answerQuestion(query, completeWalletData.data);
    
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
