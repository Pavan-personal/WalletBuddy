const { TatumSDK, Network } = require('@tatumio/tatum');
const config = require('../config');

class RPCService {
  constructor() {
    this.sdkCache = new Map();
    this.populationInProgress = new Set();
  }

  async getSDK(network) {
    if (this.sdkCache.has(network)) {
      return this.sdkCache.get(network);
    }

    // Convert network name to Tatum SDK format
    let tatumNetwork;
    switch (network) {
      case 'ethereum-mainnet':
        tatumNetwork = Network.ETHEREUM;
        break;
      case 'base-mainnet':
        tatumNetwork = Network.BASE;
        break;
      case 'solana-mainnet':
        tatumNetwork = Network.SOLANA;
        break;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }

    // Initialize SDK
    console.log(`✅ Tatum SDK initialized for ${network}`);
    const sdk = await TatumSDK.init({
      network: tatumNetwork,
      apiKey: config.tatum.mainnet,
      verbose: false
    });

    this.sdkCache.set(network, sdk);
    return sdk;
  }

  // Get native balance for any address (direct RPC call)
  async getNativeBalance(network, address) {
    try {
      const sdk = await this.getSDK(network);
      
      switch (network) {
        case 'ethereum-mainnet':
        case 'base-mainnet':
          const ethBalance = await sdk.rpc.getBalance(address);
          return {
            success: true,
            balance: (parseInt(ethBalance.result, 16) / 1e18).toString(),
            symbol: network === 'ethereum-mainnet' ? 'ETH' : 'ETH',
            network
          };
          
        case 'solana-mainnet':
          const solBalance = await sdk.rpc.getBalance(address);
          return {
            success: true,
            balance: (solBalance.result.value / 1e9).toString(),
            symbol: 'SOL',
            network
          };
          
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
    } catch (error) {
      console.error(`Error getting balance for ${address} on ${network}:`, error);
      return {
        success: false,
        error: error.message,
        balance: '0',
        network
      };
    }
  }

  // Get transaction count for any address (direct RPC call)
  async getTransactionCount(network, address) {
    try {
      const sdk = await this.getSDK(network);
      
      switch (network) {
        case 'ethereum-mainnet':
        case 'base-mainnet':
          const nonce = await sdk.rpc.getTransactionCount(address);
          return {
            success: true,
            count: parseInt(nonce.result, 16),
            network
          };
          
        case 'solana-mainnet':
          // For Solana, we need to get signatures to count transactions
          const signatures = await sdk.rpc.getSignaturesForAddress(address, { limit: 1000 });
          return {
            success: true,
            count: signatures.result ? signatures.result.length : 0,
            network
          };
          
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
    } catch (error) {
      console.error(`Error getting transaction count for ${address} on ${network}:`, error);
      return {
        success: false,
        error: error.message,
        count: 0,
        network
      };
    }
  }

  // Get token balances for any address (direct RPC call)
  async getTokenBalances(network, address) {
    try {
      const sdk = await this.getSDK(network);
      
      switch (network) {
        case 'ethereum-mainnet':
        case 'base-mainnet':
          // For EVM chains, we need to query specific token contracts
          // This is a simplified version that just returns the native balance
          const ethBalance = await sdk.rpc.getBalance(address);
          return {
            success: true,
            tokens: [
              {
                type: 'native',
                balance: (parseInt(ethBalance.result, 16) / 1e18).toString(),
                symbol: network === 'ethereum-mainnet' ? 'ETH' : 'ETH'
              }
            ],
            network
          };
          
        case 'solana-mainnet':
          // For Solana, we can use getParsedTokenAccountsByOwner
          const tokenAccounts = await sdk.rpc.getParsedTokenAccountsByOwner(address);
          const tokens = tokenAccounts.result?.value?.map(account => {
            const tokenData = account.account.data.parsed.info;
            return {
              type: 'token',
              mint: tokenData.mint,
              balance: (tokenData.tokenAmount.uiAmount || 0).toString(),
              decimals: tokenData.tokenAmount.decimals
            };
          }) || [];
          
          // Add native SOL balance
          const solBalance = await sdk.rpc.getBalance(address);
          tokens.unshift({
            type: 'native',
            balance: (solBalance.result.value / 1e9).toString(),
            symbol: 'SOL'
          });
          
          return {
            success: true,
            tokens,
            network
          };
          
        default:
          throw new Error(`Unsupported network: ${network}`);
      }
    } catch (error) {
      console.error(`Error getting token balances for ${address} on ${network}:`, error);
      return {
        success: false,
        error: error.message,
        tokens: [],
        network
      };
    }
  }

  // Trigger background database population for an address
  async triggerBackgroundDatabasePopulation(network, address) {
    try {
      // Create a unique key for this address+network
      const key = `${network}:${address}`;
      
      // Check if population is already in progress for this address
      if (this.populationInProgress.has(key)) {
        console.log(`🔄 Background DB population already in progress for ${address} on ${network}`);
        return { success: true, message: 'Population already in progress' };
      }
      
      // Check if address already exists in the database
      const prismaService = require('./prismaService');
      const existingTxs = await prismaService.getCachedTransactions(address, network, 1);
      
      if (existingTxs && existingTxs.length > 0) {
        console.log(`📦 Address ${address} already has data in the database`);
        return { success: true, message: 'Address already in database' };
      }
      
      // Mark as in progress
      this.populationInProgress.add(key);
      
      // Start background population
      console.log(`🔄 Starting background DB population for ${address} on ${network}`);
      
      // Don't await this - let it run in the background
      setTimeout(async () => {
        try {
          const tatumService = require('./tatumService');
          await tatumService.fetchAndCacheDetailedTransactions(network, address);
          console.log(`✅ Background DB population completed for ${address} on ${network}`);
        } catch (error) {
          console.error(`❌ Background DB population failed for ${address} on ${network}:`, error);
        } finally {
          // Remove from in-progress set
          this.populationInProgress.delete(key);
        }
      }, 100);
      
      return { success: true, message: 'Background population started' };
    } catch (error) {
      console.error(`Error triggering background DB population for ${address} on ${network}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new RPCService();