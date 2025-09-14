-- Transaction Cache Schema
-- Stores detailed transaction data for all chains

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    network VARCHAR(100) NOT NULL,
    transaction_hash VARCHAR(255) NOT NULL,
    block_number BIGINT,
    slot_number BIGINT, -- For Solana
    timestamp BIGINT,
    transaction_type VARCHAR(50),
    transaction_subtype VARCHAR(50),
    amount DECIMAL(36, 18),
    token_address VARCHAR(255),
    token_symbol VARCHAR(50),
    token_name VARCHAR(255),
    token_decimals INTEGER,
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    fee DECIMAL(36, 18),
    memo TEXT,
    error_message TEXT,
    confirmation_status VARCHAR(50),
    instructions_count INTEGER,
    signers_count INTEGER,
    raw_transaction_data JSONB, -- Store complete transaction details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, network, transaction_hash)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_address ON wallet_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_network ON wallet_transactions(network);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_token ON wallet_transactions(token_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_timestamp ON wallet_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);

-- Token summary table for quick lookups
CREATE TABLE IF NOT EXISTS wallet_token_summary (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    network VARCHAR(100) NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    token_symbol VARCHAR(50),
    token_name VARCHAR(255),
    total_received DECIMAL(36, 18) DEFAULT 0,
    total_sent DECIMAL(36, 18) DEFAULT 0,
    current_balance DECIMAL(36, 18) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    first_transaction_timestamp BIGINT,
    last_transaction_timestamp BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, network, token_address)
);

-- Indexes for token summary
CREATE INDEX IF NOT EXISTS idx_token_summary_wallet ON wallet_token_summary(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_summary_network ON wallet_token_summary(network);
CREATE INDEX IF NOT EXISTS idx_token_summary_token ON wallet_token_summary(token_address);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Portfolio cache table for storing comprehensive portfolio data
CREATE TABLE IF NOT EXISTS wallet_portfolio (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    portfolio_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address)
);

-- Indexes for portfolio cache
CREATE INDEX IF NOT EXISTS idx_portfolio_wallet ON wallet_portfolio(wallet_address);

-- Triggers for updated_at
CREATE TRIGGER update_wallet_transactions_updated_at 
    BEFORE UPDATE ON wallet_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_token_summary_updated_at 
    BEFORE UPDATE ON wallet_token_summary 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_wallet_portfolio_updated_at 
    BEFORE UPDATE ON wallet_portfolio 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
