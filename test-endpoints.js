const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test data
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'; // Vitalik's address
const TEST_NETWORK = 'ethereum-mainnet';

async function testEndpoints() {
  console.log('🧪 Testing AI Portfolio Cards Backend Endpoints\n');
  
  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');
    
    // Test 2: Get Supported Networks
    console.log('2️⃣ Testing Supported Networks...');
    const networksResponse = await axios.get(`${BASE_URL}/api/wallet/networks`);
    console.log('✅ Networks:', networksResponse.data.data.networks.length, 'networks supported');
    console.log('');
    
    // Test 3: Get Wallet Balance
    console.log('3️⃣ Testing Wallet Balance...');
    const balanceResponse = await axios.get(`${BASE_URL}/api/wallet/${TEST_NETWORK}/${TEST_ADDRESS}/balance`);
    console.log('✅ Balance:', balanceResponse.data.data.balance, 'ETH');
    console.log('');
    
    // Test 4: Get Portfolio Data
    console.log('4️⃣ Testing Portfolio Data...');
    const portfolioResponse = await axios.get(`${BASE_URL}/api/portfolio/${TEST_NETWORK}/${TEST_ADDRESS}`);
    console.log('✅ Portfolio Data:');
    console.log('   - Address:', portfolioResponse.data.data.address);
    console.log('   - Balance:', portfolioResponse.data.data.balance);
    console.log('   - Tokens:', portfolioResponse.data.data.tokens?.length || 0);
    console.log('   - NFTs:', portfolioResponse.data.data.nfts?.length || 0);
    console.log('   - Transactions:', portfolioResponse.data.data.transactions?.length || 0);
    console.log('');
    
    // Test 5: AI Analysis
    console.log('5️⃣ Testing AI Analysis...');
    const analysisResponse = await axios.post(`${BASE_URL}/api/portfolio/analyze`, {
      network: TEST_NETWORK,
      address: TEST_ADDRESS
    });
    console.log('✅ AI Analysis:');
    console.log('   - Trader Type:', analysisResponse.data.data.analysis.traderType);
    console.log('   - Personality:', analysisResponse.data.data.analysis.personality);
    console.log('   - Stats:', analysisResponse.data.data.analysis.stats);
    console.log('');
    
    // Test 6: Generate Portfolio Card
    console.log('6️⃣ Testing Portfolio Card Generation...');
    const cardResponse = await axios.post(`${BASE_URL}/api/portfolio/card`, {
      network: TEST_NETWORK,
      address: TEST_ADDRESS
    });
    console.log('✅ Portfolio Card:');
    console.log('   - Title:', cardResponse.data.data.card.title);
    console.log('   - Description:', cardResponse.data.data.card.description);
    console.log('   - Quote:', cardResponse.data.data.card.quote);
    console.log('');
    
    // Test 7: AI Question
    console.log('7️⃣ Testing AI Question...');
    const questionResponse = await axios.post(`${BASE_URL}/api/ai/ask`, {
      question: 'What is my best trade?',
      network: TEST_NETWORK,
      address: TEST_ADDRESS
    });
    console.log('✅ AI Answer:', questionResponse.data.data.answer);
    console.log('');
    
    // Test 8: Quick Stats
    console.log('8️⃣ Testing Quick Stats...');
    const statsResponse = await axios.post(`${BASE_URL}/api/ai/stats`, {
      network: TEST_NETWORK,
      address: TEST_ADDRESS
    });
    console.log('✅ Quick Stats:', statsResponse.data.data);
    console.log('');
    
    // Test 9: Question Validation
    console.log('9️⃣ Testing Question Validation...');
    const validQuestion = await axios.post(`${BASE_URL}/api/ai/validate`, {
      question: 'What is my portfolio value?'
    });
    console.log('✅ Valid Question:', validQuestion.data.data);
    
    const invalidQuestion = await axios.post(`${BASE_URL}/api/ai/validate`, {
      question: 'What is the weather today?'
    });
    console.log('✅ Invalid Question:', invalidQuestion.data.data);
    console.log('');
    
    // Test 10: RPC Direct Access
    console.log('🔟 Testing RPC Direct Access...');
    const rpcResponse = await axios.get(`${BASE_URL}/api/rpc/${TEST_NETWORK}/${TEST_ADDRESS}/balance`);
    console.log('✅ RPC Balance:', rpcResponse.data.data);
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   npm run dev');
    }
  }
}

// Run tests
testEndpoints();
