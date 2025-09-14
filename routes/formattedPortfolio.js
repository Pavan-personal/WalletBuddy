const express = require('express');
const router = express.Router();
const prismaService = require('../services/prismaService');

/**
 * GET /api/formatted-portfolio/:address
 * Returns a nicely formatted portfolio combining data from all three collections
 * with creative insights and analytics
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log(`📊 Getting formatted portfolio for ${address}`);
    
    // Get data from all three collections
    const chains = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    
    // Initialize response object with more creative sections
    const formattedPortfolio = {
      address,
      timestamp: new Date().toISOString(),
      balances: {},
      tokens: [],
      multichain: {
        holdings: [],
        highestBalance: {
          network: "",
          token: "",
          balance: "0",
          usdValue: "0"
        },
        lowestBalance: {
          network: "",
          token: "",
          balance: "0",
          usdValue: "0"
        },
        totalHoldingsValue: "0"
      },
      transactions: {
        count: 0,
        recent: [],
        byNetwork: {}
      },
      stats: {
        totalSent: 0,
        totalReceived: 0,
        uniqueTokens: 0
      },
      insights: {
        walletPersonality: "",
        tradingStyle: "",
        mostActiveNetwork: "",
        favoriteTokens: [],
        bestTransaction: null,
        worstTransaction: null,
        activityHeatmap: {},
        tradingPatterns: []
      }
    };
    
    // 1. Get token summaries for all chains
    const allTokens = [];
    let highestBalanceToken = null;
    let lowestBalanceToken = null;
    let highestBalanceValue = 0;
    let lowestBalanceValue = Infinity;
    
    for (const chain of chains) {
      const tokens = await prismaService.getTokenSummary(address, chain);
      allTokens.push(...tokens);
      
      // Add tokens to the formatted response
      for (const token of tokens) {
        if (parseFloat(token.currentBalance) > 0) {
          const tokenData = {
            network: chain,
            address: token.tokenAddress,
            symbol: token.tokenSymbol,
            name: token.tokenName,
            balance: token.currentBalance,
            decimals: token.tokenDecimals,
            estimatedUsdValue: "0" // We would need price data for real values
          };
          
          formattedPortfolio.tokens.push(tokenData);
          
          // Add to multichain holdings
          formattedPortfolio.multichain.holdings.push({
            network: chain,
            token: token.tokenSymbol,
            name: token.tokenName,
            balance: token.currentBalance,
            usdValue: "0" // Would need price data
          });
          
          // Track highest and lowest balances
          const balanceValue = parseFloat(token.currentBalance);
          if (balanceValue > highestBalanceValue) {
            highestBalanceValue = balanceValue;
            highestBalanceToken = {
              network: chain,
              token: token.tokenSymbol,
              balance: token.currentBalance,
              usdValue: "0" // Would need price data
            };
          }
          
          if (balanceValue > 0 && balanceValue < lowestBalanceValue) {
            lowestBalanceValue = balanceValue;
            lowestBalanceToken = {
              network: chain,
              token: token.tokenSymbol,
              balance: token.currentBalance,
              usdValue: "0" // Would need price data
            };
          }
        }
      }
      
      // Count unique tokens
      formattedPortfolio.stats.uniqueTokens += tokens.length;
    }
    
    // Set highest and lowest balances if found
    if (highestBalanceToken) {
      formattedPortfolio.multichain.highestBalance = highestBalanceToken;
    }
    
    if (lowestBalanceToken) {
      formattedPortfolio.multichain.lowestBalance = lowestBalanceToken;
    }
    
    // 2. Get transactions for all chains
    for (const chain of chains) {
      const transactions = await prismaService.getCachedTransactions(address, chain);
      
      // Add to total count
      formattedPortfolio.transactions.count += transactions.length;
      
      // Add to network-specific counts
      formattedPortfolio.transactions.byNetwork[chain] = {
        count: transactions.length,
        sent: transactions.filter(tx => tx.transactionType === 'send').length,
        received: transactions.filter(tx => tx.transactionType === 'receive').length
      };
      
      // Add recent transactions (limit to 5 most recent per chain)
      const recentTxs = transactions
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
        .slice(0, 5)
        .map(tx => ({
          hash: tx.transactionHash,
          network: chain,
          type: tx.transactionType,
          amount: tx.amount,
          token: tx.tokenSymbol,
          timestamp: new Date(parseInt(tx.timestamp)).toISOString(),
          from: tx.fromAddress,
          to: tx.toAddress
        }));
      
      formattedPortfolio.transactions.recent.push(...recentTxs);
      
      // Calculate sent/received totals
      const sentTxs = transactions.filter(tx => tx.transactionType === 'send');
      const receivedTxs = transactions.filter(tx => tx.transactionType === 'receive');
      
      for (const tx of sentTxs) {
        formattedPortfolio.stats.totalSent += 1;
      }
      
      for (const tx of receivedTxs) {
        formattedPortfolio.stats.totalReceived += 1;
      }
    }
    
    // 3. Get portfolio data if available
    try {
      const portfolio = await prismaService.getPortfolio(address);
      if (portfolio && portfolio.portfolioData) {
        const portfolioData = JSON.parse(portfolio.portfolioData);
        
        // Add native balances from portfolio
        for (const [network, data] of Object.entries(portfolioData.chains || {})) {
          formattedPortfolio.balances[network] = {
            native: {
              balance: data.nativeBalance,
              symbol: data.nativeSymbol,
              name: data.nativeName
            }
          };
          
          // Add native tokens to multichain holdings if balance > 0
          if (parseFloat(data.nativeBalance) > 0) {
            formattedPortfolio.multichain.holdings.push({
              network,
              token: data.nativeSymbol,
              name: data.nativeName,
              balance: data.nativeBalance,
              isNative: true,
              usdValue: "0" // Would need price data
            });
            
            // Update highest/lowest balance if needed
            const balanceValue = parseFloat(data.nativeBalance);
            if (balanceValue > highestBalanceValue) {
              highestBalanceValue = balanceValue;
              formattedPortfolio.multichain.highestBalance = {
                network,
                token: data.nativeSymbol,
                balance: data.nativeBalance,
                isNative: true,
                usdValue: "0" // Would need price data
              };
            }
            
            if (balanceValue > 0 && balanceValue < lowestBalanceValue) {
              lowestBalanceValue = balanceValue;
              formattedPortfolio.multichain.lowestBalance = {
                network,
                token: data.nativeSymbol,
                balance: data.nativeBalance,
                isNative: true,
                usdValue: "0" // Would need price data
              };
            }
          }
        }
        
        // Add summary stats from portfolio
        if (portfolioData.summary) {
          formattedPortfolio.summary = {
            mostRecentTransaction: portfolioData.summary.mostRecentTx,
            highestValueTransaction: portfolioData.summary.highestValue,
            firstSeen: portfolioData.summary.firstSeen || null,
            lastUpdated: new Date(portfolioData.lastUpdated).toISOString()
          };
          
          // Add token holdings from portfolio summary if available
          if (portfolioData.summary.tokenHoldings && portfolioData.summary.tokenHoldings.length > 0) {
            for (const token of portfolioData.summary.tokenHoldings) {
              // Check if this token is already in our multichain holdings
              const existingToken = formattedPortfolio.multichain.holdings.find(
                t => t.token === token.symbol && t.network === token.chain
              );
              
              if (!existingToken && parseFloat(token.balance) > 0) {
                formattedPortfolio.multichain.holdings.push({
                  network: token.chain,
                  token: token.symbol,
                  name: token.name,
                  balance: token.balance,
                  usdValue: "0" // Would need price data
                });
                
                // Update highest/lowest balance if needed
                const balanceValue = parseFloat(token.balance);
                if (balanceValue > highestBalanceValue) {
                  highestBalanceValue = balanceValue;
                  formattedPortfolio.multichain.highestBalance = {
                    network: token.chain,
                    token: token.symbol,
                    balance: token.balance,
                    usdValue: "0" // Would need price data
                  };
                }
                
                if (balanceValue > 0 && balanceValue < lowestBalanceValue) {
                  lowestBalanceValue = balanceValue;
                  formattedPortfolio.multichain.lowestBalance = {
                    network: token.chain,
                    token: token.symbol,
                    balance: token.balance,
                    usdValue: "0" // Would need price data
                  };
                }
              }
            }
          }
        }
      } else {
        console.log(`⚠️ No portfolio data found for ${address}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error parsing portfolio data: ${error.message}`);
    }
    
    // Sort recent transactions by timestamp (newest first)
    formattedPortfolio.transactions.recent.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Limit to 10 most recent transactions overall
    formattedPortfolio.transactions.recent = formattedPortfolio.transactions.recent.slice(0, 10);
    
    // Generate creative insights based on transaction data
    await generateWalletInsights(formattedPortfolio);
    
    res.json({
      success: true,
      data: formattedPortfolio
    });
    
  } catch (error) {
    console.error('Error getting formatted portfolio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate creative insights about the wallet based on transaction data
 */
async function generateWalletInsights(portfolio) {
  try {
    const { transactions, tokens, stats } = portfolio;
    const allTransactions = [];
    
    // Collect all transactions from all networks
    for (const network of Object.keys(transactions.byNetwork)) {
      const networkTxs = await prismaService.getCachedTransactions(portfolio.address, network);
      allTransactions.push(...networkTxs);
    }
    
    // Skip insights if not enough data
    if (allTransactions.length === 0) {
      portfolio.insights.walletPersonality = "New Explorer";
      portfolio.insights.tradingStyle = "Just getting started";
      return;
    }
    
    // 1. Determine wallet personality based on transaction patterns
    const personalityTraits = [];
    
    if (stats.totalSent > stats.totalReceived * 2) {
      personalityTraits.push("Active Trader");
    } else if (stats.totalReceived > stats.totalSent * 2) {
      personalityTraits.push("Collector");
    }
    
    if (tokens.length > 10) {
      personalityTraits.push("Diversified");
    } else if (tokens.length > 0 && tokens.length <= 3) {
      personalityTraits.push("Focused");
    }
    
    // Check if the wallet holds meme coins
    const memeTokens = tokens.filter(t => 
      t.symbol?.includes("PUMP") || 
      t.name?.includes("Pump") || 
      t.symbol === "DOGE" || 
      t.symbol === "SHIB" ||
      t.symbol === "PEPE" ||
      t.symbol === "TRUMP" ||
      t.symbol === "VINE"
    );
    
    if (memeTokens.length > 3) {
      personalityTraits.push("Meme Enthusiast");
    }
    
    // Check if wallet holds stablecoins
    const stablecoins = tokens.filter(t => 
      t.symbol === "USDC" || 
      t.symbol === "USDT" || 
      t.symbol === "DAI" || 
      t.symbol === "BUSD"
    );
    
    if (stablecoins.length > 0) {
      personalityTraits.push("Stability-Focused");
    }
    
    // Set wallet personality
    if (personalityTraits.length > 0) {
      portfolio.insights.walletPersonality = personalityTraits.join(" & ");
    } else {
      portfolio.insights.walletPersonality = "Mysterious Hodler";
    }
    
    // 2. Determine trading style
    const tradingStyles = [];
    
    // Check transaction frequency
    const txTimestamps = allTransactions
      .filter(tx => tx.timestamp)
      .map(tx => parseInt(tx.timestamp));
    
    if (txTimestamps.length > 0) {
      // Sort timestamps
      txTimestamps.sort();
      
      // Calculate average time between transactions (in days)
      let totalTimeDiff = 0;
      let count = 0;
      
      for (let i = 1; i < txTimestamps.length; i++) {
        const diff = txTimestamps[i] - txTimestamps[i-1];
        if (diff > 0) {
          totalTimeDiff += diff;
          count++;
        }
      }
      
      const avgTimeBetweenTx = count > 0 ? totalTimeDiff / count / (1000 * 60 * 60 * 24) : 0;
      
      if (avgTimeBetweenTx < 1) {
        tradingStyles.push("Daily Trader");
      } else if (avgTimeBetweenTx < 7) {
        tradingStyles.push("Weekly Trader");
      } else if (avgTimeBetweenTx < 30) {
        tradingStyles.push("Monthly Trader");
      } else {
        tradingStyles.push("Long-term Hodler");
      }
    }
    
    // Check transaction sizes
    const txAmounts = allTransactions
      .filter(tx => tx.amount && !isNaN(parseFloat(tx.amount)))
      .map(tx => Math.abs(parseFloat(tx.amount)));
    
    if (txAmounts.length > 0) {
      const avgTxSize = txAmounts.reduce((sum, amt) => sum + amt, 0) / txAmounts.length;
      const maxTxSize = Math.max(...txAmounts);
      
      if (maxTxSize > avgTxSize * 10) {
        tradingStyles.push("Occasional Whale");
      } else if (avgTxSize > 1000) {
        tradingStyles.push("Big Player");
      } else if (avgTxSize < 10) {
        tradingStyles.push("Micro Trader");
      }
    }
    
    // Set trading style
    if (tradingStyles.length > 0) {
      portfolio.insights.tradingStyle = tradingStyles.join(" & ");
    } else {
      portfolio.insights.tradingStyle = "Balanced Trader";
    }
    
    // 3. Find most active network
    let maxTxCount = 0;
    let mostActiveNetwork = "";
    
    for (const [network, data] of Object.entries(transactions.byNetwork)) {
      if (data.count > maxTxCount) {
        maxTxCount = data.count;
        mostActiveNetwork = network;
      }
    }
    
    if (mostActiveNetwork) {
      // Format network name nicely
      const networkName = mostActiveNetwork.split('-')[0];
      portfolio.insights.mostActiveNetwork = networkName.charAt(0).toUpperCase() + networkName.slice(1);
    }
    
    // 4. Find favorite tokens (most frequently transacted)
    const tokenFrequency = {};
    
    for (const tx of allTransactions) {
      if (tx.tokenSymbol) {
        tokenFrequency[tx.tokenSymbol] = (tokenFrequency[tx.tokenSymbol] || 0) + 1;
      }
    }
    
    // Sort tokens by frequency
    const sortedTokens = Object.entries(tokenFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([symbol]) => symbol);
    
    portfolio.insights.favoriteTokens = sortedTokens;
    
    // 5. Find best and worst transactions
    const valueTxs = allTransactions
      .filter(tx => tx.amount && !isNaN(parseFloat(tx.amount)) && tx.tokenSymbol);
    
    if (valueTxs.length > 0) {
      // Best transaction (highest received value)
      const bestTx = valueTxs
        .filter(tx => tx.transactionType === 'receive' || parseFloat(tx.amount) > 0)
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0];
      
      if (bestTx) {
        portfolio.insights.bestTransaction = {
          hash: bestTx.transactionHash,
          type: 'receive',
          amount: bestTx.amount,
          token: bestTx.tokenSymbol,
          timestamp: bestTx.timestamp ? new Date(parseInt(bestTx.timestamp)).toISOString() : null
        };
      }
      
      // Worst transaction (highest sent value)
      const worstTx = valueTxs
        .filter(tx => tx.transactionType === 'send' || parseFloat(tx.amount) < 0)
        .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
      
      if (worstTx) {
        portfolio.insights.worstTransaction = {
          hash: worstTx.transactionHash,
          type: 'send',
          amount: worstTx.amount,
          token: worstTx.tokenSymbol,
          timestamp: worstTx.timestamp ? new Date(parseInt(worstTx.timestamp)).toISOString() : null
        };
      }
    }
    
    // 6. Create activity heatmap
    const activityByMonth = {};
    
    for (const tx of allTransactions) {
      if (tx.timestamp) {
        const date = new Date(parseInt(tx.timestamp));
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        activityByMonth[monthYear] = (activityByMonth[monthYear] || 0) + 1;
      }
    }
    
    portfolio.insights.activityHeatmap = activityByMonth;
    
    // 7. Identify trading patterns
    const patterns = [];
    
    // Check for buying dips (multiple buys in short succession)
    const buyTimestamps = allTransactions
      .filter(tx => tx.transactionType === 'receive')
      .map(tx => parseInt(tx.timestamp))
      .sort();
    
    let dipBuyCount = 0;
    for (let i = 1; i < buyTimestamps.length; i++) {
      const timeDiff = buyTimestamps[i] - buyTimestamps[i-1];
      // If buys are within 24 hours
      if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
        dipBuyCount++;
      }
    }
    
    if (dipBuyCount > 2) {
      patterns.push("Dip Buyer");
    }
    
    // Check for consistent stablecoin usage
    const stablecoinTxs = allTransactions.filter(tx => 
      tx.tokenSymbol === "USDC" || 
      tx.tokenSymbol === "USDT" || 
      tx.tokenSymbol === "DAI"
    );
    
    if (stablecoinTxs.length > allTransactions.length * 0.3) {
      patterns.push("Stablecoin Strategist");
    }
    
    // Check for meme coin trading
    const memeTxs = allTransactions.filter(tx => 
      tx.tokenSymbol?.includes("PUMP") || 
      tx.tokenName?.includes("Pump") ||
      tx.tokenSymbol === "DOGE" || 
      tx.tokenSymbol === "SHIB" ||
      tx.tokenSymbol === "PEPE" ||
      tx.tokenSymbol === "TRUMP" ||
      tx.tokenSymbol === "VINE"
    );
    
    if (memeTxs.length > allTransactions.length * 0.3) {
      patterns.push("Meme Trader");
    }
    
    portfolio.insights.tradingPatterns = patterns;
    
  } catch (error) {
    console.warn(`⚠️ Error generating wallet insights: ${error.message}`);
  }
}

module.exports = router;
