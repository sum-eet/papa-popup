import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, Button, DataTable, EmptyState, Badge, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    // Get all script tags
    const scriptTagsResponse = await admin.graphql(`
      #graphql
      query {
        scriptTags(first: 50) {
          edges {
            node {
              id
              src
              displayScope
              createdAt
              updatedAt
            }
          }
        }
      }
    `);

    const scriptTagsData = await scriptTagsResponse.json();
    const scriptTags = scriptTagsData.data?.scriptTags?.edges?.map((edge: any) => edge.node) || [];

    return { scriptTags };
  } catch (error) {
    return { 
      scriptTags: [], 
      error: error instanceof Error ? error.message : "Failed to load script tags" 
    };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const scriptTagId = formData.get("scriptTagId");

  if (action === "delete" && scriptTagId) {
    try {
      console.log("🗑️ Deleting script tag:", scriptTagId);
      
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
          id: scriptTagId
        }
      });

      const deleteResult = await deleteResponse.json();
      
      if (deleteResult.data?.scriptTagDelete?.deletedScriptTagId) {
        return { 
          success: true, 
          message: `Script tag deleted successfully: ${scriptTagId}` 
        };
      } else if (deleteResult.data?.scriptTagDelete?.userErrors?.length > 0) {
        const error = deleteResult.data.scriptTagDelete.userErrors[0];
        return { 
          success: false, 
          error: `Delete failed: ${error.message}` 
        };
      } else {
        return { 
          success: false, 
          error: "Unexpected response from delete operation" 
        };
      }
    } catch (error) {
      console.error("Script tag deletion error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Delete operation failed" 
      };
    }
  }

  return { success: false, error: "Invalid action" };
}

export default function ScriptTags() {
  const { scriptTags, error: loadError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Prepare table data
  const tableRows = scriptTags.map((tag: any) => {
    const isPapaPopup = tag.src?.includes('papa-popup') || tag.src?.includes('popup-loader.js');
    const isSmartPop = tag.src?.includes('smartpop') || tag.src?.includes('smart-pop');
    
    return [
      <div key={tag.id}>
        <strong>{tag.src}</strong>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          ID: {tag.id.replace('gid://shopify/ScriptTag/', '')}
        </div>
      </div>,
      <Badge tone={isPapaPopup ? "success" : isSmartPop ? "warning" : "info"} key={`badge-${tag.id}`}>
        {isPapaPopup ? "Papa Popup ✅" : isSmartPop ? "SmartPop ⚠️" : "Other"}
      </Badge>,
      tag.displayScope || "ONLINE_STORE",
      new Date(tag.createdAt).toLocaleDateString(),
      <Form method="post" key={`form-${tag.id}`} style={{ display: 'inline' }}>
        <input type="hidden" name="action" value="delete" />
        <input type="hidden" name="scriptTagId" value={tag.id} />
        <Button 
          submit 
          variant="primary" 
          tone="critical" 
          size="micro"
          loading={isSubmitting && navigation.formData?.get("scriptTagId") === tag.id}
        >
          Delete
        </Button>
      </Form>
    ];
  });

  return (
    <Page 
      title="Script Tag Management" 
      subtitle="View and manage all script tags installed on your store"
      backAction={{ content: 'Dashboard', url: '/app' }}
    >
      <Layout>
        {actionData && (
          <Layout.Section>
            <Banner status={actionData.success ? "success" : "critical"}>
              <p>{actionData.success ? actionData.message : `Error: ${actionData.error}`}</p>
            </Banner>
          </Layout.Section>
        )}

        {loadError && (
          <Layout.Section>
            <Banner status="critical">
              <p>Error loading script tags: {loadError}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2>Current Script Tags</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  ⚠️ <strong>Papa Popup</strong> scripts should be kept. 
                  <strong> SmartPop</strong> scripts should be deleted to avoid conflicts.
                </p>
              </div>

              {tableRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                  headings={['Script URL & ID', 'Type', 'Scope', 'Created', 'Action']}
                  rows={tableRows}
                />
              ) : (
                <EmptyState
                  heading="No script tags found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>No script tags are currently installed on this store.</p>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <h3>⚠️ Important Notes:</h3>
              <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                <li><strong>Papa Popup (Green):</strong> Current working popup system - keep this</li>
                <li><strong>SmartPop (Orange):</strong> Old popup system - delete to avoid conflicts</li>
                <li><strong>Other (Blue):</strong> Review before deleting - might be needed for other features</li>
              </ul>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}