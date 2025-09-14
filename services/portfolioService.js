const tatumService = require('./tatumService');
const prismaService = require('./prismaService');

class PortfolioService {
  // Get comprehensive wallet portfolio across all chains
  async getComprehensivePortfolio(address) {
    try {
      console.log(`🔍 Getting comprehensive portfolio for ${address}`);
      
      // Get cached portfolio if available
      const cachedPortfolio = await prismaService.getPortfolio(address);
      if (cachedPortfolio) {
        console.log(`📦 Found cached portfolio for ${address}`);
        return {
          success: true,
          data: cachedPortfolio,
          cached: true
        };
      }
      
      // Initialize portfolio object
      const portfolio = {
        address,
        lastUpdated: Date.now(),
        chains: {},
        totalValueUSD: 0,
        totalTransactionCount: 0,
        summary: {
          receivedCount: 0,
          sentCount: 0,
          totalReceived: {},
          totalSent: {},
          highestValue: {
            amount: '0',
            symbol: '',
            txHash: '',
            timestamp: null,
            chain: ''
          },
          mostRecentTx: {
            txHash: '',
            timestamp: null,
            type: '',
            amount: '0',
            symbol: '',
            chain: ''
          },
          tokenHoldings: []
        }
      };
      
      // Get portfolio for each chain
      const chains = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
      
      for (const chain of chains) {
        try {
          console.log(`🔄 Getting portfolio for ${chain}...`);
          
          // Get SDK for this chain
          const sdk = await tatumService.getInstance(chain);
          if (!sdk) {
            console.warn(`⚠️ No SDK available for ${chain}`);
            continue;
          }
          
          // Get native balance
          let nativeBalance = '0';
          let nativeSymbol = 'Unknown';
          let nativeName = 'Unknown';
          let nativeDecimals = 18;
          
          if (chain === 'ethereum-mainnet') {
            const balanceResponse = await sdk.rpc.getBalance(address);
            if (balanceResponse && balanceResponse.result) {
              nativeBalance = (parseInt(balanceResponse.result, 16) / 1e18).toString();
              nativeSymbol = 'ETH';
              nativeName = 'Ethereum';
              nativeDecimals = 18;
            }
          } else if (chain === 'base-mainnet') {
            const balanceResponse = await sdk.rpc.getBalance(address);
            if (balanceResponse && balanceResponse.result) {
              nativeBalance = (parseInt(balanceResponse.result, 16) / 1e18).toString();
              nativeSymbol = 'ETH';
              nativeName = 'Ethereum';
              nativeDecimals = 18;
            }
          } else if (chain === 'solana-mainnet') {
            const balanceResponse = await sdk.rpc.getBalance(address);
            if (balanceResponse && balanceResponse.result) {
              nativeBalance = (balanceResponse.result.value / 1e9).toString();
              nativeSymbol = 'SOL';
              nativeName = 'Solana';
              nativeDecimals = 9;
            }
          }
          
          // Initialize chain portfolio
          portfolio.chains[chain] = {
            nativeBalance,
            nativeSymbol,
            nativeName,
            nativeDecimals,
            tokens: [],
            totalTransactions: 0,
            receivedTransactions: 0,
            sentTransactions: 0,
            firstTransaction: null,
            lastTransaction: null,
            highestValueTransaction: null
          };
          
          // Add native token to holdings if balance > 0
          if (parseFloat(nativeBalance) > 0) {
            portfolio.summary.tokenHoldings.push({
              chain,
              tokenAddress: 'native',
              symbol: nativeSymbol,
              name: nativeName,
              balance: nativeBalance,
              decimals: nativeDecimals
            });
          }
          
          // Get token balances
          const tokenBalances = await tatumService.getTokenBalances(chain, address);
          if (tokenBalances && tokenBalances.success && tokenBalances.data && tokenBalances.data.tokens) {
            portfolio.chains[chain].tokens = tokenBalances.data.tokens;
            
            // Add tokens to summary holdings
            for (const token of tokenBalances.data.tokens) {
              if (parseFloat(token.balance) > 0) {
                portfolio.summary.tokenHoldings.push({
                  chain,
                  tokenAddress: token.address || token.tokenAddress,
                  symbol: token.symbol,
                  name: token.name,
                  balance: token.balance,
                  decimals: token.decimals
                });
              }
            }
          }
          
          // Get transaction count and details
          // First check the database for transactions
          const dbTransactions = await prismaService.getCachedTransactions(address, chain);
          let txs = dbTransactions;
          
          // If no transactions in database, fetch from blockchain
          if (txs.length === 0) {
            const transactions = await tatumService.fetchAndCacheDetailedTransactions(chain, address);
            if (transactions.success && transactions.data && transactions.data.transactions) {
              txs = transactions.data.transactions;
            }
          } else {
            console.log(`📦 Found ${txs.length} cached transactions for ${address} on ${chain}`);
          }
          
          // Get transactions again from database after fetching
          if (txs.length === 0) {
            txs = await prismaService.getCachedTransactions(address, chain);
          }
          
          portfolio.chains[chain].totalTransactions = txs.length;
          portfolio.totalTransactionCount += txs.length;
          portfolio.chains[chain].transactions = txs;
            
            // Count received and sent transactions
            let receivedCount = 0;
            let sentCount = 0;
            let highestValueTx = null;
            let highestValue = 0;
            let latestTx = null;
            let latestTimestamp = 0;
            let firstTx = null;
            let firstTimestamp = Infinity;
            
            // Track totals by token
            const receivedTotals = {};
            const sentTotals = {};
            
            for (const tx of txs) {
              // Skip non-transfer transactions
              if (!tx.transactionType || (tx.transactionType !== 'receive' && tx.transactionType !== 'send' && tx.transactionType !== 'transfer')) {
                continue;
              }
              
              const amount = Math.abs(parseFloat(tx.amount) || 0);
              const symbol = tx.tokenSymbol || 'Unknown';
              const timestamp = tx.timestamp || 0;
              
              // Track received/sent counts
              if (tx.transactionType === 'receive') {
                receivedCount++;
                
                // Track received totals by token
                if (!receivedTotals[symbol]) {
                  receivedTotals[symbol] = 0;
                }
                receivedTotals[symbol] += amount;
                
              } else if (tx.transactionType === 'send') {
                sentCount++;
                
                // Track sent totals by token
                if (!sentTotals[symbol]) {
                  sentTotals[symbol] = 0;
                }
                sentTotals[symbol] += amount;
              }
              
              // Track highest value transaction
              if (amount > highestValue) {
                highestValue = amount;
                highestValueTx = tx;
              }
              
              // Track latest transaction
              if (timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestTx = tx;
              }
              
              // Track first transaction
              if (timestamp < firstTimestamp && timestamp > 0) {
                firstTimestamp = timestamp;
                firstTx = tx;
              }
            }
            
            // Update chain data
            portfolio.chains[chain].receivedTransactions = receivedCount;
            portfolio.chains[chain].sentTransactions = sentCount;
            portfolio.chains[chain].firstTransaction = firstTx;
            portfolio.chains[chain].lastTransaction = latestTx;
            portfolio.chains[chain].highestValueTransaction = highestValueTx;
            
            // Update summary data
            portfolio.summary.receivedCount += receivedCount;
            portfolio.summary.sentCount += sentCount;
            
            // Update received totals in summary
            for (const [symbol, amount] of Object.entries(receivedTotals)) {
              if (!portfolio.summary.totalReceived[symbol]) {
                portfolio.summary.totalReceived[symbol] = 0;
              }
              portfolio.summary.totalReceived[symbol] += amount;
            }
            
            // Update sent totals in summary
            for (const [symbol, amount] of Object.entries(sentTotals)) {
              if (!portfolio.summary.totalSent[symbol]) {
                portfolio.summary.totalSent[symbol] = 0;
              }
              portfolio.summary.totalSent[symbol] += amount;
            }
            
            // Update highest value transaction if applicable
            if (highestValueTx && highestValue > parseFloat(portfolio.summary.highestValue.amount)) {
              portfolio.summary.highestValue = {
                amount: highestValueTx.amount,
                symbol: highestValueTx.tokenSymbol,
                txHash: highestValueTx.transactionHash,
                timestamp: highestValueTx.timestamp,
                chain: chain
              };
            }
            
            // Update most recent transaction if applicable
            if (latestTx && latestTimestamp > (portfolio.summary.mostRecentTx.timestamp || 0)) {
              portfolio.summary.mostRecentTx = {
                txHash: latestTx.transactionHash,
                timestamp: latestTx.timestamp,
                type: latestTx.transactionType,
                amount: latestTx.amount,
                symbol: latestTx.tokenSymbol,
                chain: chain
              };
            }
        } catch (chainError) {
          console.error(`❌ Error getting portfolio for ${chain}:`, chainError);
        }
      }
      
      // Sort token holdings by balance value
      portfolio.summary.tokenHoldings.sort((a, b) => {
        return parseFloat(b.balance) - parseFloat(a.balance);
      });
      
      // Cache portfolio
      await prismaService.storePortfolio(address, portfolio);
      
      return {
        success: true,
        data: portfolio,
        cached: false
      };
      
    } catch (error) {
      console.error('Error getting comprehensive portfolio:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get token balances for a specific chain
  async getTokenBalances(chain, address) {
    try {
      // For Base chain, we need special handling for USDC
      if (chain === 'base-mainnet') {
        const sdk = await tatumService.getInstance(chain);
        
        // Get native ETH balance
        const balanceResponse = await sdk.rpc.getBalance(address);
        const ethBalance = parseInt(balanceResponse.result, 16) / 1e18;
        
        // Get USDC balance
        const usdcAddress = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'; // USDC on Base
        const usdcBalanceHex = await tatumService.getTokenBalance(sdk, address, usdcAddress);
        const usdcBalance = usdcBalanceHex && usdcBalanceHex !== '0x' ? parseInt(usdcBalanceHex, 16) / 1e6 : 0;
        
        const tokens = [
          {
            chain: chain,
            tokenAddress: 'native',
            type: 'native',
            address: address,
            balance: ethBalance.toString(),
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          }
        ];
        
        // Only add USDC if balance > 0
        if (usdcBalance > 0) {
          tokens.push({
            chain: chain,
            tokenAddress: usdcAddress,
            type: 'fungible',
            address: address,
            balance: usdcBalance.toString(),
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6
          });
        }
        
        return {
          success: true,
          data: {
            address,
            chain,
            tokens
          }
        };
      }
      
      // For other chains, use the standard method
      return await tatumService.getTokenBalances(chain, address);
    } catch (error) {
      console.error(`Error getting token balances for ${chain}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get transaction summary statistics
  async getTransactionSummary(address) {
    try {
      const portfolio = await this.getComprehensivePortfolio(address);
      if (!portfolio.success) {
        return portfolio;
      }
      
      const summary = portfolio.data.summary;
      
      // Calculate additional statistics
      const totalTransactions = summary.receivedCount + summary.sentCount;
      const receivedPercentage = totalTransactions > 0 ? (summary.receivedCount / totalTransactions) * 100 : 0;
      const sentPercentage = totalTransactions > 0 ? (summary.sentCount / totalTransactions) * 100 : 0;
      
      // Calculate total spent on tokens
      let totalSpent = 0;
      for (const [symbol, amount] of Object.entries(summary.totalSent)) {
        totalSpent += amount;
      }
      
      // Calculate total received
      let totalReceived = 0;
      for (const [symbol, amount] of Object.entries(summary.totalReceived)) {
        totalReceived += amount;
      }
      
      // Calculate net profit/loss
      const netProfitLoss = totalReceived - totalSpent;
      
      return {
        success: true,
        data: {
          address,
          totalTransactions,
          receivedCount: summary.receivedCount,
          sentCount: summary.sentCount,
          receivedPercentage,
          sentPercentage,
          totalSpent,
          totalReceived,
          netProfitLoss,
          highestValueTransaction: summary.highestValue,
          mostRecentTransaction: summary.mostRecentTx,
          tokenHoldings: summary.tokenHoldings
        }
      };
    } catch (error) {
      console.error('Error getting transaction summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Check if user owns specific tokens
  async checkTokenOwnership(address, tokenSymbol) {
    try {
      const portfolio = await this.getComprehensivePortfolio(address);
      if (!portfolio.success) {
        return portfolio;
      }
      
      const holdings = portfolio.data.summary.tokenHoldings;
      const matchingTokens = holdings.filter(token => 
        token.symbol.toLowerCase() === tokenSymbol.toLowerCase()
      );
      
      return {
        success: true,
        data: {
          address,
          tokenSymbol,
          owned: matchingTokens.length > 0,
          holdings: matchingTokens
        }
      };
    } catch (error) {
      console.error(`Error checking token ownership for ${tokenSymbol}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get token transaction history
  async getTokenTransactionHistory(address, tokenSymbol) {
    try {
      // Get all transactions across chains
      const allTransactions = [];
      const chains = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
      
      for (const chain of chains) {
        const transactions = await tatumService.fetchAndCacheDetailedTransactions(chain, address);
        if (transactions.success && transactions.data && transactions.data.transactions) {
          allTransactions.push(...transactions.data.transactions);
        }
      }
      
      // Filter transactions for the specific token
      const tokenTransactions = allTransactions.filter(tx => 
        tx.tokenSymbol && tx.tokenSymbol.toLowerCase() === tokenSymbol.toLowerCase()
      );
      
      // Sort by timestamp (newest first)
      tokenTransactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      // Calculate statistics
      let totalReceived = 0;
      let totalSent = 0;
      
      tokenTransactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        if (tx.transactionType === 'receive' || amount > 0) {
          totalReceived += Math.abs(amount);
        } else if (tx.transactionType === 'send' || amount < 0) {
          totalSent += Math.abs(amount);
        }
      });
      
      return {
        success: true,
        data: {
          address,
          tokenSymbol,
          transactions: tokenTransactions,
          count: tokenTransactions.length,
          totalReceived,
          totalSent,
          netAmount: totalReceived - totalSent
        }
      };
    } catch (error) {
      console.error(`Error getting token transaction history for ${tokenSymbol}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new PortfolioService();
