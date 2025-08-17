import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { generatePopupCSS, generateCSSETag } from "../utils/css-generator";

// Generate fallback CSS when PopupDesign table is not available
function generateFallbackCSS() {
  const defaultCSS = `/* Papa Popup - Default Styles (Migration Pending) */
:root {
  --papa-popup-primary: #007cba;
  --papa-popup-background: #ffffff;
  --papa-popup-text: #333333;
  --papa-popup-border: #e9ecef;
  --papa-popup-overlay: rgba(0, 0, 0, 0.5);
  --papa-popup-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --papa-popup-heading-size: 24px;
  --papa-popup-body-size: 16px;
  --papa-popup-button-size: 16px;
  --papa-popup-font-weight: 400;
  --papa-popup-radius: 12px;
  --papa-popup-padding: 40px;
  --papa-popup-max-width: 500px;
  --papa-popup-spacing: 16px;
}

/* Popup Overlay */
#papa-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--papa-popup-overlay);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: papaPopupFadeIn 0.3s ease-out;
}

/* Main Popup Modal */
#papa-popup-modal {
  background: var(--papa-popup-background);
  color: var(--papa-popup-text);
  padding: var(--papa-popup-padding);
  border-radius: var(--papa-popup-radius);
  max-width: var(--papa-popup-max-width);
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: papaPopupSlideIn 0.3s ease-out;
  font-family: var(--papa-popup-font);
  font-size: var(--papa-popup-body-size);
  line-height: 1.5;
}

/* Close Button */
#papa-popup-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--papa-popup-text);
  opacity: 0.7;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

#papa-popup-close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.1);
}

/* Typography */
.papa-popup-heading,
.papa-popup-modal h1,
.papa-popup-modal h2,
.papa-popup-modal h3 {
  font-family: var(--papa-popup-font);
  font-size: var(--papa-popup-heading-size);
  font-weight: var(--papa-popup-font-weight);
  color: var(--papa-popup-text);
  margin: 0 0 var(--papa-popup-spacing) 0;
  line-height: 1.3;
}

.papa-popup-text,
.papa-popup-modal p {
  font-family: var(--papa-popup-font);
  font-size: var(--papa-popup-body-size);
  color: var(--papa-popup-text);
  margin: 0 0 var(--papa-popup-spacing) 0;
  line-height: 1.5;
}

/* Form Elements */
.papa-popup-input {
  padding: 12px;
  border: 2px solid var(--papa-popup-border);
  border-radius: calc(var(--papa-popup-radius) * 0.5);
  font-size: var(--papa-popup-body-size);
  font-family: var(--papa-popup-font);
  color: var(--papa-popup-text);
  background: var(--papa-popup-background);
  outline: none;
  transition: border-color 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  margin: 8px 0;
}

.papa-popup-input:focus {
  border-color: var(--papa-popup-primary);
  box-shadow: 0 0 0 3px rgba(0, 124, 186, 0.1);
}

/* Buttons */
.papa-popup-button {
  background: var(--papa-popup-primary);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: calc(var(--papa-popup-radius) * 0.5);
  font-size: var(--papa-popup-button-size);
  font-weight: 600;
  cursor: pointer;
  font-family: var(--papa-popup-font);
  transition: all 0.2s ease;
  margin: 5px;
  min-width: 120px;
  display: inline-block;
}

.papa-popup-button:hover {
  background: var(--papa-popup-primary);
  filter: brightness(0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Animations */
@keyframes papaPopupFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes papaPopupSlideIn {
  from { 
    transform: translateY(-50px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}

/* Responsive Design */
@media (max-width: 480px) {
  #papa-popup-modal {
    padding: calc(var(--papa-popup-padding) * 0.7);
    margin: 20px;
    width: calc(100% - 40px);
  }
}`;

  return new Response(defaultCSS, {
    status: 200,
    headers: {
      'Content-Type': 'text/css',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes only (shorter for fallback)
      'X-Fallback-CSS': 'true'
    }
  });
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const { popupId } = params;
    
    if (!popupId) {
      return new Response("Popup ID is required", { status: 400 });
    }

    // Get PopupDesign from database with error handling
    let popupDesign;
    try {
      popupDesign = await prisma.popupDesign.findUnique({
        where: { popupId: popupId }
      });
    } catch (dbError) {
      console.warn('PopupDesign table not accessible:', dbError);
      // Return default CSS if table doesn't exist
      return generateFallbackCSS();
    }

    if (!popupDesign) {
      // Return default CSS if no design record exists
      return generateFallbackCSS();
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