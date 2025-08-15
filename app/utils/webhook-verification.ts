import crypto from "crypto";

/**
 * Verifies the HMAC signature of a Shopify webhook request
 * @param request - The incoming request object
 * @param secret - The webhook secret (usually SHOPIFY_API_SECRET)
 * @returns Promise<{ isValid: boolean, body: string }>
 */
export async function verifyWebhookHmac(
  request: Request, 
  secret: string
): Promise<{ isValid: boolean; body: string }> {
  try {
    // Get the HMAC signature from headers
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
    
    if (!hmacHeader) {
      console.warn("Missing X-Shopify-Hmac-Sha256 header");
      return { isValid: false, body: "" };
    }

    // Get the raw body as text
    const body = await request.text();
    
    if (!body) {
      console.warn("Empty request body");
      return { isValid: false, body: "" };
    }

    // Create HMAC digest from the raw body
    const calculatedHmac = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    // Use timing-safe comparison to prevent timing attacks
    const hmacBuffer = Buffer.from(hmacHeader, "base64");
    const calculatedBuffer = Buffer.from(calculatedHmac, "base64");
    
    if (hmacBuffer.length !== calculatedBuffer.length) {
      console.warn("HMAC length mismatch");
      return { isValid: false, body };
    }

    const isValid = crypto.timingSafeEqual(hmacBuffer, calculatedBuffer);
    
    if (!isValid) {
      console.warn("HMAC verification failed");
      console.warn("Expected:", calculatedHmac);
      console.warn("Received:", hmacHeader);
    }

    return { isValid, body };

  } catch (error) {
    console.error("Error verifying webhook HMAC:", error);
    return { isValid: false, body: "" };
  }
}

/**
 * Middleware to verify HMAC and return 401 if invalid
 * @param request - The incoming request
 * @param secret - The webhook secret
 * @returns Response with 401 if invalid, or null if valid
 */
export async function validateWebhookHmacOrReject(
  request: Request,
  secret: string
): Promise<{ response: Response | null; body: string }> {
  const { isValid, body } = await verifyWebhookHmac(request, secret);
  
  if (!isValid) {
    console.log("🔒 Webhook HMAC verification failed - returning 401");
    return {
      response: new Response("Unauthorized", { 
        status: 401,
        statusText: "Unauthorized - Invalid HMAC signature"
      }),
      body: ""
    };
  }
  
  console.log("✅ Webhook HMAC verification successful");
  return { response: null, body };
}