import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { action as analyticsAction } from "./api.analytics.events";

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

    // Create a new request object with the analytics data
    const forwardRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(analyticsData),
    });

    // Call the analytics action directly instead of making HTTP request
    const response = await analyticsAction({ 
      request: forwardRequest,
      context: {},
      params: {}
    });
    
    // Check if response is successful
    if (response.status >= 200 && response.status < 300) {
      console.log("Analytics Proxy: Successfully processed via direct call");
      const responseData = await response.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Analytics tracked via proxy",
          ...responseData
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      console.error("Analytics Proxy: Direct call failed with status:", response.status);
      const errorData = await response.text();
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Analytics processing failed",
          details: errorData,
          status: response.status
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error("Analytics Proxy error:", error);
    
    // Log detailed error information
    console.error("Analytics Proxy detailed error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      requestUrl: request.url,
      requestMethod: request.method
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Proxy failed to process analytics",
        debug: {
          message: error instanceof Error ? error.message : String(error),
          stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
          type: typeof error
        }
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