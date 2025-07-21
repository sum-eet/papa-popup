import { json, type ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

// This endpoint will be hit by the popup
export async function action({ request }: ActionFunctionArgs) {
  // Enable CORS for storefront
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const data = await request.json();
    const { email, shopDomain } = data;

    // Find shop
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
    });

    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404, headers });
    }

    // Save email
    await prisma.collectedEmail.create({
      data: {
        email,
        shopId: shop.id,
        source: "popup",
      },
    });

    return json({ success: true }, { headers });
  } catch (error) {
    return json({ error: "Failed to save email" }, { status: 500, headers });
  }
}

// Handle preflight
export async function loader() {
  return json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}
