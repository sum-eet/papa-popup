import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, Form, useNavigation, useFetcher } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  Spinner,
  ColorPicker,
  Grid,
  InlineStack,
  Text,
  Divider,
  BlockStack
} from "@shopify/polaris";
import { useState, useEffect } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    throw new Response("Popup ID is required", { status: 400 });
  }

  try {
    // Get popup with correct relational query structure
    const popup = await prisma.popup.findFirst({
      where: {
        id: id,
        shop: { domain: session.shop },
        isDeleted: false
      },
      include: {
        design: true
      }
    });

    if (!popup) {
      throw new Response("Popup not found", { status: 404 });
    }

    // Get theme analysis for suggestions
    let themeAnalysis = null;
    try {
      const themeResponse = await fetch(`${process.env.SHOPIFY_APP_URL}/api/theme/analyze`, {
        headers: {
          'X-Shopify-Shop-Domain': session.shop,
          'X-Shopify-Access-Token': session.accessToken,
        }
      });
      if (themeResponse.ok) {
        themeAnalysis = await themeResponse.json();
      }
    } catch (error) {
      console.warn('Failed to fetch theme analysis:', error);
    }

    return json({
      popup,
      design: popup.design,
      themeAnalysis
    });

  } catch (error) {
    console.error('Error in design loader:', error);
    throw new Response("Failed to load popup data", { status: 500 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return json({ error: "Popup ID is required" }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    try {
      const designData = {
        primaryColor: formData.get("primaryColor") as string,
        backgroundColor: formData.get("backgroundColor") as string,
        textColor: formData.get("textColor") as string,
        borderColor: formData.get("borderColor") as string,
        overlayColor: formData.get("overlayColor") as string,
        fontFamily: formData.get("fontFamily") as string,
        headingFontSize: formData.get("headingFontSize") as string,
        bodyFontSize: formData.get("bodyFontSize") as string,
        buttonFontSize: formData.get("buttonFontSize") as string,
        fontWeight: formData.get("fontWeight") as string,
        borderRadius: formData.get("borderRadius") as string,
        padding: formData.get("padding") as string,
        maxWidth: formData.get("maxWidth") as string,
        spacing: formData.get("spacing") as string,
        customCSS: formData.get("customCSS") as string || null,
      };

      // Update or create design
      await prisma.popupDesign.upsert({
        where: { popupId: id },
        update: {
          ...designData,
          updatedAt: new Date()
        },
        create: {
          popupId: id,
          ...designData
        }
      });

      return json({ success: true, message: "Design saved successfully!" });
    } catch (error) {
      console.error("Error saving design:", error);
      return json({ error: "Failed to save design. Please try again." }, { status: 500 });
    }
  }

  if (intent === "apply-theme") {
    const themeColors = JSON.parse(formData.get("themeColors") as string);
    
    try {
      await prisma.popupDesign.upsert({
        where: { popupId: id },
        update: {
          primaryColor: themeColors.primary || "#007cba",
          backgroundColor: themeColors.background || "#ffffff",
          textColor: themeColors.text || "#333333",
          borderColor: themeColors.border || "#e9ecef",
          fontFamily: themeColors.bodyFont || "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
          updatedAt: new Date()
        },
        create: {
          popupId: id,
          primaryColor: themeColors.primary || "#007cba",
          backgroundColor: themeColors.background || "#ffffff",
          textColor: themeColors.text || "#333333",
          borderColor: themeColors.border || "#e9ecef",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          fontFamily: themeColors.bodyFont || "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
          headingFontSize: "24px",
          bodyFontSize: "16px",
          buttonFontSize: "16px",
          fontWeight: "400",
          borderRadius: "12px",
          padding: "40px",
          maxWidth: "500px",
          spacing: "16px"
        }
      });

      return json({ success: true, message: "Theme colors applied successfully!" });
    } catch (error) {
      console.error("Error applying theme:", error);
      return json({ error: "Failed to apply theme colors. Please try again." }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function PopupDesign() {
  const { popup, design, themeAnalysis } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const isLoading = navigation.state === "submitting" || fetcher.state === "submitting";

  // State for design values
  const [designValues, setDesignValues] = useState({
    primaryColor: design?.primaryColor || "#007cba",
    backgroundColor: design?.backgroundColor || "#ffffff",
    textColor: design?.textColor || "#333333",
    borderColor: design?.borderColor || "#e9ecef",
    overlayColor: design?.overlayColor || "rgba(0, 0, 0, 0.5)",
    fontFamily: design?.fontFamily || "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
    headingFontSize: design?.headingFontSize || "24px",
    bodyFontSize: design?.bodyFontSize || "16px",
    buttonFontSize: design?.buttonFontSize || "16px",
    fontWeight: design?.fontWeight || "400",
    borderRadius: design?.borderRadius || "12px",
    padding: design?.padding || "40px",
    maxWidth: design?.maxWidth || "500px",
    spacing: design?.spacing || "16px",
    customCSS: design?.customCSS || "",
  });

  const handleValueChange = (field: string, value: string) => {
    setDesignValues(prev => ({ ...prev, [field]: value }));
  };

  // Color conversion utilities
  const hexToHsb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let hue = 0;
    if (delta !== 0) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
    }
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    
    const saturation = max === 0 ? 0 : delta / max;
    const brightness = max;
    
    return {
      hue: hue / 360,
      saturation,
      brightness
    };
  };

  const hsbToHex = (h: number, s: number, b: number) => {
    const hue = h * 360;
    const c = b * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = b - c;
    
    let r = 0, g = 0, bl = 0;
    if (hue >= 0 && hue < 60) {
      r = c; g = x; bl = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x; g = c; bl = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0; g = c; bl = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0; g = x; bl = c;
    } else if (hue >= 240 && hue < 300) {
      r = x; g = 0; bl = c;
    } else if (hue >= 300 && hue < 360) {
      r = c; g = 0; bl = x;
    }
    
    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((bl + m) * 255);
    
    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  };

  const handleColorPickerChange = (color: any, field: string) => {
    const hex = hsbToHex(color.hue, color.saturation, color.brightness);
    setDesignValues(prev => ({ ...prev, [field]: hex }));
  };

  // Auto-hide success message
  useEffect(() => {
    if (actionData?.success) {
      const timer = setTimeout(() => {
        // This will be handled by the next form submission clearing actionData
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData?.success]);

  // Design presets
  const presets = {
    default: {
      primaryColor: "#007cba",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      borderColor: "#e9ecef",
      overlayColor: "rgba(0, 0, 0, 0.5)"
    },
    minimal: {
      primaryColor: "#000000",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      borderColor: "#000000",
      overlayColor: "rgba(0, 0, 0, 0.7)"
    },
    bold: {
      primaryColor: "#ff4444",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      borderColor: "#ff4444",
      overlayColor: "rgba(255, 68, 68, 0.1)"
    },
    elegant: {
      primaryColor: "#8b4513",
      backgroundColor: "#fdf6e3",
      textColor: "#5d4037",
      borderColor: "#d7ccc8",
      overlayColor: "rgba(93, 64, 55, 0.2)"
    }
  };

  const applyPreset = (presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    setDesignValues(prev => ({
      ...prev,
      ...preset
    }));
  };

  const resetToDefaults = () => {
    setDesignValues({
      primaryColor: "#007cba",
      backgroundColor: "#ffffff",
      textColor: "#333333",
      borderColor: "#e9ecef",
      overlayColor: "rgba(0, 0, 0, 0.5)",
      fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
      headingFontSize: "24px",
      bodyFontSize: "16px",
      buttonFontSize: "16px",
      fontWeight: "400",
      borderRadius: "12px",
      padding: "40px",
      maxWidth: "500px",
      spacing: "16px",
      customCSS: "",
    });
  };

  const fontOptions = [
    { label: "System Font", value: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Times New Roman", value: "\"Times New Roman\", serif" },
    { label: "Courier New", value: "\"Courier New\", monospace" },
  ];

  const fontWeightOptions = [
    { label: "Light (300)", value: "300" },
    { label: "Normal (400)", value: "400" },
    { label: "Medium (500)", value: "500" },
    { label: "Semi Bold (600)", value: "600" },
    { label: "Bold (700)", value: "700" },
  ];

  return (
    <Page
      title={`Design Customization - ${popup.title}`}
      backAction={{
        content: "Back to popup",
        url: `/app/popups/${popup.id}`
      }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical">{actionData.error}</Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success" action={{
              content: 'Dismiss',
              onAction: () => window.location.reload()
            }}>
              {actionData.message} Your popup design has been updated and is now live!
            </Banner>
          </Layout.Section>
        )}

        {isLoading && (
          <Layout.Section>
            <Banner tone="info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Spinner size="small" />
                Saving your design changes...
              </div>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 8, xl: 8}}>
              <Card>
                <BlockStack gap="500">
                  <Text variant="headingMd" as="h2">Design Settings</Text>
                  
                  {/* Quick Actions */}
                  <Card subdued>
                    <BlockStack gap="300">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">Quick Actions</Text>
                      <InlineStack gap="200">
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={() => applyPreset('default')}
                        >
                          Default
                        </Button>
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={() => applyPreset('minimal')}
                        >
                          Minimal
                        </Button>
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={() => applyPreset('bold')}
                        >
                          Bold
                        </Button>
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={() => applyPreset('elegant')}
                        >
                          Elegant
                        </Button>
                        <Button
                          variant="secondary"
                          size="slim"
                          onClick={resetToDefaults}
                          tone="critical"
                        >
                          Reset All
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                  
                  <Form method="post">
                    <input type="hidden" name="intent" value="save" />
                    <FormLayout>
                      <FormLayout.Group>
                        <div>
                          <Text variant="bodyMd" as="p">Primary Color</Text>
                          <div style={{ marginTop: '8px' }}>
                            <ColorPicker
                              color={hexToHsb(designValues.primaryColor)}
                              onChange={(color) => handleColorPickerChange(color, 'primaryColor')}
                            />
                          </div>
                          <input 
                            type="hidden" 
                            name="primaryColor" 
                            value={designValues.primaryColor}
                          />
                          <TextField
                            value={designValues.primaryColor}
                            onChange={(value) => handleValueChange('primaryColor', value)}
                            placeholder="#007cba"
                            autoComplete="off"
                            label=""
                          />
                        </div>

                        <div>
                          <Text variant="bodyMd" as="p">Background Color</Text>
                          <div style={{ marginTop: '8px' }}>
                            <ColorPicker
                              color={hexToHsb(designValues.backgroundColor)}
                              onChange={(color) => handleColorPickerChange(color, 'backgroundColor')}
                            />
                          </div>
                          <input 
                            type="hidden" 
                            name="backgroundColor" 
                            value={designValues.backgroundColor}
                          />
                          <TextField
                            value={designValues.backgroundColor}
                            onChange={(value) => handleValueChange('backgroundColor', value)}
                            placeholder="#ffffff"
                            autoComplete="off"
                            label=""
                          />
                        </div>
                      </FormLayout.Group>

                      <FormLayout.Group>
                        <div>
                          <Text variant="bodyMd" as="p">Text Color</Text>
                          <div style={{ marginTop: '8px' }}>
                            <ColorPicker
                              color={hexToHsb(designValues.textColor)}
                              onChange={(color) => handleColorPickerChange(color, 'textColor')}
                            />
                          </div>
                          <input 
                            type="hidden" 
                            name="textColor" 
                            value={designValues.textColor}
                          />
                          <TextField
                            value={designValues.textColor}
                            onChange={(value) => handleValueChange('textColor', value)}
                            placeholder="#333333"
                            autoComplete="off"
                            label=""
                          />
                        </div>

                        <div>
                          <Text variant="bodyMd" as="p">Border Color</Text>
                          <div style={{ marginTop: '8px' }}>
                            <ColorPicker
                              color={hexToHsb(designValues.borderColor)}
                              onChange={(color) => handleColorPickerChange(color, 'borderColor')}
                            />
                          </div>
                          <input 
                            type="hidden" 
                            name="borderColor" 
                            value={designValues.borderColor}
                          />
                          <TextField
                            value={designValues.borderColor}
                            onChange={(value) => handleValueChange('borderColor', value)}
                            placeholder="#e9ecef"
                            autoComplete="off"
                            label=""
                          />
                        </div>
                      </FormLayout.Group>

                      <TextField
                        value={designValues.overlayColor}
                        onChange={(value) => handleValueChange('overlayColor', value)}
                        name="overlayColor"
                        label="Overlay Color"
                        placeholder="rgba(0, 0, 0, 0.5)"
                        helpText="Background overlay color (supports rgba, hex, etc.)"
                        autoComplete="off"
                      />

                      <Divider />

                      <Text variant="headingMd" as="h3">Typography</Text>

                      <Select
                        label="Font Family"
                        name="fontFamily"
                        options={fontOptions}
                        value={designValues.fontFamily}
                        onChange={(value) => handleValueChange('fontFamily', value)}
                      />

                      <FormLayout.Group>
                        <TextField
                          value={designValues.headingFontSize}
                          onChange={(value) => handleValueChange('headingFontSize', value)}
                          name="headingFontSize"
                          label="Heading Font Size"
                          placeholder="24px"
                          autoComplete="off"
                        />

                        <TextField
                          value={designValues.bodyFontSize}
                          onChange={(value) => handleValueChange('bodyFontSize', value)}
                          name="bodyFontSize"
                          label="Body Font Size"
                          placeholder="16px"
                          autoComplete="off"
                        />
                      </FormLayout.Group>

                      <FormLayout.Group>
                        <TextField
                          value={designValues.buttonFontSize}
                          onChange={(value) => handleValueChange('buttonFontSize', value)}
                          name="buttonFontSize"
                          label="Button Font Size"
                          placeholder="16px"
                          autoComplete="off"
                        />

                        <Select
                          label="Font Weight"
                          name="fontWeight"
                          options={fontWeightOptions}
                          value={designValues.fontWeight}
                          onChange={(value) => handleValueChange('fontWeight', value)}
                        />
                      </FormLayout.Group>

                      <Divider />

                      <Text variant="headingMd" as="h3">Layout</Text>

                      <FormLayout.Group>
                        <TextField
                          value={designValues.borderRadius}
                          onChange={(value) => handleValueChange('borderRadius', value)}
                          name="borderRadius"
                          label="Border Radius"
                          placeholder="12px"
                          autoComplete="off"
                        />

                        <TextField
                          value={designValues.padding}
                          onChange={(value) => handleValueChange('padding', value)}
                          name="padding"
                          label="Padding"
                          placeholder="40px"
                          autoComplete="off"
                        />
                      </FormLayout.Group>

                      <FormLayout.Group>
                        <TextField
                          value={designValues.maxWidth}
                          onChange={(value) => handleValueChange('maxWidth', value)}
                          name="maxWidth"
                          label="Max Width"
                          placeholder="500px"
                          autoComplete="off"
                        />

                        <TextField
                          value={designValues.spacing}
                          onChange={(value) => handleValueChange('spacing', value)}
                          name="spacing"
                          label="Element Spacing"
                          placeholder="16px"
                          autoComplete="off"
                        />
                      </FormLayout.Group>

                      <Divider />

                      <TextField
                        value={designValues.customCSS}
                        onChange={(value) => handleValueChange('customCSS', value)}
                        name="customCSS"
                        label="Custom CSS"
                        placeholder="/* Add custom CSS here */"
                        multiline={6}
                        helpText="Advanced: Add custom CSS to override default styles"
                        autoComplete="off"
                      />

                      <InlineStack gap="300">
                        <Button
                          variant="primary"
                          submit
                          loading={isLoading}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Saving...' : 'Save Design'}
                        </Button>

                        <Button
                          variant="secondary"
                          url={`/app/popups/${popup.id}`}
                        >
                          Cancel
                        </Button>
                      </InlineStack>
                    </FormLayout>
                  </Form>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 4, xl: 4}}>
              <BlockStack gap="500">
                {themeAnalysis?.success && themeAnalysis.designTokens && (
                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Theme Integration</Text>
                      
                      <Text variant="bodyMd" as="p">
                        We detected your theme colors. Apply them to match your store design.
                      </Text>

                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '8px',
                        padding: '12px',
                        backgroundColor: '#f6f6f7',
                        borderRadius: '8px'
                      }}>
                        {themeAnalysis.designTokens.colors.primary && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              backgroundColor: themeAnalysis.designTokens.colors.primary,
                              borderRadius: '3px',
                              border: '1px solid #ddd'
                            }} />
                            <Text variant="bodySm" as="span">Primary</Text>
                          </div>
                        )}
                        {themeAnalysis.designTokens.colors.background && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              backgroundColor: themeAnalysis.designTokens.colors.background,
                              borderRadius: '3px',
                              border: '1px solid #ddd'
                            }} />
                            <Text variant="bodySm" as="span">Background</Text>
                          </div>
                        )}
                        {themeAnalysis.designTokens.colors.text && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              backgroundColor: themeAnalysis.designTokens.colors.text,
                              borderRadius: '3px',
                              border: '1px solid #ddd'
                            }} />
                            <Text variant="bodySm" as="span">Text</Text>
                          </div>
                        )}
                        {themeAnalysis.designTokens.colors.border && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              backgroundColor: themeAnalysis.designTokens.colors.border,
                              borderRadius: '3px',
                              border: '1px solid #ddd'
                            }} />
                            <Text variant="bodySm" as="span">Border</Text>
                          </div>
                        )}
                      </div>

                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="apply-theme" />
                        <input 
                          type="hidden" 
                          name="themeColors" 
                          value={JSON.stringify(themeAnalysis.designTokens.colors)}
                        />
                        <Button
                          variant="secondary"
                          submit
                          fullWidth
                          loading={fetcher.state === "submitting"}
                          disabled={fetcher.state === "submitting"}
                        >
                          {fetcher.state === "submitting" ? 'Applying...' : 'Apply Theme Colors'}
                        </Button>
                      </fetcher.Form>
                    </BlockStack>
                  </Card>
                )}

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">Live Preview</Text>
                    
                    <div style={{
                      position: 'relative',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '8px',
                      padding: '20px',
                      minHeight: '200px',
                      overflow: 'hidden'
                    }}>
                      {/* Mini popup preview */}
                      <div style={{
                        position: 'relative',
                        backgroundColor: designValues.backgroundColor,
                        color: designValues.textColor,
                        padding: designValues.padding,
                        borderRadius: designValues.borderRadius,
                        maxWidth: '280px',
                        margin: '0 auto',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                        border: `2px solid ${designValues.borderColor}`,
                        fontFamily: designValues.fontFamily,
                        fontSize: '12px',
                        transform: 'scale(0.8)',
                        transformOrigin: 'center'
                      }}>
                        {/* Close button */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '20px',
                          height: '20px',
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          color: designValues.textColor
                        }}>
                          ×
                        </div>
                        
                        {/* Heading */}
                        <div style={{
                          fontSize: designValues.headingFontSize,
                          fontWeight: designValues.fontWeight,
                          marginBottom: designValues.spacing,
                          color: designValues.textColor
                        }}>
                          Get 10% Off!
                        </div>
                        
                        {/* Description */}
                        <div style={{
                          fontSize: designValues.bodyFontSize,
                          marginBottom: designValues.spacing,
                          color: designValues.textColor,
                          opacity: 0.8
                        }}>
                          Subscribe to our newsletter for exclusive deals
                        </div>
                        
                        {/* Input */}
                        <div style={{
                          padding: '8px 12px',
                          border: `1px solid ${designValues.borderColor}`,
                          borderRadius: `calc(${designValues.borderRadius} * 0.5)`,
                          marginBottom: designValues.spacing,
                          fontSize: designValues.bodyFontSize,
                          backgroundColor: 'rgba(255,255,255,0.9)'
                        }}>
                          your@email.com
                        </div>
                        
                        {/* Button */}
                        <div style={{
                          backgroundColor: designValues.primaryColor,
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: `calc(${designValues.borderRadius} * 0.5)`,
                          textAlign: 'center',
                          fontSize: designValues.buttonFontSize,
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}>
                          Subscribe
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      url={`/api/popup-styles/${popup.id}/css`}
                      external
                      fullWidth
                    >
                      View Generated CSS
                    </Button>

                    <div style={{ 
                      padding: '12px',
                      backgroundColor: '#f6f6f7',
                      borderRadius: '8px'
                    }}>
                      <Text variant="bodySm" as="p" color="subdued">
                        💡 Preview updates in real-time as you make changes. 
                        Save to apply to your live store.
                      </Text>
                    </div>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Grid.Cell>
          </Grid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}