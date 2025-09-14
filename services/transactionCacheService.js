const { Pool } = require('pg');
const config = require('../config');

class TransactionCacheService {
  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: { rejectUnauthorized: false }
    });
  }

  // Initialize database schema
  async initializeSchema() {
    try {
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await this.pool.query(schema);
      console.log('✅ Transaction cache schema initialized');
    } catch (error) {
      console.error('❌ Error initializing transaction cache schema:', error);
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

      const query = `
        INSERT INTO wallet_transactions (
          wallet_address, network, transaction_hash, block_number, slot_number,
          timestamp, transaction_type, transaction_subtype, amount, token_address,
          token_symbol, token_name, token_decimals, from_address, to_address,
          fee, memo, error_message, confirmation_status, instructions_count,
          signers_count, raw_transaction_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (wallet_address, network, transaction_hash) 
        DO UPDATE SET
          block_number = EXCLUDED.block_number,
          slot_number = EXCLUDED.slot_number,
          timestamp = EXCLUDED.timestamp,
          transaction_type = EXCLUDED.transaction_type,
          transaction_subtype = EXCLUDED.transaction_subtype,
          amount = EXCLUDED.amount,
          token_address = EXCLUDED.token_address,
          token_symbol = EXCLUDED.token_symbol,
          token_name = EXCLUDED.token_name,
          token_decimals = EXCLUDED.token_decimals,
          from_address = EXCLUDED.from_address,
          to_address = EXCLUDED.to_address,
          fee = EXCLUDED.fee,
          memo = EXCLUDED.memo,
          error_message = EXCLUDED.error_message,
          confirmation_status = EXCLUDED.confirmation_status,
          instructions_count = EXCLUDED.instructions_count,
          signers_count = EXCLUDED.signers_count,
          raw_transaction_data = EXCLUDED.raw_transaction_data,
          updated_at = CURRENT_TIMESTAMP
      `;

      await this.pool.query(query, [
        walletAddress, network, transactionHash, blockNumber, slotNumber,
        timestamp, transactionType, transactionSubtype, amount, tokenAddress,
        tokenSymbol, tokenName, tokenDecimals, fromAddress, toAddress,
        fee, memo, errorMessage, confirmationStatus, instructionsCount,
        signersCount, JSON.stringify(rawTransactionData)
      ]);

      return true;
    } catch (error) {
      // If database is not available, just log and continue
      console.warn('Database not available, skipping transaction storage:', error.message);
      return false;
    }
  }

  // Get cached transactions for a wallet
  async getCachedTransactions(walletAddress, network, limit = 100) {
    try {
      const query = `
        SELECT * FROM wallet_transactions 
        WHERE wallet_address = $1 AND network = $2 
        ORDER BY timestamp DESC 
        LIMIT $3
      `;
      
      const result = await this.pool.query(query, [walletAddress, network, limit]);
      return result.rows;
    } catch (error) {
      console.warn('Database not available, returning empty transactions:', error.message);
      return [];
    }
  }

  // Get transactions by token
  async getTransactionsByToken(walletAddress, network, tokenAddress) {
    try {
      const query = `
        SELECT * FROM wallet_transactions 
        WHERE wallet_address = $1 AND network = $2 AND token_address = $3
        ORDER BY timestamp DESC
      `;
      
      const result = await this.pool.query(query, [walletAddress, network, tokenAddress]);
      return result.rows;
    } catch (error) {
      console.error('Error getting transactions by token:', error);
      return [];
    }
  }

  // Search transactions by token symbol/name
  async searchTransactionsByTokenName(walletAddress, network, searchTerm) {
    try {
      const query = `
        SELECT * FROM wallet_transactions 
        WHERE wallet_address = $1 AND network = $2 
        AND (LOWER(token_symbol) LIKE LOWER($3) OR LOWER(token_name) LIKE LOWER($3))
        ORDER BY timestamp DESC
      `;
      
      const result = await this.pool.query(query, [walletAddress, network, `%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      console.error('Error searching transactions by token name:', error);
      return [];
    }
  }

  // Update token summary
  async updateTokenSummary(walletAddress, network, tokenAddress, tokenSymbol, tokenName) {
    try {
      // Get aggregated data for this token
      const summaryQuery = `
        SELECT 
          COUNT(*) as transaction_count,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_received,
          SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_sent,
          MIN(timestamp) as first_transaction_timestamp,
          MAX(timestamp) as last_transaction_timestamp
        FROM wallet_transactions 
        WHERE wallet_address = $1 AND network = $2 AND token_address = $3
      `;
      
      const summaryResult = await this.pool.query(summaryQuery, [walletAddress, network, tokenAddress]);
      const summary = summaryResult.rows[0];
      
      const currentBalance = (summary.total_received || 0) - (summary.total_sent || 0);
      
      const upsertQuery = `
        INSERT INTO wallet_token_summary (
          wallet_address, network, token_address, token_symbol, token_name,
          total_received, total_sent, current_balance, transaction_count,
          first_transaction_timestamp, last_transaction_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (wallet_address, network, token_address)
        DO UPDATE SET
          token_symbol = EXCLUDED.token_symbol,
          token_name = EXCLUDED.token_name,
          total_received = EXCLUDED.total_received,
          total_sent = EXCLUDED.total_sent,
          current_balance = EXCLUDED.current_balance,
          transaction_count = EXCLUDED.transaction_count,
          first_transaction_timestamp = EXCLUDED.first_transaction_timestamp,
          last_transaction_timestamp = EXCLUDED.last_transaction_timestamp,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await this.pool.query(upsertQuery, [
        walletAddress, network, tokenAddress, tokenSymbol, tokenName,
        summary.total_received || 0, summary.total_sent || 0, currentBalance,
        summary.transaction_count || 0, summary.first_transaction_timestamp,
        summary.last_transaction_timestamp
      ]);
      
      return true;
    } catch (error) {
      console.error('Error updating token summary:', error);
      return false;
    }
  }

  // Get token summary for a wallet
  async getTokenSummary(walletAddress, network) {
    try {
      const query = `
        SELECT * FROM wallet_token_summary 
        WHERE wallet_address = $1 AND network = $2
        ORDER BY current_balance DESC
      `;
      
      const result = await this.pool.query(query, [walletAddress, network]);
      return result.rows;
    } catch (error) {
      console.error('Error getting token summary:', error);
      return [];
    }
  }

  // Check if wallet has cached data
  async hasCachedData(walletAddress, network) {
    try {
      const query = `
        SELECT COUNT(*) as count FROM wallet_transactions 
        WHERE wallet_address = $1 AND network = $2
      `;
      
      const result = await this.pool.query(query, [walletAddress, network]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking cached data:', error);
      return false;
    }
  }

  // Get latest transaction timestamp for incremental updates
  async getLatestTransactionTimestamp(walletAddress, network) {
    try {
      const query = `
        SELECT MAX(timestamp) as latest_timestamp FROM wallet_transactions 
        WHERE wallet_address = $1 AND network = $2
      `;
      
      const result = await this.pool.query(query, [walletAddress, network]);
      return result.rows[0].latest_timestamp;
    } catch (error) {
      console.error('Error getting latest transaction timestamp:', error);
      return null;
    }
  }

  // Clear cache for a wallet (useful for debugging)
  async clearWalletCache(walletAddress, network) {
    try {
      await this.pool.query(
        'DELETE FROM wallet_transactions WHERE wallet_address = $1 AND network = $2',
        [walletAddress, network]
      );
      await this.pool.query(
        'DELETE FROM wallet_token_summary WHERE wallet_address = $1 AND network = $2',
        [walletAddress, network]
      );
      return true;
    } catch (error) {
      console.error('Error clearing wallet cache:', error);
      return false;
    }
  }
  
  // Store comprehensive portfolio data
  async storePortfolio(walletAddress, portfolioData) {
    try {
      const query = `
        INSERT INTO wallet_portfolio (
          wallet_address, portfolio_data
        ) VALUES ($1, $2)
        ON CONFLICT (wallet_address)
        DO UPDATE SET
          portfolio_data = EXCLUDED.portfolio_data,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await this.pool.query(query, [
        walletAddress, JSON.stringify(portfolioData)
      ]);
      
      return true;
    } catch (error) {
      console.warn('Error storing portfolio data:', error.message);
      return false;
    }
  }
  
  // Get cached portfolio data
  async getPortfolio(walletAddress) {
    try {
      const query = `
        SELECT portfolio_data FROM wallet_portfolio
        WHERE wallet_address = $1
      `;
      
      const result = await this.pool.query(query, [walletAddress]);
      
      if (result.rows.length > 0) {
        return result.rows[0].portfolio_data;
      }
      
      return null;
    } catch (error) {
      console.warn('Error getting portfolio data:', error.message);
      return null;
    }
  }
  
  // Clear portfolio cache
  async clearPortfolioCache(walletAddress) {
    try {
      await this.pool.query(
        'DELETE FROM wallet_portfolio WHERE wallet_address = $1',
        [walletAddress]
      );
      return true;
    } catch (error) {
      console.error('Error clearing portfolio cache:', error);
      return false;
    }
  }

  // Close database connection
  async close() {
    await this.pool.end();
  }
}

module.exports = new TransactionCacheService();
