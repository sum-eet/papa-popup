// Script to insert sample quiz popup data
// Run with: node insert-sample-data.js

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function insertSampleData() {
  console.log('🚀 Papa Popup: Inserting sample quiz popup data...\n');

  try {
    // First, check if we have any shops
    const shops = await prisma.shop.findMany({
      take: 1,
      orderBy: { installedAt: 'desc' }
    });

    if (shops.length === 0) {
      console.log('❌ No shops found in database. Install the app on a shop first.');
      return;
    }

    const shop = shops[0];
    console.log(`📍 Using shop: ${shop.domain} (ID: ${shop.id})`);

    // Create the sample popup
    const popupData = {
      id: 'sample-quiz-skincare-001',
      shopId: shop.id,
      name: 'Skincare Quiz - Sample',
      status: 'ACTIVE',
      priority: 1,
      targetingRules: JSON.stringify({ pages: ['home', 'product', 'collection'] }),
      popupType: 'QUIZ_EMAIL',
      totalSteps: 3,
      discountType: 'FIXED',
      discountConfig: JSON.stringify({}),
      emailRequired: true,
      emailStep: 3,
      isDeleted: false
    };

    console.log('📝 Creating popup...');
    const popup = await prisma.popup.upsert({
      where: { id: popupData.id },
      update: {
        status: 'ACTIVE',
        updatedAt: new Date()
      },
      create: popupData
    });

    console.log(`✅ Popup created: ${popup.name} (${popup.id})`);

    // Create the steps
    const steps = [
      {
        id: 'step-skin-type-question',
        popupId: popup.id,
        stepNumber: 1,
        stepType: 'QUESTION',
        content: JSON.stringify({
          question: "What's your skin type?",
          options: [
            { id: "1", text: "Dry", value: "dry" },
            { id: "2", text: "Oily", value: "oily" },
            { id: "3", text: "Combination", value: "combination" },
            { id: "4", text: "Sensitive", value: "sensitive" }
          ]
        })
      },
      {
        id: 'step-skin-concern-question',
        popupId: popup.id,
        stepNumber: 2,
        stepType: 'QUESTION',
        content: JSON.stringify({
          question: "What's your main skin concern?",
          options: [
            { id: "1", text: "Acne & Breakouts", value: "acne" },
            { id: "2", text: "Anti-Aging", value: "aging" },
            { id: "3", text: "Dark Spots", value: "spots" },
            { id: "4", text: "Dryness", value: "dryness" }
          ]
        })
      },
      {
        id: 'step-email-capture',
        popupId: popup.id,
        stepNumber: 3,
        stepType: 'EMAIL',
        content: JSON.stringify({
          headline: "Get Your Personalized Results!",
          description: "Enter your email to receive customized skincare recommendations based on your quiz answers.",
          placeholder: "Enter your email address",
          buttonText: "Get My Results"
        })
      }
    ];

    console.log('📝 Creating popup steps...');
    for (let i = 0; i < steps.length; i++) {
      const stepData = steps[i];
      const step = await prisma.popupStep.upsert({
        where: { id: stepData.id },
        update: {
          content: stepData.content,
          updatedAt: new Date()
        },
        create: stepData
      });

      console.log(`✅ Step ${step.stepNumber}: ${step.stepType} (${step.id})`);
    }

    // Verify the data
    console.log('\n🔍 Verifying created data...');
    const createdPopup = await prisma.popup.findUnique({
      where: { id: popup.id },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    console.log('\n📊 Sample Quiz Popup Summary:');
    console.log(`   Name: ${createdPopup.name}`);
    console.log(`   Status: ${createdPopup.status}`);
    console.log(`   Type: ${createdPopup.popupType}`);
    console.log(`   Total Steps: ${createdPopup.totalSteps}`);
    console.log(`   Steps Created: ${createdPopup.steps.length}`);
    
    createdPopup.steps.forEach(step => {
      const content = JSON.parse(step.content);
      const preview = content.question || content.headline || 'Content step';
      console.log(`   Step ${step.stepNumber} (${step.stepType}): ${preview}`);
    });

    console.log('\n🎉 Sample quiz popup created successfully!');
    console.log('\n💡 Test Instructions:');
    console.log('1. Visit your Shopify store homepage');
    console.log('2. Open browser console and run: clearPapaPopup()');
    console.log('3. Refresh the page to see the quiz popup');
    console.log('4. Or run: testPapaPopup() to test immediately');

  } catch (error) {
    console.error('💥 Error creating sample data:', error);
    if (error.code === 'P2002') {
      console.log('ℹ️  Sample data might already exist. This is normal.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  insertSampleData();
}

export { insertSampleData };