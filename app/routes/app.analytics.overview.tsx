import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Grid,
  Badge,
  Button,
  Select,
  DataTable,
  Banner,
  EmptyState,
  InlineStack,
  BlockStack,
  Spinner
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  console.log('📊 Analytics Overview: Starting loader for shop:', session.shop);
  
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        include: {
          _count: {
            select: {
              analytics: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!shop) {
    console.error('❌ Analytics Overview: Shop not found for domain:', session.shop);
    throw new Error("Shop not found");
  }

  console.log('✅ Analytics Overview: Shop found with', shop.popups?.length || 0, 'popups');

  // Calculate time periods
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get analytics summary
  const [
    totalImpressions,
    impressionsToday,
    impressionsYesterday,
    totalEmails,
    emailsToday,
    emailsThisWeek,
    topPerformingPopups,
    recentEvents
  ] = await Promise.all([
    // Total impressions
    prisma.popupAnalytics.count({
      where: { shopId: shop.id, eventType: 'impression' }
    }),
    
    // Impressions today
    prisma.popupAnalytics.count({
      where: { 
        shopId: shop.id, 
        eventType: 'impression',
        createdAt: { gte: today }
      }
    }),
    
    // Impressions yesterday
    prisma.popupAnalytics.count({
      where: { 
        shopId: shop.id, 
        eventType: 'impression',
        createdAt: { gte: yesterday, lt: today }
      }
    }),
    
    // Total emails
    prisma.collectedEmail.count({
      where: { shopId: shop.id }
    }),
    
    // Emails today
    prisma.collectedEmail.count({
      where: { 
        shopId: shop.id,
        createdAt: { gte: today }
      }
    }),
    
    // Emails this week
    prisma.collectedEmail.count({
      where: { 
        shopId: shop.id,
        createdAt: { gte: weekAgo }
      }
    }),
    
    // Top performing popups
    prisma.popup.findMany({
      where: { 
        shopId: shop.id,
        isDeleted: false,
        status: 'ACTIVE'
      },
      include: {
        _count: {
          select: {
            analytics: {
              where: { eventType: 'impression' }
            }
          }
        }
      },
      orderBy: {
        analytics: {
          _count: 'desc'
        }
      },
      take: 5
    }),
    
    // Recent analytics events
    prisma.popupAnalytics.findMany({
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
    })
  ]);

  // Calculate conversion rate
  const conversionRate = totalImpressions > 0 ? (totalEmails / totalImpressions) * 100 : 0;
  const impressionsTrend = impressionsYesterday > 0 ? 
    ((impressionsToday - impressionsYesterday) / impressionsYesterday) * 100 : 0;

  return json({
    shop,
    stats: {
      totalImpressions,
      impressionsToday,
      impressionsYesterday,
      impressionsTrend: Math.round(impressionsTrend * 100) / 100,
      totalEmails,
      emailsToday,
      emailsThisWeek,
      conversionRate: Math.round(conversionRate * 100) / 100,
      activePopups: shop.popups.filter(p => p.status === 'ACTIVE').length,
      totalPopups: shop.popups.length
    },
    topPerformingPopups,
    recentEvents
  });
}

export default function AnalyticsOverview() {
  const { shop, stats, topPerformingPopups, recentEvents } = useLoaderData<typeof loader>();
  const [timeframe, setTimeframe] = useState('7d');
  const fetcher = useFetcher();

  const timeframeOptions = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'All time', value: 'all' }
  ];

  // Prepare recent events table
  const eventsTableRows = recentEvents.map((event: any) => [
    <Badge key={`event-${event.id}`} tone={
      event.eventType === 'impression' ? 'info' :
      event.eventType === 'complete' ? 'success' :
      event.eventType === 'close' ? 'critical' : 'attention'
    }>
      {event.eventType}
    </Badge>,
    <Text key={`popup-${event.id}`} variant="bodyMd" as="p">
      {event.popup?.name || 'Unknown Popup'}
    </Text>,
    <Text key={`step-${event.id}`} variant="bodyMd" as="p">
      {event.stepNumber || '-'}
    </Text>,
    <Text key={`time-${event.id}`} variant="bodySm" as="p" tone="subdued">
      {new Date(event.createdAt).toLocaleString()}
    </Text>
  ]);

  return (
    <Page
      title="Analytics Overview"
      subtitle="Track your popup performance and customer engagement"
      secondaryActions={[
        { content: 'Performance Details', url: '/app/analytics/performance' },
        { content: 'Customer Insights', url: '/app/analytics/customers' },
        { content: 'Funnel Analysis', url: '/app/analytics/funnels' }
      ]}
    >
      <Layout>
        {/* Key Metrics */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.totalImpressions.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Impressions</Text>
                  {stats.impressionsTrend !== 0 && (
                    <Text variant="bodySm" as="p" tone={stats.impressionsTrend > 0 ? "success" : "critical"}>
                      {stats.impressionsTrend > 0 ? '+' : ''}{stats.impressionsTrend}% vs yesterday
                    </Text>
                  )}
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.totalEmails.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Emails</Text>
                  <Text variant="bodySm" as="p" tone="success">
                    {stats.emailsToday} today • {stats.emailsThisWeek} this week
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.conversionRate}%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Conversion Rate</Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    {stats.totalEmails} emails / {stats.totalImpressions} impressions
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{stats.activePopups}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Active Popups</Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    {stats.totalPopups} total popups created
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Quick Actions</Text>
                <InlineStack gap="300">
                  <Button url="/app/popups/new" variant="primary">
                    Create New Popup
                  </Button>
                  <Button url="/app/analytics/performance">
                    View Performance Details
                  </Button>
                  <Button 
                    onClick={() => {
                      fetcher.submit(
                        { action: 'sync_customers' },
                        { method: 'post', action: '/app/api/customers/sync' }
                      );
                    }}
                    loading={fetcher.state === 'submitting'}
                  >
                    {fetcher.state === 'submitting' ? 'Syncing...' : 'Sync Customers to Shopify'}
                  </Button>
                </InlineStack>
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        {/* Top Performing Popups */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <Text variant="headingMd" as="h2">Top Performing Popups</Text>
                <Button url="/app/analytics/performance" variant="secondary">View All Performance</Button>
              </div>
              
              {topPerformingPopups.length > 0 ? (
                <div>
                  {topPerformingPopups.map((popup: any, index: number) => (
                    <div key={popup.id} style={{ 
                      padding: '12px 0', 
                      borderBottom: index < topPerformingPopups.length - 1 ? '1px solid #e1e5e9' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">{popup.name}</Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          {popup.popupType.replace('_', ' ').toLowerCase()} • {popup._count.analytics} impressions
                        </Text>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Badge tone="success">{popup.status.toLowerCase()}</Badge>
                        <Button size="micro" url={`/app/analytics/performance?popupId=${popup.id}`}>
                          View Analytics
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  heading="No performance data yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create and activate popups to see performance analytics</p>
                </EmptyState>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Recent Events */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Events</Text>
            </div>
            {recentEvents.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text']}
                  headings={['Event Type', 'Popup', 'Step', 'Time']}
                  rows={eventsTableRows}
                  hasZebraStriping
                />
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  heading="No events tracked yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Events will appear here once visitors start interacting with your popups</p>
                </EmptyState>
              </div>
            )}
          </Card>
        </Layout.Section>

        {/* Customer Sync Status */}
        {fetcher.data && (
          <Layout.Section>
            {fetcher.data.success ? (
              <Banner tone="success">
                Customer sync completed successfully! Check the Customers page for details.
              </Banner>
            ) : (
              <Banner tone="critical">
                Customer sync failed: {fetcher.data.error}
              </Banner>
            )}
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}