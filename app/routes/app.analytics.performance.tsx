import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
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

  // Calculate date range
  let dateFilter: any = {};
  if (timeframe !== 'all') {
    const days = parseInt(timeframe.replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() - days);
    dateFilter = { createdAt: { gte: date } };
  }

  // Base filter
  const baseFilter = {
    shopId: shop.id,
    ...(popupId && { popupId }),
    ...dateFilter
  };

  // Get comprehensive analytics
  const [
    impressions,
    clicks,
    closes,
    completions,
    emailsCollected,
    stepAnalytics,
    popupPerformance,
    selectedPopup
  ] = await Promise.all([
    // Total impressions
    prisma.popupAnalytics.count({
      where: { ...baseFilter, eventType: 'impression' }
    }),

    // Total clicks/interactions
    prisma.popupAnalytics.count({
      where: { 
        ...baseFilter, 
        eventType: { in: ['click', 'button_click', 'step_complete'] }
      }
    }),

    // Total closes
    prisma.popupAnalytics.count({
      where: { ...baseFilter, eventType: 'close' }
    }),

    // Total completions
    prisma.popupAnalytics.count({
      where: { ...baseFilter, eventType: 'complete' }
    }),

    // Emails collected
    prisma.collectedEmail.count({
      where: {
        shopId: shop.id,
        ...(popupId && { popupId }),
        ...dateFilter
      }
    }),

    // Step-by-step analytics
    popupId ? prisma.$queryRaw`
      SELECT 
        p."stepNumber",
        p."stepType",
        COALESCE(views.count, 0) as views,
        COALESCE(completions.count, 0) as completions
      FROM "PopupStep" p
      LEFT JOIN (
        SELECT "stepNumber", COUNT(*) as count
        FROM "PopupAnalytics" 
        WHERE "popupId" = ${popupId} 
          AND "eventType" = 'step_view'
          ${dateFilter.createdAt ? `AND "createdAt" >= ${dateFilter.createdAt.gte}` : ''}
        GROUP BY "stepNumber"
      ) views ON p."stepNumber" = views."stepNumber"
      LEFT JOIN (
        SELECT "stepNumber", COUNT(*) as count
        FROM "PopupAnalytics" 
        WHERE "popupId" = ${popupId} 
          AND "eventType" = 'step_complete'
          ${dateFilter.createdAt ? `AND "createdAt" >= ${dateFilter.createdAt.gte}` : ''}
        GROUP BY "stepNumber"
      ) completions ON p."stepNumber" = completions."stepNumber"
      WHERE p."popupId" = ${popupId}
      ORDER BY p."stepNumber"
    ` : [],

    // All popup performance comparison
    prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p."popupType",
        p.status,
        COALESCE(impressions.count, 0) as impressions,
        COALESCE(completions.count, 0) as completions,
        COALESCE(emails.count, 0) as emails
      FROM "Popup" p
      LEFT JOIN (
        SELECT "popupId", COUNT(*) as count
        FROM "PopupAnalytics" 
        WHERE "shopId" = ${shop.id} 
          AND "eventType" = 'impression'
          ${dateFilter.createdAt ? `AND "createdAt" >= ${dateFilter.createdAt.gte}` : ''}
        GROUP BY "popupId"
      ) impressions ON p.id = impressions."popupId"
      LEFT JOIN (
        SELECT "popupId", COUNT(*) as count
        FROM "PopupAnalytics" 
        WHERE "shopId" = ${shop.id} 
          AND "eventType" = 'complete'
          ${dateFilter.createdAt ? `AND "createdAt" >= ${dateFilter.createdAt.gte}` : ''}
        GROUP BY "popupId"
      ) completions ON p.id = completions."popupId"
      LEFT JOIN (
        SELECT "popupId", COUNT(*) as count
        FROM "CollectedEmail" 
        WHERE "shopId" = ${shop.id}
          ${dateFilter.createdAt ? `AND "createdAt" >= ${dateFilter.createdAt.gte}` : ''}
        GROUP BY "popupId"
      ) emails ON p.id = emails."popupId"
      WHERE p."shopId" = ${shop.id} AND p."isDeleted" = false
      ORDER BY impressions.count DESC NULLS LAST
    `,

    // Selected popup details
    popupId ? prisma.popup.findUnique({
      where: { id: popupId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    }) : null
  ]);

  // Calculate performance metrics
  const clickRate = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const closeRate = impressions > 0 ? (closes / impressions) * 100 : 0;
  const conversionRate = impressions > 0 ? (emailsCollected / impressions) * 100 : 0;
  const completionRate = impressions > 0 ? (completions / impressions) * 100 : 0;

  return json({
    shop,
    selectedPopup,
    timeframe,
    metrics: {
      impressions,
      clicks,
      closes,
      completions,
      emailsCollected,
      clickRate: Math.round(clickRate * 100) / 100,
      closeRate: Math.round(closeRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100
    },
    stepAnalytics,
    popupPerformance
  });
}

export default function AnalyticsPerformance() {
  const { shop, selectedPopup, timeframe, metrics, stepAnalytics, popupPerformance } = useLoaderData<typeof loader>();
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

  // Prepare popup performance table
  const performanceTableRows = (popupPerformance as any[]).map((popup: any) => {
    const conversionRate = popup.impressions > 0 ? 
      (parseInt(popup.emails) / parseInt(popup.impressions)) * 100 : 0;
    
    return [
      <div key={`name-${popup.id}`}>
        <Text variant="bodyMd" as="p" fontWeight="semibold">{popup.name}</Text>
        <Text variant="bodySm" as="p" tone="subdued">
          {popup.popupType.replace('_', ' ').toLowerCase()}
        </Text>
      </div>,
      <Badge key={`status-${popup.id}`} tone={popup.status === 'ACTIVE' ? 'success' : 'attention'}>
        {popup.status.toLowerCase()}
      </Badge>,
      <Text key={`impressions-${popup.id}`} variant="bodyMd" as="p">
        {parseInt(popup.impressions).toLocaleString()}
      </Text>,
      <Text key={`emails-${popup.id}`} variant="bodyMd" as="p">
        {parseInt(popup.emails).toLocaleString()}
      </Text>,
      <Text key={`conversion-${popup.id}`} variant="bodyMd" as="p">
        {Math.round(conversionRate * 100) / 100}%
      </Text>,
      <Button key={`action-${popup.id}`} size="micro" url={`/app/analytics/performance?popupId=${popup.id}`}>
        View Details
      </Button>
    ];
  });

  return (
    <Page
      title="Performance Analytics"
      subtitle={selectedPopup ? `Detailed analytics for ${selectedPopup.name}` : "Compare popup performance and analyze conversion rates"}
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
                  <Text variant="bodyMd" as="p" tone="subdued">Impressions</Text>
                  <Text variant="bodySm" as="p" tone="subdued">Times popup was shown</Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.clickRate}%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Click Rate</Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    {metrics.clicks} / {metrics.impressions} interactions
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.conversionRate}%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Conversion Rate</Text>
                  <Text variant="bodySm" as="p" tone="success">
                    {metrics.emailsCollected} emails collected
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <Text variant="headingLg" as="h3">{metrics.closeRate}%</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Close Rate</Text>
                  <Text variant="bodySm" as="p" tone="critical">
                    {metrics.closes} closes without conversion
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Step-by-Step Analysis (if specific popup selected) */}
        {selectedPopup && stepAnalytics.length > 0 && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2">Step-by-Step Funnel Analysis</Text>
                <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                  Track how users progress through each step of your popup
                </Text>
              </div>
              <div style={{ padding: '20px' }}>
                {(stepAnalytics as any[]).map((step: any, index: number) => {
                  const views = parseInt(step.views) || 0;
                  const completions = parseInt(step.completions) || 0;
                  const completionRate = views > 0 ? (completions / views) * 100 : 0;
                  const dropOff = views - completions;
                  
                  return (
                    <div key={step.stepNumber} style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          Step {step.stepNumber}: {step.stepType.replace('_', ' ')}
                        </Text>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <Text variant="bodySm" as="p" tone="subdued">
                            {views} views
                          </Text>
                          <Text variant="bodySm" as="p" tone="success">
                            {completions} completions
                          </Text>
                          <Text variant="bodySm" as="p" tone="critical">
                            {dropOff} drop-offs
                          </Text>
                        </div>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <ProgressBar 
                          progress={completionRate} 
                          size="small"
                        />
                      </div>
                      <Text variant="bodySm" as="p" tone="subdued">
                        {Math.round(completionRate * 100) / 100}% completion rate
                        {dropOff > 0 && ` • ${Math.round((dropOff / views) * 10000) / 100}% drop-off`}
                      </Text>
                      {index < stepAnalytics.length - 1 && <Divider style={{ marginTop: '16px' }} />}
                    </div>
                  );
                })}
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* All Popups Performance Comparison */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Popup Performance Comparison</Text>
            </div>
            {popupPerformance.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'numeric', 'numeric', 'text']}
                headings={['Popup Name', 'Status', 'Impressions', 'Emails', 'Conversion %', 'Actions']}
                rows={performanceTableRows}
                hasZebraStriping
              />
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