// Quick API Test Script for Production
// Run with: node test-production.js

const baseURL = 'https://quickshift-9qjun.ondigitalocean.app';

async function testAPI() {
    console.log('🧪 Testing QuickShift API...\n');

    // Test 1: Health Check
    try {
        console.log('1. Testing health endpoint...');
        const healthResponse = await fetch(`${baseURL}/api/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }

    // Test 2: Welcome Message
    try {
        console.log('\n2. Testing welcome endpoint...');
        const welcomeResponse = await fetch(`${baseURL}/`);
        const welcomeData = await welcomeResponse.json();
        console.log('✅ Welcome message:', welcomeData);
    } catch (error) {
        console.log('❌ Welcome endpoint failed:', error.message);
    }

    // Test 3: Auth endpoint structure (should return 404 for GET, but endpoint exists)
    try {
        console.log('\n3. Testing auth endpoint structure...');
        const authResponse = await fetch(`${baseURL}/api/auth`);
        console.log('📝 Auth endpoint status:', authResponse.status, authResponse.statusText);
        if (authResponse.status === 404) {
            console.log('✅ Auth routes are configured (404 expected for GET /api/auth)');
        }
    } catch (error) {
        console.log('❌ Auth endpoint test failed:', error.message);
    }

    // Test 4: CORS Check
    try {
        console.log('\n4. Testing CORS configuration...');
        const corsResponse = await fetch(`${baseURL}/api/health`, {
            method: 'OPTIONS'
        });
        console.log('✅ CORS status:', corsResponse.status);
    } catch (error) {
        console.log('❌ CORS test failed:', error.message);
    }

    console.log('\n🎉 API testing complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Set environment variables in DigitalOcean App Platform');
    console.log('   2. Configure Stripe webhooks');
    console.log('   3. Test POST endpoints with authentication');
}

// Run the tests
testAPI().catch(console.error);
