-- Sample Quiz Popup Data for Papa Popup
-- This creates a working quiz popup that can be tested immediately

-- First, create the sample popup (using UUID for predictable ID)
INSERT INTO "Popup" (
  id, 
  "shopId", 
  name, 
  status, 
  priority, 
  "targetingRules", 
  "popupType", 
  "totalSteps", 
  "discountType", 
  "discountConfig", 
  "emailRequired", 
  "emailStep", 
  "isDeleted", 
  "createdAt", 
  "updatedAt"
) VALUES (
  'sample-quiz-skincare-001',
  (SELECT id FROM "Shop" ORDER BY "installedAt" DESC LIMIT 1),
  'Skincare Quiz - Sample',
  'ACTIVE',
  1,
  '{"pages": ["home", "product", "collection"]}',
  'QUIZ_EMAIL',
  3,
  'FIXED',
  '{}',
  true,
  3,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = 'ACTIVE',
  "updatedAt" = NOW();

-- Step 1: First Quiz Question
INSERT INTO "PopupStep" (
  id,
  "popupId",
  "stepNumber",
  "stepType",
  content,
  "createdAt",
  "updatedAt"
) VALUES (
  'step-skin-type-question',
  'sample-quiz-skincare-001',
  1,
  'QUESTION',
  '{
    "question": "What''s your skin type?",
    "options": [
      {"id": "1", "text": "Dry", "value": "dry"},
      {"id": "2", "text": "Oily", "value": "oily"},
      {"id": "3", "text": "Combination", "value": "combination"},
      {"id": "4", "text": "Sensitive", "value": "sensitive"}
    ]
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  "updatedAt" = NOW();

-- Step 2: Second Quiz Question
INSERT INTO "PopupStep" (
  id,
  "popupId",
  "stepNumber",
  "stepType",
  content,
  "createdAt",
  "updatedAt"
) VALUES (
  'step-skin-concern-question',
  'sample-quiz-skincare-001',
  2,
  'QUESTION',
  '{
    "question": "What''s your main skin concern?",
    "options": [
      {"id": "1", "text": "Acne & Breakouts", "value": "acne"},
      {"id": "2", "text": "Anti-Aging", "value": "aging"},
      {"id": "3", "text": "Dark Spots", "value": "spots"},
      {"id": "4", "text": "Dryness", "value": "dryness"}
    ]
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  "updatedAt" = NOW();

-- Step 3: Email Capture
INSERT INTO "PopupStep" (
  id,
  "popupId",
  "stepNumber",
  "stepType",
  content,
  "createdAt",
  "updatedAt"
) VALUES (
  'step-email-capture',
  'sample-quiz-skincare-001',
  3,
  'EMAIL',
  '{
    "headline": "Get Your Personalized Results!",
    "description": "Enter your email to receive customized skincare recommendations based on your quiz answers.",
    "placeholder": "Enter your email address",
    "buttonText": "Get My Results"
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  "updatedAt" = NOW();

-- Display success message
SELECT 
  'Sample quiz popup created successfully!' as message,
  p.id as popup_id,
  p.name as popup_name,
  p.status,
  COUNT(ps.id) as step_count
FROM "Popup" p
LEFT JOIN "PopupStep" ps ON p.id = ps."popupId"
WHERE p.id = 'sample-quiz-skincare-001'
GROUP BY p.id, p.name, p.status;