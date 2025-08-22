import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
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
  EmptyState,
  InlineStack,
  BlockStack
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const popupId = url.searchParams.get('popupId');
  const timeframe = url.searchParams.get('timeframe') || '7d';

  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Simple performance data
  const selectedPopup = popupId ? await prisma.popup.findUnique({
    where: { id: popupId },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' }
      }
    }
  }) : null;

  // Basic popup data for comparison table
  const popups = await prisma.popup.findMany({
    where: { shopId: shop.id, isDeleted: false },
    orderBy: { createdAt: 'desc' }
  });

  return {
    shop,
    selectedPopup,
    timeframe,
    metrics: {
      impressions: 0,
      clicks: 0,
      closes: 0,
      completions: 0,
      emailsCollected: 0,
      clickRate: 0,
      closeRate: 0,
      conversionRate: 0,
      completionRate: 0
    },
    stepAnalytics: [],
    popupPerformance: popups.map((popup: any) => ({
      id: popup.id,
      name: popup.name,
      popupType: popup.popupType,
      status: popup.status,
      impressions: 0,
      interactions: 0,
      completions: 0,
      emails: 0
    }))
  };
}

export default function AnalyticsPerformance() {
  const { shop, selectedPopup, timeframe, metrics, popupPerformance } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const popupOptions = [
    { label: 'All Popups', value: '' },
    ...shop?.popups?.map((popup: any) => ({
      label: popup.name,
      value: popup.id
    })) || []
  ];

  const timeframeOptions = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 90 days', value: '90d' },
    { label: 'All time', value: 'all' }
  ];

  const handlePopupChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set('popupId', value);
    } else {
      newSearchParams.delete('popupId');
    }
    setSearchParams(newSearchParams);
  };

  const handleTimeframeChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('timeframe', value);
    setSearchParams(newSearchParams);
  };

  // Prepare performance comparison table
  const performanceTableRows = popupPerformance.map((popup: any) => [
    <div key={`name-${popup.id}`}>
      <Text variant="bodyMd" as="p" fontWeight="semibold">{popup.name}</Text>
      <Text variant="bodySm" as="p" tone="subdued">
        {popup.popupType.replace('_', ' ').toLowerCase()}
      </Text>
    </div>,
    <Badge key={`status-${popup.id}`} tone={popup.status === 'ACTIVE' ? 'success' : 'warning'}>
      {popup.status.toLowerCase()}
    </Badge>,
    <Text key={`impressions-${popup.id}`} variant="bodyMd" as="p">
      {popup.impressions.toLocaleString()}
    </Text>,
    <Text key={`completions-${popup.id}`} variant="bodyMd" as="p">
      {popup.completions.toLocaleString()}
    </Text>,
    <Text key={`emails-${popup.id}`} variant="bodyMd" as="p">
      {popup.emails.toLocaleString()}
    </Text>,
    <Button key={`action-${popup.id}`} size="micro" url={`/app/analytics/performance?popupId=${popup.id}`}>
      View Details
    </Button>
  ]);

  return (
    <Page
      title="Performance Analytics"
      subtitle={selectedPopup ? `Performance analysis for ${selectedPopup.name}` : "Analyze popup performance metrics"}
      backAction={{ content: 'Analytics Overview', url: '/app/analytics/overview' }}
      secondaryActions={[
        { content: 'Customer Insights', url: '/app/analytics/customers' },
        { content: 'Funnel Analysis', url: '/app/analytics/funnels' }
      ]}
    >
      <Layout>
        {/* Filters */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Filters</Text>
                <InlineStack gap="400">
                  <div style={{ minWidth: '200px' }}>
                    <Select
                      label="Popup"
                      options={popupOptions}
                      value={searchParams.get('popupId') || ''}
                      onChange={handlePopupChange}
                    />
                  </div>
                  <div style={{ minWidth: '150px' }}>
                    <Select
                      label="Time Period"
                      options={timeframeOptions}
                      value={timeframe}
                      onChange={handleTimeframeChange}
                    />
                  </div>
                </InlineStack>
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        {/* Performance Metrics */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.impressions.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Impressions</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.clicks.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Clicks</Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    {metrics.clickRate}% click rate
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.completions.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Completions</Text>
                  <Text variant="bodySm" as="p" tone="success">
                    {metrics.completionRate}% completion rate
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.emailsCollected.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Emails Collected</Text>
                  <Text variant="bodySm" as="p" tone="success">
                    {metrics.conversionRate}% conversion rate
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Performance Comparison Table */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Popup Performance Comparison</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Compare performance metrics across all your popups
              </Text>
            </div>
            {popupPerformance.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric', 'text']}
                  headings={['Popup Name', 'Status', 'Impressions', 'Completions', 'Emails', 'Actions']}
                  rows={performanceTableRows}
                />
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  heading="No performance data available"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create and activate popups to see performance analytics</p>
                  <div style={{ marginTop: '15px' }}>
                    <Button variant="primary" url="/app/popups/new">Create Your First Popup</Button>
                  </div>
                </EmptyState>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}