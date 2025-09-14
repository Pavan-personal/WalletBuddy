require('dotenv').config();

module.exports = {
  // Tatum API Keys
  tatum: {
    mainnet: process.env.TATUM_API_KEY_MAINNET,
    testnet: process.env.TATUM_API_KEY_TESTNET
  },
  
  // Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL
  },
  
  // Wallet Connect
  walletConnect: {
    projectId: process.env.WALLET_CONNECT_PROJECT_ID
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT,
    env: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN
  }
};
