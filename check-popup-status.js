// Script to check current popup status in database
// Run with: node check-popup-status.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPopupStatus() {
  console.log('🔍 Checking current popup status...\n');
  
  try {
    // Find the sample popup
    const popup = await prisma.popup.findUnique({
      where: { id: 'sample-quiz-skincare-001' },
      include: {
        shop: true,
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });
    
    if (!popup) {
      console.log('❌ Sample popup not found');
      return;
    }
    
    console.log('📊 Current Popup Status:');
    console.log(`   ID: ${popup.id}`);
    console.log(`   Name: ${popup.name}`);
    console.log(`   Status: ${popup.status}`);
    console.log(`   Shop: ${popup.shop.domain}`);
    console.log(`   Script Tag ID: ${popup.scriptTagId || 'NOT SET'}`);
    console.log(`   Created: ${popup.createdAt}`);
    console.log(`   Updated: ${popup.updatedAt}`);
    console.log(`   Steps: ${popup.steps.length}`);
    
    // Check if we need to create a script tag
    if (popup.status === 'ACTIVE' && !popup.scriptTagId) {
      console.log('\n⚠️  ISSUE FOUND: Popup is ACTIVE but has no script tag!');
      console.log('💡 Solution: The popup needs a script tag to work on the storefront');
    } else if (popup.status === 'ACTIVE' && popup.scriptTagId) {
      console.log('\n✅ Popup looks good - ACTIVE with script tag');
    } else {
      console.log(`\n💡 Popup status is ${popup.status}, needs to be ACTIVE`);
    }
    
    // Also check if there are any other active popups
    const allActivePopups = await prisma.popup.findMany({
      where: {
        shopId: popup.shopId,
        status: 'ACTIVE',
        isDeleted: false
      }
    });
    
    console.log(`\n📈 Total active popups for this shop: ${allActivePopups.length}`);
    allActivePopups.forEach(p => {
      console.log(`   - ${p.name} (${p.id}) - Script: ${p.scriptTagId || 'NONE'}`);
    });
    
  } catch (error) {
    console.error('💥 Error checking popup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkPopupStatus();
}

export { checkPopupStatus };