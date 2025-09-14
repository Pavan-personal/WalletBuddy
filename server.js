const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const prismaService = require('./services/prismaService');

// Import routes
const walletRoutes = require('./routes/wallet');
const portfolioRoutes = require('./routes/portfolioRoutes');
const aiRoutes = require('./routes/ai');
const transactionRoutes = require('./routes/transactions');
const rpcRoutes = require('./routes/rpcRoutes');
const populateDbRoutes = require('./routes/populateDb');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: config.server.env
  });
});

// API routes
app.use('/api/wallet', walletRoutes);
app.use('/api/portfolio', portfolioRoutes); // Using the new portfolio routes
app.use('/api/ai', aiRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/rpc', rpcRoutes); // Fast RPC calls for simple queries
app.use('/api/db', populateDbRoutes); // Database population utilities

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: config.server.env === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize Prisma and connect to database
    await prismaService.connect();
    
    // Start server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${config.server.env}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 API endpoints: http://localhost:${PORT}/api`);
      console.log(`💾 Transaction cache enabled with Prisma ORM`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
