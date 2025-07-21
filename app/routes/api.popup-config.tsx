import { type LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get('shop');

  if (!shopDomain) {
    return new Response(JSON.stringify({ error: "Shop domain required" }), { 
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
      include: { popupConfig: true }
    });

    if (!shop || !shop.popupConfig || !shop.popupConfig.enabled) {
      return new Response(JSON.stringify({ enabled: false }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    const config = {
      enabled: shop.popupConfig.enabled,
      headline: shop.popupConfig.headline,
      description: shop.popupConfig.description,
      buttonText: shop.popupConfig.buttonText,
    };

    return new Response(JSON.stringify(config), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  } catch (error) {
    console.error("Failed to fetch popup config:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }
}