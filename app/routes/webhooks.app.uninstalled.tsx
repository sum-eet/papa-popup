import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { validateWebhookHmacOrReject } from "../utils/webhook-verification";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("📤 Received app/uninstalled webhook");

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
    // Create a new request with the verified body for authenticate.webhook
    const verifiedRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: body
    });

    const { shop, session, topic } = await authenticate.webhook(verifiedRequest);

    console.log(`Received ${topic} webhook for ${shop}`);

    // Webhook requests can trigger multiple times and after an app has already been uninstalled.
    // If this webhook already ran, the session may have been deleted previously.
    if (session) {
      await db.session.deleteMany({ where: { shop } });
      console.log(`Deleted sessions for shop: ${shop}`);
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Error processing app/uninstalled webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
