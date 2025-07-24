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

    // Only validate sessions for multi-popup system
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

    // Check if popup is still active
    if (customerSession.popup.status !== 'ACTIVE' || customerSession.popup.isDeleted) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Popup is no longer active" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[Session Validate] Valid session ${sessionToken} for popup ${customerSession.popupId}`);

    const responses = typeof customerSession.responses === 'string' 
      ? JSON.parse(customerSession.responses) 
      : customerSession.responses;

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: customerSession.sessionToken,
        currentStep: customerSession.currentStep,
        totalSteps: customerSession.totalSteps,
        responses,
        isCompleted: !!customerSession.completedAt,
        popup: {
          id: customerSession.popup.id,
          type: customerSession.popup.popupType,
          steps: customerSession.popup.steps.map(step => ({
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
    console.error("[Session Validate] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}