const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzePortfolio(portfolioData) {
    try {
      const prompt = `
        Analyze this crypto portfolio data and provide insights:
        
        Portfolio Data:
        - Address: ${portfolioData.address}
        - Network: ${portfolioData.network}
        - Balance: ${portfolioData.balance}
        - Tokens: ${JSON.stringify(portfolioData.tokens, null, 2)}
        - NFTs: ${JSON.stringify(portfolioData.nfts, null, 2)}
        - Transactions: ${portfolioData.transactions?.length || 0} transactions
        
        Please provide:
        1. Trader type/personality (e.g., "Diamond Hands", "DeFi Farmer", "NFT Collector")
        2. Key statistics (win rate, best trade, worst trade)
        3. Trading patterns and insights
        4. Achievements unlocked
        5. Recommendations for improvement
        
        Format the response as JSON with the following structure:
        {
          "traderType": "string",
          "personality": "string",
          "stats": {
            "totalTrades": number,
            "winRate": number,
            "bestTrade": number,
            "worstTrade": number,
            "totalValue": number
          },
          "insights": ["string"],
          "achievements": ["string"],
          "recommendations": ["string"]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON response
      try {
        const analysis = JSON.parse(text);
        return {
          success: true,
          data: analysis
        };
      } catch (parseError) {
        // If JSON parsing fails, return raw text
        return {
          success: true,
          data: {
            traderType: "Crypto Enthusiast",
            personality: "Active Trader",
            stats: {
              totalTrades: portfolioData.transactions?.length || 0,
              winRate: 0,
              bestTrade: 0,
              worstTrade: 0,
              totalValue: parseFloat(portfolioData.balance) || 0
            },
            insights: [text],
            achievements: ["Portfolio Analyzed"],
            recommendations: ["Keep trading!"]
          }
        };
      }
    } catch (error) {
      console.error('Error analyzing portfolio with Gemini:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generatePortfolioCard(portfolioData, analysis) {
    try {
      const prompt = `
        Create a trading card-style description for this crypto portfolio:
        
        Portfolio Data:
        - Address: ${portfolioData.address}
        - Network: ${portfolioData.network}
        - Balance: ${portfolioData.balance}
        - Trader Type: ${analysis.traderType}
        - Personality: ${analysis.personality}
        - Stats: ${JSON.stringify(analysis.stats, null, 2)}
        - Achievements: ${JSON.stringify(analysis.achievements, null, 2)}
        
        Create a fun, trading card-style description that includes:
        1. A catchy title
        2. A brief description of the trader
        3. Key stats in a card format
        4. Special abilities/achievements
        5. A fun quote or tagline
        
        Format as JSON:
        {
          "title": "string",
          "description": "string",
          "stats": {
            "level": number,
            "experience": number,
            "power": number
          },
          "abilities": ["string"],
          "quote": "string"
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const card = JSON.parse(text);
        return {
          success: true,
          data: card
        };
      } catch (parseError) {
        return {
          success: true,
          data: {
            title: "Crypto Trader",
            description: "A mysterious trader from the blockchain realm",
            stats: {
              level: Math.floor(Math.random() * 100),
              experience: portfolioData.transactions?.length || 0,
              power: Math.floor(parseFloat(portfolioData.balance) || 0)
            },
            abilities: ["Trading", "HODLing", "Diamond Hands"],
            quote: "To the moon! 🚀"
          }
        };
      }
    } catch (error) {
      console.error('Error generating portfolio card with Gemini:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async answerQuestion(question, walletData) {
    try {
      // Check if this is a balance query from RPC
      if (walletData.type === 'balance_query') {
        return this.answerBalanceQuestion(question, walletData);
      }
      
      // Enhanced prompt to handle complete wallet data from all tables
      const prompt = `
        Answer this question about the crypto portfolio: "${question}"
        
        Wallet Data:
        - Address: ${walletData.address}
        - Last Updated: ${walletData.lastUpdated ? new Date(walletData.lastUpdated).toISOString() : new Date().toISOString()}
        - Total Transaction Count: ${walletData.totalTransactionCount}
        
        Chain Data:
        ${Object.entries(walletData.chains || {}).map(([chain, data]) => `
        ${chain.toUpperCase()}:
        - Native Balance: ${data.nativeBalance} ${data.nativeSymbol}
        - Total Transactions: ${data.totalTransactions}
        - Received Transactions: ${data.receivedTransactions}
        - Sent Transactions: ${data.sentTransactions}
        - Token Holdings: ${JSON.stringify(data.tokens || [], null, 2)}
        - Recent Transactions: ${JSON.stringify((data.transactions || []).slice(0, 5).map(tx => ({
            hash: tx.transactionHash,
            type: tx.transactionType,
            amount: tx.amount,
            token: tx.tokenSymbol,
            tokenName: tx.tokenName,
            tokenAddress: tx.tokenAddress,
            timestamp: tx.timestamp
          })), null, 2)}
        `).join('\n')}
        
        Portfolio Summary:
        - Received Count: ${walletData.portfolioSummary?.receivedCount || 0}
        - Sent Count: ${walletData.portfolioSummary?.sentCount || 0}
        - Total Received: ${JSON.stringify(walletData.portfolioSummary?.totalReceived || {}, null, 2)}
        - Total Sent: ${JSON.stringify(walletData.portfolioSummary?.totalSent || {}, null, 2)}
        - Token Holdings: ${JSON.stringify(walletData.portfolioSummary?.tokenHoldings || [], null, 2)}
        
        UNIQUE TOKENS (${walletData.uniqueTokenCount || 0} total):
        ${JSON.stringify(walletData.uniqueTokens || [], null, 2)}
        
        SOLANA TOKENS:
        ${JSON.stringify(walletData.networkTokens?.['solana-mainnet'] || [], null, 2)}
        
        ETHEREUM TOKENS:
        ${JSON.stringify(walletData.networkTokens?.['ethereum-mainnet'] || [], null, 2)}
        
        BASE TOKENS:
        ${JSON.stringify(walletData.networkTokens?.['base-mainnet'] || [], null, 2)}
        
        TOKEN TRANSACTION HISTORY (by date):
        ${JSON.stringify(walletData.tokenTransactionHistory || {}, null, 2)}
        
        Token Summaries:
        ${JSON.stringify(walletData.rawData?.tokenSummaries || [], null, 2)}
        
        SPECIAL TOKEN DATA (IMPORTANT):
        
        VINE TOKEN TRANSACTIONS:
        ${JSON.stringify(walletData.specialTokens?.VINE || [], null, 2)}
        
        TRUMP TOKEN TRANSACTIONS:
        ${JSON.stringify(walletData.specialTokens?.TRUMP || [], null, 2)}
        
        USDC TOKEN TRANSACTIONS:
        ${JSON.stringify(walletData.specialTokens?.USDC || [], null, 2)}
        
        PUMP TOKEN TRANSACTIONS:
        ${JSON.stringify(walletData.specialTokens?.PUMP || [], null, 2)}
        
        IMPORTANT INSTRUCTIONS FOR TOKEN ANALYSIS:
        1. Look at each chain's data separately (ethereum-mainnet, base-mainnet, solana-mainnet)
        2. ALWAYS check the UNIQUE TOKENS section first - it has the most accurate count of unique tokens
        3. Use the network-specific token sections (SOLANA TOKENS, ETHEREUM TOKENS, BASE TOKENS) to analyze tokens by chain
        4. For Solana, check for specific token addresses like:
           - VINE: 6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump
           - TRUMP tokens: 6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN, E4jzcSdKf6bD8L4DPQj5iW7t9yTUa4kXfFuTGM7cdqTb, 4h8LjZWUfUQVgbEZ29UzTuGXNW6rwrJis78ZU66ekkPV
        5. For Base chain, check for USDC token: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
        6. Analyze tokenSymbol and tokenName fields for better identification
        7. The uniqueTokens array contains important details:
           - transaction counts (total, sent, received)
           - total amounts for each token
           - firstTransaction and lastTransaction with dates
           - largestTransaction with amount and date
           - recentTransactions with amounts and dates
        8. The TOKEN TRANSACTION HISTORY section shows token activity by date - use this for time-based analysis
        9. Be specific about token names, amounts, and transaction dates when available
        10. IMPORTANT: Check the SPECIAL TOKEN DATA section for specific token transactions
        11. For PUMP tokens, look for tokens with "pump" in the address or "Pump.fun" in the name
        12. When analyzing profits/losses, use the totalAmount field in uniqueTokens and the netAmount in tokenTransactionHistory
        
        Provide a helpful, accurate answer based on the detailed wallet data. You can analyze token balances, transaction history, and token holdings to answer questions about profits, losses, best performing tokens, etc.
        
        Keep the response conversational and helpful.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        data: {
          question,
          answer: text,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error answering question with Gemini:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async answerBalanceQuestion(question, balanceData) {
    try {
      // Create a specialized prompt for balance queries
      const prompt = `
        Answer this question about the crypto wallet: "${question}"
        
        Wallet Address: ${balanceData.address}
        Last Updated: ${balanceData.timestamp}
        
        Balance Information:
        ${Object.entries(balanceData.networks || {}).map(([network, data]) => {
          const networkName = network.split('-')[0].toUpperCase();
          return `${networkName}: ${data.balance} ${data.symbol} (${data.success ? 'Successfully fetched' : 'Failed to fetch'})`;
        }).join('\n')}
        
        Provide a helpful, accurate answer based on the balance data above. If the balance is 0, state that clearly.
        If the balance is greater than 0, mention the exact amount and which network it's on.
        
        Keep the response conversational and helpful.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        data: {
          question,
          answer: text,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error answering balance question with Gemini:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new GeminiService();