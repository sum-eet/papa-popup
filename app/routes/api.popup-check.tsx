import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

// Legacy popup system handler
async function handleLegacyPopupCheck(shopDomain: string, pageType: string, pageUrl: string, corsHeaders: Record<string, string>) {
  console.log("🔄 Using legacy popup system for:", shopDomain);
  
  // Find shop and popup config
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    include: { popupConfig: true }
  });

  if (!shop || !shop.popupConfig || !shop.popupConfig.enabled) {
    return new Response(
      JSON.stringify({ showPopup: false, reason: "No active legacy popup" }),
      { status: 200, headers: corsHeaders }
    );
  }

  // Simple logic: show on home and product pages
  const showOnPages = ['home', 'product', 'collection'];
  const shouldShow = showOnPages.includes(pageType);

  if (!shouldShow) {
    return new Response(
      JSON.stringify({ showPopup: false, reason: `Page type ${pageType} not targeted` }),
      { status: 200, headers: corsHeaders }
    );
  }

  // Return popup config
  const config = {
    headline: shop.popupConfig.headline,
    description: shop.popupConfig.description,
    buttonText: shop.popupConfig.buttonText,
    popupType: 'SIMPLE_EMAIL',
    totalSteps: 1,
    system: 'legacy'
  };

  return new Response(
    JSON.stringify({
      showPopup: true,
      config,
      pageType,
      system: 'legacy'
    }),
    { status: 200, headers: corsHeaders }
  );
}

// New multi-popup system handler  
async function handleMultiPopupCheck(shopDomain: string, pageType: string, pageUrl: string, corsHeaders: Record<string, string>) {
  console.log("🚀 Using multi-popup system for:", shopDomain, "pageType:", pageType);
  
  // Find shop and active popups
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    include: { 
      popups: {
        where: {
          status: 'ACTIVE',
          isDeleted: false
        },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' }
          }
        },
        orderBy: { priority: 'desc' } // Higher priority first
      }
    }
  });

  console.log("🔍 Multi-popup debug:", {
    shopFound: !!shop,
    shopId: shop?.id,
    activePopupsCount: shop?.popups?.length || 0,
    popups: shop?.popups?.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      scriptTagId: p.scriptTagId,
      targetingRules: p.targetingRules
    })) || []
  });

  if (!shop || !shop.popups.length) {
    return new Response(
      JSON.stringify({ 
        showPopup: false, 
        reason: "No active multi-popups",
        debug: {
          shopFound: !!shop,
          popupsCount: shop?.popups?.length || 0
        }
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // Find the highest priority popup that matches the current page
  let selectedPopup = null;
  
  // Helper function to check if URL matches a pattern
  function checkUrlMatch(pattern, currentUrl) {
    // Simple pattern matching with wildcard support
    if (pattern === currentUrl) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return currentUrl.startsWith(prefix);
    }
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      return currentUrl.endsWith(suffix);
    }
    return currentUrl.includes(pattern);
  }
  
  // First pass: Look for popups with specific URL targeting that match current page
  for (const popup of shop.popups) {
    const targetingRules = typeof popup.targetingRules === 'string' 
      ? JSON.parse(popup.targetingRules) 
      : popup.targetingRules;
    
    const specificUrls = targetingRules.specificUrls || [];
    const urlPriority = targetingRules.urlPriority || false;
    
    // If this popup has specific URLs and URL priority is enabled
    if (urlPriority && specificUrls.length > 0) {
      for (const urlPattern of specificUrls) {
        if (checkUrlMatch(urlPattern, pageUrl)) {
          selectedPopup = popup;
          console.log(`🎯 Found specific URL match: ${urlPattern} matches ${pageUrl}`);
          break;
        }
      }
      if (selectedPopup) break; // Found a specific URL match, stop looking
    }
  }
  
  // Second pass: If no specific URL match found, look for page type matches
  if (!selectedPopup) {
    for (const popup of shop.popups) {
      const targetingRules = typeof popup.targetingRules === 'string' 
        ? JSON.parse(popup.targetingRules) 
        : popup.targetingRules;
      
      const targetPages = targetingRules.pages || ['all'];
      
      if (targetPages.includes('all') || targetPages.includes(pageType)) {
        selectedPopup = popup;
        console.log(`📄 Found page type match: ${pageType}`);
        break; // Take the first (highest priority) match
      }
    }
  }

  if (!selectedPopup) {
    return new Response(
      JSON.stringify({ showPopup: false, reason: `No popup targets page type: ${pageType}` }),
      { status: 200, headers: corsHeaders }
    );
  }

  // Build config based on popup type and steps
  const config = {
    popupId: selectedPopup.id,
    popupType: selectedPopup.popupType,
    totalSteps: selectedPopup.totalSteps,
    triggerConfig: (() => {
      try {
        // Handle string JSON
        let triggerConfig;
        if (typeof selectedPopup.triggerConfig === 'string') {
          triggerConfig = JSON.parse(selectedPopup.triggerConfig);
        } else if (selectedPopup.triggerConfig && typeof selectedPopup.triggerConfig === 'object') {
          triggerConfig = selectedPopup.triggerConfig;
        } else {
          // Fallback for null/undefined/invalid
          triggerConfig = { type: 'delay', value: 2 };
        }
        
        // Remove URL trigger type as it's now handled in targeting
        if (triggerConfig.type === 'url') {
          console.log('⚠️ Found legacy URL trigger, converting to delay trigger');
          triggerConfig = { type: 'delay', value: 2 };
        }
        
        return triggerConfig;
      } catch (error) {
        console.warn('Invalid triggerConfig for popup:', selectedPopup.id, error);
        return { type: 'delay', value: 2 };
      }
    })(),
    steps: selectedPopup.steps.map(step => ({
      stepNumber: step.stepNumber,
      stepType: step.stepType,
      content: typeof step.content === 'string' ? JSON.parse(step.content) : step.content
    })),
    discountType: selectedPopup.discountType,
    discountConfig: typeof selectedPopup.discountConfig === 'string' 
      ? JSON.parse(selectedPopup.discountConfig) 
      : selectedPopup.discountConfig,
    system: 'multi'
  };

  return new Response(
    JSON.stringify({
      showPopup: true,
      config,
      pageType,
      system: 'multi'
    }),
    { status: 200, headers: corsHeaders }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { shopDomain, pageType, pageUrl, forceMultiCheck } = await request.json();

    if (!shopDomain) {
      return new Response(
        JSON.stringify({ error: "Shop domain required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check feature flag to determine which system to use
    const useMultiPopup = process.env.ENABLE_MULTI_POPUP === 'true' || forceMultiCheck;
    
    if (useMultiPopup) {
      // Try multi-popup system first (even if feature flag is off via forceMultiCheck)
      const multiResult = await handleMultiPopupCheck(shopDomain, pageType, pageUrl, corsHeaders);
      
      // If forceMultiCheck is true and no multi-popup found, still fall back to legacy
      if (forceMultiCheck) {
        const multiData = await multiResult.json();
        if (multiData.showPopup) {
          // Found a multi-popup, return it
          return new Response(JSON.stringify(multiData), { status: 200, headers: corsHeaders });
        } else {
          // No multi-popup found, fall back to legacy
          return await handleLegacyPopupCheck(shopDomain, pageType, pageUrl, corsHeaders);
        }
      } else {
        return multiResult;
      }
    } else {
      return await handleLegacyPopupCheck(shopDomain, pageType, pageUrl, corsHeaders);
    }

  } catch (error) {
    console.error("Popup check error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", showPopup: false }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS preflight for CORS
export async function loader() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}