import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { generatePopupCSS, generateCSSETag } from "../utils/css-generator";

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const { popupId } = params;
    
    if (!popupId) {
      return new Response("Popup ID is required", { status: 400 });
    }

    // Get PopupDesign from database
    const popupDesign = await prisma.popupDesign.findUnique({
      where: { popupId: popupId }
    });

    if (!popupDesign) {
      return new Response("Popup design not found", { status: 404 });
    }

    // Generate ETag for caching
    const etag = generateCSSETag(popupDesign);
    
    // Check if client has cached version
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch === etag) {
      return new Response(null, { 
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // Generate CSS
    const css = generatePopupCSS(popupDesign);

    return new Response(css, {
      status: 200,
      headers: {
        'Content-Type': 'text/css',
        'ETag': etag,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Vary': 'Accept-Encoding'
      }
    });

  } catch (error) {
    console.error('Error generating popup CSS:', error);
    
    // Return minimal fallback CSS
    const fallbackCSS = `/* Papa Popup - Error generating custom styles */
#papa-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

#papa-popup-modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}`;

    return new Response(fallbackCSS, {
      status: 200,
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'no-cache'
      }
    });
  }
}