// Script to create script tag for active popup
// This mimics what the legacy system does in app._index.tsx

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Simplified GraphQL client for Shopify Admin API
async function createScriptTag(shop, accessToken) {
  const scriptTagUrl = `${process.env.SHOPIFY_APP_URL}/popup-loader-enhanced.js`;
  console.log("📜 Script tag URL:", scriptTagUrl);
  
  const mutation = `
    mutation scriptTagCreate($input: ScriptTagInput!) {
      scriptTagCreate(input: $input) {
        scriptTag {
          id
          src
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  const variables = {
    input: {
      src: scriptTagUrl,
      displayScope: "ONLINE_STORE"
    }
  };
  
  const response = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({ query: mutation, variables })
  });
  
  return await response.json();
}

async function addScriptTagToPopup() {
  console.log('🚀 Creating script tag for sample popup...\n');
  
  try {
    // Get the sample popup
    const popup = await prisma.popup.findUnique({
      where: { id: 'sample-quiz-skincare-001' },
      include: { shop: true }
    });
    
    if (!popup) {
      console.log('❌ Sample popup not found');
      return;
    }
    
    if (popup.scriptTagId) {
      console.log(`ℹ️  Popup already has script tag: ${popup.scriptTagId}`);
      return;
    }
    
    console.log(`📍 Processing popup: ${popup.name}`);
    console.log(`🏪 Shop: ${popup.shop.domain}`);
    
    // Get shop session for API access
    const session = await prisma.session.findFirst({
      where: { shop: popup.shop.domain },
      orderBy: { expires: 'desc' }
    });
    
    if (!session) {
      console.log('❌ No valid session found for shop');
      return;
    }
    
    console.log('🔑 Found valid session, creating script tag...');
    
    // Create script tag
    const result = await createScriptTag(popup.shop.domain, session.accessToken);
    console.log('📋 Script tag API response:', JSON.stringify(result, null, 2));
    
    if (result.data?.scriptTagCreate?.scriptTag?.id) {
      const scriptTagId = result.data.scriptTagCreate.scriptTag.id.replace('gid://shopify/ScriptTag/', '');
      console.log(`✅ Script tag created successfully! ID: ${scriptTagId}`);
      
      // Update popup with script tag ID
      await prisma.popup.update({
        where: { id: popup.id },
        data: { scriptTagId: scriptTagId }
      });
      
      console.log('💾 Popup updated with script tag ID');
      console.log('\n🎉 SUCCESS! Script tag created and associated with popup');
      console.log(`📜 Script tag ID: ${scriptTagId}`);
      console.log(`🌐 Papa Popup should now load on: https://${popup.shop.domain}`);
      
    } else if (result.data?.scriptTagCreate?.userErrors?.length > 0) {
      const error = result.data.scriptTagCreate.userErrors[0];
      console.log(`❌ Script tag creation failed: ${error.message}`);
    } else {
      console.log('⚠️ Unexpected script tag response:', result);
    }
    
  } catch (error) {
    console.error('💥 Error creating script tag:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addScriptTagToPopup();
}

export { addScriptTagToPopup };