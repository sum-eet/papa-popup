import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Card, 
  Text,
  Grid,
  Badge,
  Button,
  EmptyState
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { isMultiPopupEnabled } from "../utils/features";
import { redirect } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check feature flag like working routes do
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session } = await authenticate.admin(request);
  
  // Get shop data like working routes do
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        orderBy: { updatedAt: 'desc' }
      },
      emails: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Simple stats calculation
  const totalEmails = shop.emails.length;
  const totalPopups = shop.popups.length;
  const activePopups = shop.popups.filter(p => p.status === 'ACTIVE').length;

  return { 
    shop,
    stats: {
      totalEmails,
      totalPopups,
      activePopups
    }
  };
}

export default function AnalyticsOverview() {
  const { shop, stats } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Analytics Overview"
      subtitle="Basic analytics for your popups"
      backAction={{ content: 'Dashboard', url: '/app' }}
    >
      <Layout>
        {/* Key Metrics */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.totalEmails}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Emails</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.activePopups}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Active Popups</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.totalPopups}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Popups</Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Recent Popups */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Popups</Text>
              
              {shop.popups.length > 0 ? (
                <div style={{ marginTop: '16px' }}>
                  {shop.popups.slice(0, 5).map((popup: any) => (
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
                      <Badge tone={popup.status === 'ACTIVE' ? 'success' : 'attention'}>
                        {popup.status.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: '16px' }}>
                  <EmptyState
                    heading="No popups created yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Create your first popup to see analytics</p>
                    <div style={{ marginTop: '15px' }}>
                      <Button variant="primary" url="/app/popups/new">Create Your First Popup</Button>
                    </div>
                  </EmptyState>
                </div>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Quick Actions</Text>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <Button url="/app/popups" variant="secondary">
                  📋 Manage Popups
                </Button>
                <Button url="/app/popups/new" variant="primary">
                  ➕ Create New Popup
                </Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}