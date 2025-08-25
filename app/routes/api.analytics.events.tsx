import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  // Enhanced CORS headers for storefront
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400", // 24 hours
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const data = await request.json();
    console.log("Analytics API: Received data:", data);
    
    const { 
      eventType,
      shopDomain, 
      sessionToken, 
      popupId,
      stepNumber,
      metadata,
      ipAddress,
      userAgent,
      pageUrl
    } = data;

    if (!eventType || !shopDomain) {
      console.error("Analytics API: Missing required fields:", { eventType, shopDomain });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "eventType and shopDomain are required" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Find shop
    console.log("Analytics API: Looking for shop:", shopDomain);
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
    });

    if (!shop) {
      console.error("Analytics API: Shop not found:", shopDomain);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Shop not found" 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get client IP if not provided
    const clientIP = ipAddress || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown';

    // Get user agent if not provided
    const clientUserAgent = userAgent || request.headers.get('user-agent') || 'unknown';

    console.log("Analytics API: Creating analytics event with data:", {
      shopId: shop.id,
      popupId: popupId || null,
      eventType,
      sessionToken: sessionToken || null,
      stepNumber: stepNumber || null,
      metadata: metadata || null,
      ipAddress: clientIP,
      userAgent: clientUserAgent,
      pageUrl: pageUrl || null
    });

    // Create analytics event
    const analyticsEvent = await prisma.popupAnalytics.create({
      data: {
        shopId: shop.id,
        popupId: popupId || null,
        eventType,
        sessionToken: sessionToken || null,
        stepNumber: stepNumber || null,
        metadata: metadata || null,
        ipAddress: clientIP,
        userAgent: clientUserAgent,
        pageUrl: pageUrl || null
      }
    });

    console.log("Analytics API: Successfully created analytics event:", analyticsEvent.id);

    // Update customer analytics if we have a session token - simplified version
    if (sessionToken) {
      const now = new Date();
      
      try {
        // Find existing customer analytics record
        const existing = await prisma.customerAnalytics.findUnique({
          where: { sessionToken }
        });

        if (existing) {
          // Update existing record with simple operations
          await prisma.customerAnalytics.update({
            where: { sessionToken },
            data: {
              totalInteractions: { increment: 1 },
              lastActivity: now,
              emailProvided: eventType === 'complete' || eventType === 'email_provided' || existing.emailProvided,
              discountClaimed: eventType === 'discount_claimed' || existing.discountClaimed
            }
          });
        } else {
          // Create new record with basic data
          await prisma.customerAnalytics.create({
            data: {
              shopId: shop.id,
              sessionToken,
              popupId: popupId || null,
              totalInteractions: 1,
              firstVisit: now,
              lastActivity: now,
              emailProvided: eventType === 'complete' || eventType === 'email_provided',
              discountClaimed: eventType === 'discount_claimed',
              customerJourney: [],
              conversionFunnel: {}
            }
          });
        }
      } catch (customerAnalyticsError) {
        // Log customer analytics error but don't fail the main analytics tracking
        console.warn("Customer analytics update failed:", customerAnalyticsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventId: analyticsEvent.id
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Analytics event error:", error);
    
    // Log detailed error information for debugging
    console.error("Analytics error details:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestData: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      }
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Failed to track event",
        debug: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight and health checks
export async function loader() {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
  
  return new Response(
    JSON.stringify({ 
      status: "Analytics API is healthy",
      timestamp: new Date().toISOString()
    }), 
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}