import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { generateSessionToken } from "../utils/session";
import { isMultiPopupEnabled } from "../utils/features";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function loader() {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders
  });
}

export async function action({ request }: ActionFunctionArgs) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { shopDomain, popupId, pageUrl, userAgent } = await request.json();

    if (!shopDomain || !popupId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Shop domain and popup ID are required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Only create sessions for multi-popup system
    // HARDCODED FOR TESTING - bypassing feature flag check
    // if (!isMultiPopupEnabled()) {
    //   return new Response(
    //     JSON.stringify({ 
    //       success: false, 
    //       error: "Multi-popup system not enabled" 
    //     }),
    //     { status: 400, headers: corsHeaders }
    //   );
    // }

    // Find the shop
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain }
    });

    if (!shop) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Shop not found" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify popup exists and is active
    const popup = await prisma.popup.findFirst({
      where: {
        id: popupId,
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Popup not found or not active" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    
    // Get client IP
    const clientIp = request.headers.get("x-forwarded-for") || 
                    request.headers.get("x-real-ip") || 
                    "unknown";

    // Create customer session
    const customerSession = await prisma.customerSession.create({
      data: {
        sessionToken,
        shopId: shop.id,
        popupId: popup.id,
        currentStep: 1,
        totalSteps: popup.totalSteps,
        responses: JSON.stringify({}),
        ipAddress: clientIp,
        userAgent: userAgent || request.headers.get("user-agent") || "unknown",
        pageUrl: pageUrl || "unknown",
        isCompleted: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    console.log(`[Session Create] Created session ${sessionToken} for popup ${popupId} on shop ${shopDomain}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: customerSession.sessionToken,
        currentStep: customerSession.currentStep,
        totalSteps: customerSession.totalSteps,
        popup: {
          id: popup.id,
          type: popup.popupType,
          steps: popup.steps.map(step => ({
            stepNumber: step.stepNumber,
            stepType: step.stepType,
            content: typeof step.content === 'string' 
              ? JSON.parse(step.content) 
              : step.content
          }))
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("[Session Create] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}