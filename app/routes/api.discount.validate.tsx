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
    const { discountCode, shopDomain } = await request.json();

    if (!discountCode || !shopDomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Discount code and shop domain are required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Only validate discounts for multi-popup system
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

    // Find customer session with this discount code
    const customerSession = await prisma.customerSession.findFirst({
      where: {
        discountCode,
        shopId: shop.id,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        popup: true,
        collectedEmails: true
      }
    });

    if (!customerSession) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          valid: false,
          error: "Discount code not found or expired" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if discount has already been used (if email was collected)
    const hasEmailCollected = customerSession.collectedEmails.length > 0;
    
    // Additional validation rules can be added here
    const isValid = !hasEmailCollected || customerSession.completedAt !== null;
    
    console.log(`[Discount Validate] Code ${discountCode} validation: ${isValid ? 'valid' : 'invalid'}`);

    return new Response(
      JSON.stringify({
        success: true,
        valid: isValid,
        discountCode,
        sessionInfo: {
          sessionToken: customerSession.sessionToken,
          popupType: customerSession.popup?.popupType,
          completedAt: customerSession.completedAt,
          emailCollected: hasEmailCollected
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("[Discount Validate] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        valid: false,
        error: "Internal server error" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}