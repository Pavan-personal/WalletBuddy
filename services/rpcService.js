const { TatumSDK, Network } = require('@tatumio/tatum');
const config = require('../config');

class RPCService {
  constructor() {
    this.sdkCache = new Map();
  }

  async getSDK(network) {
    if (this.sdkCache.has(network)) {
      return this.sdkCache.get(network);
    }

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

  // Get basic account info (balance + transaction count)
  async getBasicAccountInfo(address) {
    const networks = ['ethereum-mainnet', 'base-mainnet', 'solana-mainnet'];
    const results = {};

    await Promise.all(networks.map(async (network) => {
      const [balance, txCount] = await Promise.all([
        this.getNativeBalance(network, address),
        this.getTransactionCount(network, address)
      ]);

      results[network] = {
        balance: balance.balance,
        symbol: balance.symbol,
        transactionCount: txCount.count,
        success: balance.success && txCount.success
      };
    }));

    return {
      success: true,
      address,
      networks: results,
      timestamp: Date.now()
    };
  }

  // Check if address is valid for a given network
  isValidAddress(network, address) {
    switch (network) {
      case 'ethereum-mainnet':
      case 'base-mainnet':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'solana-mainnet':
        return address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
      default:
        return false;
    }
  }

  // Auto-detect network from address format
  detectNetwork(address) {
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return ['ethereum-mainnet', 'base-mainnet']; // Could be either
    } else if (address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
      return ['solana-mainnet'];
    }
    return [];
  }
}

module.exports = new RPCService();
