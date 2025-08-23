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

  // Add PopupAnalytics data safely
  let funnelData = {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    clickRate: 0,
    conversionRate: 0
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

    // Calculate rates safely
    const clickRate = impressionsCount > 0 ? Math.round((clicksCount / impressionsCount) * 100) : 0;
    const conversionRate = clicksCount > 0 ? Math.round((conversionsCount / clicksCount) * 100) : 0;

    funnelData = {
      impressions: impressionsCount,
      clicks: clicksCount,
      conversions: conversionsCount,
      clickRate,
      conversionRate
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

        {/* Basic Funnel Insight */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Funnel Overview</Text>
              <div style={{ marginTop: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Email Collection Rate
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued" style={{ marginTop: '4px' }}>
                    You have collected {stats.totalEmails} emails across {stats.totalPopups} popups.
                    {stats.activePopups > 0 ? ` ${stats.activePopups} popups are currently active.` : ' No popups are currently active.'}
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