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
  InlineStack,
  BlockStack,
  Banner,
  ProgressBar
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  console.log('👥 Analytics Customers: Starting loader for shop:', session.shop);
  
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop }
  });

  if (!shop) {
    console.error('❌ Analytics Customers: Shop not found for domain:', session.shop);
    throw new Error("Shop not found");
  }

  console.log('✅ Analytics Customers: Shop found, fetching customer analytics data...');

  // Calculate time periods
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get customer analytics data
  let analytics;
  try {
    analytics = await Promise.all([
    // Total unique customers
    prisma.customerAnalytics.count({
      where: { shopId: shop.id }
    }),

    // Customers this week
    prisma.customerAnalytics.count({
      where: { 
        shopId: shop.id,
        createdAt: { gte: weekAgo }
      }
    }),

    // Customers this month
    prisma.customerAnalytics.count({
      where: { 
        shopId: shop.id,
        createdAt: { gte: monthAgo }
      }
    }),

    // Shopify sync status summary
    prisma.shopifyCustomerSync.groupBy({
      by: ['syncStatus'],
      where: { shopId: shop.id },
      _count: { syncStatus: true }
    }),

    // Recent customer analytics
    prisma.customerAnalytics.findMany({
      where: { shopId: shop.id },
      include: {
        popup: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),

    // Top customer journeys (most interactions)
    prisma.customerAnalytics.findMany({
      where: { 
        shopId: shop.id,
        totalInteractions: { gt: 1 }
      },
      include: {
        popup: {
          select: {
            name: true
          }
        }
      },
      orderBy: { totalInteractions: 'desc' },
      take: 5
    })
    ]);

    console.log('✅ Analytics Customers: All database queries completed successfully');
  } catch (error) {
    console.error('❌ Analytics Customers: Database query failed:', error);
    // Return fallback data to prevent complete failure
    analytics = [0, 0, 0, [], [], []];
  }

  // Extract results from analytics array
  const [
    totalCustomers,
    customersThisWeek,
    customersThisMonth,
    syncStatus,
    recentCustomers,
    topCustomerJourneys
  ] = analytics;

  // Process sync status
  const syncSummary = {
    pending: syncStatus.find(s => s.syncStatus === 'pending')?._count.syncStatus || 0,
    synced: syncStatus.find(s => s.syncStatus === 'synced')?._count.syncStatus || 0,
    failed: syncStatus.find(s => s.syncStatus === 'failed')?._count.syncStatus || 0
  };

  const totalSyncRecords = syncSummary.pending + syncSummary.synced + syncSummary.failed;
  const syncRate = totalSyncRecords > 0 ? (syncSummary.synced / totalSyncRecords) * 100 : 0;

  return json({
    shop,
    stats: {
      totalCustomers,
      customersThisWeek,
      customersThisMonth,
      syncRate: Math.round(syncRate * 100) / 100
    },
    syncSummary,
    recentCustomers,
    topCustomerJourneys
  });
}

export default function AnalyticsCustomers() {
  const { shop, stats, syncSummary, recentCustomers, topCustomerJourneys } = useLoaderData<typeof loader>();
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
      {customer.popup?.name || 'Unknown Popup'}
    </Text>,
    <Text key={`interactions-${customer.id}`} variant="bodyMd" as="p">
      {customer.totalInteractions}
    </Text>,
    <Text key={`time-${customer.id}`} variant="bodyMd" as="p">
      {customer.timeSpent ? `${Math.round(customer.timeSpent / 60)}m` : '-'}
    </Text>,
    <Badge key={`status-${customer.id}`} tone={customer.emailProvided ? 'success' : 'warning'}>
      {customer.emailProvided ? 'Converted' : 'Browsing'}
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
                  <Text variant="headingLg" as="h3">{stats.syncRate}%</Text>
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
                        <ProgressBar progress={stats.syncRate} size="small" />
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

        {/* Top Customer Journeys */}
        {topCustomerJourneys.length > 0 && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2">Most Engaged Customers</Text>
                <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                  Customers with the highest interaction rates
                </Text>
              </div>
              <div style={{ padding: '20px' }}>
                {topCustomerJourneys.map((customer: any, index: number) => (
                  <div key={customer.id} style={{ 
                    padding: '12px 0', 
                    borderBottom: index < topCustomerJourneys.length - 1 ? '1px solid #e1e5e9' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {customer.email || 'Anonymous Customer'}
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {customer.popup?.name || 'Unknown popup'} • 
                        {customer.timeSpent ? ` ${Math.round(customer.timeSpent / 60)}m spent` : ' No time data'}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Text variant="bodyMd" as="p">
                        {customer.totalInteractions} interactions
                      </Text>
                      <Badge tone={customer.emailProvided ? 'success' : 'warning'}>
                        {customer.emailProvided ? 'Converted' : 'Engaged'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
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