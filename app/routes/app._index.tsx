import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useActionData, useFetcher } from "@remix-run/react";
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
  Banner,
  Grid,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";
import type { PopupStatsResponse } from "../types/popup";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const useMultiPopup = isMultiPopupEnabled();
  
  if (useMultiPopup) {
    // Multi-popup system data
    const shop = await prisma.shop.findUnique({
      where: { domain: session.shop },
      include: {
        popups: {
          where: { isDeleted: false },
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 5 // Recent popups for dashboard
        },
        emails: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customerSession: {
              select: {
                popupId: true,
                popup: {
                  select: { name: true }
                }
              }
            }
          }
        },
        // Legacy popup config for migration reference
        popupConfig: true
      }
    });

    if (!shop) {
      throw new Error("Shop not found");
    }

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emailsToday = await prisma.collectedEmail.count({
      where: {
        shopId: shop.id,
        createdAt: { gte: today }
      }
    });

    const activePopups = shop.popups.filter(p => p.status === 'ACTIVE').length;
    const topPerformingPopup = shop.popups.length > 0 ? shop.popups[0] : null;

    const stats: PopupStatsResponse = {
      totalPopups: shop.popups.length,
      activePopups,
      draftPopups: shop.popups.filter(p => p.status === 'DRAFT').length,
      emailsCollectedToday: emailsToday,
      emailsCollectedTotal: shop.emails.length,
      topPerformingPopup: topPerformingPopup ? {
        id: topPerformingPopup.id,
        name: topPerformingPopup.name,
        emailsCollected: 0 // TODO: Calculate actual emails from this popup
      } : undefined
    };

    return { 
      system: 'multi' as const,
      shop, 
      stats,
      activePopup: shop.popups.find(p => p.status === 'ACTIVE') || null
    };
  } else {
    // Legacy single popup system
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

    return { 
      system: 'legacy' as const,
      shop 
    };
  }
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
      const scriptTagUrl = `${process.env.SHOPIFY_APP_URL}popup-loader-enhanced.js`;
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
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  // Conditional rendering based on system type
  if (data.system === 'multi') {
    return <MultiPopupDashboard data={data} actionData={actionData} />;
  } else {
    return <LegacyPopupDashboard data={data} actionData={actionData} navigation={navigation} />;
  }
}

// Legacy dashboard component (existing functionality)
function LegacyPopupDashboard({ data, actionData, navigation }: any) {
  const { shop } = data;
  const isSubmitting = navigation.state === "submitting";
  const [enabled, setEnabled] = useState(shop?.popupConfig?.enabled || false);
  
  // Form state for editable fields
  const [headline, setHeadline] = useState(shop?.popupConfig?.headline || "Get 10% Off!");
  const [description, setDescription] = useState(shop?.popupConfig?.description || "Subscribe to our newsletter for exclusive deals");
  const [buttonText, setButtonText] = useState(shop?.popupConfig?.buttonText || "Subscribe");

  const emailRows = shop?.emails.map((email: any) => [
    email.email,
    new Date(email.createdAt).toLocaleDateString()
  ]) || [];

  return (
    <Page title="Email Popup Dashboard">
      <Layout>
        {actionData && (
          <Layout.Section>
            {actionData.success ? (
              <Banner tone="success">
                <p>✅ Popup configuration updated successfully!</p>
                {actionData.config?.enabled && actionData.config?.scriptTagId && (
                  <p>Script tag created with ID: {actionData.config.scriptTagId}</p>
                )}
              </Banner>
            ) : (
              <Banner tone="critical">
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

// New multi-popup dashboard component
function MultiPopupDashboard({ data, actionData }: any) {
  const { shop, stats, activePopup } = data;
  const fetcher = useFetcher();
  
  const handlePausePopup = (popupId: string) => {
    fetcher.submit(
      { popupId, status: 'PAUSED' },
      { method: 'POST', action: '/app/api/popups/status' }
    );
  };

  // Prepare email rows with popup attribution
  const emailRows = shop?.emails.map((email: any) => [
    email.email,
    email.customerSession?.popup?.name || 'Legacy Popup',
    new Date(email.createdAt).toLocaleDateString(),
    email.discountUsed || 'None'
  ]) || [];

  return (
    <Page 
      title="Papa Popup Dashboard" 
      primaryAction={{
        content: 'Create New Popup',
        url: '/app/popups/new'
      }}
      secondaryActions={[
        { content: 'Manage All Popups', url: '/app/popups' },
        { content: 'View Analytics', url: '/app/analytics' }
      ]}
    >
      <Layout>
        {actionData && (
          <Layout.Section>
            {actionData.success ? (
              <Banner tone="success">
                <p>✅ {actionData.message}</p>
              </Banner>
            ) : (
              <Banner tone="critical">
                <p>❌ Error: {actionData.error}</p>
              </Banner>
            )}
          </Layout.Section>
        )}

        {/* Stats Cards */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.totalPopups}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Popups</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3" tone="success">{stats.activePopups}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Active Popups</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.emailsCollectedToday}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Emails Today</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.emailsCollectedTotal}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Emails</Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Active Popup Card */}
        {activePopup && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div>
                    <Text variant="headingMd" as="h2">Currently Active Popup</Text>
                    <Text variant="bodyMd" as="p" tone="subdued">This popup is currently showing to visitors</Text>
                  </div>
                  <Badge tone="success">Active</Badge>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Text variant="headingMd" as="h3">{activePopup.name}</Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      {activePopup.popupType.replace('_', ' ').toLowerCase()} • {activePopup.totalSteps} step{activePopup.totalSteps !== 1 ? 's' : ''}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button url={`/app/popups/${activePopup.id}/edit`}>Edit</Button>
                    <Button 
                      variant="secondary"
                      onClick={() => handlePausePopup(activePopup.id)}
                      loading={fetcher.state === 'submitting' && fetcher.formData?.get('popupId') === activePopup.id}
                    >
                      {fetcher.state === 'submitting' && fetcher.formData?.get('popupId') === activePopup.id 
                        ? 'Pausing...' 
                        : 'Pause'
                      }
                    </Button>
                    <Button variant="secondary" url={`/app/popups/${activePopup.id}/preview`}>Preview</Button>
                  </div>
                </div>
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* Recent Popups */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <Text variant="headingMd" as="h2">Recent Popups</Text>
                <Button url="/app/popups" variant="secondary">View All</Button>
              </div>
              
              {shop.popups.length > 0 ? (
                <div>
                  {shop.popups.slice(0, 3).map((popup: any) => (
                    <div key={popup.id} style={{ 
                      padding: '12px 0', 
                      borderBottom: '1px solid #e1e5e9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <Text variant="bodyMd" as="p">{popup.name}</Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          {popup.status.toLowerCase()} • Updated {new Date(popup.updatedAt).toLocaleDateString()}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Badge tone={popup.status === 'ACTIVE' ? 'success' : popup.status === 'DRAFT' ? 'attention' : 'info'}>
                          {popup.status.toLowerCase()}
                        </Badge>
                        <Button size="micro" url={`/app/popups/${popup.id}/edit`}>Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  heading="No popups created yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create your first popup to start collecting emails and boosting conversions</p>
                  <div style={{ marginTop: '15px' }}>
                    <Button variant="primary" url="/app/popups/new">Create Your First Popup</Button>
                  </div>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Email Collection with Attribution */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Email Submissions</Text>
            </div>
            <div style={{ padding: '20px' }}>
              {emailRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={['Email', 'Source Popup', 'Date', 'Discount Used']}
                  rows={emailRows}
                />
              ) : (
                <EmptyState
                  heading="No emails collected yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Emails will appear here once visitors start subscribing through your popups</p>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Feature Migration Banner */}
        {shop.popupConfig && (
          <Layout.Section>
            <Banner tone="info">
              <p>
                <strong>🆕 New Multi-Popup System Active!</strong> Your previous popup has been migrated and is ready to use. 
                You can now create multiple popups with advanced quiz functionality.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {/* Advanced Tools */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Advanced Tools</Text>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                <Button url="/app/script-tags" variant="secondary">
                  📋 Manage Script Tags
                </Button>
                <Button url="/app/check-token" variant="secondary">
                  🔍 Debug Tokens  
                </Button>
                <Button url="/app/analytics" variant="secondary">
                  📊 View Analytics
                </Button>
                <Button url="/app/popups/templates" variant="secondary">
                  🎨 Popup Templates
                </Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}