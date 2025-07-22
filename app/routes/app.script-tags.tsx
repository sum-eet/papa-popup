import { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, Button, DataTable, EmptyState, Badge, Banner, TextField, FormLayout } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  try {
    // Get ALL script tags with higher limit
    const scriptTagsResponse = await admin.graphql(`
      #graphql
      query {
        scriptTags(first: 250) {
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

  // Bulk delete SmartPop scripts
  if (action === "bulk_delete_smartpop") {
    try {
      // Get all script tags first
      const scriptTagsResponse = await admin.graphql(`
        #graphql
        query {
          scriptTags(first: 250) {
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
      const allScriptTags = scriptTagsData.data?.scriptTags?.edges?.map((edge: any) => edge.node) || [];
      
      // Find SmartPop scripts
      const smartPopScripts = allScriptTags.filter((tag: any) => 
        tag.src && (
          tag.src.includes('smartpop') || 
          tag.src.includes('smart-pop') ||
          tag.src.includes('popup-script.js') ||
          (tag.src.includes('popup') && !tag.src.includes('papa-popup') && !tag.src.includes('popup-loader.js'))
        )
      );

      console.log("Found SmartPop scripts to delete:", smartPopScripts);

      if (smartPopScripts.length === 0) {
        return { success: true, message: "No SmartPop scripts found to delete" };
      }

      // Delete each SmartPop script
      let deletedCount = 0;
      const errors = [];

      for (const script of smartPopScripts) {
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
            variables: { id: script.id }
          });

          const deleteResult = await deleteResponse.json();
          
          if (deleteResult.data?.scriptTagDelete?.deletedScriptTagId) {
            deletedCount++;
          } else {
            errors.push(`Failed to delete ${script.src}`);
          }
        } catch (error) {
          errors.push(`Error deleting ${script.src}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { 
        success: true, 
        message: `Deleted ${deletedCount} SmartPop script(s)${errors.length > 0 ? '. Some errors occurred.' : ''}`,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Bulk delete failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Manual script ID deletion
  if (action === "delete_manual") {
    const manualId = formData.get("manualId") as string;
    if (!manualId) {
      return { success: false, error: "Please enter a script tag ID" };
    }

    try {
      // Add gid prefix if not present
      const fullId = manualId.startsWith('gid://') ? manualId : `gid://shopify/ScriptTag/${manualId}`;
      
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
        variables: { id: fullId }
      });

      const deleteResult = await deleteResponse.json();
      
      if (deleteResult.data?.scriptTagDelete?.deletedScriptTagId) {
        return { 
          success: true, 
          message: `Successfully deleted script tag: ${manualId}` 
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
          error: "Script tag not found or already deleted" 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Manual delete failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Individual script deletion (existing code)
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

  // Count different script types
  const papaPopupCount = scriptTags.filter((tag: any) => 
    tag.src?.includes('papa-popup') || tag.src?.includes('popup-loader.js')
  ).length;
  
  const smartPopCount = scriptTags.filter((tag: any) => 
    tag.src && (
      tag.src.includes('smartpop') || 
      tag.src.includes('smart-pop') ||
      tag.src.includes('popup-script.js') ||
      (tag.src.includes('popup') && !tag.src.includes('papa-popup') && !tag.src.includes('popup-loader.js'))
    )
  ).length;

  // Prepare table data
  const tableRows = scriptTags.map((tag: any) => {
    const isPapaPopup = tag.src?.includes('papa-popup') || tag.src?.includes('popup-loader.js');
    const isSmartPop = tag.src && (
      tag.src.includes('smartpop') || 
      tag.src.includes('smart-pop') ||
      tag.src.includes('popup-script.js') ||
      (tag.src.includes('popup') && !tag.src.includes('papa-popup') && !tag.src.includes('popup-loader.js'))
    );
    
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
              {actionData.errors && actionData.errors.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p><strong>Detailed errors:</strong></p>
                  <ul style={{ paddingLeft: '20px' }}>
                    {actionData.errors.map((error: string, index: number) => (
                      <li key={index} style={{ fontSize: '12px' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                <h2>Script Tag Summary</h2>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                  <div>📊 Total Scripts: <strong>{scriptTags.length}</strong></div>
                  <div>✅ Papa Popup: <strong>{papaPopupCount}</strong></div>
                  <div>⚠️ SmartPop/Conflicting: <strong>{smartPopCount}</strong></div>
                </div>
              </div>

              {/* Bulk Actions */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '15px' }}>🧹 Bulk Actions</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Form method="post" style={{ display: 'inline' }}>
                    <input type="hidden" name="action" value="bulk_delete_smartpop" />
                    <Button 
                      submit 
                      variant="primary" 
                      tone="critical"
                      loading={isSubmitting && navigation.formData?.get("action") === "bulk_delete_smartpop"}
                      disabled={smartPopCount === 0}
                    >
                      🗑️ Delete All SmartPop Scripts ({smartPopCount})
                    </Button>
                  </Form>
                  
                  <Button 
                    url="/app/script-tags" 
                    variant="secondary"
                    loading={isSubmitting}
                  >
                    🔄 Refresh List
                  </Button>
                </div>
              </div>

              {/* Manual Deletion */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '15px' }}>🎯 Manual Script Deletion</h3>
                <Form method="post">
                  <input type="hidden" name="action" value="delete_manual" />
                  <FormLayout>
                    <TextField
                      label="Script Tag ID"
                      name="manualId"
                      placeholder="Enter ID (e.g., 123456789 or gid://shopify/ScriptTag/123456789)"
                      helpText="Use this if you found a script ID from browser network tab or console"
                      autoComplete="off"
                    />
                    <Button 
                      submit 
                      variant="primary"
                      loading={isSubmitting && navigation.formData?.get("action") === "delete_manual"}
                    >
                      Delete by ID
                    </Button>
                  </FormLayout>
                </Form>
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2>All Script Tags</h2>
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