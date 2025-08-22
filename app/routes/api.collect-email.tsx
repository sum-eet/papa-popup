import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";

// Simple rate limiting - store IP requests in memory
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

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

  // Basic rate limiting by IP
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const now = Date.now();
  const ipData = rateLimitMap.get(clientIP);
  
  if (ipData) {
    if (now < ipData.resetTime) {
      if (ipData.count >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Too many requests. Please try again later." 
          }),
          { status: 429, headers: corsHeaders }
        );
      }
      ipData.count++;
    } else {
      // Reset the count after window expires
      rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
  } else {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
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

    // Enhanced validation
    if (!email || !shopDomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email and shop domain are required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid email format" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate email length
    if (email.length > 320) { // RFC 5321 limit
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email address too long" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate shop domain format
    if (!/^[\w.-]+$/.test(shopDomain)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid shop domain format" 
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
