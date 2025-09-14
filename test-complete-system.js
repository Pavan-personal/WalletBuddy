// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001';

async function testCompleteSystem() {
  console.log('🧪 Testing Complete AI Portfolio Cards System');
  console.log('=' * 60);

  const testAddresses = {
    'solana-mainnet': 'Bjm4M35wzaWrE2WZ32BVRUTvusxneL7Vjp489ZJTmR71',
    'ethereum-mainnet': '0xc61167e7Dcd02ece2E090cC3fFEEec021557Bb53',
    'base-mainnet': '0xc61167e7Dcd02ece2E090cC3fFEEec021557Bb53'
  };

  for (const [network, address] of Object.entries(testAddresses)) {
    console.log(`\n🔍 Testing ${network.toUpperCase()}`);
    console.log(`Address: ${address}`);
    console.log('-' * 40);

    try {
      // Test 1: Get ALL transactions
      console.log('📊 Fetching ALL transactions...');
      const txResponse = await fetch(`${BASE_URL}/api/transactions/${network}/${address}/detailed`);
      const txData = await txResponse.json();
      
      if (txData.success) {
        console.log(`✅ Found ${txData.data.count} transactions`);
        console.log(`📦 Cached: ${txData.data.cached}`);
        if (txData.data.totalSignatures) {
          console.log(`📝 Total signatures: ${txData.data.totalSignatures}`);
        }
        if (txData.data.totalPages) {
          console.log(`📄 Total pages: ${txData.data.totalPages}`);
        }
      } else {
        console.log(`❌ Transaction fetch failed: ${txData.error}`);
      }

      // Test 2: AI Analysis
      console.log('\n🤖 Testing AI Analysis...');
      const aiResponse = await fetch(`${BASE_URL}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `What tokens do I have on ${network}?`,
          address: address,
          network: network
        })
      });
      
      const aiData = await aiResponse.json();
      if (aiData.success) {
        console.log(`✅ AI Response: ${aiData.data.answer.substring(0, 100)}...`);
      } else {
        console.log(`❌ AI failed: ${aiData.error}`);
      }

      // Test 3: Token Search
      console.log('\n🔍 Testing Token Search...');
      const searchResponse = await fetch(`${BASE_URL}/api/transactions/${network}/${address}/search?q=trump`);
      const searchData = await searchResponse.json();
      
      if (searchData.success) {
        console.log(`✅ Found ${searchData.data.count} Trump-related transactions`);
      } else {
        console.log(`❌ Search failed: ${searchData.error}`);
      }

      // Test 4: Token Analysis
      console.log('\n📈 Testing Token Analysis...');
      const analysisResponse = await fetch(`${BASE_URL}/api/transactions/${network}/${address}/analyze/trump`);
      const analysisData = await analysisResponse.json();
      
      if (analysisData.success) {
        console.log(`✅ Trump analysis: ${analysisData.data.analysis.hasTraded ? 'HAS TRADED' : 'NO TRADES'}`);
        console.log(`   Total bought: ${analysisData.data.analysis.totalBought}`);
        console.log(`   Total sold: ${analysisData.data.analysis.totalSold}`);
      } else {
        console.log(`❌ Analysis failed: ${analysisData.error}`);
      }

    } catch (error) {
      console.log(`❌ Error testing ${network}: ${error.message}`);
    }
  }

  console.log('\n🎉 Complete System Test Finished!');
}

// Run the test
testCompleteSystem().catch(console.error);
