import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function loader() {
  return new Response("Method not allowed", { 
    status: 405,
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
    const { sessionToken, shopDomain } = await request.json();

    if (!sessionToken || !shopDomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Session token and shop domain are required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Only generate discounts for multi-popup system
    if (!isMultiPopupEnabled()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Multi-popup system not enabled" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

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

    // Find customer session
    const customerSession = await prisma.customerSession.findFirst({
      where: {
        sessionToken,
        shopId: shop.id,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        popup: {
          include: {
            steps: {
              where: { stepType: 'DISCOUNT_REVEAL' },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!customerSession) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Session not found or expired" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if popup supports discount generation
    if (!customerSession.popup || customerSession.popup.popupType !== 'QUIZ_DISCOUNT') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Popup does not support discount generation" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate discount code if not already generated
    let discountCode = customerSession.discountCode;
    
    if (!discountCode) {
      // Generate unique discount code
      discountCode = generateDiscountCode(customerSession.responses);
      
      // Update session with discount code
      await prisma.customerSession.update({
        where: { id: customerSession.id },
        data: {
          discountCode
        }
      });
    }

    // Get discount step content for display
    const discountStep = customerSession.popup.steps.find(step => step.stepType === 'DISCOUNT_REVEAL');
    const discountContent = discountStep ? (
      typeof discountStep.content === 'string' 
        ? JSON.parse(discountStep.content) 
        : discountStep.content
    ) : {};

    console.log(`[Discount Generate] Generated code ${discountCode} for session ${sessionToken}`);

    return new Response(
      JSON.stringify({
        success: true,
        discountCode,
        discountInfo: {
          headline: discountContent.headline || "Here's your discount!",
          description: discountContent.description || "Thanks for completing the quiz",
          validityText: discountContent.validityText || "Valid for 24 hours",
          codeDisplay: discountCode
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("[Discount Generate] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Generate a discount code based on quiz responses
 * This can be enhanced with more sophisticated logic
 */
function generateDiscountCode(responses: any): string {
  const timestamp = Date.now().toString().slice(-6);
  const prefix = "QUIZ";
  
  // Parse responses if string
  const parsedResponses = typeof responses === 'string' 
    ? JSON.parse(responses) 
    : responses || {};
  
  // Add logic based on responses (example)
  const responseCount = Object.keys(parsedResponses).length;
  const suffix = responseCount > 2 ? "VIP" : "SAVE";
  
  return `${prefix}${suffix}${timestamp}`;
}