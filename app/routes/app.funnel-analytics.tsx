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
  
  // Get funnel data for this shop
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        orderBy: { updatedAt: 'desc' }
      },
      customerSessions: {
        take: 100,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  // Form complexity analysis
  const oneStepForms = shop.popups.filter(p => p.totalSteps === 1).length;
  const twoStepForms = shop.popups.filter(p => p.totalSteps === 2).length;
  const threeStepForms = shop.popups.filter(p => p.totalSteps >= 3).length;

  // Customer session analysis
  const totalSessions = shop.customerSessions.length;
  const completedSessions = shop.customerSessions.filter(s => s.completedAt !== null).length;
  const emailProvidedSessions = shop.customerSessions.filter(s => s.emailProvided).length;
  const discountGeneratedSessions = shop.customerSessions.filter(s => s.discountCode !== null).length;

  // Step progression analysis
  const sessionsStep1 = shop.customerSessions.filter(s => s.stepsViewed >= 1).length;
  const sessionsStep2 = shop.customerSessions.filter(s => s.stepsViewed >= 2).length;
  const sessionsStep3 = shop.customerSessions.filter(s => s.stepsViewed >= 3).length;

  // Calculate rates
  const emailCaptureRate = totalSessions > 0 ? (emailProvidedSessions / totalSessions) * 100 : 0;
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  const discountGenerationRate = totalSessions > 0 ? (discountGeneratedSessions / totalSessions) * 100 : 0;

  return {
    shop,
    funnelStats: {
      // Form complexity
      oneStepForms,
      twoStepForms,
      threeStepForms,
      totalForms: shop.popups.length,
      
      // Session metrics
      totalSessions,
      completedSessions,
      emailProvidedSessions,
      discountGeneratedSessions,
      
      // Step progression
      sessionsStep1,
      sessionsStep2,
      sessionsStep3,
      
      // Conversion rates
      emailCaptureRate: Math.round(emailCaptureRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      discountGenerationRate: Math.round(discountGenerationRate * 100) / 100
    },
    recentSessions: shop.customerSessions.slice(0, 10)
  };
}


export default function FunnelAnalytics() {
  const { shop, funnelStats, recentSessions } = useLoaderData<typeof loader>();

  // Prepare recent sessions table rows
  const sessionRows = recentSessions.map((session: any) => [
    <Text key={`session-${session.id}`} variant="bodyMd" as="p" fontWeight="semibold">
      {session.sessionToken.slice(0, 8)}...
    </Text>,
    <Text key={`steps-${session.id}`} variant="bodyMd" as="p">
      {session.stepsViewed} / {session.stepsCompleted}
    </Text>,
    <Text key={`email-${session.id}`} variant="bodyMd" as="p">
      {session.emailProvided ? '✅ Yes' : '❌ No'}
    </Text>,
    <Text key={`discount-${session.id}`} variant="bodyMd" as="p">
      {session.discountCode ? '🎟️ Generated' : '❌ None'}
    </Text>,
    <Text key={`status-${session.id}`} variant="bodyMd" as="p">
      {session.completedAt ? '✅ Completed' : '⏳ In Progress'}
    </Text>,
    <Text key={`date-${session.id}`} variant="bodySm" as="p" tone="subdued">
      {new Date(session.createdAt).toLocaleDateString()}
    </Text>
  ]);

  return (
    <Page
      title="Conversion Funnel Analytics"
      subtitle="Track user journey and conversion patterns across your popup forms"
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        {/* Form Complexity Analysis */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Form Complexity Distribution</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.oneStepForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">1-Step Forms</Text>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.twoStepForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">2-Step Forms</Text>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.threeStepForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">3+ Step Forms</Text>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                  <Text variant="headingLg" as="p">{funnelStats.totalForms}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">Total Forms</Text>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Conversion Funnel Stats */}
        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.totalSessions}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">Total Sessions Started</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.emailProvidedSessions}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">Emails Captured</Text>
                <Text variant="bodySm" as="p" tone="success">{funnelStats.emailCaptureRate}% rate</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.discountGeneratedSessions}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">Discounts Generated</Text>
                <Text variant="bodySm" as="p" tone="success">{funnelStats.discountGenerationRate}% rate</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{funnelStats.completedSessions}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">Sessions Completed</Text>
                <Text variant="bodySm" as="p" tone="success">{funnelStats.completionRate}% rate</Text>
              </div>
            </Card>
          </div>
        </Layout.Section>

        {/* Step Progression Funnel */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Step Progression Funnel</Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginTop: '8px' }}>
                Track how users progress through each step of your forms
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', padding: '0 20px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: '#007cba', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: '8px' }}>
                    <Text variant="headingMd" as="p">{funnelStats.sessionsStep1}</Text>
                  </div>
                  <Text variant="bodyMd" as="p">Step 1 Views</Text>
                </div>
                
                <div style={{ flex: 0.5, textAlign: 'center', color: '#666' }}>→</div>
                
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: '#46a049', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: '8px' }}>
                    <Text variant="headingMd" as="p">{funnelStats.sessionsStep2}</Text>
                  </div>
                  <Text variant="bodyMd" as="p">Step 2 Views</Text>
                </div>
                
                <div style={{ flex: 0.5, textAlign: 'center', color: '#666' }}>→</div>
                
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: '#ff9800', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: '8px' }}>
                    <Text variant="headingMd" as="p">{funnelStats.sessionsStep3}</Text>
                  </div>
                  <Text variant="bodyMd" as="p">Step 3+ Views</Text>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Recent Sessions */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Recent Customer Sessions</Text>
              {recentSessions.length > 0 ? (
                <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Session ID', 'Steps (Viewed/Completed)', 'Email Provided', 'Discount', 'Status', 'Date']}
                    rows={sessionRows}
                    hasZebraStriping
                  />
                </div>
              ) : (
                <div style={{ marginTop: '16px' }}>
                  <EmptyState
                    heading="No customer sessions yet"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Customer session data will appear here once users start interacting with your popups</p>
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
      </Layout>
    </Page>
  );
}