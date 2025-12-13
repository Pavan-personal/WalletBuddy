# Portfolio Service Unit Tests

## Overview
Comprehensive unit test suite for `portfolioService.js` with 49 test cases covering all public methods and edge cases.

## Test Coverage Summary

### 1. `getComprehensivePortfolio(address)` - 22 tests
Tests the main portfolio aggregation method across multiple blockchain networks.

**Happy Path Tests:**
- Returns cached portfolio when available
- Builds portfolio from database when cache is not available
- Handles multiple chains (Ethereum, Base, Solana) correctly
- Uses native token data from database when available
- Processes token summaries from database
- Calculates transaction statistics correctly
- Tracks highest value transaction
- Tracks most recent transaction
- Sorts token holdings by balance

**Edge Cases:**
- Fallback to RPC when native token not in database
- Fallback to RPC for token balances when database is empty
- Skips non-transfer transactions
- Handles empty transactions array
- Handles tokens with zero balance (excludes from holdings)
- Handles malformed transaction data (null amounts, invalid data)

**Error Handling:**
- Handles chain errors gracefully (continues with other chains)
- Handles when SDK is not available for a chain
- Returns failure response on database errors

### 2. `getTokenBalances(chain, address)` - 6 tests
Tests token balance retrieval with special handling for Base chain USDC.

**Happy Path Tests:**
- Handles Base chain with USDC specially
- Delegates to tatumService for non-Base chains
- Handles Solana chain correctly

**Edge Cases:**
- Does not include USDC if balance is zero on Base
- Handles USDC with null or '0x' response

**Error Handling:**
- Handles errors gracefully

### 3. `getTransactionSummary(address)` - 6 tests
Tests transaction statistics calculation and aggregation.

**Happy Path Tests:**
- Calculates transaction statistics correctly (percentages, totals, net profit/loss)
- Includes token holdings in response

**Edge Cases:**
- Handles zero transactions
- Handles negative net profit/loss

**Error Handling:**
- Handles portfolio fetch failure
- Handles errors from underlying service

### 4. `checkTokenOwnership(address, tokenSymbol)` - 7 tests
Tests token ownership verification across multiple chains.

**Happy Path Tests:**
- Returns true when token is owned
- Returns multiple holdings for same token across chains
- Case-insensitive token symbol matching

**Edge Cases:**
- Returns false when token is not owned
- Handles empty token holdings

**Error Handling:**
- Handles portfolio fetch failure
- Handles errors from underlying service

### 5. `getTokenTransactionHistory(address, tokenSymbol)` - 8 tests
Tests transaction history filtering and aggregation for specific tokens.

**Happy Path Tests:**
- Fetches and filters transactions by token symbol
- Case-insensitive token symbol matching
- Sorts transactions by timestamp (newest first)
- Calculates total received and sent
- Queries all supported chains
- Aggregates transactions across multiple chains

**Edge Cases:**
- Returns empty results when no transactions found
- Handles transactions with positive/negative amounts
- Handles null or undefined amounts
- Handles transactions with null timestamp
- Filters out transactions with null or missing tokenSymbol

**Error Handling:**
- Handles database errors

## Test Methodology

### Mocking Strategy
- **Dependencies Mocked:**
  - `tatumService` - External blockchain API service
  - `prismaService` - Database service
  - Console methods (log, warn, error) - Suppressed during tests

### Test Structure
- **Setup:** `beforeEach()` clears all mocks and suppresses console output
- **Teardown:** `afterEach()` restores console methods
- **Assertions:** Uses Jest matchers for comprehensive validation

### Coverage Areas
1. **Caching Logic:** Tests both cached and non-cached data paths
2. **Multi-Chain Support:** Tests Ethereum, Base, and Solana chains
3. **Data Aggregation:** Tests transaction and balance aggregation
4. **Error Resilience:** Tests graceful degradation and error handling
5. **Edge Cases:** Tests boundary conditions and malformed data
6. **Business Logic:** Tests statistical calculations and sorting

## Running the Tests

```bash
# Run all tests
npm test

# Run portfolio service tests only
npm test portfolioService

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Data Patterns

### Mock Addresses
- Primary test address: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`

### Mock Blockchain Data
- **Ethereum balances:** Hex-encoded wei values (e.g., `0x0de0b6b3a7640000` = 1 ETH)
- **Solana balances:** Lamports in result.value (e.g., `5000000000` = 5 SOL)
- **Token addresses:** Standard ERC-20 format or 'native' for native tokens

### Mock Transactions
- Include: transactionHash, transactionType, amount, tokenSymbol, timestamp
- Types: 'receive', 'send', 'transfer', or other non-transfer types

## Key Testing Insights

1. **Service is robust** - Continues operation even when individual chains fail
2. **Caching is prioritized** - Always checks cache before making external calls
3. **Multi-chain aware** - Properly aggregates data across Ethereum, Base, and Solana
4. **Defensive programming** - Handles null/undefined values gracefully
5. **Performance conscious** - Uses database caching to minimize RPC calls

## Future Test Enhancements

Consider adding:
- Integration tests with real database connections
- Performance tests for large transaction volumes
- Stress tests for concurrent portfolio requests
- Tests for rate limiting scenarios
- Tests for blockchain network failures