import type { ActionFunctionArgs } from "@remix-run/node";
import { validateWebhookHmacOrReject } from "../utils/webhook-verification";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🏪 Received shop/redact webhook");

  // Verify HMAC signature first
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.error("Missing SHOPIFY_API_SECRET environment variable");
    return new Response("Internal Server Error", { status: 500 });
  }

  const { response: hmacResponse, body } = await validateWebhookHmacOrReject(request, secret);
  if (hmacResponse) {
    return hmacResponse; // Return 401 if HMAC verification failed
  }

  try {
    // Parse the webhook payload
    const payload = JSON.parse(body);
    console.log("Shop redact payload:", payload);

    const { shop_id, shop_domain } = payload;

    if (!shop_id || !shop_domain) {
      console.warn("Missing required fields in shop redact payload");
      return new Response("Bad Request", { status: 400 });
    }

    // Find the shop in our database
    const shop = await prisma.shop.findFirst({
      where: {
        OR: [
          { id: shop_id },
          { domain: shop_domain }
        ]
      }
    });

    if (!shop) {
      console.log(`Shop not found: ${shop_domain} (${shop_id}) - nothing to redact`);
      return new Response("OK", { status: 200 });
    }

    // Delete ALL shop data from our database
    const deleteResults = await prisma.$transaction(async (tx) => {
      // Get counts before deletion for logging
      const popupCount = await tx.popup.count({ where: { shopId: shop.id } });
      const sessionCount = await tx.session.count({ where: { shop: shop_domain } });
      const emailCount = await tx.collectedEmail.count({ where: { shopId: shop.id } });
      const customerSessionCount = await tx.customerSession.count({ where: { shopId: shop.id } });
      const popupStepCount = await tx.popupStep.count({ 
        where: { 
          popup: { shopId: shop.id } 
        } 
      });

      // Delete popup steps first (foreign key dependency)
      await tx.popupStep.deleteMany({
        where: {
          popup: { shopId: shop.id }
        }
      });

      // Delete customer sessions
      await tx.customerSession.deleteMany({
        where: { shopId: shop.id }
      });

      // Delete collected emails
      await tx.collectedEmail.deleteMany({
        where: { shopId: shop.id }
      });

      // Delete popups
      await tx.popup.deleteMany({
        where: { shopId: shop.id }
      });

      // Delete popup config if exists
      await tx.popupConfig.deleteMany({
        where: { shopId: shop.id }
      });

      // Delete sessions
      await tx.session.deleteMany({
        where: { shop: shop_domain }
      });

      // Finally delete the shop record
      await tx.shop.delete({
        where: { id: shop.id }
      });

      return {
        popupCount,
        sessionCount,
        emailCount,
        customerSessionCount,
        popupStepCount
      };
    });

    console.log(`Successfully redacted all shop data for ${shop_domain}:`);
    console.log(`- Deleted ${deleteResults.popupCount} popups`);
    console.log(`- Deleted ${deleteResults.popupStepCount} popup steps`);
    console.log(`- Deleted ${deleteResults.sessionCount} sessions`);
    console.log(`- Deleted ${deleteResults.emailCount} collected emails`);
    console.log(`- Deleted ${deleteResults.customerSessionCount} customer sessions`);
    console.log(`- Deleted shop record`);

    // Log the redaction for audit purposes
    console.log(`GDPR SHOP REDACTION: All data for shop ${shop_domain} (${shop_id}) has been permanently deleted`);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Error processing shop/redact webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};