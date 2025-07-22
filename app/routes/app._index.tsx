import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  FormLayout,
  Badge,
  DataTable,
  EmptyState,
  Checkbox,
  Banner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  // Get shop and popup config
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popupConfig: true,
      emails: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return { shop };
}

export async function action({ request }: ActionFunctionArgs) {
  console.log("🚀 Papa Popup: Action started");
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  console.log("📝 Form data received:", {
    enabled: formData.get("enabled"),
    headline: formData.get("headline"),
    description: formData.get("description"),
    buttonText: formData.get("buttonText"),
  });
  
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: { popupConfig: true }
  });

  if (!shop) {
    console.log("❌ Shop not found for domain:", session.shop);
    throw new Error("Shop not found");
  }

  console.log("🏪 Shop found:", { id: shop.id, domain: shop.domain });

  const isEnabled = formData.get("enabled") === "true";
  const existingConfig = shop.popupConfig;
  
  console.log("⚙️ Current config:", {
    isEnabled,
    existingEnabled: existingConfig?.enabled,
    existingScriptTagId: existingConfig?.scriptTagId,
    hasExistingConfig: !!existingConfig
  });
  
  try {
    let scriptTagId: string | null = null;

    // Always delete existing script tag first if it exists
    if (existingConfig?.scriptTagId) {
      console.log("🗑️ Deleting existing script tag first:", existingConfig.scriptTagId);
      try {
        const deleteResponse = await admin.graphql(`
          #graphql
          mutation scriptTagDelete($id: ID!) {
            scriptTagDelete(id: $id) {
              deletedScriptTagId
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: {
            id: `gid://shopify/ScriptTag/${existingConfig.scriptTagId}`
          }
        });

        const deleteResult = await deleteResponse.json();
        console.log("🗑️ Delete result:", JSON.stringify(deleteResult, null, 2));
        
        if (deleteResult.data?.scriptTagDelete?.deletedScriptTagId) {
          console.log("✅ Old script tag deleted successfully");
        } else {
          console.warn("⚠️ Could not delete old script tag, continuing anyway");
        }
      } catch (error) {
        console.warn("⚠️ Error deleting old script tag:", error);
      }
    }

    // Create new script tag if popup is enabled
    if (isEnabled) {
      console.log("🏗️ Creating new script tag...");
      // Create new script tag
      const scriptTagUrl = `${process.env.SHOPIFY_APP_URL}/popup-loader.js`;
      console.log("📜 Script tag URL:", scriptTagUrl);
      
      const scriptTagResponse = await admin.graphql(`
        #graphql
        mutation scriptTagCreate($input: ScriptTagInput!) {
          scriptTagCreate(input: $input) {
            scriptTag {
              id
              src
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          input: {
            src: scriptTagUrl,
            displayScope: "ONLINE_STORE"
          }
        }
      });

      const scriptTagResult = await scriptTagResponse.json();
      console.log("📋 Script tag API response:", JSON.stringify(scriptTagResult, null, 2));
      
      if (scriptTagResult.data?.scriptTagCreate?.scriptTag?.id) {
        scriptTagId = scriptTagResult.data.scriptTagCreate.scriptTag.id.replace('gid://shopify/ScriptTag/', '');
        console.log("✅ Script tag created successfully! ID:", scriptTagId);
      } else if (scriptTagResult.data?.scriptTagCreate?.userErrors?.length > 0) {
        const error = scriptTagResult.data.scriptTagCreate.userErrors[0];
        console.log("❌ Script tag creation failed:", error);
        throw new Error(`Script tag creation failed: ${error.message}`);
      } else {
        console.log("⚠️ Unexpected script tag response:", scriptTagResult);
        throw new Error("Script tag creation failed: Unexpected response");
      }
    }

    // Create or update popup config
    console.log("💾 Updating database with config:", {
      shopId: shop.id,
      enabled: isEnabled,
      headline: formData.get("headline"),
      description: formData.get("description"),
      buttonText: formData.get("buttonText"),
      scriptTagId: scriptTagId,
    });

    const updatedConfig = await prisma.popupConfig.upsert({
      where: { shopId: shop.id },
      create: {
        shopId: shop.id,
        enabled: isEnabled,
        headline: formData.get("headline") as string,
        description: formData.get("description") as string,
        buttonText: formData.get("buttonText") as string,
        scriptTagId: scriptTagId,
      },
      update: {
        enabled: isEnabled,
        headline: formData.get("headline") as string,
        description: formData.get("description") as string,
        buttonText: formData.get("buttonText") as string,
        scriptTagId: scriptTagId,
      }
    });

    console.log("✅ Database updated successfully:", {
      id: updatedConfig.id,
      enabled: updatedConfig.enabled,
      scriptTagId: updatedConfig.scriptTagId,
    });

    return { 
      success: true,
      config: {
        enabled: updatedConfig.enabled,
        scriptTagId: updatedConfig.scriptTagId,
      }
    };
  } catch (error) {
    console.error("❌ Papa Popup Action Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to manage script tag" 
    };
  }
}

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [enabled, setEnabled] = useState(shop?.popupConfig?.enabled || false);
  
  // Form state for editable fields
  const [headline, setHeadline] = useState(shop?.popupConfig?.headline || "Get 10% Off!");
  const [description, setDescription] = useState(shop?.popupConfig?.description || "Subscribe to our newsletter for exclusive deals");
  const [buttonText, setButtonText] = useState(shop?.popupConfig?.buttonText || "Subscribe");

  const emailRows = shop?.emails.map(email => [
    email.email,
    new Date(email.createdAt).toLocaleDateString()
  ]) || [];

  return (
    <Page title="Email Popup Dashboard">
      <Layout>
        {actionData && (
          <Layout.Section>
            {actionData.success ? (
              <Banner status="success">
                <p>✅ Popup configuration updated successfully!</p>
                {actionData.config?.enabled && actionData.config?.scriptTagId && (
                  <p>Script tag created with ID: {actionData.config.scriptTagId}</p>
                )}
              </Banner>
            ) : (
              <Banner status="critical">
                <p>❌ Error: {actionData.error}</p>
              </Banner>
            )}
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2>Create New Popup</h2>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {shop?.popupConfig?.scriptTagId ? `Current Script: ${shop.popupConfig.scriptTagId}` : 'No active script'}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '20px' }}>
              <Form method="post">
                <FormLayout>
                  <Checkbox
                    label="Enable Email Popup"
                    checked={enabled}
                    onChange={(checked) => setEnabled(checked)}
                    helpText="When enabled, the popup will appear on your storefront"
                  />
                  
                  <TextField
                    label="Popup Headline"
                    name="headline"
                    value={headline}
                    autoComplete="off"
                    helpText="This is the main headline visitors will see"
                    onChange={(value) => setHeadline(value)}
                  />
                  
                  <TextField
                    label="Description"
                    name="description"
                    value={description}
                    autoComplete="off"
                    multiline
                    helpText="Describe your offer or newsletter benefits"
                    onChange={(value) => setDescription(value)}
                  />
                  
                  <TextField
                    label="Button Text"
                    name="buttonText"
                    value={buttonText}
                    autoComplete="off"
                    helpText="Call-to-action text (e.g., Subscribe, Get Discount)"
                    onChange={(value) => setButtonText(value)}
                  />
                  
                  <input type="hidden" name="enabled" value={enabled.toString()} />
                  
                  <Button submit variant="primary" loading={isSubmitting}>
                    {enabled ? "Save & Enable Popup" : "Save Configuration"}
                  </Button>
                </FormLayout>
              </Form>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <h2>Current Popup Configuration</h2>
            </div>
            <div style={{ padding: '20px' }}>
              {shop?.popupConfig ? (
                <div style={{ 
                  border: '1px solid #e1e5e9', 
                  borderRadius: '8px', 
                  padding: '15px',
                  backgroundColor: shop.popupConfig.enabled ? '#f0f9ff' : '#fff5f5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Badge tone={shop.popupConfig.enabled ? "success" : "critical"}>
                        {shop.popupConfig.enabled ? "Active" : "Inactive"}
                      </Badge>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        ID: {shop.popupConfig.id}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Script: {shop.popupConfig.scriptTagId || 'None'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Headline:</strong> {shop.popupConfig.headline}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Description:</strong> {shop.popupConfig.description}
                  </div>
                  <div>
                    <strong>Button Text:</strong> {shop.popupConfig.buttonText}
                  </div>
                </div>
              ) : (
                <EmptyState
                  heading="No popup configuration found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create your first popup using the form above</p>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <h2>Recent Email Submissions</h2>
            </div>
            <div style={{ padding: '20px' }}>
              {emailRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text']}
                  headings={['Email', 'Date']}
                  rows={emailRows}
                />
              ) : (
                <EmptyState
                  heading="No emails collected yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Emails will appear here once visitors start subscribing</p>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <h2>Advanced Tools</h2>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <Button url="/app/script-tags" variant="secondary">
                  📋 Manage Script Tags
                </Button>
                <Button url="/app/check-token" variant="secondary">
                  🔍 Debug Tokens
                </Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}