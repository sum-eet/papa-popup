/**
 * Data migration script: Copy existing PopupConfig to new Popup format
 * 
 * This script safely migrates existing single-popup configurations to the new
 * multi-popup system without affecting existing functionality.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingPopups() {
  console.log('🚀 Starting migration of existing popups...');
  
  try {
    // Find all shops with existing popup configurations
    const shopsWithPopups = await prisma.shop.findMany({
      include: {
        popupConfig: true
      },
      where: {
        popupConfig: {
          isNot: null
        }
      }
    });

    console.log(`📊 Found ${shopsWithPopups.length} shops with existing popup configurations`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const shop of shopsWithPopups) {
      const existingConfig = shop.popupConfig;
      
      // Check if this shop already has new-style popups
      const existingNewPopup = await prisma.popup.findFirst({
        where: {
          shopId: shop.id,
          name: 'Migrated Legacy Popup'
        }
      });

      if (existingNewPopup) {
        console.log(`⏭️  Shop ${shop.domain} already has migrated popup, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`🔄 Migrating popup for shop: ${shop.domain}`);

      // Create new Popup record
      const newPopup = await prisma.popup.create({
        data: {
          shopId: shop.id,
          name: 'Migrated Legacy Popup',
          status: existingConfig.enabled ? 'ACTIVE' : 'DRAFT',
          priority: 1,
          targetingRules: JSON.stringify({ pages: ['all'] }),
          popupType: 'SIMPLE_EMAIL',
          totalSteps: 1,
          discountType: 'FIXED',
          discountConfig: JSON.stringify({ code: null, amount: null }),
          emailRequired: true,
          emailStep: 1,
          scriptTagId: existingConfig.scriptTagId
        }
      });

      // Create the single PopupStep for email collection
      await prisma.popupStep.create({
        data: {
          popupId: newPopup.id,
          stepNumber: 1,
          stepType: 'EMAIL',
          content: JSON.stringify({
            headline: existingConfig.headline,
            description: existingConfig.description,
            placeholder: 'Enter your email',
            buttonText: existingConfig.buttonText
          })
        }
      });

      console.log(`✅ Successfully migrated popup: ${newPopup.id}`);
      migratedCount++;
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`   ✅ Migrated: ${migratedCount} popups`);
    console.log(`   ⏭️  Skipped: ${skippedCount} popups (already migrated)`);
    console.log(`   📊 Total processed: ${shopsWithPopups.length} shops`);

    // Verify migration by checking new records
    const totalNewPopups = await prisma.popup.count();
    const totalNewSteps = await prisma.popupStep.count();
    
    console.log(`\n📈 Database totals after migration:`);
    console.log(`   - Total Popup records: ${totalNewPopups}`);
    console.log(`   - Total PopupStep records: ${totalNewSteps}`);
    console.log(`   - Legacy PopupConfig records: ${shopsWithPopups.length} (unchanged)`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingPopups()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateExistingPopups;