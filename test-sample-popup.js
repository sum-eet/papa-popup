// Quick test script to verify the sample popup works
// Run with: node test-sample-popup.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSamplePopup() {
  console.log('🧪 Testing sample popup functionality...\n');

  try {
    // Get the shop
    const shop = await prisma.shop.findFirst({
      orderBy: { installedAt: 'desc' }
    });

    if (!shop) {
      console.log('❌ No shop found');
      return;
    }

    console.log(`📍 Testing with shop: ${shop.domain}`);

    // Test 1: Check if popup exists and is active
    console.log('\n1. 🔍 Checking if sample popup exists...');
    const popup = await prisma.popup.findFirst({
      where: {
        id: 'sample-quiz-skincare-001',
        shopId: shop.id,
        status: 'ACTIVE',
        isDeleted: false
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    if (!popup) {
      console.log('❌ Sample popup not found or not active');
      return;
    }

    console.log(`✅ Found popup: ${popup.name}`);
    console.log(`   Type: ${popup.popupType}`);
    console.log(`   Steps: ${popup.steps.length}`);

    // Test 2: Simulate popup-check API logic
    console.log('\n2. 🌐 Simulating popup-check API...');
    
    // This simulates what happens in /api/popup-check
    const targetingRules = JSON.parse(popup.targetingRules);
    const pageType = 'home'; // Simulating home page
    
    const shouldShow = targetingRules.pages.includes('all') || 
                      targetingRules.pages.includes(pageType);
    
    console.log(`   Page type: ${pageType}`);
    console.log(`   Targeting rules: ${JSON.stringify(targetingRules.pages)}`);
    console.log(`   Should show: ${shouldShow ? '✅ YES' : '❌ NO'}`);

    if (shouldShow) {
      console.log('\n📋 Popup config that would be returned:');
      
      const config = {
        popupId: popup.id,
        popupType: popup.popupType,
        totalSteps: popup.totalSteps
      };
      
      console.log(JSON.stringify(config, null, 2));
      
      console.log('\n📝 Steps that would be included:');
      popup.steps.forEach(step => {
        const content = JSON.parse(step.content);
        const preview = content.question || content.headline || 'Content';
        console.log(`   Step ${step.stepNumber} (${step.stepType}): ${preview}`);
      });
    }

    // Test 3: Test that the enhanced script would work
    console.log('\n3. 🚀 Enhanced script compatibility check...');
    
    const hasValidSteps = popup.steps.every(step => {
      try {
        JSON.parse(step.content);
        return true;
      } catch {
        return false;
      }
    });
    
    console.log(`   Valid JSON content: ${hasValidSteps ? '✅ YES' : '❌ NO'}`);
    console.log(`   Multi-step popup: ${popup.totalSteps > 1 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Quiz type: ${popup.popupType.includes('QUIZ') ? '✅ YES' : '❌ NO'}`);

    console.log('\n🎉 Sample popup test completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Deploy the updated popup-loader.js to production');
    console.log('2. Test on your actual Shopify store');
    console.log('3. Use browser console: clearPapaPopup() then testPapaPopup()');

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSamplePopup();