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
    let scriptTagId: string | null = existingConfig?.scriptTagId || null;

    // Handle script tag creation/deletion
    if (isEnabled && !existingConfig?.scriptTagId) {
      console.log("🏗️ Creating new script tag...");
      // Create new script tag
      const scriptTagUrl = `${process.env.SHOPIFY_APP_URL}/popup-loader.js`;
      console.log("📜 Script tag URL:", scriptTagUrl);
      
      const scriptTagResponse = await admin.graphql(`
        #graphql
        mutation scriptTagCreate($scriptTag: ScriptTagInput!) {
          scriptTagCreate(scriptTag: $scriptTag) {
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
          scriptTag: {
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
    } else if (!isEnabled && existingConfig?.scriptTagId) {
      console.log("🗑️ Deleting existing script tag...");
      // Delete existing script tag
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
      console.log("🗑️ Script tag deletion response:", JSON.stringify(deleteResult, null, 2));
      
      if (deleteResult.data?.scriptTagDelete?.deletedScriptTagId) {
        scriptTagId = null;
        console.log("✅ Script tag deleted successfully");
      } else if (deleteResult.data?.scriptTagDelete?.userErrors?.length > 0) {
        console.warn("⚠️ Script tag deletion failed:", deleteResult.data.scriptTagDelete.userErrors[0].message);
        // Continue anyway - config will be updated
      }
    } else {
      console.log("⏭️ No script tag operations needed", { 
        isEnabled, 
        hasExistingScriptTag: !!existingConfig?.scriptTagId 
      });
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
                <h2>Popup Configuration</h2>
                {shop?.popupConfig?.enabled ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="critical">Inactive</Badge>
                )}
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
                    value={shop?.popupConfig?.headline || "Get 10% Off!"}
                    autoComplete="off"
                    helpText="This is the main headline visitors will see"
                    onChange={() => {}}
                  />
                  
                  <TextField
                    label="Description"
                    name="description"
                    value={shop?.popupConfig?.description || "Subscribe to our newsletter for exclusive deals"}
                    autoComplete="off"
                    multiline
                    onChange={() => {}}
                  />
                  
                  <TextField
                    label="Button Text"
                    name="buttonText"
                    value={shop?.popupConfig?.buttonText || "Subscribe"}
                    autoComplete="off"
                    onChange={() => {}}
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
      </Layout>
    </Page>
  );
}