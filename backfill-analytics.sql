-- Safe backfill script for CustomerSession analytics
-- Run this to fix existing tracking data

UPDATE "CustomerSession" 
SET 
  "stepsViewed" = CASE 
    -- If session is completed, user viewed all steps
    WHEN "completedAt" IS NOT NULL THEN 
      COALESCE(p."totalSteps", "currentStep")
    
    -- Try to count responses safely
    WHEN responses IS NOT NULL THEN
      CASE 
        -- Check if it's a valid JSON object (not scalar or string)
        WHEN jsonb_typeof(responses) = 'object' THEN
          GREATEST(
            "currentStep",
            (SELECT COUNT(*) FROM jsonb_object_keys(responses) WHERE jsonb_object_keys LIKE 'step_%')
          )
        -- Fallback to current step if responses isn't an object
        ELSE "currentStep"
      END
    
    -- Default to current step
    ELSE "currentStep"
  END,
  
  "stepsCompleted" = CASE 
    -- If session is completed, all steps are completed
    WHEN "completedAt" IS NOT NULL THEN 
      COALESCE(p."totalSteps", "currentStep")
    
    -- Try to count completed steps from responses
    WHEN responses IS NOT NULL THEN
      CASE 
        -- Check if it's a valid JSON object
        WHEN jsonb_typeof(responses) = 'object' THEN
          (SELECT COUNT(*) FROM jsonb_object_keys(responses) WHERE jsonb_object_keys LIKE 'step_%')
        -- If not an object, assume no steps completed
        ELSE 0
      END
    
    -- No responses means no steps completed
    ELSE 0
  END,
  
  "emailProvided" = CASE 
    -- If session completed and popup requires email, then email was provided
    WHEN "completedAt" IS NOT NULL AND p."emailRequired" = true THEN true
    
    -- Check if there's an email in responses
    WHEN responses IS NOT NULL THEN
      CASE
        -- Check if responses is a valid JSON object
        WHEN jsonb_typeof(responses) = 'object' THEN
          EXISTS (
            SELECT 1 FROM jsonb_each_text(responses) 
            WHERE value LIKE '%@%' AND value LIKE '%.%'
          )
        -- If not an object, check if there's a collected email record
        ELSE EXISTS (
          SELECT 1 FROM "CollectedEmail" ce 
          WHERE ce."customerSessionId" = "CustomerSession".id
        )
      END
    
    -- Check CollectedEmail table as fallback
    WHEN EXISTS (
      SELECT 1 FROM "CollectedEmail" ce 
      WHERE ce."customerSessionId" = "CustomerSession".id
    ) THEN true
    
    ELSE false
  END

FROM "Popup" p
WHERE p.id = "CustomerSession"."popupId";

-- Verification query to check results
SELECT 
  COUNT(*) as total_sessions,
  AVG("stepsViewed") as avg_steps_viewed,
  AVG("stepsCompleted") as avg_steps_completed,
  SUM(CASE WHEN "emailProvided" = true THEN 1 ELSE 0 END) as total_emails_provided,
  SUM(CASE WHEN "completedAt" IS NOT NULL THEN 1 ELSE 0 END) as total_completed_sessions
FROM "CustomerSession";