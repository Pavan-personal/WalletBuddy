#!/usr/bin/env node

/**
 * Script to update token metadata in the database
 * 
 * This script will:
 * 1. Run the updateTokenMetadata.js script to update Unknown tokens
 * 2. Display statistics before and after the update
 * 
 * Usage:
 * node scripts/runTokenUpdate.js
 */

const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const path = require('path');

const prisma = new PrismaClient();

async function getTokenStats() {
  // Get stats for Unknown tokens
  const unknownCount = await prisma.walletTransaction.count({
    where: {
      OR: [
        { tokenSymbol: 'Unknown' },
        { tokenSymbol: 'UNKNOWN' },
        { tokenName: 'Unknown Token' }
      ]
    }
  });
  
  // Get stats for all tokens
  const totalCount = await prisma.walletTransaction.count();
  
  // Get unique tokens with Unknown metadata
  const uniqueUnknownTokens = await prisma.walletTransaction.findMany({
    where: {
      OR: [
        { tokenSymbol: 'Unknown' },
        { tokenSymbol: 'UNKNOWN' },
        { tokenName: 'Unknown Token' }
      ]
    },
    select: {
      tokenAddress: true,
      network: true
    },
    distinct: ['tokenAddress', 'network']
  });
  
  // Get stats for specific tokens we care about
  const specificTokens = [
    { name: 'VINE', address: '4Q6WW2ouZ6V3iaF56hgF6hXWgJtT4nXgKcQzqo7Wn1fQ' },
    { name: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
    { name: 'DOGE', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    { name: 'TRUMP', address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN' },
    { name: 'UFD', address: 'UFDGrSH8iE9J8jMQAVpY6qAHdMnQC8pg1UjmTDfhcQn' }
  ];
  
  const specificTokenStats = {};
  
  for (const token of specificTokens) {
    const count = await prisma.walletTransaction.count({
      where: {
        tokenAddress: token.address
      }
    });
    
    const firstTx = await prisma.walletTransaction.findFirst({
      where: {
        tokenAddress: token.address
      },
      select: {
        tokenSymbol: true,
        tokenName: true
      }
    });
    
    specificTokenStats[token.name] = {
      count,
      symbol: firstTx?.tokenSymbol || 'N/A',
      name: firstTx?.tokenName || 'N/A'
    };
  }
  
  return {
    unknownCount,
    totalCount,
    uniqueUnknownTokens: uniqueUnknownTokens.length,
    specificTokenStats
  };
}

async function runUpdateScript() {
  return new Promise((resolve, reject) => {
    const updateScript = path.join(__dirname, 'updateTokenMetadata.js');
    const process = spawn('node', [updateScript]);
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Update script exited with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    console.log('📊 Getting token stats before update...');
    const beforeStats = await getTokenStats();
    
    console.log('\n==== BEFORE UPDATE ====');
    console.log(`Total transactions: ${beforeStats.totalCount}`);
    console.log(`Unknown token transactions: ${beforeStats.unknownCount} (${(beforeStats.unknownCount / beforeStats.totalCount * 100).toFixed(2)}%)`);
    console.log(`Unique unknown tokens: ${beforeStats.uniqueUnknownTokens}`);
    
    console.log('\nSpecific token stats:');
    for (const [token, stats] of Object.entries(beforeStats.specificTokenStats)) {
      console.log(`${token}: ${stats.count} transactions, Symbol: ${stats.symbol}, Name: ${stats.name}`);
    }
    
    console.log('\n🔄 Running token metadata update...');
    await runUpdateScript();
    
    console.log('\n📊 Getting token stats after update...');
    const afterStats = await getTokenStats();
    
    console.log('\n==== AFTER UPDATE ====');
    console.log(`Total transactions: ${afterStats.totalCount}`);
    console.log(`Unknown token transactions: ${afterStats.unknownCount} (${(afterStats.unknownCount / afterStats.totalCount * 100).toFixed(2)}%)`);
    console.log(`Unique unknown tokens: ${afterStats.uniqueUnknownTokens}`);
    
    console.log('\nSpecific token stats:');
    for (const [token, stats] of Object.entries(afterStats.specificTokenStats)) {
      console.log(`${token}: ${stats.count} transactions, Symbol: ${stats.symbol}, Name: ${stats.name}`);
    }
    
    console.log('\n==== SUMMARY ====');
    const fixedTokens = beforeStats.unknownCount - afterStats.unknownCount;
    console.log(`Fixed ${fixedTokens} unknown token transactions`);
    console.log(`Reduced unknown tokens from ${(beforeStats.unknownCount / beforeStats.totalCount * 100).toFixed(2)}% to ${(afterStats.unknownCount / afterStats.totalCount * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
