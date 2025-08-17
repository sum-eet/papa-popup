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
import { useState } from "react";

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
            <Banner status="critical">{actionData.error}</Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner status="success">{actionData.message}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 8, xl: 8}}>
              <Card>
                <BlockStack gap="500">
                  <Text variant="headingMd" as="h2">Design Settings</Text>
                  
                  <Form method="post">
                    <input type="hidden" name="intent" value="save" />
                    <FormLayout>
                      <FormLayout.Group>
                        <div>
                          <Text variant="bodyMd" as="p">Primary Color</Text>
                          <div style={{ marginTop: '8px' }}>
                            <ColorPicker
                              color={{
                                hue: 200,
                                brightness: 1,
                                saturation: 0.7,
                              }}
                              onChange={() => {}}
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
                          <TextField
                            value={designValues.backgroundColor}
                            onChange={(value) => handleValueChange('backgroundColor', value)}
                            name="backgroundColor"
                            placeholder="#ffffff"
                            autoComplete="off"
                            label=""
                          />
                        </div>
                      </FormLayout.Group>

                      <FormLayout.Group>
                        <TextField
                          value={designValues.textColor}
                          onChange={(value) => handleValueChange('textColor', value)}
                          name="textColor"
                          label="Text Color"
                          placeholder="#333333"
                          autoComplete="off"
                        />

                        <TextField
                          value={designValues.borderColor}
                          onChange={(value) => handleValueChange('borderColor', value)}
                          name="borderColor"
                          label="Border Color"
                          placeholder="#e9ecef"
                          autoComplete="off"
                        />
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
                        >
                          Save Design
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
                        >
                          Apply Theme Colors
                        </Button>
                      </fetcher.Form>
                    </BlockStack>
                  </Card>
                )}

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">Live Preview</Text>
                    
                    <Text variant="bodyMd" as="p">
                      Test your popup design on your live store.
                    </Text>

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
                        💡 Tip: Changes are applied automatically when you save. 
                        Visit your store to see the updated popup design.
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