import { type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

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
    const { email, shopDomain } = data;

    // Find shop
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
    });

    if (!shop) {
      return new Response(
        JSON.stringify({ error: "Shop not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Save email
    await prisma.collectedEmail.create({
      data: {
        email,
        shopId: shop.id,
        source: "popup",
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Email collection error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to save email" }),
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
