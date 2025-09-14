# WalletBuddy AI - Backend Server

## Demo

# Starting the server with Gemini & Tatum API integrations

<img width="1470" height="670" alt="q1" src="https://github.com/user-attachments/assets/91f3c095-a4df-484b-99af-bcdb4b23d201" />

# Populating the transaction data into database by getTransaction()

<img width="738" height="670" alt="q2" src="https://github.com/user-attachments/assets/6f9db4fe-e1f9-45b7-8dc7-b9490aa4982a" />

# 2 transactions per second will be performed (as rate limit is 3 calls per second)

<img width="735" height="670" alt="q3" src="https://github.com/user-attachments/assets/44bcae8d-e66c-4d35-a805-c7ed04e6aef3" />

# Token data like symbol and amount will be fetched and populated into db successfully.

<img width="737" height="670" alt="q4" src="https://github.com/user-attachments/assets/00400e4e-4771-48d4-a17f-5ec53db02a34" />

# Normal questions like balance & transaction count can be answered by rpc node call.

<img width="1470" height="670" alt="q5" src="https://github.com/user-attachments/assets/f0425e61-e4e8-45df-85fd-4f1560bf9dc3" />

# But complex queries like profit loss, token related, buys and sells, can be deduced from database. (which are initally fetched from rpc itself)

<img width="1470" height="670" alt="q6" src="https://github.com/user-attachments/assets/f56f6f92-44c7-413b-af7d-d14bb3e3e891" />

# Here I asked about Vine coin related transaction to AI and it answers as well.

<img width="1470" height="670" alt="q7" src="https://github.com/user-attachments/assets/67fbfc25-f8ec-465e-ab67-0758c5179a76" />

# These are the wallet_transactions collection snaps (amount, symbols, addresses and name of token)

<img width="1208" height="670" alt="q8" src="https://github.com/user-attachments/assets/ed16dd18-90e0-4fc3-b8af-92c141a3cbb5" />

<img width="1470" height="670" alt="q9" src="https://github.com/user-attachments/assets/898c8414-7c04-4c00-bc09-f7f0b6507299" />

# wallet_token_summary collections

<img width="1470" height="670" alt="q10" src="https://github.com/user-attachments/assets/16c53a4b-66f5-409c-886c-5bda3a01a1af" />

<img width="1470" height="670" alt="q11" src="https://github.com/user-attachments/assets/cfa937b8-f3b2-471b-aeeb-7b0c58ba78d7" />

# wallet_portfolio collection

<img width="1470" height="670" alt="q12" src="https://github.com/user-attachments/assets/7d1463a4-76a4-4962-a522-6eba02efc880" />

## Overview

A comprehensive backend service for WalletBuddy AI that provides portfolio analysis, AI-powered insights, and blockchain data integration for cryptocurrency wallets.

## Architecture

### Core Services
- **Portfolio Service**: Manages wallet portfolio data and analysis
- **AI Service**: Integrates with Gemini AI for portfolio insights
- **RPC Service**: Handles blockchain data fetching
- **Token Metadata Service**: Manages token information and metadata
- **Transaction Cache Service**: Optimizes transaction data retrieval
- **Tatum Service**: Blockchain data provider integration

### Database
- **PostgreSQL** with Prisma ORM
- **Schema**: Portfolio data, transactions, token metadata, AI responses

## API Endpoints

### Portfolio Routes (`/api/portfolio`)
- `GET /portfolio/:address` - Get portfolio data for wallet address
- `POST /portfolio/populate` - Populate database with wallet data
- `GET /portfolio/status/:address` - Check population status
- `GET /portfolio/formatted/:address` - Get formatted portfolio data

### AI Routes (`/api/ai`)
- `POST /query` - AI-powered portfolio analysis and Q&A
- `GET /health` - Health check

### RPC Routes (`/api/rpc`)
- `POST /rpc` - Generic RPC calls to blockchain networks
- `GET /networks` - Available network configurations

### Transaction Routes (`/api/transactions`)
- `GET /transactions/:address` - Get transaction history
- `POST /transactions/cache` - Cache transaction data

## Environment Variables

Create a `.env` file in the server directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/walletbuddy"

# Tatum API (Blockchain Data)
TATUM_API_KEY_MAINNET="your_tatum_mainnet_key"
TATUM_API_KEY_TESTNET="your_tatum_testnet_key"

# Gemini AI
GEMINI_API_KEY="your_gemini_api_key"

# WalletConnect (Optional)
WALLET_CONNECT_PROJECT_ID="your_walletconnect_project_id"

# Server Configuration
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

## Installation & Setup

1. **Install Dependencies**
```bash
   cd server
npm install
   ```

2. **Database Setup**
   ```bash
   # Initialize database
   npm run db:init
   
   # Run migrations
   npx prisma migrate dev
   ```

3. **Start Server**
   ```bash
   npm start
   ```

## Workflow

### 1. Wallet Connection Flow
```
User connects wallet → Frontend sends address → Backend validates → Returns connection status
```

### 2. Portfolio Population Flow
```
Wallet connected → Trigger population → Fetch blockchain data → Process transactions → 
Update token metadata → Store in database → Return population status
```

### 3. AI Analysis Flow
```
User query → Send to Gemini AI → Process response → Return formatted insights
```

### 4. Data Flow Architecture
```
Frontend → API Gateway → Service Layer → Database
                ↓
         External APIs (Tatum, Gemini)
```

## Key Features

### Portfolio Analysis
- Real-time balance tracking
- Transaction history analysis
- Token metadata management
- Profit/loss calculations

### AI Integration
- Natural language queries
- Portfolio insights
- Transaction analysis
- Investment recommendations

### Blockchain Integration
- Multi-chain support (Ethereum, Base)
- Real-time data fetching
- Transaction caching
- Token metadata updates

## Database Schema

### Tables
- `portfolios` - Wallet portfolio data
- `transactions` - Transaction history
- `tokens` - Token metadata
- `ai_responses` - AI query responses

### Relationships
- One-to-many: Portfolio → Transactions
- Many-to-many: Portfolio → Tokens (through holdings)

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm run db:init` - Initialize database
- `npm run db:reset` - Reset database

### Testing
- Health check: `GET /api/ai/health`
- Test portfolio: `GET /api/portfolio/0x...`
- Test AI: `POST /api/ai/query`

## Deployment

### Production Checklist
- [ ] Set all environment variables
- [ ] Configure database connection
- [ ] Set up CORS for production domain
- [ ] Configure rate limiting
- [ ] Set up monitoring

### Docker Support
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Monitoring & Logs

### Health Endpoints
- `/api/ai/health` - AI service health
- `/api/portfolio/status/:address` - Portfolio status

### Logging
- Request/response logging
- Error tracking
- Performance monitoring

## Security

### API Security
- CORS configuration
- Input validation
- Rate limiting
- Error handling

### Data Protection
- Encrypted database connections
- Secure API key management
- Input sanitization

## Troubleshooting

### Common Issues
1. **Database Connection**: Check DATABASE_URL
2. **API Keys**: Verify Tatum and Gemini keys
3. **CORS**: Ensure CORS_ORIGIN matches frontend URL
4. **Port Conflicts**: Check PORT environment variable

### Debug Commands
```bash
# Check database connection
npm run db:check

# Test API endpoints
curl http://localhost:3001/api/ai/health

# View logs
npm run logs
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details
