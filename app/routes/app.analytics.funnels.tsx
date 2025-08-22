import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
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
  BlockStack,
  ProgressBar,
  Divider
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  
  try {
    const url = new URL(request.url);
    const popupId = url.searchParams.get('popupId');
    const timeframe = url.searchParams.get('timeframe') || '7d';

    const shop = await prisma.shop.findUnique({
      where: { domain: session.shop }
    });

    if (!shop) {
      throw new Error("Shop not found");
    }

    // Simple basic popup data
    const popups = await prisma.popup.findMany({
      where: { shopId: shop.id, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    // Selected popup if specified
    const selectedPopup = popupId ? await prisma.popup.findUnique({
      where: { id: popupId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    }) : null;

    return json({
      shop: { ...shop, popups },
      selectedPopup,
      timeframe,
      metrics: {
        totalImpressions: 0,
        totalInteractions: 0,
        totalCompletions: 0,
        totalDropoffs: 0,
        engagementRate: 0,
        completionRate: 0,
        dropoffRate: 0,
        conversionRate: 0
      },
      funnelSteps: [],
      popupFunnels: popups.map((popup: any) => ({
        id: popup.id,
        name: popup.name,
        popupType: popup.popupType,
        status: popup.status,
        impressions: 0,
        interactions: 0,
        completions: 0,
        dropoffs: 0
      }))
    });
  } catch (error) {
    console.error('Analytics funnels error:', error);
    return json({
      shop: null,
      selectedPopup: null,
      timeframe: '7d',
      metrics: {
        totalImpressions: 0,
        totalInteractions: 0,
        totalCompletions: 0,
        totalDropoffs: 0,
        engagementRate: 0,
        completionRate: 0,
        dropoffRate: 0,
        conversionRate: 0
      },
      funnelSteps: [],
      popupFunnels: []
    });
  }
}

export default function AnalyticsFunnels() {
  const { shop, selectedPopup, timeframe, metrics, funnelSteps, popupFunnels } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const popupOptions = [
    { label: 'All Popups', value: '' },
    ...shop.popups.map((popup: any) => ({
      label: popup.name,
      value: popup.id
    }))
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

  // Prepare funnel comparison table
  const funnelTableRows = (popupFunnels as any[]).map((popup: any) => {
    const impressions = parseInt(popup.impressions) || 0;
    const interactions = parseInt(popup.interactions) || 0;
    const completions = parseInt(popup.completions) || 0;
    const dropoffs = parseInt(popup.dropoffs) || 0;
    
    const engagementRate = impressions > 0 ? (interactions / impressions) * 100 : 0;
    const completionRate = impressions > 0 ? (completions / impressions) * 100 : 0;
    
    return [
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
        {impressions.toLocaleString()}
      </Text>,
      <Text key={`interactions-${popup.id}`} variant="bodyMd" as="p">
        {interactions.toLocaleString()}
      </Text>,
      <Text key={`completions-${popup.id}`} variant="bodyMd" as="p">
        {completions.toLocaleString()}
      </Text>,
      <Text key={`engagement-${popup.id}`} variant="bodyMd" as="p">
        {Math.round(engagementRate * 100) / 100}%
      </Text>,
      <Text key={`completion-${popup.id}`} variant="bodyMd" as="p">
        {Math.round(completionRate * 100) / 100}%
      </Text>,
      <Button key={`action-${popup.id}`} size="micro" url={`/app/analytics/funnels?popupId=${popup.id}`}>
        View Details
      </Button>
    ];
  });

  return (
    <Page
      title="Funnel Analytics"
      subtitle={selectedPopup ? `Detailed funnel analysis for ${selectedPopup.name}` : "Analyze user journey and conversion funnels"}
      backAction={{ content: 'Analytics Overview', url: '/app/analytics/overview' }}
      secondaryActions={[
        { content: 'Performance Metrics', url: '/app/analytics/performance' },
        { content: 'Customer Insights', url: '/app/analytics/customers' }
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

        {/* Funnel Overview Metrics */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.totalImpressions.toLocaleString()}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Impressions</Text>
                  <Text variant="bodySm" as="p" tone="subdued">Funnel entry point</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.engagementRate}%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Engagement Rate</Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    {metrics.totalInteractions} / {metrics.totalImpressions} engaged
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.completionRate}%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Completion Rate</Text>
                  <Text variant="bodySm" as="p" tone="success">
                    {metrics.totalCompletions} successful completions
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.dropoffRate}%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Drop-off Rate</Text>
                  <Text variant="bodySm" as="p" tone="critical">
                    {metrics.totalDropoffs} early exits
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Step-by-Step Funnel Analysis (if specific popup selected) */}
        {selectedPopup && funnelSteps.length > 0 && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2">Step-by-Step Funnel Breakdown</Text>
                <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                  Detailed user journey through each step of the popup
                </Text>
              </div>
              <div style={{ padding: '20px' }}>
                {(funnelSteps as any[]).map((step: any, index: number) => {
                  const views = parseInt(step.step_views) || 0;
                  const completions = parseInt(step.step_completions) || 0;
                  const dropoffs = parseInt(step.step_dropoffs) || 0;
                  const completionRate = views > 0 ? (completions / views) * 100 : 0;
                  const dropoffRate = views > 0 ? (dropoffs / views) * 100 : 0;
                  
                  return (
                    <div key={step.stepNumber} style={{ marginBottom: '25px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          Step {step.stepNumber}
                        </Text>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <Text variant="bodySm" as="p" tone="subdued">
                            {views} views
                          </Text>
                          <Text variant="bodySm" as="p" tone="success">
                            {completions} completions
                          </Text>
                          <Text variant="bodySm" as="p" tone="critical">
                            {dropoffs} drop-offs
                          </Text>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <Text variant="bodySm" as="p" style={{ marginBottom: '4px' }}>
                              Completion Rate: {Math.round(completionRate * 100) / 100}%
                            </Text>
                            <ProgressBar progress={completionRate} size="small" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <Text variant="bodySm" as="p" style={{ marginBottom: '4px' }}>
                              Drop-off Rate: {Math.round(dropoffRate * 100) / 100}%
                            </Text>
                            <ProgressBar progress={dropoffRate} size="small" />
                          </div>
                        </div>
                      </div>
                      
                      {index < funnelSteps.length - 1 && <Divider style={{ marginTop: '16px' }} />}
                    </div>
                  );
                })}
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* Funnel Performance Comparison */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Popup Funnel Comparison</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Compare funnel performance across all your popups
              </Text>
            </div>
            {popupFunnels.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'text']}
                  headings={['Popup Name', 'Status', 'Impressions', 'Interactions', 'Completions', 'Engagement %', 'Completion %', 'Actions']}
                  rows={funnelTableRows}
                />
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  heading="No funnel data available"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create and activate popups to see funnel analytics and user journey data</p>
                  <div style={{ marginTop: '15px' }}>
                    <Button variant="primary" url="/app/popups/new">Create Your First Popup</Button>
                  </div>
                </EmptyState>
              </div>
            )}
          </Card>
        </Layout.Section>

        {/* Funnel Insights */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Funnel Insights</Text>
              <div style={{ marginTop: '16px' }}>
                <BlockStack gap="300">
                  <div style={{ padding: '12px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      Overall Conversion Rate: {metrics.conversionRate}%
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Of users who interact with your popups, {metrics.conversionRate}% complete the full journey
                    </Text>
                  </div>
                  
                  {metrics.engagementRate > 0 && (
                    <div style={{ padding: '12px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Engagement Analysis
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {metrics.engagementRate > 50 ? 
                          'Good engagement! Most visitors are interacting with your popups.' :
                          'Consider optimizing popup timing and positioning to improve engagement.'
                        }
                      </Text>
                    </div>
                  )}
                  
                  {metrics.dropoffRate > 30 && (
                    <div style={{ padding: '12px', backgroundColor: '#fef7f0', borderRadius: '8px' }}>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        High Drop-off Rate Detected
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {metrics.dropoffRate}% of users are dropping off. Consider simplifying your popup flow or adjusting the timing.
                      </Text>
                    </div>
                  )}
                </BlockStack>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}