import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, Banner, Text, Button, List } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return {
    requiredScopes: "write_products,write_script_tags,read_script_tags",
    warningMessage: "This will delete your current session and force a fresh OAuth flow."
  };
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const action = formData.get("action");

    if (action === "clear_sessions") {
      // Delete all sessions for this shop
      const deletedSessions = await prisma.session.deleteMany({
        where: { shop: session.shop }
      });

      // Also delete shop record to force complete refresh
      await prisma.shop.deleteMany({
        where: { domain: session.shop }
      });

      return {
        success: true,
        message: `Deleted ${deletedSessions.count} session(s) for ${session.shop}`,
        nextStep: "Now visit your app again to trigger fresh OAuth with correct scopes"
      };
    }

    if (action === "check_sessions") {
      // Show all sessions for this shop
      const sessions = await prisma.session.findMany({
        where: { shop: session.shop },
        select: {
          id: true,
          shop: true,
          scope: true,
          isOnline: true,
          accessToken: true
        }
      });

      return {
        success: true,
        sessions: sessions.map(s => ({
          ...s,
          accessToken: s.accessToken ? `${s.accessToken.substring(0, 10)}...` : "None"
        }))
      };
    }

    return { error: "Unknown action" };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export default function ForceReinstall() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Page title="Force Fresh Installation">
      <Layout>
        <Layout.Section>
          <Banner status="warning">
            <Text as="p">
              <strong>⚠️ NUCLEAR OPTION</strong>: This will completely reset your app installation 
              and force Shopify to give you a fresh token with the correct permissions.
            </Text>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Required Scopes</Text>
              <div style={{ marginTop: '15px' }}>
                <Text as="p">Your app needs these permissions:</Text>
                <List type="bullet">
                  <List.Item><strong>write_products</strong> - Edit products</List.Item>
                  <List.Item><strong>write_script_tags</strong> - Create script tags (for popup)</List.Item>
                  <List.Item><strong>read_script_tags</strong> - Read existing script tags</List.Item>
                </List>
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Step 1: Check Current Sessions</Text>
              <div style={{ marginTop: '15px' }}>
                <Form method="post">
                  <input type="hidden" name="action" value="check_sessions" />
                  <Button submit loading={isSubmitting && navigation.formData?.get("action") === "check_sessions"}>
                    Show Current Sessions
                  </Button>
                </Form>
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Step 2: Nuclear Reset</Text>
              <div style={{ marginTop: '15px' }}>
                <Text as="p">
                  This will DELETE all sessions and shop data for your store, 
                  forcing a completely fresh OAuth installation.
                </Text>
                <div style={{ marginTop: '15px' }}>
                  <Form method="post">
                    <input type="hidden" name="action" value="clear_sessions" />
                    <Button 
                      submit 
                      variant="primary" 
                      tone="critical"
                      loading={isSubmitting && navigation.formData?.get("action") === "clear_sessions"}
                    >
                      🚨 DELETE SESSIONS & FORCE FRESH INSTALL
                    </Button>
                  </Form>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {actionData && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                {actionData.success ? (
                  <Banner status="success">
                    <Text as="p">{actionData.message}</Text>
                    {actionData.nextStep && <Text as="p">{actionData.nextStep}</Text>}
                  </Banner>
                ) : (
                  <Banner status="critical">
                    <Text as="p">Error: {actionData.error}</Text>
                  </Banner>
                )}

                {actionData.sessions && (
                  <div style={{ marginTop: '20px' }}>
                    <Text as="h3" variant="headingMd">Current Sessions:</Text>
                    {actionData.sessions.length === 0 ? (
                      <Text as="p">No sessions found</Text>
                    ) : (
                      <div style={{ marginTop: '10px' }}>
                        {actionData.sessions.map((session: any) => (
                          <div key={session.id} style={{ 
                            border: '1px solid #ccc', 
                            padding: '10px', 
                            margin: '5px 0',
                            fontSize: '12px'
                          }}>
                            <strong>ID:</strong> {session.id}<br/>
                            <strong>Shop:</strong> {session.shop}<br/>
                            <strong>Scope:</strong> {session.scope || "No scope!"}<br/>
                            <strong>Online:</strong> {session.isOnline ? "Yes" : "No"}<br/>
                            <strong>Token:</strong> {session.accessToken}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Banner status="info">
            <Text as="p">
              <strong>After clearing sessions:</strong><br/>
              1. Visit your app URL again<br/>
              2. Shopify will ask you to re-authorize<br/>
              3. You should now see "Edit online store" permission<br/>
              4. Script tag creation should work
            </Text>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}