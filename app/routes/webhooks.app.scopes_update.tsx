import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { validateWebhookHmacOrReject } from "../utils/webhook-verification";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    console.log("🔄 Received app/scopes_update webhook");

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

        const { payload, session, topic, shop } = await authenticate.webhook(verifiedRequest);
        console.log(`Received ${topic} webhook for ${shop}`);

        const current = payload.current as string[];
        if (session) {
            await db.session.update({   
                where: {
                    id: session.id
                },
                data: {
                    scope: current.toString(),
                },
            });
            console.log(`Updated scopes for session ${session.id}: ${current.toString()}`);
        }

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("Error processing app/scopes_update webhook:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
};
