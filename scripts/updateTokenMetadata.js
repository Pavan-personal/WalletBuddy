const { PrismaClient } = require('@prisma/client');
const tokenMetadataService = require('../services/tokenMetadataService');

const prisma = new PrismaClient();

async function updateUnknownTokens() {
  console.log('🔄 Starting update of Unknown tokens in the database...');
  
  try {
    // Find all transactions with Unknown token names or symbols
    const unknownTokens = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          { tokenSymbol: 'Unknown' },
          { tokenSymbol: 'UNKNOWN' },
          { tokenName: 'Unknown Token' }
        ]
      },
      select: {
        id: true,
        tokenAddress: true,
        network: true,
        tokenSymbol: true,
        tokenName: true
      },
      distinct: ['tokenAddress', 'network']
    });
    
    console.log(`📊 Found ${unknownTokens.length} unique unknown tokens to update`);
    
    // Group by token address for better logging
    const tokenGroups = {};
    unknownTokens.forEach(token => {
      if (!tokenGroups[token.tokenAddress]) {
        tokenGroups[token.tokenAddress] = [];
      }
      tokenGroups[token.tokenAddress].push(token);
    });
    
    // Update each token
    let updatedCount = 0;
    for (const [tokenAddress, tokens] of Object.entries(tokenGroups)) {
      if (!tokenAddress || tokenAddress === 'native') continue;
      
      const network = tokens[0].network;
      console.log(`🔍 Looking up metadata for token ${tokenAddress} on ${network}`);
      
      try {
        const metadata = await tokenMetadataService.getTokenMetadata(tokenAddress, network);
        
        if (metadata && (metadata.symbol !== 'UNKNOWN' && metadata.name !== 'Unknown Token')) {
          console.log(`✅ Found metadata for ${tokenAddress}: ${metadata.symbol} (${metadata.name})`);
          
          // Update all transactions with this token address
          const updateResult = await prisma.walletTransaction.updateMany({
            where: {
              tokenAddress: tokenAddress,
              network: network
            },
            data: {
              tokenSymbol: metadata.symbol,
              tokenName: metadata.name,
              tokenDecimals: metadata.decimals
            }
          });
          
          console.log(`📝 Updated ${updateResult.count} transactions with token ${tokenAddress}`);
          updatedCount += updateResult.count;
          
          // Also update token summaries
          await prisma.walletTokenSummary.updateMany({
            where: {
              tokenAddress: tokenAddress,
              network: network
            },
            data: {
              tokenSymbol: metadata.symbol,
              tokenName: metadata.name
            }
          });
        } else {
          console.log(`⚠️ No better metadata found for ${tokenAddress}`);
        }
      } catch (error) {
        console.error(`❌ Error updating token ${tokenAddress}:`, error.message);
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Update complete! Updated ${updatedCount} transactions`);
  } catch (error) {
    console.error('❌ Error updating unknown tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateUnknownTokens()
  .then(() => console.log('🏁 Script finished'))
  .catch(err => console.error('❌ Script failed:', err));
