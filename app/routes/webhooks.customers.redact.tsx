import type { ActionFunctionArgs } from "@remix-run/node";
import { validateWebhookHmacOrReject } from "../utils/webhook-verification";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🗑️ Received customers/redact webhook");

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
    console.log("Customer redact payload:", payload);

    const { shop_id, shop_domain, customer } = payload;

    if (!shop_id || !customer?.id) {
      console.warn("Missing required fields in redact payload");
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

    // Delete all customer data from our database
    const deleteResults = await prisma.$transaction(async (tx) => {
      // Find customer sessions to delete
      const customerSessions = await tx.customerSession.findMany({
        where: {
          shopId: shop.id,
          customerEmail: customer.email
        },
        select: { id: true }
      });

      console.log(`Found ${customerSessions.length} customer sessions to delete`);

      // Delete collected emails for this customer
      const deletedEmails = await tx.collectedEmail.deleteMany({
        where: {
          shopId: shop.id,
          email: customer.email
        }
      });

      // Delete customer sessions
      const deletedSessions = await tx.customerSession.deleteMany({
        where: {
          shopId: shop.id,
          customerEmail: customer.email
        }
      });

      return {
        deletedEmails: deletedEmails.count,
        deletedSessions: deletedSessions.count
      };
    });

    console.log(`Successfully redacted customer data for ${customer.email}:`);
    console.log(`- Deleted ${deleteResults.deletedEmails} email records`);
    console.log(`- Deleted ${deleteResults.deletedSessions} customer sessions`);

    // Log the redaction for audit purposes
    console.log(`GDPR REDACTION: Customer ${customer.id} (${customer.email}) data deleted from shop ${shop_domain}`);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Error processing customers/redact webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};