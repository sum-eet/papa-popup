import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

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
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Failed to track event" 
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