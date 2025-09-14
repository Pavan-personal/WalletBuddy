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

  async answerQuestion(question, portfolioData) {
    try {
      // Enhanced prompt to handle comprehensive portfolio data
      const prompt = `
        Answer this question about the crypto portfolio: "${question}"
        
        Portfolio Data:
        - Address: ${portfolioData.address}
        - Last Updated: ${new Date(portfolioData.lastUpdated).toISOString()}
        - Total Transaction Count: ${portfolioData.totalTransactionCount}
        
        Chain Data:
        ${Object.entries(portfolioData.chains || {}).map(([chain, data]) => `
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
            timestamp: tx.timestamp
          })), null, 2)}
        `).join('\n')}
        
        Summary:
        - Received Count: ${portfolioData.summary?.receivedCount || 0}
        - Sent Count: ${portfolioData.summary?.sentCount || 0}
        - Total Received: ${JSON.stringify(portfolioData.summary?.totalReceived || {}, null, 2)}
        - Total Sent: ${JSON.stringify(portfolioData.summary?.totalSent || {}, null, 2)}
        - Token Holdings: ${JSON.stringify(portfolioData.summary?.tokenHoldings || [], null, 2)}
        
        IMPORTANT INSTRUCTIONS FOR TOKEN ANALYSIS:
        1. Look at each chain's data separately (ethereum-mainnet, base-mainnet, solana-mainnet)
        2. For Solana, check for specific token addresses like:
           - VINE: 4Q6WW2ouZ6V3iaF56hgF6hXWgJtT4nXgKcQzqo7Wn1fQ
           - TRUMP tokens: 6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN, E4jzcSdKf6bD8L4DPQj5iW7t9yTUa4kXfFuTGM7cdqTb, 4h8LjZWUfUQVgbEZ29UzTuGXNW6rwrJis78ZU66ekkPV
        3. For Base chain, check for USDC token: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
        4. Analyze tokenSymbol and tokenName fields for better identification
        5. Calculate totals by summing amounts for specific tokens
        6. Count transactions by looking at receivedTransactions and sentTransactions
        7. Be specific about token names, amounts, and transaction details when available
        
        Provide a helpful, accurate answer based on the detailed portfolio data. You can analyze token balances, transaction history, and token holdings to answer questions about profits, losses, best performing tokens, etc.
        
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
}

module.exports = new GeminiService();
