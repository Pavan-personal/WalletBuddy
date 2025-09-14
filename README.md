# 🚀 AI Portfolio Cards - Tatum Hackathon Project

A revolutionary AI-powered crypto portfolio analyzer that creates beautiful trading card-style visualizations of your blockchain journey. Built with Tatum APIs and Gemini AI.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Keys Setup](#api-keys-setup)
- [Usage](#usage)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Resources & Documentation](#resources--documentation)
- [Development Guide](#development-guide)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Project Overview

**AI Portfolio Cards** is a unique web application that combines blockchain data analysis with AI-powered insights to create personalized trading card-style visualizations of users' crypto portfolios. Users can connect their wallets across multiple networks, ask AI questions about their trading history, and generate beautiful, shareable portfolio cards.

### 🏆 Hackathon Requirements Met
- ✅ **Tatum API Integration** - Full blockchain data access
- ✅ **Direct Tatum SDK Integration** - Fast and reliable blockchain access
- ✅ **Multi-chain Support** - Ethereum, Base, Polygon, Solana, Bitcoin
- ✅ **Innovation** - Unique trading card concept
- ✅ **Technical Excellence** - Complex AI + blockchain integration

## ✨ Features

### 🎨 Portfolio Cards
- **Trading Card Style** - Pokemon/Yu-Gi-Oh inspired design
- **Multiple Themes** - Cyberpunk, Retro Gaming, Minimalist
- **Animated Effects** - Subtle sparkles and hover effects
- **Shareable Format** - Download as image or share on social media

### 🤖 AI Chat Interface
- **Natural Language Queries** - Ask anything about your portfolio
- **Smart Validation** - Filters non-crypto related questions
- **Contextual Responses** - AI understands your trading patterns
- **Quick Action Buttons** - Common questions with one click

### 📊 Analytics Dashboard
- **Multi-tab Interface** - Profits, Losses, Win Rate, All Stats
- **Real-time Data** - Live portfolio updates
- **Historical Analysis** - Trading pattern insights
- **Achievement System** - Unlock badges based on trading behavior

### 🌐 Multi-Chain Support
- **EVM Networks** - Ethereum, Base, Polygon (MetaMask)
- **Non-EVM Networks** - Solana (Phantom), Bitcoin (Bitcoin wallet)
- **Network Switching** - Easy dropdown selection
- **Unified Interface** - Same experience across all chains

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Query** - State management

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time communication

### Blockchain & AI
- **Tatum SDK** - Blockchain data access
- **Direct Tatum SDK** - Fast and reliable blockchain access
- **Google Gemini AI** - Natural language processing
- **MetaMask** - EVM wallet connection
- **Phantom** - Solana wallet connection

### Infrastructure
- **Vercel** - Frontend hosting
- **Railway/Heroku** - Backend hosting
- **MongoDB Atlas** - Database
- **IPFS** - Decentralized storage

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Quick Start
```bash
# Clone the repository
git clone https://github.com/yourusername/ai-portfolio-cards.git
cd ai-portfolio-cards

# Install dependencies
npm install

# Install Tatum packages
npm install @tatumio/tatum

# Install AI packages
npm install @google/generative-ai

# Install styling packages
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography

# Start development server
npm run dev
```


## 🔑 Configuration

### Environment Variables
Create a `.env.local` file in the root directory:

```env
# Tatum Configuration
REACT_APP_TATUM_API_KEY=your_tatum_api_key_here
TATUM_API_KEY=your_tatum_api_key_here

# Gemini AI Configuration
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here


# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# Wallet Configuration
REACT_APP_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
```


## 🔐 API Keys Setup

### 1. Tatum API Key
1. Visit [Tatum Dashboard](https://dashboard.tatum.io)
2. Sign up for free account
3. Navigate to API Keys section
4. Generate new API key
5. Copy and add to environment variables

### 2. Gemini AI API Key
1. Visit [Google AI Studio](https://ai.google.dev)
2. Sign in with Google account
3. Create new API key
4. Copy and add to environment variables

### 3. Wallet Connect Project ID
1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create new project
3. Copy Project ID
4. Add to environment variables

## 🚀 Usage

### 1. Connect Wallet
- Click "Connect Wallet" button
- Select your preferred network
- Approve connection in wallet

### 2. Generate Portfolio Card
- Click "Get My Card" button
- AI analyzes your portfolio
- Beautiful card is generated
- Download or share

### 3. Ask AI Questions
- Type questions in chat interface
- Use quick action buttons
- Get personalized insights
- View detailed analytics

### 4. Explore Analytics
- Switch between tabs (Profits, Losses, Win Rate)
- View real-time data
- Track performance over time
- Unlock achievements

## 🏗 Architecture

### Frontend Architecture
```
src/
├── components/
│   ├── WalletConnection.tsx      # Wallet connection logic
│   ├── PortfolioCard.tsx         # Card generation and display
│   ├── AIChat.tsx               # Chat interface
│   ├── StatsTabs.tsx            # Analytics dashboard
│   └── NetworkSelector.tsx      # Network switching
├── services/
│   ├── tatumService.ts          # Tatum SDK integration
│   ├── geminiService.ts         # AI integration
│   └── walletService.ts         # Wallet management
├── hooks/
│   ├── useWallet.ts             # Wallet state management
│   ├── usePortfolio.ts          # Portfolio data
│   └── useAI.ts                 # AI chat functionality
└── utils/
    ├── constants.ts             # App constants
    ├── helpers.ts               # Utility functions
    └── types.ts                 # TypeScript types
```

### Backend Architecture
```
server/
├── routes/
│   ├── wallet.js                # Wallet operations
│   ├── portfolio.js             # Portfolio data
│   ├── ai.js                    # AI processing
├── services/
│   ├── tatumService.js          # Tatum API calls
│   ├── aiService.js             # AI processing
├── middleware/
│   ├── auth.js                  # Authentication
│   └── validation.js            # Input validation
└── utils/
    ├── database.js              # Database connection
    └── logger.js                # Logging
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Wallet Connection Failed
**Problem:** MetaMask not connecting
**Solutions:**
- Check if MetaMask is installed
- Ensure correct network is selected
- Clear browser cache
- Check console for errors

- Check environment variables

#### 3. AI Chat Not Responding
**Problem:** Gemini AI not working
**Solutions:**
- Verify Gemini API key
- Check API quota limits
- Ensure internet connection
- Check console for errors

#### 4. Portfolio Data Not Loading
**Problem:** Tatum API calls failing
**Solutions:**
- Verify Tatum API key
- Check network connection
- Ensure wallet is connected
- Check API rate limits

#### 5. Card Generation Failed
**Problem:** Portfolio card not generating
**Solutions:**
- Ensure portfolio data is loaded
- Check AI service status
- Verify image generation permissions
- Clear browser cache

### Debug Mode
Enable debug mode by setting:
```env
REACT_APP_DEBUG=true
NODE_ENV=development
```

### Logs
Check logs in:
- Browser console (Frontend)
- Terminal (Backend)

## 📚 Resources & Documentation

### Tatum Resources
- **Main Website:** [tatum.io](https://tatum.io)
- **Documentation:** [docs.tatum.io](https://docs.tatum.io)
- **SDK Documentation:** [tatum.io/sdk](https://tatum.io/sdk)
- **API Reference:** [docs.tatum.io/reference](https://docs.tatum.io/reference)
- **Dashboard:** [dashboard.tatum.io](https://dashboard.tatum.io)
- **GitHub SDK:** [github.com/tatumio/tatum-js](https://github.com/tatumio/tatum-js)

### AI Resources
- **Gemini AI:** [ai.google.dev](https://ai.google.dev)
- **Gemini Documentation:** [ai.google.dev/docs](https://ai.google.dev/docs)

### Blockchain Resources
- **Ethereum:** [ethereum.org](https://ethereum.org)
- **Base:** [base.org](https://base.org)
- **Polygon:** [polygon.technology](https://polygon.technology)
- **Solana:** [solana.com](https://solana.com)
- **Bitcoin:** [bitcoin.org](https://bitcoin.org)

### Wallet Resources
- **MetaMask:** [metamask.io](https://metamask.io)
- **Phantom:** [phantom.app](https://phantom.app)
- **WalletConnect:** [walletconnect.com](https://walletconnect.com)

### Development Resources
- **React:** [react.dev](https://react.dev)
- **TypeScript:** [typescriptlang.org](https://typescriptlang.org)
- **Tailwind CSS:** [tailwindcss.com](https://tailwindcss.com)
- **Node.js:** [nodejs.org](https://nodejs.org)
- **MongoDB:** [mongodb.com](https://mongodb.com)

### Design Resources
- **Figma:** [figma.com](https://figma.com)
- **Unsplash:** [unsplash.com](https://unsplash.com)
- **Heroicons:** [heroicons.com](https://heroicons.com)
- **Font Awesome:** [fontawesome.com](https://fontawesome.com)

## 🛠 Development Guide

### Project Setup
1. Fork the repository
2. Clone your fork
3. Install dependencies
4. Set up environment variables
5. Start development server

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Add comments for complex logic

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

### Building
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚀 Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### Backend (Railway/Heroku)
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Database (MongoDB Atlas)
1. Create MongoDB Atlas account
2. Create cluster
3. Get connection string
4. Add to environment variables

## 🤝 Contributing

### How to Contribute
1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

### Pull Request Process
1. Ensure tests pass
2. Update documentation
3. Add changelog entry
4. Request review
5. Merge after approval

### Code of Conduct
- Be respectful
- Help others
- Follow guidelines
- Report issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Hackathon Submission

### Project Details
- **Name:** AI Portfolio Cards
- **Description:** AI-powered crypto portfolio analyzer with trading card visualizations
- **Tech Stack:** React, TypeScript, Tatum SDK, Gemini AI
- **Networks:** Ethereum, Base, Polygon, Solana, Bitcoin

### Demo Video
- **Duration:** 2-3 minutes
- **Content:** Show wallet connection, AI chat, card generation
- **Platform:** YouTube or Loom

### Submission Checklist
- [ ] GitHub repository public
- [ ] Demo video uploaded
- [ ] Project description complete
- [ ] All features working
- [ ] Documentation updated

## 📞 Support

### Getting Help
- **GitHub Issues:** [github.com/yourusername/ai-portfolio-cards/issues](https://github.com/yourusername/ai-portfolio-cards/issues)
- **Discord:** [discord.gg/tatum](https://discord.gg/tatum)
- **Email:** your-email@example.com

### FAQ
**Q: Which wallets are supported?**
A: MetaMask for EVM networks, Phantom for Solana, Bitcoin wallet for Bitcoin.

**Q: Is there a cost to use the app?**
A: The app is free to use. Only blockchain transaction fees apply.

**Q: Can I use testnet networks?**
A: Yes, all supported networks have testnet versions available.

**Q: How secure is my data?**
A: All data is processed locally. No private keys are stored.

---

**Made with ❤️ for the Tatum Hackathon**

*Built with Tatum SDK and Gemini AI*
