const portfolioService = require('../portfolioService');
const tatumService = require('../tatumService');
const prismaService = require('../prismaService');

// Mock the dependencies
jest.mock('../tatumService');
jest.mock('../prismaService');

describe('PortfolioService', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  describe('getComprehensivePortfolio', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    
    it('should return cached portfolio when available', async () => {
      const cachedPortfolio = {
        address: testAddress,
        lastUpdated: Date.now(),
        chains: {
          'ethereum-mainnet': {
            nativeBalance: '1.5',
            nativeSymbol: 'ETH',
            tokens: []
          }
        },
        totalValueUSD: 0,
        totalTransactionCount: 10
      };

      prismaService.getPortfolio.mockResolvedValue(cachedPortfolio);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result).toEqual({
        success: true,
        data: cachedPortfolio,
        cached: true
      });
      expect(prismaService.getPortfolio).toHaveBeenCalledWith(testAddress);
      expect(tatumService.getInstance).not.toHaveBeenCalled();
    });

    it('should build portfolio from database when cache is not available', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      const mockSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: '0x0de0b6b3a7640000' // 1 ETH in hex
          })
        }
      };

      tatumService.getInstance.mockResolvedValue(mockSdk);
      prismaService.getTokenSummary.mockResolvedValue([]);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.data).toHaveProperty('address', testAddress);
      expect(result.data).toHaveProperty('chains');
      expect(result.data).toHaveProperty('summary');
      expect(prismaService.storePortfolio).toHaveBeenCalled();
    });

    it('should handle multiple chains correctly', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      const mockEthSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: '0x0de0b6b3a7640000' // 1 ETH
          })
        }
      };

      const mockBaseSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: '0x16345785d8a0000' // 0.1 ETH
          })
        }
      };

      const mockSolanaSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: {
              value: 5000000000 // 5 SOL
            }
          })
        }
      };

      tatumService.getInstance.mockImplementation((chain) => {
        if (chain === 'ethereum-mainnet') return Promise.resolve(mockEthSdk);
        if (chain === 'base-mainnet') return Promise.resolve(mockBaseSdk);
        if (chain === 'solana-mainnet') return Promise.resolve(mockSolanaSdk);
        return Promise.resolve(null);
      });

      prismaService.getTokenSummary.mockResolvedValue([]);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data.chains)).toHaveLength(3);
      expect(result.data.chains['ethereum-mainnet']).toBeDefined();
      expect(result.data.chains['base-mainnet']).toBeDefined();
      expect(result.data.chains['solana-mainnet']).toBeDefined();
    });

    it('should use native token from database when available', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      const nativeTokenSummary = [
        {
          tokenAddress: 'native',
          currentBalance: '2.5',
          tokenSymbol: 'ETH',
          tokenName: 'Ethereum',
          tokenDecimals: 18
        }
      ];

      prismaService.getTokenSummary.mockResolvedValue(nativeTokenSummary);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = { rpc: { getBalance: jest.fn() } };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.chains['ethereum-mainnet'].nativeBalance).toBe('2.5');
      expect(result.data.chains['ethereum-mainnet'].nativeSymbol).toBe('ETH');
      expect(mockSdk.rpc.getBalance).not.toHaveBeenCalled();
    });

    it('should fallback to RPC when native token not in database', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      
      const mockSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: '0x2b5e3af16b1880000' // 50 ETH
          })
        }
      };

      tatumService.getInstance.mockResolvedValue(mockSdk);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(mockSdk.rpc.getBalance).toHaveBeenCalled();
      expect(parseFloat(result.data.chains['ethereum-mainnet'].nativeBalance)).toBeCloseTo(50, 1);
    });

    it('should process token summaries from database', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      const tokenSummaries = [
        {
          tokenAddress: '0xabc123',
          currentBalance: '1000',
          tokenName: 'Test Token',
          tokenSymbol: 'TEST',
          tokenDecimals: 18
        },
        {
          tokenAddress: '0xdef456',
          currentBalance: '500.5',
          tokenName: 'Another Token',
          tokenSymbol: 'ANOT',
          tokenDecimals: 6
        }
      ];

      prismaService.getTokenSummary.mockResolvedValue(tokenSummaries);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.chains['ethereum-mainnet'].tokens).toHaveLength(2);
      expect(result.data.summary.tokenHoldings.length).toBeGreaterThan(0);
    });

    it('should fallback to RPC for token balances when database is empty', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      
      const mockTokenBalances = {
        success: true,
        data: {
          tokens: [
            {
              address: '0xtoken123',
              balance: '100',
              symbol: 'TKN',
              name: 'Token',
              decimals: 18
            }
          ]
        }
      };

      tatumService.getTokenBalances.mockResolvedValue(mockTokenBalances);
      
      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(tatumService.getTokenBalances).toHaveBeenCalled();
    });

    it('should process transactions and calculate statistics', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      
      const transactions = [
        {
          transactionHash: '0xabc1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xabc2',
          transactionType: 'send',
          amount: '5',
          tokenSymbol: 'ETH',
          timestamp: 1000100
        },
        {
          transactionHash: '0xabc3',
          transactionType: 'receive',
          amount: '20',
          tokenSymbol: 'USDC',
          timestamp: 1000200
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.summary.receivedCount).toBe(2);
      expect(result.data.summary.sentCount).toBe(1);
      expect(result.data.summary.totalReceived['ETH']).toBe(10);
      expect(result.data.summary.totalReceived['USDC']).toBe(20);
      expect(result.data.summary.totalSent['ETH']).toBe(5);
    });

    it('should track highest value transaction', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: '50',
          tokenSymbol: 'ETH',
          timestamp: 1000100
        },
        {
          transactionHash: '0xtx3',
          transactionType: 'receive',
          amount: '5',
          tokenSymbol: 'ETH',
          timestamp: 1000200
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.summary.highestValue.amount).toBe('50');
      expect(result.data.summary.highestValue.txHash).toBe('0xtx2');
      expect(result.data.summary.highestValue.symbol).toBe('ETH');
    });

    it('should track most recent transaction', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      
      const transactions = [
        {
          transactionHash: '0xold',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xrecent',
          transactionType: 'send',
          amount: '5',
          tokenSymbol: 'USDC',
          timestamp: 2000000
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.summary.mostRecentTx.txHash).toBe('0xrecent');
      expect(result.data.summary.mostRecentTx.timestamp).toBe(2000000);
    });

    it('should skip non-transfer transactions', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'contract',
          amount: '100',
          tokenSymbol: 'ETH',
          timestamp: 1000100
        },
        {
          transactionHash: '0xtx3',
          transactionType: null,
          amount: '50',
          tokenSymbol: 'ETH',
          timestamp: 1000200
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.summary.receivedCount).toBe(1);
      expect(result.data.summary.sentCount).toBe(0);
    });

    it('should sort token holdings by balance', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      const tokenSummaries = [
        {
          tokenAddress: '0xtoken1',
          currentBalance: '100',
          tokenName: 'Token A',
          tokenSymbol: 'TKNA',
          tokenDecimals: 18
        },
        {
          tokenAddress: '0xtoken2',
          currentBalance: '1000',
          tokenName: 'Token B',
          tokenSymbol: 'TKNB',
          tokenDecimals: 18
        },
        {
          tokenAddress: '0xtoken3',
          currentBalance: '50',
          tokenName: 'Token C',
          tokenSymbol: 'TKNC',
          tokenDecimals: 18
        }
      ];

      prismaService.getTokenSummary.mockResolvedValue(tokenSummaries);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      const holdings = result.data.summary.tokenHoldings;
      expect(holdings.length).toBeGreaterThan(0);
      // Verify sorting - first should have highest balance
      for (let i = 0; i < holdings.length - 1; i++) {
        expect(parseFloat(holdings[i].balance)).toBeGreaterThanOrEqual(
          parseFloat(holdings[i + 1].balance)
        );
      }
    });

    it('should handle chain errors gracefully', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      tatumService.getInstance.mockImplementation((chain) => {
        if (chain === 'ethereum-mainnet') {
          return Promise.reject(new Error('Chain not available'));
        }
        return Promise.resolve({
          rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
        });
      });

      prismaService.getTokenSummary.mockResolvedValue([]);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      // Should still succeed with other chains
      expect(result.success).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle when SDK is not available for a chain', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      tatumService.getInstance.mockImplementation((chain) => {
        if (chain === 'ethereum-mainnet') return Promise.resolve(null);
        return Promise.resolve({
          rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
        });
      });

      prismaService.getTokenSummary.mockResolvedValue([]);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle errors and return failure response', async () => {
      prismaService.getPortfolio.mockRejectedValue(new Error('Database error'));

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle empty transactions array', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.totalTransactionCount).toBe(0);
      expect(result.data.summary.receivedCount).toBe(0);
      expect(result.data.summary.sentCount).toBe(0);
    });

    it('should handle tokens with zero balance', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      
      const tokenSummaries = [
        {
          tokenAddress: '0xtoken1',
          currentBalance: '0',
          tokenName: 'Zero Token',
          tokenSymbol: 'ZERO',
          tokenDecimals: 18
        },
        {
          tokenAddress: '0xtoken2',
          currentBalance: '100',
          tokenName: 'Active Token',
          tokenSymbol: 'ACTIVE',
          tokenDecimals: 18
        }
      ];

      prismaService.getTokenSummary.mockResolvedValue(tokenSummaries);
      prismaService.getCachedTransactions.mockResolvedValue([]);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      // Zero balance token should not be in holdings
      const zeroBalanceToken = result.data.summary.tokenHoldings.find(
        t => t.symbol === 'ZERO'
      );
      expect(zeroBalanceToken).toBeUndefined();
    });

    it('should handle malformed transaction data', async () => {
      prismaService.getPortfolio.mockResolvedValue(null);
      prismaService.getTokenSummary.mockResolvedValue([]);
      
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: null,
          tokenSymbol: null,
          timestamp: null
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: 'invalid',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);
      prismaService.storePortfolio.mockResolvedValue(true);

      const mockSdk = {
        rpc: { getBalance: jest.fn().mockResolvedValue({ result: '0x0' }) }
      };
      tatumService.getInstance.mockResolvedValue(mockSdk);

      const result = await portfolioService.getComprehensivePortfolio(testAddress);

      expect(result.success).toBe(true);
      // Should handle gracefully without crashing
    });
  });

  describe('getTokenBalances', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    it('should handle Base chain with USDC specially', async () => {
      const mockSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: '0x0de0b6b3a7640000' // 1 ETH
          })
        }
      };

      tatumService.getInstance.mockResolvedValue(mockSdk);
      tatumService.getTokenBalance.mockResolvedValue('0x989680'); // 10 USDC

      const result = await portfolioService.getTokenBalances('base-mainnet', testAddress);

      expect(result.success).toBe(true);
      expect(result.data.tokens).toHaveLength(2);
      expect(result.data.tokens[0].symbol).toBe('ETH');
      expect(result.data.tokens[1].symbol).toBe('USDC');
      expect(parseFloat(result.data.tokens[1].balance)).toBe(10);
    });

    it('should not include USDC if balance is zero on Base', async () => {
      const mockSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: '0x0de0b6b3a7640000'
          })
        }
      };

      tatumService.getInstance.mockResolvedValue(mockSdk);
      tatumService.getTokenBalance.mockResolvedValue('0x0');

      const result = await portfolioService.getTokenBalances('base-mainnet', testAddress);

      expect(result.success).toBe(true);
      expect(result.data.tokens).toHaveLength(1);
      expect(result.data.tokens[0].symbol).toBe('ETH');
    });

    it('should handle USDC with null or 0x response', async () => {
      const mockSdk = {
        rpc: {
          getBalance: jest.fn().mockResolvedValue({
            result: '0x0de0b6b3a7640000'
          })
        }
      };

      tatumService.getInstance.mockResolvedValue(mockSdk);
      tatumService.getTokenBalance.mockResolvedValue('0x');

      const result = await portfolioService.getTokenBalances('base-mainnet', testAddress);

      expect(result.success).toBe(true);
      expect(result.data.tokens).toHaveLength(1);
    });

    it('should delegate to tatumService for non-Base chains', async () => {
      const mockResponse = {
        success: true,
        data: {
          address: testAddress,
          chain: 'ethereum-mainnet',
          tokens: [
            { symbol: 'ETH', balance: '1.5', name: 'Ethereum', decimals: 18 }
          ]
        }
      };

      tatumService.getTokenBalances.mockResolvedValue(mockResponse);

      const result = await portfolioService.getTokenBalances('ethereum-mainnet', testAddress);

      expect(result).toEqual(mockResponse);
      expect(tatumService.getTokenBalances).toHaveBeenCalledWith('ethereum-mainnet', testAddress);
    });

    it('should handle errors gracefully', async () => {
      tatumService.getInstance.mockRejectedValue(new Error('Network error'));

      const result = await portfolioService.getTokenBalances('base-mainnet', testAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle Solana chain', async () => {
      const mockResponse = {
        success: true,
        data: {
          address: testAddress,
          chain: 'solana-mainnet',
          tokens: [
            { symbol: 'SOL', balance: '5.0', name: 'Solana', decimals: 9 }
          ]
        }
      };

      tatumService.getTokenBalances.mockResolvedValue(mockResponse);

      const result = await portfolioService.getTokenBalances('solana-mainnet', testAddress);

      expect(result.success).toBe(true);
      expect(result.data.chain).toBe('solana-mainnet');
    });
  });

  describe('getTransactionSummary', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    beforeEach(() => {
      // Mock getComprehensivePortfolio since it's called internally
      jest.spyOn(portfolioService, 'getComprehensivePortfolio');
    });

    it('should calculate transaction statistics correctly', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          address: testAddress,
          summary: {
            receivedCount: 10,
            sentCount: 5,
            totalReceived: { ETH: 100, USDC: 500 },
            totalSent: { ETH: 30, USDC: 100 },
            highestValue: {
              amount: '50',
              symbol: 'ETH',
              txHash: '0xhigh',
              timestamp: 1000000,
              chain: 'ethereum-mainnet'
            },
            mostRecentTx: {
              txHash: '0xrecent',
              timestamp: 2000000,
              type: 'receive',
              amount: '10',
              symbol: 'ETH',
              chain: 'ethereum-mainnet'
            },
            tokenHoldings: []
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getTransactionSummary(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.totalTransactions).toBe(15);
      expect(result.data.receivedCount).toBe(10);
      expect(result.data.sentCount).toBe(5);
      expect(result.data.receivedPercentage).toBeCloseTo(66.67, 1);
      expect(result.data.sentPercentage).toBeCloseTo(33.33, 1);
      expect(result.data.totalReceived).toBe(600);
      expect(result.data.totalSpent).toBe(130);
      expect(result.data.netProfitLoss).toBe(470);
    });

    it('should handle zero transactions', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          address: testAddress,
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
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getTransactionSummary(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.totalTransactions).toBe(0);
      expect(result.data.receivedPercentage).toBe(0);
      expect(result.data.sentPercentage).toBe(0);
      expect(result.data.totalReceived).toBe(0);
      expect(result.data.totalSpent).toBe(0);
      expect(result.data.netProfitLoss).toBe(0);
    });

    it('should handle portfolio fetch failure', async () => {
      const mockPortfolio = {
        success: false,
        error: 'Failed to fetch portfolio'
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getTransactionSummary(testAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch portfolio');
    });

    it('should handle negative net profit/loss', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          address: testAddress,
          summary: {
            receivedCount: 5,
            sentCount: 10,
            totalReceived: { ETH: 10 },
            totalSent: { ETH: 50 },
            highestValue: {},
            mostRecentTx: {},
            tokenHoldings: []
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getTransactionSummary(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.netProfitLoss).toBe(-40);
    });

    it('should handle errors', async () => {
      portfolioService.getComprehensivePortfolio.mockRejectedValue(
        new Error('Portfolio error')
      );

      const result = await portfolioService.getTransactionSummary(testAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Portfolio error');
    });

    it('should include token holdings in response', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          address: testAddress,
          summary: {
            receivedCount: 1,
            sentCount: 1,
            totalReceived: { ETH: 10 },
            totalSent: { ETH: 5 },
            highestValue: {},
            mostRecentTx: {},
            tokenHoldings: [
              { symbol: 'ETH', balance: '5', chain: 'ethereum-mainnet' },
              { symbol: 'USDC', balance: '100', chain: 'ethereum-mainnet' }
            ]
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getTransactionSummary(testAddress);

      expect(result.success).toBe(true);
      expect(result.data.tokenHoldings).toHaveLength(2);
    });
  });

  describe('checkTokenOwnership', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    beforeEach(() => {
      jest.spyOn(portfolioService, 'getComprehensivePortfolio');
    });

    it('should return true when token is owned', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          summary: {
            tokenHoldings: [
              { symbol: 'ETH', balance: '1.5', chain: 'ethereum-mainnet' },
              { symbol: 'USDC', balance: '100', chain: 'ethereum-mainnet' }
            ]
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.checkTokenOwnership(testAddress, 'USDC');

      expect(result.success).toBe(true);
      expect(result.data.owned).toBe(true);
      expect(result.data.holdings).toHaveLength(1);
      expect(result.data.holdings[0].symbol).toBe('USDC');
    });

    it('should be case-insensitive for token symbol', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          summary: {
            tokenHoldings: [
              { symbol: 'ETH', balance: '1.5', chain: 'ethereum-mainnet' }
            ]
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.checkTokenOwnership(testAddress, 'eth');

      expect(result.success).toBe(true);
      expect(result.data.owned).toBe(true);
    });

    it('should return false when token is not owned', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          summary: {
            tokenHoldings: [
              { symbol: 'ETH', balance: '1.5', chain: 'ethereum-mainnet' }
            ]
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.checkTokenOwnership(testAddress, 'USDC');

      expect(result.success).toBe(true);
      expect(result.data.owned).toBe(false);
      expect(result.data.holdings).toHaveLength(0);
    });

    it('should return multiple holdings for same token across chains', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          summary: {
            tokenHoldings: [
              { symbol: 'ETH', balance: '1.5', chain: 'ethereum-mainnet' },
              { symbol: 'ETH', balance: '0.5', chain: 'base-mainnet' }
            ]
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.checkTokenOwnership(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.owned).toBe(true);
      expect(result.data.holdings).toHaveLength(2);
    });

    it('should handle portfolio fetch failure', async () => {
      const mockPortfolio = {
        success: false,
        error: 'Portfolio error'
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.checkTokenOwnership(testAddress, 'ETH');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Portfolio error');
    });

    it('should handle errors', async () => {
      portfolioService.getComprehensivePortfolio.mockRejectedValue(
        new Error('Network error')
      );

      const result = await portfolioService.checkTokenOwnership(testAddress, 'ETH');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle empty token holdings', async () => {
      const mockPortfolio = {
        success: true,
        data: {
          summary: {
            tokenHoldings: []
          }
        }
      };

      portfolioService.getComprehensivePortfolio.mockResolvedValue(mockPortfolio);

      const result = await portfolioService.checkTokenOwnership(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.owned).toBe(false);
      expect(result.data.holdings).toHaveLength(0);
    });
  });

  describe('getTokenTransactionHistory', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    it('should fetch and filter transactions by token symbol', async () => {
      const ethTransactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: '5',
          tokenSymbol: 'ETH',
          timestamp: 1000100
        }
      ];

      const usdcTransactions = [
        {
          transactionHash: '0xtx3',
          transactionType: 'receive',
          amount: '100',
          tokenSymbol: 'USDC',
          timestamp: 1000200
        }
      ];

      prismaService.getCachedTransactions.mockImplementation((addr, chain) => {
        if (chain === 'ethereum-mainnet') return Promise.resolve(ethTransactions);
        if (chain === 'base-mainnet') return Promise.resolve(usdcTransactions);
        return Promise.resolve([]);
      });

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(2);
      expect(result.data.count).toBe(2);
      expect(result.data.tokenSymbol).toBe('ETH');
    });

    it('should be case-insensitive for token symbol', async () => {
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'eth');

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(1);
    });

    it('should sort transactions by timestamp (newest first)', async () => {
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: '5',
          tokenSymbol: 'ETH',
          timestamp: 2000000
        },
        {
          transactionHash: '0xtx3',
          transactionType: 'receive',
          amount: '15',
          tokenSymbol: 'ETH',
          timestamp: 1500000
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.transactions[0].timestamp).toBe(2000000);
      expect(result.data.transactions[1].timestamp).toBe(1500000);
      expect(result.data.transactions[2].timestamp).toBe(1000000);
    });

    it('should calculate total received and sent', async () => {
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: '5',
          tokenSymbol: 'ETH',
          timestamp: 1000100
        },
        {
          transactionHash: '0xtx3',
          transactionType: 'receive',
          amount: '20',
          tokenSymbol: 'ETH',
          timestamp: 1000200
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.totalReceived).toBe(30);
      expect(result.data.totalSent).toBe(5);
      expect(result.data.netAmount).toBe(25);
    });

    it('should handle transactions with positive/negative amounts', async () => {
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: '-5',
          tokenSymbol: 'ETH',
          timestamp: 1000100
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.totalReceived).toBe(10);
      expect(result.data.totalSent).toBe(5);
    });

    it('should return empty results when no transactions found', async () => {
      prismaService.getCachedTransactions.mockResolvedValue([]);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(0);
      expect(result.data.count).toBe(0);
      expect(result.data.totalReceived).toBe(0);
      expect(result.data.totalSent).toBe(0);
      expect(result.data.netAmount).toBe(0);
    });

    it('should query all supported chains', async () => {
      prismaService.getCachedTransactions.mockResolvedValue([]);

      await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(prismaService.getCachedTransactions).toHaveBeenCalledTimes(3);
      expect(prismaService.getCachedTransactions).toHaveBeenCalledWith(
        testAddress,
        'ethereum-mainnet'
      );
      expect(prismaService.getCachedTransactions).toHaveBeenCalledWith(
        testAddress,
        'base-mainnet'
      );
      expect(prismaService.getCachedTransactions).toHaveBeenCalledWith(
        testAddress,
        'solana-mainnet'
      );
    });

    it('should handle null or undefined amounts', async () => {
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: null,
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: undefined,
          tokenSymbol: 'ETH',
          timestamp: 1000100
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.totalReceived).toBe(0);
      expect(result.data.totalSent).toBe(0);
    });

    it('should handle transactions with null timestamp', async () => {
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: null
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(1);
    });

    it('should handle errors', async () => {
      prismaService.getCachedTransactions.mockRejectedValue(
        new Error('Database error')
      );

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should filter out transactions with null or missing tokenSymbol', async () => {
      const transactions = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        },
        {
          transactionHash: '0xtx2',
          transactionType: 'receive',
          amount: '5',
          tokenSymbol: null,
          timestamp: 1000100
        },
        {
          transactionHash: '0xtx3',
          transactionType: 'receive',
          amount: '15',
          tokenSymbol: 'USDC',
          timestamp: 1000200
        }
      ];

      prismaService.getCachedTransactions.mockResolvedValue(transactions);

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(1);
      expect(result.data.transactions[0].tokenSymbol).toBe('ETH');
    });

    it('should aggregate transactions across multiple chains', async () => {
      const ethMainnetTxs = [
        {
          transactionHash: '0xtx1',
          transactionType: 'receive',
          amount: '10',
          tokenSymbol: 'ETH',
          timestamp: 1000000
        }
      ];

      const baseTxs = [
        {
          transactionHash: '0xtx2',
          transactionType: 'send',
          amount: '5',
          tokenSymbol: 'ETH',
          timestamp: 1000100
        }
      ];

      prismaService.getCachedTransactions.mockImplementation((addr, chain) => {
        if (chain === 'ethereum-mainnet') return Promise.resolve(ethMainnetTxs);
        if (chain === 'base-mainnet') return Promise.resolve(baseTxs);
        return Promise.resolve([]);
      });

      const result = await portfolioService.getTokenTransactionHistory(testAddress, 'ETH');

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(2);
      expect(result.data.totalReceived).toBe(10);
      expect(result.data.totalSent).toBe(5);
    });
  });
});