const { PrismaClient } = require('@prisma/client');

class PrismaService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  // Initialize database connection
  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Prisma connected to database');
      return true;
    } catch (error) {
      console.error('❌ Error connecting to database:', error);
      return false;
    }
  }

  // Store detailed transaction data
  async storeTransaction(transactionData) {
    try {
      const {
        walletAddress,
        network,
        transactionHash,
        blockNumber,
        slotNumber,
        timestamp,
        transactionType,
        transactionSubtype,
        amount,
        tokenAddress,
        tokenSymbol,
        tokenName,
        tokenDecimals,
        fromAddress,
        toAddress,
        fee,
        memo,
        errorMessage,
        confirmationStatus,
        instructionsCount,
        signersCount,
        rawTransactionData
      } = transactionData;
      
      // Normalize wallet address to lowercase
      const normalizedWalletAddress = walletAddress.toLowerCase();

      await this.prisma.walletTransaction.upsert({
        where: {
          walletAddress_network_transactionHash: {
            walletAddress: normalizedWalletAddress,
            network,
            transactionHash
          }
        },
        update: {
          blockNumber: blockNumber ? blockNumber.toString() : null,
          slotNumber: slotNumber ? slotNumber.toString() : null,
          timestamp: timestamp ? timestamp.toString() : null,
          transactionType,
          transactionSubtype,
          amount: amount ? amount.toString() : null,
          tokenAddress,
          tokenSymbol,
          tokenName,
          tokenDecimals,
          fromAddress,
          toAddress,
          fee: fee ? fee.toString() : null,
          memo,
          errorMessage,
          confirmationStatus,
          instructionsCount,
          signersCount,
          rawTransactionData: rawTransactionData ? JSON.stringify(rawTransactionData) : null,
          updatedAt: new Date()
        },
        create: {
          walletAddress: normalizedWalletAddress,
          network,
          transactionHash,
          blockNumber: blockNumber ? blockNumber.toString() : null,
          slotNumber: slotNumber ? slotNumber.toString() : null,
          timestamp: timestamp ? timestamp.toString() : null,
          transactionType,
          transactionSubtype,
          amount: amount ? amount.toString() : null,
          tokenAddress,
          tokenSymbol,
          tokenName,
          tokenDecimals,
          fromAddress,
          toAddress,
          fee: fee ? fee.toString() : null,
          memo,
          errorMessage,
          confirmationStatus,
          instructionsCount,
          signersCount,
          rawTransactionData: rawTransactionData ? JSON.stringify(rawTransactionData) : null
        }
      });

      return true;
    } catch (error) {
      console.warn('Error storing transaction:', error.message);
      return false;
    }
  }

  // Get cached transactions for a wallet
  async getCachedTransactions(walletAddress, network, limit = 100) {
    try {
      // SQLite doesn't support case-insensitive mode, so we need to normalize the address
      const normalizedAddress = walletAddress.toLowerCase();
      
      const transactions = await this.prisma.walletTransaction.findMany({
        where: {
          walletAddress: normalizedAddress,
          network
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });

      return transactions;
    } catch (error) {
      console.warn('Error getting cached transactions:', error.message);
      return [];
    }
  }

  // Get transactions by token
  async getTransactionsByToken(walletAddress, network, tokenAddress) {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      const transactions = await this.prisma.walletTransaction.findMany({
        where: {
          walletAddress: normalizedAddress,
          network,
          tokenAddress
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions by token:', error);
      return [];
    }
  }

  // Alias for getCachedTransactionsByToken
  async getCachedTransactionsByToken(walletAddress, network, tokenAddress) {
    return this.getTransactionsByToken(walletAddress, network, tokenAddress);
  }

  // Clear transaction cache for a wallet
  async clearTransactionCache(walletAddress, network) {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      await this.prisma.walletTransaction.deleteMany({
        where: {
          walletAddress: normalizedAddress,
          network
        }
      });
      return true;
    } catch (error) {
      console.error('Error clearing transaction cache:', error);
      return false;
    }
  }

  // Search transactions by token symbol/name
  async searchTransactionsByTokenName(walletAddress, network, searchTerm) {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      const transactions = await this.prisma.walletTransaction.findMany({
        where: {
          walletAddress: normalizedAddress,
          network,
          OR: [
            {
              tokenSymbol: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              tokenName: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          ]
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return transactions;
    } catch (error) {
      console.error('Error searching transactions by token name:', error);
      return [];
    }
  }

  // Update token summary
  async updateTokenSummary(walletAddress, network, tokenAddress, tokenSymbol, tokenName) {
    try {
      // Get all transactions for this token
      const transactions = await this.prisma.walletTransaction.findMany({
        where: {
          walletAddress,
          network,
          tokenAddress
        }
      });
      
      // Calculate summary data
      let totalReceived = 0;
      let totalSent = 0;
      let firstTimestamp = null;
      let lastTimestamp = null;
      
      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount || '0');
        
        if (amount > 0) {
          totalReceived += amount;
        } else if (amount < 0) {
          totalSent += Math.abs(amount);
        }
        
        const timestamp = parseInt(tx.timestamp || '0');
        if (timestamp > 0) {
          if (!firstTimestamp || timestamp < firstTimestamp) {
            firstTimestamp = timestamp;
          }
          
          if (!lastTimestamp || timestamp > lastTimestamp) {
            lastTimestamp = timestamp;
          }
        }
      });
      
      const currentBalance = totalReceived - totalSent;
      
      await this.prisma.walletTokenSummary.upsert({
        where: {
          walletAddress_network_tokenAddress: {
            walletAddress,
            network,
            tokenAddress
          }
        },
        update: {
          tokenSymbol,
          tokenName,
          totalReceived: totalReceived.toString(),
          totalSent: totalSent.toString(),
          currentBalance: currentBalance.toString(),
          transactionCount: transactions.length,
          firstTransactionTimestamp: firstTimestamp ? firstTimestamp.toString() : null,
          lastTransactionTimestamp: lastTimestamp ? lastTimestamp.toString() : null,
          updatedAt: new Date()
        },
        create: {
          walletAddress,
          network,
          tokenAddress,
          tokenSymbol,
          tokenName,
          totalReceived: totalReceived.toString(),
          totalSent: totalSent.toString(),
          currentBalance: currentBalance.toString(),
          transactionCount: transactions.length,
          firstTransactionTimestamp: firstTimestamp ? firstTimestamp.toString() : null,
          lastTransactionTimestamp: lastTimestamp ? lastTimestamp.toString() : null
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating token summary:', error);
      return false;
    }
  }

  // Get token summary for a wallet
  async getTokenSummary(walletAddress, network) {
    try {
      const summary = await this.prisma.walletTokenSummary.findMany({
        where: {
          walletAddress: walletAddress,
          network: network
        },
        orderBy: {
          currentBalance: 'desc'
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting token summary:', error);
      return [];
    }
  }

  // Check if wallet has cached data
  async hasCachedData(walletAddress, network) {
    try {
      const count = await this.prisma.walletTransaction.count({
        where: {
          walletAddress,
          network
        }
      });

      return count > 0;
    } catch (error) {
      console.error('Error checking cached data:', error);
      return false;
    }
  }

  // Get latest transaction timestamp for incremental updates
  async getLatestTransactionTimestamp(walletAddress, network) {
    try {
      const latestTransaction = await this.prisma.walletTransaction.findFirst({
        where: {
          walletAddress,
          network
        },
        orderBy: {
          timestamp: 'desc'
        },
        select: {
          timestamp: true
        }
      });

      return latestTransaction?.timestamp || null;
    } catch (error) {
      console.error('Error getting latest transaction timestamp:', error);
      return null;
    }
  }

  // Store comprehensive portfolio data
  async storePortfolio(walletAddress, portfolioData) {
    try {
      await this.prisma.walletPortfolio.upsert({
        where: {
          walletAddress
        },
        update: {
          portfolioData: JSON.stringify(portfolioData),
          updatedAt: new Date()
        },
        create: {
          walletAddress,
          portfolioData: JSON.stringify(portfolioData)
        }
      });

      return true;
    } catch (error) {
      console.warn('Error storing portfolio data:', error.message);
      return false;
    }
  }

  // Get cached portfolio data
  async getPortfolio(walletAddress) {
    try {
      const portfolio = await this.prisma.walletPortfolio.findUnique({
        where: {
          walletAddress
        }
      });

      if (portfolio?.portfolioData) {
        return JSON.parse(portfolio.portfolioData);
      }
      return null;
    } catch (error) {
      console.warn('Error getting portfolio data:', error.message);
      return null;
    }
  }

  // Clear cache for a wallet (useful for debugging)
  async clearWalletCache(walletAddress, network) {
    try {
      await this.prisma.walletTransaction.deleteMany({
        where: {
          walletAddress,
          network
        }
      });

      await this.prisma.walletTokenSummary.deleteMany({
        where: {
          walletAddress,
          network
        }
      });

      return true;
    } catch (error) {
      console.error('Error clearing wallet cache:', error);
      return false;
    }
  }

  // Clear portfolio cache
  async clearPortfolioCache(walletAddress) {
    try {
      await this.prisma.walletPortfolio.delete({
        where: {
          walletAddress
        }
      });
      return true;
    } catch (error) {
      console.error('Error clearing portfolio cache:', error);
      return false;
    }
  }

  // Close database connection
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = new PrismaService();
