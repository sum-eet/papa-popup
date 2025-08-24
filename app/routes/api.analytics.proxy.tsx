import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

// This proxy route allows analytics to be sent from any domain without CORS issues
// It forwards the analytics data to our main analytics system

export async function action({ request }: ActionFunctionArgs) {
  // Enhanced CORS headers for storefront - allow any origin
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get the analytics data from the request
    const analyticsData = await request.json();
    
    console.log("Analytics Proxy: Received data:", analyticsData);

    // Forward to the main analytics API using an internal request
    const analyticsUrl = new URL("/api/analytics/events", request.url);
    
    const forwardResponse = await fetch(analyticsUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(analyticsData),
    });

    const responseData = await forwardResponse.json();
    
    if (forwardResponse.ok) {
      console.log("Analytics Proxy: Successfully forwarded to main API");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Analytics tracked via proxy",
          ...responseData
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      console.error("Analytics Proxy: Main API failed:", responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Analytics API failed",
          details: responseData
        }),
        { status: forwardResponse.status, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error("Analytics Proxy error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Proxy failed to process analytics",
        debug: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Health check endpoint
export async function loader({ request }: LoaderFunctionArgs) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };

  return new Response(
    JSON.stringify({
      status: "Analytics Proxy is healthy",
      timestamp: new Date().toISOString(),
      info: "This proxy forwards analytics data to avoid CORS issues"
    }),
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}