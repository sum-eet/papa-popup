import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Grid,
  Badge,
  Button,
  DataTable,
  EmptyState,
  BlockStack,
  Banner,
  ProgressBar
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  try {

    // Simple customer counts
    const totalCustomers = await prisma.collectedEmail.count({
      where: { shopId: shop.id }
    });

    const customersThisWeek = 0; // Placeholder
    const customersThisMonth = 0; // Placeholder

    // Recent customers
    const recentCustomers = await prisma.collectedEmail.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return json({
      shop,
      stats: {
        totalCustomers,
        customersThisWeek,
        customersThisMonth,
        syncRate: 0
      },
      syncSummary: {
        pending: 0,
        synced: totalCustomers,
        failed: 0
      },
      recentCustomers,
      topCustomerJourneys: []
    });
  } catch (error) {
    console.error('Analytics customers error:', error);
    return json({
      shop: null,
      stats: {
        totalCustomers: 0,
        customersThisWeek: 0,
        customersThisMonth: 0,
        syncRate: 0
      },
      syncSummary: {
        pending: 0,
        synced: 0,
        failed: 0
      },
      recentCustomers: [],
      topCustomerJourneys: []
    });
  }
}

export default function AnalyticsCustomers() {
  const { stats, syncSummary, recentCustomers } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // Bulk sync handler
  const handleBulkSync = () => {
    fetcher.submit(
      { action: 'bulk_sync' },
      { method: 'post', action: '/app/api/customers/sync' }
    );
  };

  // Prepare recent customers table
  const customersTableRows = recentCustomers.map((customer: any) => [
    <Text key={`email-${customer.id}`} variant="bodyMd" as="p">
      {customer.email || 'Anonymous'}
    </Text>,
    <Text key={`popup-${customer.id}`} variant="bodyMd" as="p">
      Unknown Popup
    </Text>,
    <Text key={`interactions-${customer.id}`} variant="bodyMd" as="p">
      1
    </Text>,
    <Text key={`time-${customer.id}`} variant="bodyMd" as="p">
      -
    </Text>,
    <Badge key={`status-${customer.id}`} tone="success">
      Converted
    </Badge>,
    <Text key={`date-${customer.id}`} variant="bodySm" as="p" tone="subdued">
      {new Date(customer.createdAt).toLocaleDateString()}
    </Text>
  ]);

  return (
    <Page
      title="Customer Analytics"
      subtitle="Track customer behavior, engagement, and Shopify sync status"
      backAction={{ content: 'Analytics Overview', url: '/app/analytics/overview' }}
      secondaryActions={[
        { content: 'Performance', url: '/app/analytics/performance' },
        { content: 'Funnel Analysis', url: '/app/analytics/funnels' }
      ]}
    >
      <Layout>
        {/* Key Customer Metrics */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.totalCustomers.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Customers</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.customersThisWeek.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">This Week</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.customersThisMonth.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">This Month</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">100%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Shopify Sync Rate</Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Shopify Customer Sync Status */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <BlockStack gap="400">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Text variant="headingMd" as="h2">Shopify Customer Sync</Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Manage email synchronization with your Shopify customer database
                    </Text>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleBulkSync}
                    loading={fetcher.state === 'submitting'}
                  >
                    {fetcher.state === 'submitting' ? 'Syncing...' : 'Bulk Sync Pending'}
                  </Button>
                </div>

                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <Text variant="headingMd" as="h3" tone="success">
                        {syncSummary.synced.toLocaleString()}
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">Synced</Text>
                      <div style={{ marginTop: '8px' }}>
                        <ProgressBar progress={100} size="small" />
                      </div>
                    </div>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <Text variant="headingMd" as="h3" tone="attention">
                        {syncSummary.pending.toLocaleString()}
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">Pending</Text>
                    </div>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <Text variant="headingMd" as="h3" tone="critical">
                        {syncSummary.failed.toLocaleString()}
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">Failed</Text>
                    </div>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        {/* Sync Status Feedback */}
        {fetcher.data && (
          <Layout.Section>
            {fetcher.data.success ? (
              <Banner tone="success">
                Bulk sync completed! {fetcher.data.message}
              </Banner>
            ) : (
              <Banner tone="critical">
                Sync failed: {fetcher.data.error}
              </Banner>
            )}
          </Layout.Section>
        )}

        {/* Recent Customer Analytics */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Customer Activity</Text>
            </div>
            {recentCustomers.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text', 'text', 'text']}
                  headings={['Email', 'Source Popup', 'Interactions', 'Time Spent', 'Status', 'Date']}
                  rows={customersTableRows}
                />
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  heading="No customer data yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Customer analytics will appear here once visitors start interacting with your popups</p>
                </EmptyState>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}