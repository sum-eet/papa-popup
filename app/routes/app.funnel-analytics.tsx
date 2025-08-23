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

        {/* Multi-Step Funnel Visualization */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Multi-Step Conversion Funnel</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Track user progression through each step of your popups
              </Text>
              
              <div style={{ marginTop: '24px' }}>
                {/* Funnel Steps */}
                <div style={{ display: 'grid', gap: '16px' }}>
                  {/* Impressions → Clicks */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">👁️ Impressions → 🖱️ Clicks</Text>
                        <Text variant="bodyMd" as="p">{funnelData.impressions.toLocaleString()} → {funnelData.clicks.toLocaleString()}</Text>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          backgroundColor: funnelData.clickRate > 10 ? '#00AA5B' : funnelData.clickRate > 5 ? '#FFA500' : '#E53E3E',
                          width: `${Math.min(funnelData.clickRate, 100)}%`,
                          borderRadius: '4px'
                        }}></div>
                      </div>
                      <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                        {funnelData.clickRate}% click through rate
                      </Text>
                    </div>
                  </div>

                  {/* Step 1 Views/Completions */}
                  {funnelData.step1Views > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Text variant="bodyMd" as="p" fontWeight="semibold">📝 Step 1 Views → Completions</Text>
                          <Text variant="bodyMd" as="p">{funnelData.step1Views.toLocaleString()} → {funnelData.step1Completions.toLocaleString()}</Text>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            backgroundColor: '#007cba',
                            width: `${funnelData.step1Views > 0 ? Math.min((funnelData.step1Completions / funnelData.step1Views) * 100, 100) : 0}%`,
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                          {funnelData.step1Views > 0 ? Math.round((funnelData.step1Completions / funnelData.step1Views) * 100) : 0}% completion rate
                        </Text>
                      </div>
                    </div>
                  )}

                  {/* Step 2 Views/Completions */}
                  {funnelData.step2Views > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '40px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Text variant="bodyMd" as="p" fontWeight="semibold">📋 Step 2 Views → Completions</Text>
                          <Text variant="bodyMd" as="p">{funnelData.step2Views.toLocaleString()} → {funnelData.step2Completions.toLocaleString()}</Text>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            backgroundColor: '#007cba',
                            width: `${funnelData.step2Views > 0 ? Math.min((funnelData.step2Completions / funnelData.step2Views) * 100, 100) : 0}%`,
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                          {funnelData.step2Views > 0 ? Math.round((funnelData.step2Completions / funnelData.step2Views) * 100) : 0}% completion rate
                        </Text>
                      </div>
                    </div>
                  )}

                  {/* Step 3 Views/Completions */}
                  {funnelData.step3Views > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '60px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Text variant="bodyMd" as="p" fontWeight="semibold">📊 Step 3 Views → Completions</Text>
                          <Text variant="bodyMd" as="p">{funnelData.step3Views.toLocaleString()} → {funnelData.step3Completions.toLocaleString()}</Text>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            backgroundColor: '#007cba',
                            width: `${funnelData.step3Views > 0 ? Math.min((funnelData.step3Completions / funnelData.step3Views) * 100, 100) : 0}%`,
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                          {funnelData.step3Views > 0 ? Math.round((funnelData.step3Completions / funnelData.step3Views) * 100) : 0}% completion rate
                        </Text>
                      </div>
                    </div>
                  )}

                  {/* Email Submissions */}
                  {funnelData.emailSubmissions > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '80px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Text variant="bodyMd" as="p" fontWeight="semibold">📧 Email Submissions</Text>
                          <Text variant="bodyMd" as="p">{funnelData.emailSubmissions.toLocaleString()}</Text>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#00AA5B', borderRadius: '4px' }}></div>
                        <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                          Final conversion achieved
                        </Text>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Dropoff Analysis */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Drop-off Analysis</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Identify where users are leaving your funnel most frequently
              </Text>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '20px' }}>
                {/* Click to Step 1 Dropoff */}
                {funnelData.clickToStep1Dropoff > 0 && (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#fef7f0', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${funnelData.clickToStep1Dropoff > 50 ? '#E53E3E' : funnelData.clickToStep1Dropoff > 25 ? '#FFA500' : '#00AA5B'}`
                  }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">Click → Step 1</Text>
                    <Text variant="headingLg" as="p" style={{color: funnelData.clickToStep1Dropoff > 50 ? '#E53E3E' : funnelData.clickToStep1Dropoff > 25 ? '#FFA500' : '#00AA5B'}}>
                      {funnelData.clickToStep1Dropoff}% drop-off
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                      Users who click but don't start Step 1
                    </Text>
                  </div>
                )}

                {/* Step 1 to Step 2 Dropoff */}
                {funnelData.step1ToStep2Dropoff > 0 && (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#fef7f0', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${funnelData.step1ToStep2Dropoff > 50 ? '#E53E3E' : funnelData.step1ToStep2Dropoff > 25 ? '#FFA500' : '#00AA5B'}`
                  }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">Step 1 → Step 2</Text>
                    <Text variant="headingLg" as="p" style={{color: funnelData.step1ToStep2Dropoff > 50 ? '#E53E3E' : funnelData.step1ToStep2Dropoff > 25 ? '#FFA500' : '#00AA5B'}}>
                      {funnelData.step1ToStep2Dropoff}% drop-off
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                      Users who abandon after Step 1
                    </Text>
                  </div>
                )}

                {/* Step 2 to Step 3 Dropoff */}
                {funnelData.step2ToStep3Dropoff > 0 && (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#fef7f0', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${funnelData.step2ToStep3Dropoff > 50 ? '#E53E3E' : funnelData.step2ToStep3Dropoff > 25 ? '#FFA500' : '#00AA5B'}`
                  }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">Step 2 → Step 3</Text>
                    <Text variant="headingLg" as="p" style={{color: funnelData.step2ToStep3Dropoff > 50 ? '#E53E3E' : funnelData.step2ToStep3Dropoff > 25 ? '#FFA500' : '#00AA5B'}}>
                      {funnelData.step2ToStep3Dropoff}% drop-off
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                      Users who leave during Step 2
                    </Text>
                  </div>
                )}

                {/* Step 3 to Email Dropoff */}
                {funnelData.step3ToEmailDropoff > 0 && (
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#fef7f0', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${funnelData.step3ToEmailDropoff > 50 ? '#E53E3E' : funnelData.step3ToEmailDropoff > 25 ? '#FFA500' : '#00AA5B'}`
                  }}>
                    <Text variant="bodyMd" as="p" fontWeight="semibold">Step 3 → Email</Text>
                    <Text variant="headingLg" as="p" style={{color: funnelData.step3ToEmailDropoff > 50 ? '#E53E3E' : funnelData.step3ToEmailDropoff > 25 ? '#FFA500' : '#00AA5B'}}>
                      {funnelData.step3ToEmailDropoff}% drop-off
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                      Users who complete steps but don't provide email
                    </Text>
                  </div>
                )}
              </div>

              {/* No data message */}
              {funnelData.impressions === 0 && (
                <div style={{ textAlign: 'center', marginTop: '20px', padding: '20px' }}>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    No funnel data available yet. Activate your popups to start collecting analytics.
                  </Text>
                </div>
              )}
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