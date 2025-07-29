import { type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Card, 
  Text,
  Button,
  Badge,
  EmptyState,
  Banner,
  ButtonGroup
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { isMultiPopupEnabled } from "../utils/features";
import { redirect } from "@remix-run/node";

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Check feature flag
  if (!isMultiPopupEnabled()) {
    return redirect("/app");
  }

  const { session } = await authenticate.admin(request);
  const popupId = params.id;

  if (!popupId) {
    throw new Error("Popup ID is required");
  }

  // Get popup with steps
  const popup = await prisma.popup.findFirst({
    where: {
      id: popupId,
      shop: { domain: session.shop },
      isDeleted: false
    },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' }
      },
      shop: true
    }
  });

  if (!popup) {
    throw new Error("Popup not found");
  }

  return { popup };
}

function PopupPreviewStep({ step, stepNumber, totalSteps }: { step: any, stepNumber: number, totalSteps: number }) {
  const content = typeof step.content === 'string' ? JSON.parse(step.content) : step.content;
  
  return (
    <div style={{ 
      border: '2px solid #e1e5e9',
      borderRadius: '12px',
      padding: '24px',
      backgroundColor: 'white',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      marginBottom: '16px'
    }}>
      {/* Step Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Badge tone="info">Step {stepNumber} of {totalSteps}</Badge>
        <Badge tone="subdued">{step.stepType}</Badge>
      </div>

      {/* Step Content */}
      {step.stepType === 'QUESTION' && (
        <div>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '16px' }}>
            {content.question || `Question ${stepNumber}`}
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {content.options?.map((option: any, index: number) => (
              <div key={index} style={{
                padding: '12px 16px',
                border: '1px solid #c9cccf',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#f6f6f7'
              }}>
                <Text variant="bodyMd" as="p">{option.text}</Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {step.stepType === 'EMAIL' && (
        <div>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '8px' }}>
            {content.headline || 'Get Your Results!'}
          </Text>
          {content.description && (
            <Text variant="bodyMd" as="p" style={{ marginBottom: '16px' }}>
              {content.description}
            </Text>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="email"
              placeholder={content.placeholder || 'Enter your email'}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #c9cccf',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled
            />
            <div style={{
              padding: '12px 24px',
              backgroundColor: '#008060',
              color: 'white',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {content.buttonText || 'Submit'}
            </div>
          </div>
        </div>
      )}

      {step.stepType === 'DISCOUNT_REVEAL' && (
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h2" style={{ marginBottom: '8px' }}>
            {content.headline || 'Here\'s Your Discount!'}
          </Text>
          {content.description && (
            <Text variant="bodyMd" as="p" style={{ marginBottom: '16px' }}>
              {content.description}
            </Text>
          )}
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#ffd79d',
            border: '2px dashed #cc8800',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <Text variant="headingLg" as="h3" style={{ color: '#cc8800' }}>
              {content.codeDisplay || 'DISCOUNT10'}
            </Text>
          </div>
          {content.validityText && (
            <Text variant="bodySm" as="p" tone="subdued">
              {content.validityText}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

export default function PopupPreview() {
  const { popup } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const handleActivatePopup = () => {
    fetcher.submit(
      { popupId: popup.id, status: 'ACTIVE' },
      { method: 'POST', action: '/app/api/popups/status' }
    );
  };

  return (
    <Page
      title={`Preview: ${popup.name}`}
      subtitle="See how your popup will appear to customers"
      backAction={{
        content: 'Back to Edit',
        url: `/app/popups/${popup.id}/edit`
      }}
      secondaryActions={[
        {
          content: 'Edit Popup',
          url: `/app/popups/${popup.id}/edit`
        }
      ]}
    >
      <Layout>
        {/* Status Banner */}
        <Layout.Section>
          {popup.status === 'ACTIVE' ? (
            <Banner status="success">
              <p>✅ This popup is currently <strong>ACTIVE</strong> and showing to customers</p>
              {popup.scriptTagId && (
                <p>Script tag ID: {popup.scriptTagId}</p>
              )}
            </Banner>
          ) : (
            <Banner status="info">
              <p>ℹ️ This popup is in <strong>{popup.status}</strong> status and not showing to customers</p>
              <p>Activate it from the popup listing page to make it live</p>
            </Banner>
          )}
        </Layout.Section>

        {/* Popup Info */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <Text variant="headingMd" as="h2">Popup Details</Text>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge tone={popup.status === 'ACTIVE' ? 'success' : 'subdued'}>
                    {popup.status}
                  </Badge>
                  <Badge tone="info">
                    {popup.popupType.replace('_', ' ').toLowerCase()}
                  </Badge>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">Total Steps</Text>
                  <Text variant="bodyMd" as="p">{popup.totalSteps}</Text>
                </div>
                <div>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">Email Step</Text>
                  <Text variant="bodyMd" as="p">Step {popup.emailStep}</Text>
                </div>
                <div>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">Priority</Text>
                  <Text variant="bodyMd" as="p">{popup.priority}</Text>
                </div>
                <div>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">Created</Text>
                  <Text variant="bodyMd" as="p">{new Date(popup.createdAt).toLocaleDateString()}</Text>
                </div>
              </div>

              {/* Targeting Rules */}
              <div style={{ marginTop: '16px' }}>
                <Text variant="bodyMd" as="p" fontWeight="semibold" style={{ marginBottom: '4px' }}>
                  Target Pages
                </Text>
                <Text variant="bodyMd" as="p">
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
                </Text>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Preview Section */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2" style={{ marginBottom: '16px' }}>
                Live Preview
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued" style={{ marginBottom: '20px' }}>
                This is how your popup will appear to customers. Navigate through each step below.
              </Text>
              
              {/* Mock Browser Frame */}
              <div style={{ 
                border: '1px solid #c9cccf',
                borderRadius: '8px',
                backgroundColor: '#f6f6f7',
                padding: '20px'
              }}>
                <div style={{ 
                  backgroundColor: '#e1e5e9',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  🌐 {popup.shop.domain} - Customer View
                </div>

                {/* Popup Steps Preview */}
                <div style={{
                  maxWidth: '400px',
                  margin: '0 auto',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}>
                  {popup.steps.length > 0 ? (
                    popup.steps.map((step: any) => (
                      <PopupPreviewStep 
                        key={step.id}
                        step={step}
                        stepNumber={step.stepNumber}
                        totalSteps={popup.totalSteps}
                      />
                    ))
                  ) : (
                    <EmptyState
                      heading="No steps configured"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Add steps to see the popup preview</p>
                    </EmptyState>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>

        {/* Actions */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2" style={{ marginBottom: '16px' }}>
                Next Steps
              </Text>
              <ButtonGroup>
                <Button variant="primary" url={`/app/popups/${popup.id}/edit`}>
                  Edit Popup
                </Button>
                <Button url="/app/popups">
                  Back to All Popups
                </Button>
                {popup.status !== 'ACTIVE' && (
                  <Button 
                    variant="secondary"
                    onClick={handleActivatePopup}
                    loading={fetcher.state === 'submitting'}
                  >
                    {fetcher.state === 'submitting' ? 'Activating...' : 'Activate Popup'}
                  </Button>
                )}
                <Button variant="secondary" url={`https://${popup.shop.domain}`} external>
                  View Store
                </Button>
              </ButtonGroup>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}