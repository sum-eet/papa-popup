// Simple test script for Papa Popup APIs
// Run with: node test-apis.js

const APP_URL = 'http://localhost:3000'; // Change to your local dev server
const TEST_SHOP = 'test-shop.myshopify.com';

async function testAPIs() {
  console.log('🧪 Testing Papa Popup APIs...\n');
  
  try {
    // Test 1: Popup Check API
    console.log('1. Testing /api/popup-check...');
    const popupCheckResponse = await fetch(`${APP_URL}/api/popup-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopDomain: TEST_SHOP,
        pageType: 'home',
        pageUrl: `https://${TEST_SHOP}/`
      })
    });
    
    const popupCheckData = await popupCheckResponse.json();
    console.log('✅ Popup Check Response:', popupCheckData);
    
    // Test 2: Session Creation API (if multi-popup enabled)
    if (popupCheckData.config?.popupId) {
      console.log('\n2. Testing /api/session/create...');
      const sessionResponse = await fetch(`${APP_URL}/api/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: TEST_SHOP,
          popupId: popupCheckData.config.popupId,
          pageUrl: `https://${TEST_SHOP}/`,
          userAgent: 'Test Agent'
        })
      });
      
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('✅ Session Creation Response:', sessionData);
        
        // Test 3: Session Validation
        console.log('\n3. Testing /api/session/validate...');
        const validateResponse = await fetch(`${APP_URL}/api/session/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: sessionData.sessionToken,
            shopDomain: TEST_SHOP
          })
        });
        
        const validateData = await validateResponse.json();
        console.log('✅ Session Validation Response:', validateData);
        
        // Test 4: Session Progress Update
        console.log('\n4. Testing /api/session/progress...');
        const progressResponse = await fetch(`${APP_URL}/api/session/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: sessionData.sessionToken,
            shopDomain: TEST_SHOP,
            stepNumber: 1,
            stepResponse: { value: 'option1', text: 'Test Option' },
            action: 'answer'
          })
        });
        
        const progressData = await progressResponse.json();
        console.log('✅ Session Progress Response:', progressData);
        
        // Test 5: Email Collection with Session
        console.log('\n5. Testing /api/collect-email with session...');
        const emailResponse = await fetch(`${APP_URL}/api/collect-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            shopDomain: TEST_SHOP,
            sessionToken: sessionData.sessionToken,
            quizResponses: { step_1: { value: 'option1', text: 'Test Option' } },
            popupId: sessionData.popup.id
          })
        });
        
        const emailData = await emailResponse.json();
        console.log('✅ Email Collection Response:', emailData);
        
      } else {
        console.log('⚠️ Session creation failed, skipping session tests');
        const errorData = await sessionResponse.json();
        console.log('Error:', errorData);
      }
    } else {
      console.log('⚠️ No popup ID found, testing legacy email collection...');
      
      // Test legacy email collection
      console.log('\n2. Testing /api/collect-email (legacy)...');
      const emailResponse = await fetch(`${APP_URL}/api/collect-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          shopDomain: TEST_SHOP
        })
      });
      
      const emailData = await emailResponse.json();
      console.log('✅ Legacy Email Collection Response:', emailData);
    }
    
    console.log('\n🎉 API tests completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAPIs();
}

module.exports = { testAPIs };