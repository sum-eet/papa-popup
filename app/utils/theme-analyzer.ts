/**
 * Utility functions for analyzing Shopify themes and extracting design tokens
 */

interface ThemeFile {
  filename: string;
  content: string;
  contentType: string;
}

interface DesignTokens {
  colors: {
    primary?: string;
    accent?: string;
    background?: string;
    text?: string;
    border?: string;
  };
  typography: {
    headingFont?: string;
    bodyFont?: string;
    baseFontSize?: string;
  };
  layout: {
    borderRadius?: string;
    spacing?: string;
  };
}

/**
 * Get the published theme for a shop
 */
export async function getPublishedTheme(admin: any): Promise<any> {
  const themesQuery = `
    query getThemes {
      themes(first: 10) {
        nodes {
          id
          name
          role
          themeStoreId
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(themesQuery);
    const result = await response.json();
    
    if (result.data?.themes?.nodes) {
      // Find the published theme (role: "MAIN")
      const publishedTheme = result.data.themes.nodes.find(
        (theme: any) => theme.role === 'MAIN'
      );
      
      if (publishedTheme) {
        return publishedTheme;
      }
      
      // Fallback to first theme if no published theme found
      return result.data.themes.nodes[0];
    }
    
    throw new Error('No themes found');
  } catch (error) {
    console.error('Error fetching published theme:', error);
    throw error;
  }
}

/**
 * Get theme assets (CSS files) from a theme
 */
export async function getThemeAssets(admin: any, themeId: string): Promise<ThemeFile[]> {
  const filesQuery = `
    query getThemeFiles($themeId: ID!) {
      theme(id: $themeId) {
        files(first: 50) {
          nodes {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
            contentType
          }
        }
      }
    }
  `;

  try {
    const response = await admin.graphql(filesQuery, {
      variables: { themeId }
    });
    
    const result = await response.json();
    
    if (result.data?.theme?.files?.nodes) {
      // Filter for CSS files and convert to our format
      const cssFiles = result.data.theme.files.nodes
        .filter((file: any) => 
          file.contentType === 'text/css' || 
          file.filename.endsWith('.css') ||
          file.filename.endsWith('.scss') ||
          file.filename.endsWith('.liquid')
        )
        .map((file: any) => ({
          filename: file.filename,
          content: file.body?.content || '',
          contentType: file.contentType
        }))
        .filter((file: ThemeFile) => file.content.length > 0);

      console.log(`Found ${cssFiles.length} CSS/Liquid files in theme`);
      return cssFiles;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching theme assets:', error);
    throw error;
  }
}

/**
 * Parse CSS variables and design tokens from CSS content
 */
export function parseCSSVariables(cssFiles: ThemeFile[]): DesignTokens {
  const tokens: DesignTokens = {
    colors: {},
    typography: {},
    layout: {}
  };

  const allCSS = cssFiles.map(file => file.content).join('\n');

  // Extract CSS custom properties (variables)
  const cssVarRegex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
  let match;
  
  const cssVariables: Record<string, string> = {};
  while ((match = cssVarRegex.exec(allCSS)) !== null) {
    const [, name, value] = match;
    cssVariables[name] = value.trim();
  }

  console.log('Found CSS variables:', Object.keys(cssVariables).length);

  // Extract color tokens
  tokens.colors = {
    primary: extractColor(cssVariables, ['color-primary', 'color-accent', 'accent-color', 'primary-color']),
    accent: extractColor(cssVariables, ['color-accent', 'color-secondary', 'accent']),
    background: extractColor(cssVariables, ['color-background', 'bg-color', 'background', 'color-body']),
    text: extractColor(cssVariables, ['color-text', 'text-color', 'color-foreground', 'color-body-text']),
    border: extractColor(cssVariables, ['color-border', 'border-color', 'color-line'])
  };

  // Extract typography
  tokens.typography = {
    headingFont: extractFont(cssVariables, ['font-heading', 'font-family-heading', 'heading-font']),
    bodyFont: extractFont(cssVariables, ['font-body', 'font-family-body', 'body-font', 'font-primary']),
    baseFontSize: extractSize(cssVariables, ['font-size', 'font-size-base', 'text-size'])
  };

  // Extract layout tokens
  tokens.layout = {
    borderRadius: extractSize(cssVariables, ['border-radius', 'radius', 'border-radius-base']),
    spacing: extractSize(cssVariables, ['spacing', 'spacing-base', 'space'])
  };

  // If no CSS variables found, try to extract from regular CSS rules
  if (Object.keys(cssVariables).length === 0) {
    tokens.colors = extractColorsFromCSS(allCSS);
    tokens.typography = extractTypographyFromCSS(allCSS);
  }

  return tokens;
}

/**
 * Extract color value from CSS variables with fallback names
 */
function extractColor(variables: Record<string, string>, names: string[]): string | undefined {
  for (const name of names) {
    if (variables[name]) {
      const value = variables[name];
      // Clean up the value (remove quotes, spaces, etc.)
      const cleaned = value.replace(/['"]/g, '').trim();
      if (isValidColor(cleaned)) {
        return cleaned;
      }
    }
  }
  return undefined;
}

/**
 * Extract font family from CSS variables
 */
function extractFont(variables: Record<string, string>, names: string[]): string | undefined {
  for (const name of names) {
    if (variables[name]) {
      return variables[name].replace(/['"]/g, '').trim();
    }
  }
  return undefined;
}

/**
 * Extract size value from CSS variables
 */
function extractSize(variables: Record<string, string>, names: string[]): string | undefined {
  for (const name of names) {
    if (variables[name]) {
      const value = variables[name].trim();
      if (value.match(/^\d+(px|rem|em|%)$/)) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Check if a string is a valid CSS color
 */
function isValidColor(color: string): boolean {
  return !!(color.match(/^#[0-9a-fA-F]{3,6}$/) || 
           color.match(/^rgb\(/) || 
           color.match(/^rgba\(/) || 
           color.match(/^hsl\(/) || 
           color.match(/^hsla\(/));
}

/**
 * Fallback: Extract colors from regular CSS rules
 */
function extractColorsFromCSS(css: string): DesignTokens['colors'] {
  const colors: DesignTokens['colors'] = {};
  
  // Look for common color patterns in CSS
  const colorRegex = /(background-color|color|border-color):\s*([^;]+);/g;
  let match;
  const colorCounts: Record<string, number> = {};
  
  while ((match = colorRegex.exec(css)) !== null) {
    const [, property, value] = match;
    const color = value.trim();
    if (isValidColor(color)) {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }
  
  // Get most commonly used colors
  const sortedColors = Object.entries(colorCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([color]) => color);
    
  if (sortedColors.length > 0) {
    colors.primary = sortedColors[0];
    if (sortedColors.length > 1) colors.accent = sortedColors[1];
    if (sortedColors.length > 2) colors.text = sortedColors[2];
  }
  
  return colors;
}

/**
 * Fallback: Extract typography from regular CSS rules
 */
function extractTypographyFromCSS(css: string): DesignTokens['typography'] {
  const typography: DesignTokens['typography'] = {};
  
  // Look for font-family declarations
  const fontRegex = /font-family:\s*([^;]+);/g;
  let match;
  const fontCounts: Record<string, number> = {};
  
  while ((match = fontRegex.exec(css)) !== null) {
    const font = match[1].trim();
    fontCounts[font] = (fontCounts[font] || 0) + 1;
  }
  
  const sortedFonts = Object.entries(fontCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([font]) => font);
    
  if (sortedFonts.length > 0) {
    typography.bodyFont = sortedFonts[0];
    if (sortedFonts.length > 1) typography.headingFont = sortedFonts[1];
  }
  
  return typography;
}

/**
 * Generate default design tokens when theme analysis fails
 */
export function getDefaultDesignTokens(): DesignTokens {
  return {
    colors: {
      primary: '#007cba',
      background: '#ffffff',
      text: '#333333',
      border: '#e9ecef'
    },
    typography: {
      bodyFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      baseFontSize: '16px'
    },
    layout: {
      borderRadius: '12px',
      spacing: '16px'
    }
  };
}