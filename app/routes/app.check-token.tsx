import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Banner, Text, List } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session, admin } = await authenticate.admin(request);
    
    // Get session from database to see stored scopes
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id }
    });

    // Test script tags API call
    let scriptTagsTestResult = null;
    try {
      const scriptTagsResponse = await admin.graphql(`
        #graphql
        query {
          scriptTags(first: 1) {
            edges {
              node {
                id
                src
              }
            }
          }
        }
      `);
      
      const scriptTagsData = await scriptTagsResponse.json();
      scriptTagsTestResult = {
        success: !scriptTagsData.errors,
        data: scriptTagsData
      };
    } catch (error) {
      scriptTagsTestResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }

    // Test script tag creation
    let scriptTagCreateResult = null;
    try {
      const createResponse = await admin.graphql(`
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
            src: "https://test.com/test.js",
            displayScope: "ONLINE_STORE"
          }
        }
      });

      const createData = await createResponse.json();
      scriptTagCreateResult = {
        success: !createData.errors && (!createData.data?.scriptTagCreate?.userErrors?.length),
        data: createData
      };

      // If we created a test script tag, delete it immediately
      if (scriptTagCreateResult.success && createData.data?.scriptTagCreate?.scriptTag?.id) {
        await admin.graphql(`
          #graphql
          mutation scriptTagDelete($id: ID!) {
            scriptTagDelete(id: $id) {
              deletedScriptTagId
            }
          }
        `, {
          variables: {
            id: createData.data.scriptTagCreate.scriptTag.id
          }
        });
      }
    } catch (error) {
      scriptTagCreateResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }

    return {
      session: {
        id: session.id,
        shop: session.shop,
        isOnline: session.isOnline,
        scope: session.scope || "No scope in session object"
      },
      dbSession: dbSession ? {
        id: dbSession.id,
        shop: dbSession.shop,
        scope: dbSession.scope || "No scope in database",
        accessToken: dbSession.accessToken ? "Present (hidden)" : "Missing"
      } : "Session not found in database",
      scriptTagsTest: scriptTagsTestResult,
      scriptTagCreateTest: scriptTagCreateResult,
      environment: {
        shopifyApiKey: process.env.SHOPIFY_API_KEY ? "Present" : "Missing",
        shopifyApiSecret: process.env.SHOPIFY_API_SECRET ? "Present" : "Missing", 
        scopes: process.env.SCOPES || "Not set in .env"
      }
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown authentication error",
      stack: error instanceof Error ? error.stack : undefined
    };
  }
}

export default function CheckToken() {
  const data = useLoaderData<typeof loader>();

  if ('error' in data) {
    return (
      <Page title="Token Check - ERROR">
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <Text as="p">Authentication Error: {data.error}</Text>
              {data.stack && (
                <details style={{ marginTop: '10px' }}>
                  <summary>Stack trace</summary>
                  <pre style={{ fontSize: '12px', marginTop: '10px' }}>{data.stack}</pre>
                </details>
              )}
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Token & Permissions Debug">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Session Information</Text>
              <div style={{ marginTop: '15px' }}>
                <List type="bullet">
                  <List.Item>Session ID: {data.session.id}</List.Item>
                  <List.Item>Shop: {data.session.shop}</List.Item>
                  <List.Item>Is Online: {data.session.isOnline ? "Yes" : "No"}</List.Item>
                  <List.Item><strong>Scope from session: {data.session.scope}</strong></List.Item>
                </List>
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Database Session</Text>
              <div style={{ marginTop: '15px' }}>
                {typeof data.dbSession === 'string' ? (
                  <Banner status="warning">
                    <Text as="p">{data.dbSession}</Text>
                  </Banner>
                ) : (
                  <List type="bullet">
                    <List.Item>Database ID: {data.dbSession.id}</List.Item>
                    <List.Item>Database Shop: {data.dbSession.shop}</List.Item>
                    <List.Item><strong>Scope from DB: {data.dbSession.scope}</strong></List.Item>
                    <List.Item>Access Token: {data.dbSession.accessToken}</List.Item>
                  </List>
                )}
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Script Tags API Test - READ</Text>
              <div style={{ marginTop: '15px' }}>
                {data.scriptTagsTest?.success ? (
                  <Banner status="success">
                    <Text as="p">✅ Can READ script tags successfully!</Text>
                  </Banner>
                ) : (
                  <Banner status="critical">
                    <Text as="p">❌ Cannot read script tags</Text>
                    {data.scriptTagsTest?.error && <Text as="p">Error: {data.scriptTagsTest.error}</Text>}
                    {data.scriptTagsTest?.data && (
                      <details style={{ marginTop: '10px' }}>
                        <summary>API Response</summary>
                        <pre style={{ fontSize: '12px', marginTop: '10px' }}>
                          {JSON.stringify(data.scriptTagsTest.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Banner>
                )}
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Script Tags API Test - WRITE</Text>
              <div style={{ marginTop: '15px' }}>
                {data.scriptTagCreateTest?.success ? (
                  <Banner status="success">
                    <Text as="p">✅ Can CREATE script tags successfully!</Text>
                  </Banner>
                ) : (
                  <Banner status="critical">
                    <Text as="p">❌ Cannot create script tags</Text>
                    {data.scriptTagCreateTest?.error && <Text as="p">Error: {data.scriptTagCreateTest.error}</Text>}
                    {data.scriptTagCreateTest?.data && (
                      <details style={{ marginTop: '10px' }}>
                        <summary>API Response</summary>
                        <pre style={{ fontSize: '12px', marginTop: '10px' }}>
                          {JSON.stringify(data.scriptTagCreateTest.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Banner>
                )}
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">Environment Configuration</Text>
              <div style={{ marginTop: '15px' }}>
                <List type="bullet">
                  <List.Item>Shopify API Key: {data.environment.shopifyApiKey}</List.Item>
                  <List.Item>Shopify API Secret: {data.environment.shopifyApiSecret}</List.Item>
                  <List.Item><strong>SCOPES env var: {data.environment.scopes}</strong></List.Item>
                </List>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}