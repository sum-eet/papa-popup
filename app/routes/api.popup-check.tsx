import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
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
    const { shopDomain, pageType, pageUrl } = await request.json();

    if (!shopDomain) {
      return new Response(
        JSON.stringify({ error: "Shop domain required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Find shop and popup config
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
      include: { popupConfig: true }
    });

    if (!shop || !shop.popupConfig || !shop.popupConfig.enabled) {
      return new Response(
        JSON.stringify({ showPopup: false }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Simple logic: show on home and product pages
    const showOnPages = ['home', 'product', 'collection'];
    const shouldShow = showOnPages.includes(pageType);

    if (!shouldShow) {
      return new Response(
        JSON.stringify({ showPopup: false }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Return popup config
    const config = {
      headline: shop.popupConfig.headline,
      description: shop.popupConfig.description,
      buttonText: shop.popupConfig.buttonText,
    };

    return new Response(
      JSON.stringify({
        showPopup: true,
        config,
        pageType,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Popup check error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", showPopup: false }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS preflight for CORS
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