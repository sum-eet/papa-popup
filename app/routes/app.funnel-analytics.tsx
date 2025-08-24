import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Card, 
  DataTable, 
  Button, 
  EmptyState,
  Text
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";
import { redirect } from "@remix-run/node";
import { FunnelBarChart } from "../components/charts/FunnelBarChart";
import { DropoffBarChart } from "../components/charts/DropoffBarChart";
import { ConversionLineChart } from "../components/charts/ConversionLineChart";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if analytics are available (only in multi-popup mode)
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session } = await authenticate.admin(request);
  
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

  // Add PopupAnalytics data safely with multi-step tracking
  let funnelData = {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    clickRate: 0,
    conversionRate: 0,
    // Multi-step tracking
    step1Views: 0,
    step2Views: 0,
    step3Views: 0,
    step1Completions: 0,
    step2Completions: 0,
    step3Completions: 0,
    emailSubmissions: 0,
    // Dropoff rates
    clickToStep1Dropoff: 0,
    step1ToStep2Dropoff: 0,
    step2ToStep3Dropoff: 0,
    step3ToEmailDropoff: 0
  };

  try {
    // Get basic funnel metrics from PopupAnalytics
    const impressionsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'impression'
      }
    });

    const clicksCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'click'
      }
    });

    const conversionsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'complete'
      }
    });

    // Get step-specific analytics
    const step1ViewsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'step_view',
        stepNumber: 1
      }
    });

    const step2ViewsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'step_view',
        stepNumber: 2
      }
    });

    const step3ViewsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'step_view',
        stepNumber: 3
      }
    });

    const step1CompletionsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'step_complete',
        stepNumber: 1
      }
    });

    const step2CompletionsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'step_complete',
        stepNumber: 2
      }
    });

    const step3CompletionsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'step_complete',
        stepNumber: 3
      }
    });

    const emailSubmissionsCount = await prisma.popupAnalytics.count({
      where: {
        shopId: shop.id,
        eventType: 'email_provided'
      }
    });

    // Calculate rates safely
    const clickRate = impressionsCount > 0 ? Math.round((clicksCount / impressionsCount) * 100) : 0;
    const conversionRate = clicksCount > 0 ? Math.round((conversionsCount / clicksCount) * 100) : 0;

    // Calculate dropoff rates
    const clickToStep1Dropoff = clicksCount > 0 ? Math.round(((clicksCount - step1ViewsCount) / clicksCount) * 100) : 0;
    const step1ToStep2Dropoff = step1CompletionsCount > 0 ? Math.round(((step1CompletionsCount - step2ViewsCount) / step1CompletionsCount) * 100) : 0;
    const step2ToStep3Dropoff = step2CompletionsCount > 0 ? Math.round(((step2CompletionsCount - step3ViewsCount) / step2CompletionsCount) * 100) : 0;
    const step3ToEmailDropoff = step3CompletionsCount > 0 ? Math.round(((step3CompletionsCount - emailSubmissionsCount) / step3CompletionsCount) * 100) : 0;

    funnelData = {
      impressions: impressionsCount,
      clicks: clicksCount,
      conversions: conversionsCount,
      clickRate,
      conversionRate,
      // Multi-step data
      step1Views: step1ViewsCount,
      step2Views: step2ViewsCount,
      step3Views: step3ViewsCount,
      step1Completions: step1CompletionsCount,
      step2Completions: step2CompletionsCount,
      step3Completions: step3CompletionsCount,
      emailSubmissions: emailSubmissionsCount,
      // Dropoff rates
      clickToStep1Dropoff: Math.max(0, clickToStep1Dropoff),
      step1ToStep2Dropoff: Math.max(0, step1ToStep2Dropoff),
      step2ToStep3Dropoff: Math.max(0, step2ToStep3Dropoff),
      step3ToEmailDropoff: Math.max(0, step3ToEmailDropoff)
    };
  } catch (error) {
    console.log('PopupAnalytics query error:', error);
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
    recentEmails: shop.emails
  };
}

export default function FunnelAnalytics() {
  const { shop, stats, funnelData, recentEmails } = useLoaderData<typeof loader>();

  // Prepare recent emails table rows
  const emailRows = recentEmails.map((email: any) => [
    <Text key={`email-${email.id}`} variant="bodyMd" as="p" fontWeight="semibold">
      {email.email}
    </Text>,
    <Text key={`source-${email.id}`} variant="bodyMd" as="p">
      {email.popupId ? `Popup: ${email.popupId.slice(0, 8)}...` : 'Direct'}
    </Text>,
    <Text key={`date-${email.id}`} variant="bodyMd" as="p">
      {new Date(email.createdAt).toLocaleDateString()}
    </Text>
  ]);

  return (
    <Page
      title="Funnel Analytics"
      subtitle="Basic funnel insights for your popup campaigns"
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        {/* Stats Cards */}
        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stats.totalEmails}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">📧 Emails Collected</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelData.impressions.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">👁️ Total Impressions</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelData.clicks.toLocaleString()}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">🖱️ Clicks</Text>
                <Text variant="bodySm" as="p" tone="subdued">{funnelData.clickRate}% click rate</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stats.activePopups}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">🟢 Active Popups</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stats.totalPopups}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">📊 Total Popups</Text>
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
                <FunnelBarChart data={funnelData} />
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
                <DropoffBarChart data={{
                  clickToStep1Dropoff: funnelData.clickToStep1Dropoff,
                  step1ToStep2Dropoff: funnelData.step1ToStep2Dropoff,
                  step2ToStep3Dropoff: funnelData.step2ToStep3Dropoff,
                  step3ToEmailDropoff: funnelData.step3ToEmailDropoff
                }} />
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
                    You have collected {stats.totalEmails} emails across {stats.totalPopups} popups.
                    {stats.activePopups > 0 ? ` ${stats.activePopups} popups are currently active.` : ' No popups are currently active.'}
                    {funnelData.impressions > 0 ? ` Overall conversion rate: ${funnelData.conversionRate}%` : ''}
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}