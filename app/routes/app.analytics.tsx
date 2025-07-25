import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Card, 
  Text,
  Grid,
  DataTable,
  EmptyState,
  Badge,
  Divider
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";
import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check feature flag
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session } = await authenticate.admin(request);
  
  // Get analytics data
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        include: {
          steps: true
        }
      },
      emails: {
        include: {
          customerSession: {
            select: {
              popupId: true,
              popup: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Recent emails for analysis
      }
    }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Calculate time periods
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Analytics calculations
  const emailsToday = shop.emails.filter(e => e.createdAt >= today).length;
  const emailsYesterday = shop.emails.filter(e => e.createdAt >= yesterday && e.createdAt < today).length;
  const emailsThisWeek = shop.emails.filter(e => e.createdAt >= weekAgo).length;
  const emailsThisMonth = shop.emails.filter(e => e.createdAt >= monthAgo).length;

  // Popup performance
  const popupStats = shop.popups.map(popup => {
    const popupEmails = shop.emails.filter(e => 
      e.customerSession?.popupId === popup.id
    );
    
    return {
      id: popup.id,
      name: popup.name,
      status: popup.status,
      totalSteps: popup.totalSteps,
      emailsCollected: popupEmails.length,
      scriptTagId: popup.scriptTagId,
      createdAt: popup.createdAt
    };
  });

  // Top performing popup
  const topPopup = popupStats.reduce((best, current) => {
    return current.emailsCollected > (best?.emailsCollected || 0) ? current : best;
  }, null as any);

  return {
    stats: {
      totalPopups: shop.popups.length,
      activePopups: shop.popups.filter(p => p.status === 'ACTIVE').length,
      totalEmails: shop.emails.length,
      emailsToday,
      emailsYesterday,
      emailsThisWeek,
      emailsThisMonth,
      conversionRate: shop.popups.length > 0 ? Math.round((shop.emails.length / shop.popups.length) * 10) / 10 : 0
    },
    popupStats,
    topPopup,
    recentEmails: shop.emails.slice(0, 20) // Most recent 20 emails
  };
}

export default function Analytics() {
  const { stats, popupStats, topPopup, recentEmails } = useLoaderData<typeof loader>();

  // Prepare popup performance table
  const popupTableRows = popupStats.map((popup: any) => [
    <div key={`name-${popup.id}`}>
      <Text variant="bodyMd" as="p" fontWeight="semibold">{popup.name}</Text>
      <Text variant="bodySm" as="p" tone="subdued">
        {popup.totalSteps} step{popup.totalSteps !== 1 ? 's' : ''} • 
        Created {new Date(popup.createdAt).toLocaleDateString()}
      </Text>
    </div>,
    <Badge key={`status-${popup.id}`} tone={popup.status === 'ACTIVE' ? 'success' : 'subdued'}>
      {popup.status.toLowerCase()}
    </Badge>,
    <Text key={`emails-${popup.id}`} variant="bodyMd" as="p">
      {popup.emailsCollected}
    </Text>,
    <Text key={`script-${popup.id}`} variant="bodySm" as="p" tone="subdued">
      {popup.scriptTagId || 'No script tag'}
    </Text>
  ]);

  // Prepare recent emails table
  const emailTableRows = recentEmails.map((email: any) => [
    <Text key={`email-${email.id}`} variant="bodyMd" as="p">
      {email.email}
    </Text>,
    <Text key={`source-${email.id}`} variant="bodyMd" as="p">
      {email.customerSession?.popup?.name || 'Legacy Popup'}
    </Text>,
    <Text key={`date-${email.id}`} variant="bodyMd" as="p">
      {new Date(email.createdAt).toLocaleDateString()}
    </Text>,
    <Text key={`time-${email.id}`} variant="bodySm" as="p" tone="subdued">
      {new Date(email.createdAt).toLocaleTimeString()}
    </Text>
  ]);

  return (
    <Page
      title="Analytics Dashboard"
      subtitle="Track your popup performance and email collection metrics"
      backAction={{
        content: 'Back to Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        {/* Key Metrics */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Overview</Text>
              <div style={{ marginTop: '16px' }}>
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{stats.totalEmails}</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">Total Emails</Text>
                    </div>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{stats.emailsToday}</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">Today</Text>
                      {stats.emailsYesterday > 0 && (
                        <Text variant="bodySm" as="p" tone={stats.emailsToday >= stats.emailsYesterday ? "success" : "critical"}>
                          {stats.emailsToday >= stats.emailsYesterday ? '+' : ''}{stats.emailsToday - stats.emailsYesterday} vs yesterday
                        </Text>
                      )}
                    </div>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{stats.emailsThisWeek}</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">This Week</Text>
                    </div>
                  </Grid.Cell>
                  
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{stats.activePopups}</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">Active Popups</Text>
                    </div>
                  </Grid.Cell>
                </Grid>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Top Performing Popup */}
        {topPopup && (
          <Layout.Section>
            <Card>
              <div style={{ padding: '20px' }}>
                <Text variant="headingMd" as="h2">Top Performing Popup</Text>
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <Text variant="headingMd" as="h3">{topPopup.name}</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        {topPopup.emailsCollected} email{topPopup.emailsCollected !== 1 ? 's' : ''} collected
                      </Text>
                    </div>
                    <Badge tone="success">{topPopup.emailsCollected} emails</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* Popup Performance Table */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Popup Performance</Text>
            </div>
            {popupStats.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'text']}
                headings={['Popup Name', 'Status', 'Emails Collected', 'Script Tag']}
                rows={popupTableRows}
                hasZebraStriping
              />
            ) : (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  heading="No popup data available"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create some popups to see performance analytics</p>
                </EmptyState>
              </div>
            )}
          </Card>
        </Layout.Section>

        {/* Recent Email Submissions */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Email Submissions</Text>
            </div>
            {recentEmails.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text']}
                headings={['Email', 'Source Popup', 'Date', 'Time']}
                rows={emailTableRows}
                hasZebraStriping
              />
            ) : (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  heading="No email submissions yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Email submissions will appear here once visitors start subscribing</p>
                </EmptyState>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}