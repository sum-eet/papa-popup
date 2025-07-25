// Script to activate popup and create script tag via backend API
// Run with: node activate-popup.js

const POPUP_ID = 'sample-quiz-skincare-001';
const PRODUCTION_URL = 'https://smartpop-revenue-engine.vercel.app';

async function activatePopup() {
  console.log('🚀 Activating popup via backend API...\n');
  
  try {
    // Call the status API to activate the popup (which should create the script tag)
    console.log(`📞 Calling status API for popup: ${POPUP_ID}`);
    
    // Create form data
    const formData = new URLSearchParams();
    formData.append('popupId', POPUP_ID);
    formData.append('status', 'ACTIVE');
    
    const response = await fetch(`${PRODUCTION_URL}/app/api/popups/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    console.log(`📋 Status API Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Status API Response:', JSON.stringify(result, null, 2));
      
      if (result.success && result.popup?.scriptTagId) {
        console.log(`\n🎉 SUCCESS! Script tag created with ID: ${result.popup.scriptTagId}`);
        console.log(`📜 Script tag should now be active in Shopify admin`);
        console.log(`🌐 Papa Popup should load on: https://testingstoresumeet.myshopify.com`);
      } else if (result.success) {
        console.log(`\n✅ Popup activated successfully`);
        console.log(`ℹ️  Message: ${result.message}`);
      } else {
        console.log(`\n❌ Activation failed: ${result.error}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ HTTP Error ${response.status}:`, errorText);
    }
    
  } catch (error) {
    console.error('💥 Error activating popup:', error.message);
  }
}

// Run the activation
if (import.meta.url === `file://${process.argv[1]}`) {
  activatePopup();
}

export { activatePopup };