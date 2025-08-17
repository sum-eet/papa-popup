import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getPublishedTheme, getThemeAssets, parseCSSVariables, getDefaultDesignTokens } from "../utils/theme-analyzer";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);

    console.log('🎨 Starting theme analysis...');

    // Get the published theme
    const theme = await getPublishedTheme(admin);
    console.log(`📄 Found published theme: ${theme.name} (ID: ${theme.id})`);

    // Get theme assets (CSS files)
    const cssFiles = await getThemeAssets(admin, theme.id);
    console.log(`📁 Retrieved ${cssFiles.length} CSS/Liquid files`);

    // Parse design tokens from CSS
    let designTokens;
    try {
      designTokens = parseCSSVariables(cssFiles);
      console.log('✅ Successfully extracted design tokens from theme');
    } catch (parseError) {
      console.warn('⚠️ Failed to parse theme CSS, using defaults:', parseError);
      designTokens = getDefaultDesignTokens();
    }

    // Enhance tokens with fallbacks
    const enhancedTokens = {
      ...designTokens,
      colors: {
        primary: designTokens.colors.primary || '#007cba',
        accent: designTokens.colors.accent || designTokens.colors.primary || '#007cba',
        background: designTokens.colors.background || '#ffffff',
        text: designTokens.colors.text || '#333333',
        border: designTokens.colors.border || '#e9ecef'
      },
      typography: {
        headingFont: designTokens.typography.headingFont || designTokens.typography.bodyFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        bodyFont: designTokens.typography.bodyFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        baseFontSize: designTokens.typography.baseFontSize || '16px'
      },
      layout: {
        borderRadius: designTokens.layout.borderRadius || '12px',
        spacing: designTokens.layout.spacing || '16px'
      },
      meta: {
        themeId: theme.id,
        themeName: theme.name,
        analyzed: true,
        analyzedAt: new Date().toISOString()
      }
    };

    console.log('🎯 Theme analysis completed:', {
      theme: theme.name,
      colorsFound: Object.keys(enhancedTokens.colors).length,
      typographyFound: Object.keys(enhancedTokens.typography).length,
      layoutFound: Object.keys(enhancedTokens.layout).length
    });

    return new Response(JSON.stringify({
      success: true,
      designTokens: enhancedTokens,
      theme: {
        id: theme.id,
        name: theme.name
      },
      filesAnalyzed: cssFiles.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('❌ Theme analysis failed:', error);

    // Return default tokens when analysis fails
    const defaultTokens = getDefaultDesignTokens();
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Theme analysis failed',
      designTokens: {
        ...defaultTokens,
        meta: {
          analyzed: false,
          error: true,
          analyzedAt: new Date().toISOString()
        }
      }
    }), {
      status: 200, // Still return 200 with default tokens
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  // POST requests trigger a fresh analysis (bypass cache)
  return loader({ request } as LoaderFunctionArgs);
}