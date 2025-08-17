import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { 
  Page, 
  Layout, 
  Card, 
  DataTable, 
  Button, 
  EmptyState,
  Badge,
  Text,
  Banner
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
  
  // Get all popups for this shop
  const shop = await prisma.shop.findUnique({
    where: { domain: session.shop },
    include: {
      popups: {
        where: { isDeleted: false },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }
    }
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  return { popups: shop.popups };
}

function PopupStatusBadge({ status }: { status: string }) {
  const tone = status === 'ACTIVE' ? 'success' : 
               status === 'DRAFT' ? 'attention' : 
               status === 'PAUSED' ? 'subdued' : 'critical';
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}

export default function PopupsList() {
  const { popups } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleStatusToggle = (popupId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    fetcher.submit(
      { popupId, status: newStatus },
      { method: 'POST', action: '/app/api/popups/status' }
    );
  };

  const handleDelete = (popupId: string, popupName: string) => {
    const popup = popups.find(p => p.id === popupId);
    const isActive = popup?.status === 'ACTIVE';
    
    const confirmMessage = isActive 
      ? `⚠️ "${popupName}" is currently ACTIVE and showing to customers. Deleting it will remove the popup from your store and delete its script tag. Are you sure you want to continue?`
      : `Are you sure you want to delete "${popupName}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      fetcher.submit(
        { popupId },
        { method: 'DELETE', action: '/app/api/popups/delete' }
      );
    }
  };

  // Check if we have a successful action response
  const actionData = fetcher.data;
  const isLoading = fetcher.state === 'submitting';
  const [showBanner, setShowBanner] = useState(true);

  // Auto-hide success banner after 5 seconds
  useEffect(() => {
    if (actionData?.success && showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionData?.success, showBanner]);

  // Reset banner visibility when new action data arrives
  useEffect(() => {
    if (actionData) {
      setShowBanner(true);
    }
  }, [actionData]);

  // Prepare table rows
  const tableRows = popups.map((popup: any) => [
    <div key={`name-${popup.id}`}>
      <Text variant="bodyMd" as="p" fontWeight="semibold">{popup.name}</Text>
      <Text variant="bodySm" as="p" tone="subdued">
        {popup.totalSteps} step{popup.totalSteps !== 1 ? 's' : ''} • 
        Created {new Date(popup.createdAt).toLocaleDateString()}
        {popup.scriptTagId && (
          <> • Script: {popup.scriptTagId}</>
        )}
      </Text>
    </div>,
    
    <div key={`status-${popup.id}`}>
      <PopupStatusBadge status={popup.status} />
      {popup.status === 'ACTIVE' && popup.scriptTagId && (
        <div style={{ marginTop: '4px' }}>
          <Text variant="bodySm" as="p" tone="subdued">
            Script Tag: {popup.scriptTagId}
          </Text>
        </div>
      )}
    </div>,
    
    <Text key={`type-${popup.id}`} variant="bodyMd" as="p">
      {popup.popupType.replace('_', ' ').toLowerCase()}
    </Text>,
    
    <Text key={`pages-${popup.id}`} variant="bodyMd" as="p">
      {(() => {
        try {
          const rules = typeof popup.targetingRules === 'string' 
            ? JSON.parse(popup.targetingRules) 
            : popup.targetingRules;
          const pages = rules.pages || ['all'];
          return pages.includes('all') ? 'All pages' : pages.join(', ');
        } catch {
          return 'All pages';
        }
      })()}
    </Text>,
    
    <div key={`actions-${popup.id}`} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Button
        size="micro"
        variant="secondary"
        url={`/app/popups/${popup.id}/edit`}
        disabled={isLoading}
      >
        Edit
      </Button>

      <Button
        size="micro"
        variant="secondary"
        url={`/app/popups/${popup.id}/design`}
        disabled={isLoading}
      >
        Design
      </Button>
      
      <Button
        size="micro"
        variant="secondary"
        onClick={() => handleStatusToggle(popup.id, popup.status)}
        loading={isLoading && fetcher.formData?.get('popupId') === popup.id && fetcher.formData?.get('status')}
        disabled={isLoading && fetcher.formData?.get('popupId') !== popup.id}
      >
        {isLoading && fetcher.formData?.get('popupId') === popup.id && fetcher.formData?.get('status')
          ? (fetcher.formData.get('status') === 'ACTIVE' ? 'Activating...' : 'Pausing...')
          : (popup.status === 'ACTIVE' ? 'Pause' : 'Activate')
        }
      </Button>
      
      <Button
        size="micro"
        variant="secondary"
        tone="critical"
        onClick={() => handleDelete(popup.id, popup.name)}
        loading={isLoading && fetcher.formData?.get('popupId') === popup.id && fetcher.method === 'DELETE'}
        disabled={isLoading && !(fetcher.formData?.get('popupId') === popup.id && fetcher.method === 'DELETE')}
      >
        {isLoading && fetcher.formData?.get('popupId') === popup.id && fetcher.method === 'DELETE'
          ? 'Deleting...'
          : 'Delete'
        }
      </Button>
      
      <Button
        size="micro"
        variant="secondary"
        url={`/app/popups/${popup.id}/preview`}
        disabled={isLoading}
      >
        Preview
      </Button>
    </div>
  ]);

  return (
    <Page
      title="Manage Popups"
      subtitle={`${popups.length} popup${popups.length !== 1 ? 's' : ''} created`}
      primaryAction={{
        content: 'Create New Popup',
        url: '/app/popups/new',
        variant: 'primary'
      }}
      backAction={{
        content: 'Dashboard',
        url: '/app'
      }}
    >
      <Layout>
        {actionData && showBanner && (
          <Layout.Section>
            {actionData.success ? (
              <Banner 
                status="success"
                onDismiss={() => setShowBanner(false)}
              >
                <p>✅ {actionData.message}</p>
                {actionData.popup?.scriptTagId && (
                  <p>Script tag created with ID: {actionData.popup.scriptTagId}</p>
                )}
              </Banner>
            ) : (
              <Banner 
                status="critical"
                onDismiss={() => setShowBanner(false)}
              >
                <p>❌ Error: {actionData.error}</p>
              </Banner>
            )}
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Card>
            {popups.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={['Popup Name', 'Status', 'Type', 'Target Pages', 'Actions']}
                rows={tableRows}
                hasZebraStriping
              />
            ) : (
              <EmptyState
                heading="No popups created yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Create your first popup to start collecting emails and engaging customers</p>
                <div style={{ marginTop: '16px' }}>
                  <Button variant="primary" url="/app/popups/new">
                    Create Your First Popup
                  </Button>
                </div>
              </EmptyState>
            )}
          </Card>
        </Layout.Section>

        {/* Stats Summary */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Quick Stats</Text>
              <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
                <div>
                  <Text variant="headingLg" as="p">{popups.filter(p => p.status === 'ACTIVE').length}</Text>
                  <Text variant="bodySm" as="p" tone="subdued">Active popups</Text>
                </div>
                <div>
                  <Text variant="headingLg" as="p">{popups.filter(p => p.status === 'DRAFT').length}</Text>
                  <Text variant="bodySm" as="p" tone="subdued">Draft popups</Text>
                </div>
                <div>
                  <Text variant="headingLg" as="p">{popups.length}</Text>
                  <Text variant="bodySm" as="p" tone="subdued">Total popups</Text>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}