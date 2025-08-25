import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useMemo } from "react";
import { 
  Page, 
  Layout, 
  Card, 
  DataTable, 
  Button, 
  EmptyState,
  Text,
  Select
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";
import { redirect } from "@remix-run/node";
import { FunnelBarChart } from "../components/charts/FunnelBarChart";
import { DropoffBarChart } from "../components/charts/DropoffBarChart";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ConversionLineChart } from "../components/charts/ConversionLineChart";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if analytics are available (only in multi-popup mode)
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session } = await authenticate.admin(request);
  
  // Get popup filter from URL search params
  const url = new URL(request.url);
  const selectedPopupId = url.searchParams.get('popup') || 'all';
  
  // Get analytics data for this shop
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        orderBy: { updatedAt: 'desc' }
      },
      emails: {
        take: 50,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Calculate basic stats (existing working logic)
  const totalEmails = shop.emails.length;
  const activePopups = shop.popups.filter(p => p.status === 'ACTIVE').length;
  const totalPopups = shop.popups.length;

  // Build filter condition for popup
  const popupFilter = selectedPopupId === 'all' ? {} : { popupId: selectedPopupId };

  // Get real funnel data from CustomerSession table
  let funnelData = {
    impressions: 0,
    step1Completions: 0,
    step2Completions: 0,
    step3Completions: 0,
    emailCompletions: 0,
    // Dropoff rates (calculated)
    step1Dropoff: 0,
    step2Dropoff: 0,
    step3Dropoff: 0,
    emailDropoff: 0,
    // Conversion rates
    overallConversionRate: 0,
    emailConversionRate: 0
  };

  try {
    // Get funnel metrics from CustomerSession table using our corrected tracking fields
    const sessionsData = await prisma.customerSession.groupBy({
      by: ['id'],
      where: {
        shopId: shop.id,
        ...popupFilter
      },
      _count: {
        id: true
      }
    });

    // Get detailed funnel breakdown
    const funnelMetrics = await prisma.customerSession.findMany({
      where: {
        shopId: shop.id,
        ...popupFilter
      },
      select: {
        stepsViewed: true,
        stepsCompleted: true,
        emailProvided: true,
        completedAt: true
      }
    });

    // Calculate funnel stages
    const totalImpressions = funnelMetrics.length;
    const step1Completions = funnelMetrics.filter(session => session.stepsCompleted >= 1).length;
    const step2Completions = funnelMetrics.filter(session => session.stepsCompleted >= 2).length;
    const step3Completions = funnelMetrics.filter(session => session.stepsCompleted >= 3).length;
    const emailCompletions = funnelMetrics.filter(session => session.emailProvided).length;

    // Calculate dropoff rates
    const step1Dropoff = totalImpressions > 0 ? Math.round(((totalImpressions - step1Completions) / totalImpressions) * 100) : 0;
    const step2Dropoff = step1Completions > 0 ? Math.round(((step1Completions - step2Completions) / step1Completions) * 100) : 0;
    const step3Dropoff = step2Completions > 0 ? Math.round(((step2Completions - step3Completions) / step2Completions) * 100) : 0;
    const emailDropoff = step3Completions > 0 ? Math.round(((step3Completions - emailCompletions) / step3Completions) * 100) : 0;

    // Calculate conversion rates
    const overallConversionRate = totalImpressions > 0 ? Math.round((emailCompletions / totalImpressions) * 100) : 0;
    const emailConversionRate = totalImpressions > 0 ? Math.round((emailCompletions / totalImpressions) * 100) : 0;

    funnelData = {
      impressions: totalImpressions,
      step1Completions,
      step2Completions,
      step3Completions,
      emailCompletions,
      // Dropoff rates
      step1Dropoff: Math.max(0, step1Dropoff),
      step2Dropoff: Math.max(0, step2Dropoff),
      step3Dropoff: Math.max(0, step3Dropoff),
      emailDropoff: Math.max(0, emailDropoff),
      // Conversion rates
      overallConversionRate,
      emailConversionRate
    };
  } catch (error) {
    console.log('CustomerSession analytics query error:', error);
    // Keep default values if queries fail
  }

  return { 
    shop,
    stats: {
      totalEmails,
      activePopups, 
      totalPopups
    },
    funnelData,
    recentEmails: shop.emails,
    selectedPopupId,
    popups: shop.popups
  };
}

export default function FunnelAnalytics() {
  const { shop, stats, funnelData, recentEmails, selectedPopupId, popups } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Memoize all loader data to prevent recreation on every render
  const stableFunnelData = useMemo(() => funnelData, [
    funnelData.impressions,
    funnelData.step1Completions,
    funnelData.step2Completions,
    funnelData.step3Completions,
    funnelData.emailCompletions,
    funnelData.step1Dropoff,
    funnelData.step2Dropoff,
    funnelData.step3Dropoff,
    funnelData.emailDropoff,
    funnelData.overallConversionRate
  ]);

  // Handle popup filter change - wrapped in useCallback to prevent infinite re-renders
  const handlePopupFilterChange = useCallback((value: string) => {
    // Prevent navigation if the value hasn't actually changed
    if ((value === 'all' && selectedPopupId === 'all') || value === selectedPopupId) {
      return;
    }
    
    const currentParams = new URLSearchParams(window.location.search);
    if (value === 'all') {
      currentParams.delete('popup');
    } else {
      currentParams.set('popup', value);
    }
    
    const newUrl = `/app/funnel-analytics${currentParams.toString() ? '?' + currentParams.toString() : ''}`;
    navigate(newUrl);
  }, [selectedPopupId, navigate]);

  // Prepare popup filter options - memoized to prevent recreation on every render
  const popupOptions = useMemo(() => [
    { label: 'All Popups', value: 'all' },
    ...popups.map(popup => ({
      label: popup.name,
      value: popup.id
    }))
  ], [popups]);

  // Prepare recent emails table rows - memoized to prevent recreation on every render
  const emailRows = useMemo(() => recentEmails.map((email: any) => [
    <Text key={`email-${email.id}`} variant="bodyMd" as="p" fontWeight="semibold">
      {email.email}
    </Text>,
    <Text key={`source-${email.id}`} variant="bodyMd" as="p">
      {email.popupId ? `Popup: ${email.popupId.slice(0, 8)}...` : 'Direct'}
    </Text>,
    <Text key={`date-${email.id}`} variant="bodyMd" as="p">
      {new Date(email.createdAt).toLocaleDateString()}
    </Text>
  ]), [recentEmails]);

  return (
    <ErrorBoundary>
      <Page
        title="Funnel Analytics"
        subtitle="Basic funnel insights for your popup campaigns"
        backAction={{
          content: 'Dashboard',
          url: '/app'
        }}
      >
        <Layout>
        {/* Popup Filter */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Filter by Popup</Text>
              <div style={{ marginTop: '12px', maxWidth: '300px' }}>
                <Select
                  label=""
                  options={popupOptions}
                  value={selectedPopupId}
                  onChange={handlePopupFilterChange}
                />
              </div>
            </div>
          </Card>
        </Layout.Section>
        {/* Stats Cards */}
        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stableFunnelData.impressions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">👁️ Total Impressions</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stableFunnelData.step1Completions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">✅ Step 1 Completions</Text>
                <Text variant="bodySm" as="p" tone="subdued">{stableFunnelData.step1Dropoff}% drop-off</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stableFunnelData.step2Completions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">✅ Step 2 Completions</Text>
                <Text variant="bodySm" as="p" tone="subdued">{stableFunnelData.step2Dropoff}% drop-off</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stableFunnelData.step3Completions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">✅ Step 3 Completions</Text>
                <Text variant="bodySm" as="p" tone="subdued">{stableFunnelData.step3Dropoff}% drop-off</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stableFunnelData.emailCompletions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">📧 Email Completions</Text>
                <Text variant="bodySm" as="p" tone="subdued">{stableFunnelData.overallConversionRate}% conversion</Text>
              </div>
            </Card>
          </div>
        </Layout.Section>

        {/* Recent Emails */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Email Captures</Text>
              {recentEmails.length > 0 ? (
                <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                  <DataTable
                    columnContentTypes={['text', 'text', 'text']}
                    headings={['Email', 'Source', 'Date']}
                    rows={emailRows}
                    hasZebraStriping
                  />
                </div>
              ) : (
                <div style={{ marginTop: '16px' }}>
                  <EmptyState
                    heading="No emails captured yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Start capturing emails by activating your popups</p>
                    <div style={{ marginTop: '16px' }}>
                      <Button variant="primary" url="/app/popups">
                        Manage Popups
                      </Button>
                    </div>
                  </EmptyState>
                </div>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Professional Funnel Bar Chart */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Conversion Funnel Chart</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Visual breakdown of user progression through your funnel stages
              </Text>
              
              <div style={{ marginTop: '20px' }}>
                <FunnelBarChart 
                  key="funnel-chart" 
                  data={{
                    impressions: stableFunnelData.impressions,
                    step1Completions: stableFunnelData.step1Completions,
                    step2Completions: stableFunnelData.step2Completions,
                    step3Completions: stableFunnelData.step3Completions,
                    emailCompletions: stableFunnelData.emailCompletions
                  }} 
                />
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Conversion Trends Chart */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Conversion Trends</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Track performance trends over time (sample data shown)
              </Text>
              
              <div style={{ marginTop: '20px' }}>
                <ConversionLineChart data={[]} />
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Professional Dropoff Chart */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Drop-off Analysis Chart</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Identify where users are leaving your funnel most frequently
              </Text>
              
              <div style={{ marginTop: '20px' }}>
                <DropoffBarChart 
                  key="dropoff-chart" 
                  data={{
                    step1Dropoff: stableFunnelData.step1Dropoff,
                    step2Dropoff: stableFunnelData.step2Dropoff,
                    step3Dropoff: stableFunnelData.step3Dropoff,
                    emailDropoff: stableFunnelData.emailDropoff
                  }} 
                />
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Basic Funnel Insight */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Funnel Summary</Text>
              <div style={{ marginTop: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Overall Performance
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                    You have {stableFunnelData.impressions.toLocaleString()} total impressions with {stableFunnelData.emailCompletions} email completions.
                    {stats.activePopups > 0 ? ` ${stats.activePopups} popups are currently active.` : ' No popups are currently active.'}
                    {stableFunnelData.impressions > 0 ? ` Overall conversion rate: ${stableFunnelData.overallConversionRate}%` : ''}
                    {selectedPopupId !== 'all' ? ` (Filtered by popup: ${popups.find(p => p.id === selectedPopupId)?.name || 'Unknown'})` : ' (All popups)'}
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
    </ErrorBoundary>
  );
}