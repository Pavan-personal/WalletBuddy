-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "walletAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" TEXT,
    "slotNumber" TEXT,
    "timestamp" TEXT,
    "transactionType" TEXT,
    "transactionSubtype" TEXT,
    "amount" TEXT,
    "tokenAddress" TEXT,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "tokenDecimals" INTEGER,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "fee" TEXT,
    "memo" TEXT,
    "errorMessage" TEXT,
    "confirmationStatus" TEXT,
    "instructionsCount" INTEGER,
    "signersCount" INTEGER,
    "rawTransactionData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "wallet_token_summary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "walletAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "totalReceived" TEXT NOT NULL DEFAULT '0',
    "totalSent" TEXT NOT NULL DEFAULT '0',
    "currentBalance" TEXT NOT NULL DEFAULT '0',
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "firstTransactionTimestamp" TEXT,
    "lastTransactionTimestamp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "wallet_portfolio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "walletAddress" TEXT NOT NULL,
    "portfolioData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "wallet_transactions_walletAddress_idx" ON "wallet_transactions"("walletAddress");

-- CreateIndex
CREATE INDEX "wallet_transactions_network_idx" ON "wallet_transactions"("network");

-- CreateIndex
CREATE INDEX "wallet_transactions_tokenAddress_idx" ON "wallet_transactions"("tokenAddress");

-- CreateIndex
CREATE INDEX "wallet_transactions_timestamp_idx" ON "wallet_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "wallet_transactions_transactionType_idx" ON "wallet_transactions"("transactionType");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_walletAddress_network_transactionHash_key" ON "wallet_transactions"("walletAddress", "network", "transactionHash");

-- CreateIndex
CREATE INDEX "wallet_token_summary_walletAddress_idx" ON "wallet_token_summary"("walletAddress");

-- CreateIndex
CREATE INDEX "wallet_token_summary_network_idx" ON "wallet_token_summary"("network");

-- CreateIndex
CREATE INDEX "wallet_token_summary_tokenAddress_idx" ON "wallet_token_summary"("tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_token_summary_walletAddress_network_tokenAddress_key" ON "wallet_token_summary"("walletAddress", "network", "tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_portfolio_walletAddress_key" ON "wallet_portfolio"("walletAddress");

-- CreateIndex
CREATE INDEX "wallet_portfolio_walletAddress_idx" ON "wallet_portfolio"("walletAddress");
