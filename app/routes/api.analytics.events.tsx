import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "eventType and shopDomain are required" 
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

    // Get client IP if not provided
    const clientIP = ipAddress || 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown';

    // Get user agent if not provided
    const clientUserAgent = userAgent || request.headers.get('user-agent') || 'unknown';

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

    // Update customer analytics if we have a session token
    if (sessionToken) {
      const now = new Date();
      
      // Find or create customer analytics record
      await prisma.customerAnalytics.upsert({
        where: { sessionToken },
        create: {
          shopId: shop.id,
          sessionToken,
          popupId: popupId || null,
          customerJourney: [{
            timestamp: now.toISOString(),
            eventType,
            stepNumber,
            metadata
          }],
          conversionFunnel: {
            [eventType]: 1
          },
          totalInteractions: 1,
          firstVisit: now,
          emailProvided: eventType === 'complete' || eventType === 'email_provided',
          discountClaimed: eventType === 'discount_claimed'
        },
        update: {
          customerJourney: {
            push: {
              timestamp: now.toISOString(),
              eventType,
              stepNumber,
              metadata
            }
          },
          conversionFunnel: {
            // This will need custom logic to update funnel counts
          },
          totalInteractions: { increment: 1 },
          emailProvided: eventType === 'complete' || eventType === 'email_provided' ? true : undefined,
          discountClaimed: eventType === 'discount_claimed' ? true : undefined,
          lastActivity: now
        }
      });

      // Update funnel data with raw SQL for complex JSON updates
      if (eventType !== 'impression') {
        await prisma.$executeRaw`
          UPDATE "CustomerAnalytics" 
          SET "conversionFunnel" = COALESCE("conversionFunnel", '{}')::jsonb || 
            jsonb_build_object(${eventType}, COALESCE(("conversionFunnel"->>${eventType})::int, 0) + 1)
          WHERE "sessionToken" = ${sessionToken}
        `;
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