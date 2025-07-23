import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";

// This endpoint will be hit by the popup
export async function action({ request }: ActionFunctionArgs) {
  // Enable CORS for storefront
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
    const data = await request.json();
    const { 
      email, 
      shopDomain, 
      sessionToken, 
      quizResponses, 
      popupId,
      source = "popup" 
    } = data;

    if (!email || !shopDomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email and shop domain are required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Find shop
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
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

    let customerSessionId = null;
    let discountCode = null;

    // Handle multi-popup system with session tracking
    if (isMultiPopupEnabled() && sessionToken) {
      // Find and update customer session
      const customerSession = await prisma.customerSession.findFirst({
        where: {
          sessionToken,
          shopId: shop.id,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          popup: true
        }
      });

      if (customerSession) {
        customerSessionId = customerSession.id;

        // Mark session as completed with email
        await prisma.customerSession.update({
          where: { id: customerSession.id },
          data: {
            completedAt: new Date()
          }
        });

        // Generate discount code if popup type requires it
        if (customerSession.popup && customerSession.popup.popupType === 'QUIZ_DISCOUNT') {
          // Simple discount code generation - can be enhanced later
          discountCode = `QUIZ${Date.now().toString().slice(-6)}`;
          
          // Update session with discount code
          await prisma.customerSession.update({
            where: { id: customerSession.id },
            data: {
              discountCode
            }
          });
        }

        console.log(`[Email Collection] Session ${sessionToken} marked as completed with email`);
      }
    }

    // Prepare quiz responses data
    const quizData = quizResponses || {};
    
    // Save email with enhanced data
    const collectedEmail = await prisma.collectedEmail.create({
      data: {
        email,
        shopId: shop.id,
        customerSessionId,
        source,
        quizResponses: Object.keys(quizData).length > 0 ? JSON.stringify(quizData) : undefined,
        popupId: popupId || null,
      },
    });

    console.log(`[Email Collection] Saved email ${email} for shop ${shopDomain}${sessionToken ? ` with session ${sessionToken}` : ''}`);

    const response = {
      success: true,
      id: collectedEmail.id,
      discountCode: discountCode || undefined
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Email collection error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Failed to save email" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight
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
