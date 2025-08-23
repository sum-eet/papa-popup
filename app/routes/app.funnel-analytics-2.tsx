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

  // Calculate analytics stats
  const totalEmails = shop.emails.length;
  const activePopups = shop.popups.filter(p => p.status === 'ACTIVE').length;
  const totalPopups = shop.popups.length;

  return { 
    shop,
    stats: {
      totalEmails,
      activePopups, 
      totalPopups
    },
    recentEmails: shop.emails
  };
}


export default function FunnelAnalytics2() {
  const { shop, stats, recentEmails } = useLoaderData<typeof loader>();

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
      title="Analytics Overview"
      subtitle="Performance insights for your popup campaigns"
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        {/* Stats Cards */}
        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stats.totalEmails}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">Total Emails Collected</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stats.activePopups}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">Active Popups</Text>
              </div>
            </Card>
            
            <Card>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Text variant="headingXl" as="p">{stats.totalPopups}</Text>
                <Text variant="bodyMd" as="p" tone="subdued">Total Popups</Text>
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
      </Layout>
    </Page>
  );
}