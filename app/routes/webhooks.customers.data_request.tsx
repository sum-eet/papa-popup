import type { ActionFunctionArgs } from "@remix-run/node";
import { validateWebhookHmacOrReject } from "../utils/webhook-verification";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("📋 Received customers/data_request webhook");

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
    console.log("Customer data request payload:", payload);

    const { shop_id, shop_domain, customer } = payload;

    if (!shop_id || !customer?.id) {
      console.warn("Missing required fields in data request payload");
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
      console.log(`Shop not found: ${shop_domain} (${shop_id})`);
      // Return empty data response - this is valid for GDPR compliance
      return new Response(JSON.stringify({
        customer: {
          id: customer.id,
          email: customer.email,
        },
        data: []
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // Find all data associated with this customer
    const customerData = await prisma.collectedEmail.findMany({
      where: {
        shopId: shop.id,
        email: customer.email
      },
      include: {
        customerSession: {
          include: {
            popup: {
              select: {
                name: true,
                popupType: true
              }
            }
          }
        }
      }
    });

    // Format the data for GDPR compliance response
    const formattedData = customerData.map(record => ({
      id: record.id,
      email: record.email,
      source: record.source,
      created_at: record.createdAt.toISOString(),
      popup_name: record.customerSession?.popup?.name || "Unknown",
      popup_type: record.customerSession?.popup?.popupType || "Unknown",
      quiz_responses: record.quizResponses || null,
      discount_used: record.discountUsed || null
    }));

    console.log(`Found ${formattedData.length} records for customer ${customer.email}`);

    // Return the customer data in the required format
    return new Response(JSON.stringify({
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone || null
      },
      data: formattedData
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error processing customers/data_request webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};