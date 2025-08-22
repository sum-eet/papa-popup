import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
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
  BlockStack
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

  // Simple counts - no complex queries
  const totalEmails = await prisma.collectedEmail.count({
    where: { shopId: shop.id }
  });

  const totalPopups = await prisma.popup.count({
    where: { shopId: shop.id, isDeleted: false }
  });

  const activePopups = await prisma.popup.count({
    where: { shopId: shop.id, isDeleted: false, status: 'ACTIVE' }
  });

  // Get some basic popup data
  const popups = await prisma.popup.findMany({
    where: { shopId: shop.id, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    shop,
    stats: {
      totalImpressions: 0,
      impressionsToday: 0,
      impressionsYesterday: 0,
      impressionsTrend: 0,
      totalEmails,
      emailsToday: 0,
      emailsThisWeek: 0,
      conversionRate: 0,
      activePopups,
      totalPopups
    },
    topPerformingPopups: popups,
    recentEvents: []
  };
}

export default function AnalyticsOverview() {
  const { stats, topPerformingPopups, recentEvents } = useLoaderData<typeof loader>();

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
                <Text variant="headingMd" as="h2">Recent Popups</Text>
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
                          {popup.popupType.replace('_', ' ').toLowerCase()}
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
                  heading="No popups yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create popups to see analytics</p>
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
                  <p>Events will appear here once visitors interact with your popups</p>
                </EmptyState>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};